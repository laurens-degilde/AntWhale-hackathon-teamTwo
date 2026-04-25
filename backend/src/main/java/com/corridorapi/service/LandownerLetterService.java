package com.corridorapi.service;

import com.corridorapi.enums.InterventionType;
import com.corridorapi.enums.SpeciesType;
import com.corridorapi.enums.SubsidyScheme;
import com.corridorapi.model.response.CadastralParcel;
import com.corridorapi.model.response.CadastralResponse;
import com.corridorapi.model.response.Intervention;
import com.corridorapi.model.response.InterventionResponse;
import com.corridorapi.model.response.LandownerLetter;
import com.corridorapi.model.response.LandownerLetterResponse;
import com.corridorapi.model.response.SubsidyHint;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Composes one personalised letter per affected cadastral parcel. Pairs each
 * parcel with the nearest pinch-point intervention, picks the relevant subsidy
 * schemes by intervention archetype + owner type, and emits a JSON contract a
 * document-renderer service can turn into PDF/DOCX.
 */
@Service
public class LandownerLetterService {

    private final KadasterService kadasterService;
    private final InterventionService interventionService;

    public LandownerLetterService(KadasterService kadasterService,
                                  InterventionService interventionService) {
        this.kadasterService = kadasterService;
        this.interventionService = interventionService;
    }

    public LandownerLetterResponse compose(SpeciesType species, double[] bbox) {
        CadastralResponse parcels = kadasterService.fetch(bbox, 100);
        InterventionResponse iv = interventionService.classify(species, bbox, 8);

        List<LandownerLetter> letters = new ArrayList<>();
        int interventionIdx = 0;
        for (CadastralParcel p : parcels.getParcels()) {
            if (iv.getInterventions().isEmpty()) break;
            // Round-robin pair parcels to interventions; real impl picks nearest.
            Intervention chosen = iv.getInterventions().get(interventionIdx % iv.getInterventions().size());
            interventionIdx++;

            double midCost = (chosen.getMinCostEur() + chosen.getMaxCostEur()) / 2.0;
            double costToOwner = "private".equals(p.getOwnerType()) ? 0.0 : 0.0; // typically zero — funded by scheme
            List<SubsidyHint> subsidies = pickSubsidies(chosen.getType(), p.getOwnerType(), midCost);

            letters.add(LandownerLetter.builder()
                .parcelId(p.getId())
                .municipality(p.getMunicipality())
                .ownerType(p.getOwnerType())
                .ownerName(p.getOwnerName())
                .proposedIntervention(chosen.getType())
                .proposedInterventionDescription(chosen.getDescription())
                .estimatedCostEur(midCost)
                .costToLandowner(costToOwner)
                .summary(letterSummary(species, p, chosen))
                .body(letterBody(species, p, chosen, subsidies))
                .applicableSubsidies(subsidies)
                .contactPersonRole("Provinciale Coördinator Natuurnetwerk Nederland")
                .build());
        }

        return LandownerLetterResponse.builder()
            .species(species.getKey())
            .bbox(List.of(bbox[0], bbox[1], bbox[2], bbox[3]))
            .letters(letters)
            .status("STUB")
            .note("One letter per parcel intersected by an intervention. Body is a structured template the renderer interpolates; replace owner-name placeholders with BRK 2.0 lookup once authenticated.")
            .build();
    }

    private List<SubsidyHint> pickSubsidies(InterventionType type, String ownerType, double midCost) {
        List<SubsidyHint> out = new ArrayList<>();
        boolean agriEligible = "private".equals(ownerType);
        boolean agriIntervention = switch (type) {
            case HEDGEROW_PLANTING, WILDFLOWER_STRIP, FENCE_MODIFICATION, FENCE_REMOVAL,
                 STEPPING_STONE_GRASSLAND, STEPPING_STONE_POND -> true;
            default -> false;
        };

        if (agriEligible && agriIntervention) {
            out.add(toHint(SubsidyScheme.ANLB, midCost * 0.7));
            out.add(toHint(SubsidyScheme.GLB_ECO_SCHEMES, midCost * 0.3));
        }
        if (!agriEligible && agriIntervention) {
            out.add(toHint(SubsidyScheme.SNL, midCost * 0.8));
        }
        // Provincial biodiversity is broadly applicable.
        out.add(toHint(SubsidyScheme.PROVINCIAL_BIODIVERSITY, Math.min(midCost * 0.4, 250_000)));
        return out;
    }

    private SubsidyHint toHint(SubsidyScheme scheme, double estimatedAnnualEur) {
        return SubsidyHint.builder()
            .scheme(scheme)
            .displayName(scheme.getDisplayName())
            .summary(scheme.getSummary())
            .estimatedAnnualEur(Math.round(estimatedAnnualEur * 100.0) / 100.0)
            .url(scheme.getUrl())
            .build();
    }

    private String letterSummary(SpeciesType species, CadastralParcel p, Intervention iv) {
        return String.format(
            "Parcel %s in %s is identified as a priority site for a %s to support %s connectivity.",
            p.getId(), p.getMunicipality(), iv.getType().name().toLowerCase().replace('_', ' '),
            species.getKey().replace('_', ' '));
    }

    private String letterBody(SpeciesType species, CadastralParcel p, Intervention iv, List<SubsidyHint> subsidies) {
        StringBuilder sb = new StringBuilder();
        sb.append("Geachte heer/mevrouw,\n\n");
        sb.append("In de gemeente ").append(p.getMunicipality())
          .append(" is op uw perceel ").append(p.getId()).append(" een knelpunt geïdentificeerd voor de ")
          .append(species.getKey().replace('_', ' '))
          .append(". Wij stellen een ").append(iv.getType().name().toLowerCase().replace('_', ' '))
          .append(" voor: ").append(iv.getDescription()).append(".\n\n");
        sb.append("De geraamde investering ligt tussen € ").append(formatEur(iv.getMinCostEur()))
          .append(" en € ").append(formatEur(iv.getMaxCostEur()))
          .append(". Voor u als eigenaar zijn er naar verwachting geen kosten aan verbonden, omdat de maatregel wordt gedekt vanuit:\n");
        for (SubsidyHint h : subsidies) {
            sb.append("  - ").append(h.getDisplayName())
              .append(" (geschatte vergoeding € ").append(formatEur(h.getEstimatedAnnualEur())).append("/jaar)\n");
        }
        sb.append("\nWij nemen graag contact met u op om de details te bespreken. Met vriendelijke groet,\nde Provinciale Coördinator NNN.");
        return sb.toString();
    }

    private static String formatEur(double v) {
        return String.format("%,.0f", v).replace(',', '.');
    }
}
