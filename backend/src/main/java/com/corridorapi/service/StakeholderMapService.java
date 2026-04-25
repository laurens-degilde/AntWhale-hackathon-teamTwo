package com.corridorapi.service;

import com.corridorapi.enums.SpeciesType;
import com.corridorapi.enums.StakeholderType;
import com.corridorapi.model.response.Stakeholder;
import com.corridorapi.model.response.StakeholderMapResponse;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Stakeholder list assembled by intersecting the project bbox with municipality,
 * water-board, province, and known-NGO boundaries. STUB: returns a representative
 * Veluwe-area stakeholder set.
 */
@Service
public class StakeholderMapService {

    public StakeholderMapResponse build(SpeciesType species, double[] bbox) {
        List<Stakeholder> stakeholders = List.of(
            Stakeholder.builder()
                .id("provincie-gelderland")
                .name("Provincie Gelderland")
                .type(StakeholderType.PROVINCE)
                .role("NNN beleidshouder + financier biodiversiteitsubsidies")
                .requiredApprovals(List.of("NNN-toetsing", "Vergunning Wet natuurbescherming"))
                .contactUrl("https://www.gelderland.nl/themas/natuur-en-landschap")
                .build(),
            Stakeholder.builder()
                .id("gem-apeldoorn")
                .name("Gemeente Apeldoorn")
                .type(StakeholderType.MUNICIPALITY)
                .role("Bestemmingsplan + omgevingsvergunning")
                .requiredApprovals(List.of("Omgevingsvergunning"))
                .contactUrl("https://www.apeldoorn.nl/")
                .build(),
            Stakeholder.builder()
                .id("gem-epe")
                .name("Gemeente Epe")
                .type(StakeholderType.MUNICIPALITY)
                .role("Bestemmingsplan + omgevingsvergunning")
                .requiredApprovals(List.of("Omgevingsvergunning"))
                .contactUrl("https://www.epe.nl/")
                .build(),
            Stakeholder.builder()
                .id("waterschap-vallei-veluwe")
                .name("Waterschap Vallei en Veluwe")
                .type(StakeholderType.WATER_BOARD)
                .role("Waterstaatkundige toetsing voor culverts en amfibietunnels")
                .requiredApprovals(List.of("Watervergunning"))
                .contactUrl("https://www.vallei-veluwe.nl/")
                .build(),
            Stakeholder.builder()
                .id("rws-oost-nederland")
                .name("Rijkswaterstaat Oost-Nederland")
                .type(StakeholderType.ROAD_AUTHORITY)
                .role("Beheerder rijkswegen — verplichte partij voor ecoducten over A1/A28/A50")
                .requiredApprovals(List.of("Akkoord wegbeheerder"))
                .contactUrl("https://www.rijkswaterstaat.nl/")
                .build(),
            Stakeholder.builder()
                .id("ngo-natuurmonumenten")
                .name("Natuurmonumenten")
                .type(StakeholderType.NGO)
                .role("Beheerder aangrenzende natuurgebieden; potentiële co-financier")
                .requiredApprovals(List.of("Beheerakkoord"))
                .contactUrl("https://www.natuurmonumenten.nl/")
                .build(),
            Stakeholder.builder()
                .id("ngo-zoogdiervereniging")
                .name("Zoogdiervereniging")
                .type(StakeholderType.NGO)
                .role("Soortspecifieke ecologische advisering voor " + species.getKey())
                .requiredApprovals(List.of("Soortenadvies"))
                .contactUrl("https://www.zoogdiervereniging.nl/")
                .build()
        );

        return StakeholderMapResponse.builder()
            .species(species.getKey())
            .bbox(List.of(bbox[0], bbox[1], bbox[2], bbox[3]))
            .stakeholders(stakeholders)
            .status("STUB")
            .build();
    }
}
