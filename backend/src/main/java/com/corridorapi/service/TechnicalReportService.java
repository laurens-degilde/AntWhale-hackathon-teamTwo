package com.corridorapi.service;

import com.corridorapi.enums.SpeciesType;
import com.corridorapi.model.response.ConnectivityResponse;
import com.corridorapi.model.response.InterventionResponse;
import com.corridorapi.model.response.ResistanceSurfaceResponse;
import com.corridorapi.model.response.TechnicalReport;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Service
public class TechnicalReportService {

    private final ResistanceSurfaceService resistance;
    private final ConnectivityService connectivity;
    private final InterventionService interventions;

    public TechnicalReportService(ResistanceSurfaceService resistance,
                                  ConnectivityService connectivity,
                                  InterventionService interventions) {
        this.resistance = resistance;
        this.connectivity = connectivity;
        this.interventions = interventions;
    }

    public TechnicalReport build(SpeciesType species, double[] bbox) {
        ResistanceSurfaceResponse rs = resistance.generate(species, bbox, "100m");
        ConnectivityResponse cn = connectivity.compute(species, bbox, "CIRCUITSCAPE");
        InterventionResponse iv = interventions.classify(species, bbox, 5);

        return TechnicalReport.builder()
            .species(species.getKey())
            .bbox(List.of(bbox[0], bbox[1], bbox[2], bbox[3]))
            .generatedAt(Instant.now().toString())
            .summary("Connectivity analysis for " + species.getKey() + " across the requested bounding box. " +
                "Five priority interventions were identified at corridor pinch points; details below.")
            .methods(List.of(
                "Land cover: Copernicus CGLS-LC100 reclassified per species suitability.",
                "Resistance surface: per-class coefficients from Zeller et al. (2012), Koen et al. (2014), and species-specific literature.",
                "Habitat patches: connected components above species-specific minimum patch size.",
                "Connectivity: Circuitscape current density between source and destination patches.",
                "Pinch points: local maxima of current density on candidate corridor zones, classified by dominant land cover.",
                "Interventions: archetype matched to species + land cover; cost ranges from MJPO and EU LIFE programme post-completion budgets; cost-effectiveness = predicted current-density uplift / mid-cost."
            ))
            .assumptions(List.of(
                "Resistance coefficients are population-mean values; site-specific calibration may be required.",
                "Source/destination patches use minimum patch size as a proxy for population persistence.",
                "Cost ranges are order-of-magnitude planning figures; engineering surveys must precede tendering.",
                "Stateless analysis — no land-cover change is detected unless re-run via /api/change-detection."
            ))
            .resistanceCoefficients(rs.getResistanceCoefficients())
            .connectivitySummary(Map.of(
                "engine", cn.getEngine(),
                "meanCurrentDensity", cn.getMeanCurrentDensity(),
                "maxCurrentDensity", cn.getMaxCurrentDensity(),
                "topPinchPointIds", iv.getInterventions().stream().map(i -> i.getPinchPointId()).toList()
            ))
            .rankedInterventions(iv.getInterventions())
            .dataSources(List.of(
                "OpenStreetMap (Overpass)",
                "Copernicus Land Monitoring Service (CGLS-LC100)",
                "Sentinel-2 L2A (Element 84 STAC)",
                "GBIF",
                "iNaturalist",
                "Waarneming.nl verkeerslachtoffers",
                "Rijkswaterstaat ecoduct inventory",
                "PDOK BRT/BGT topography",
                "Provincial NNN layers",
                "Atlas Natuurlijk Kapitaal",
                "Kadaster BRK (cadastral parcels)"
            ))
            .nextSteps(List.of(
                "Engineering feasibility study for the top-3 ranked interventions.",
                "Stakeholder engagement — see /api/outputs/stakeholder-map.",
                "Subsidy applications — see /api/outputs/subsidy-applications.",
                "Schedule re-analysis quarterly via /api/change-detection."
            ))
            .status("STUB")
            .build();
    }
}
