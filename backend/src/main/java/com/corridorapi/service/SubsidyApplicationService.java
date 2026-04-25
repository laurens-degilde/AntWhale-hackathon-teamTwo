package com.corridorapi.service;

import com.corridorapi.enums.SpeciesType;
import com.corridorapi.enums.SubsidyScheme;
import com.corridorapi.model.response.LandownerLetter;
import com.corridorapi.model.response.LandownerLetterResponse;
import com.corridorapi.model.response.SubsidyApplication;
import com.corridorapi.model.response.SubsidyApplicationResponse;
import com.corridorapi.model.response.SubsidyHint;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class SubsidyApplicationService {

    private final LandownerLetterService landownerLetterService;

    public SubsidyApplicationService(LandownerLetterService landownerLetterService) {
        this.landownerLetterService = landownerLetterService;
    }

    public SubsidyApplicationResponse compose(SpeciesType species, double[] bbox) {
        LandownerLetterResponse letters = landownerLetterService.compose(species, bbox);
        List<SubsidyApplication> applications = new ArrayList<>();

        for (LandownerLetter l : letters.getLetters()) {
            for (SubsidyHint hint : l.getApplicableSubsidies()) {
                if (hint.getScheme() != SubsidyScheme.ANLB && hint.getScheme() != SubsidyScheme.GLB_ECO_SCHEMES) {
                    continue; // only ANLb and GLB get pre-filled application payloads
                }
                Map<String, Object> fields = new LinkedHashMap<>();
                fields.put("aanvragerType", l.getOwnerType());
                fields.put("aanvragerNaam", l.getOwnerName());
                fields.put("kadastraleAanduiding", l.getParcelId());
                fields.put("gemeente", l.getMunicipality());
                fields.put("maatregel", l.getProposedIntervention().name());
                fields.put("doelsoort", species.getKey());
                fields.put("kostenraming", l.getEstimatedCostEur());

                applications.add(SubsidyApplication.builder()
                    .parcelId(l.getParcelId())
                    .scheme(hint.getScheme())
                    .schemeDisplayName(hint.getScheme().getDisplayName())
                    .submissionPortal(submissionPortalFor(hint.getScheme()))
                    .prefilledFields(fields)
                    .requestedAnnualEur(hint.getEstimatedAnnualEur())
                    .status("DRAFT")
                    .build());
            }
        }

        return SubsidyApplicationResponse.builder()
            .species(species.getKey())
            .bbox(List.of(bbox[0], bbox[1], bbox[2], bbox[3]))
            .applications(applications)
            .status("STUB")
            .note("Pre-filled JSON only — submission must be performed by the landowner via the scheme's official portal. ANLb runs through agrarian collectives (BoerenNatuur); GLB eco-schemes run through RVO mijn.rvo.nl.")
            .build();
    }

    private String submissionPortalFor(SubsidyScheme scheme) {
        return switch (scheme) {
            case ANLB -> "https://www.boerennatuur.nl/anlb/";
            case GLB_ECO_SCHEMES -> "https://mijn.rvo.nl/glb";
            case SNL -> "https://www.bij12.nl/onderwerpen/natuur-en-landschap/subsidiestelsel-natuur-en-landschap-snl/";
            case PROVINCIAL_BIODIVERSITY -> "(per-province portal)";
        };
    }
}
