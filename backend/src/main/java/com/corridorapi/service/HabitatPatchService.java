package com.corridorapi.service;

import com.corridorapi.enums.HabitatPatchKind;
import com.corridorapi.enums.SpeciesType;
import com.corridorapi.model.response.GeoPoint;
import com.corridorapi.model.response.HabitatPatch;
import com.corridorapi.model.response.HabitatPatchResponse;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * Derives source/destination habitat patches for a species from land-cover input.
 * STUB: returns realistic Veluwe-region examples; real implementation would call
 * LandCoverService for the bbox, threshold by per-species minimum patch size,
 * connected-component label, and emit polygon centroids.
 */
@Service
public class HabitatPatchService {

    /**
     * Per-species minimum viable patch size (hectares). Sources:
     *   badger        — Roper (2010), Lara-Romero et al. (2012): 25 ha to support a clan
     *   otter         — Cianfrani et al. (2013): 50 ha riparian for a stable home range
     *   red_deer      — Van Moorter et al. (2011): 200 ha forest core for resident herd
     *   pine_marten   — Mergey et al. (2011): 50 ha continuous forest
     *   great_crested_newt — Jehle (2000): 0.05 ha breeding pond + ≥250 m terrestrial buffer
     *   hazel_dormouse — Bright (1998), Mortelliti et al. (2014): 20 ha broadleaf woodland
     */
    private static final Map<SpeciesType, Double> MIN_PATCH_HA = Map.of(
        SpeciesType.BADGER, 25.0,
        SpeciesType.OTTER, 50.0,
        SpeciesType.RED_DEER, 200.0,
        SpeciesType.PINE_MARTEN, 50.0,
        SpeciesType.GREAT_CRESTED_NEWT, 0.05,
        SpeciesType.HAZEL_DORMOUSE, 20.0
    );

    public HabitatPatchResponse derive(SpeciesType species, double[] bbox) {
        double centerLat = (bbox[1] + bbox[3]) / 2;
        double centerLng = (bbox[0] + bbox[2]) / 2;

        // Sample patches positioned within the bbox so they look spatially coherent.
        double dLat = (bbox[3] - bbox[1]) / 6;
        double dLng = (bbox[2] - bbox[0]) / 6;

        List<HabitatPatch> patches = List.of(
            HabitatPatch.builder()
                .id("patch-1")
                .kind(HabitatPatchKind.SOURCE)
                .areaHa(842.0)
                .centroid(GeoPoint.builder().lat(centerLat - dLat).lng(centerLng - dLng).build())
                .dominantLandCover("Mixed forest")
                .habitatQuality(0.92)
                .build(),
            HabitatPatch.builder()
                .id("patch-2")
                .kind(HabitatPatchKind.DESTINATION)
                .areaHa(615.0)
                .centroid(GeoPoint.builder().lat(centerLat + dLat).lng(centerLng + dLng).build())
                .dominantLandCover("Broad-leaved forest")
                .habitatQuality(0.88)
                .build(),
            HabitatPatch.builder()
                .id("patch-3")
                .kind(HabitatPatchKind.STEPPING_STONE)
                .areaHa(34.0)
                .centroid(GeoPoint.builder().lat(centerLat).lng(centerLng).build())
                .dominantLandCover("Transitional woodland-shrub")
                .habitatQuality(0.61)
                .build(),
            HabitatPatch.builder()
                .id("patch-4")
                .kind(HabitatPatchKind.SOURCE)
                .areaHa(241.0)
                .centroid(GeoPoint.builder().lat(centerLat + dLat).lng(centerLng - dLng).build())
                .dominantLandCover("Coniferous forest")
                .habitatQuality(0.74)
                .build()
        );

        return HabitatPatchResponse.builder()
            .species(species.getKey())
            .bbox(List.of(bbox[0], bbox[1], bbox[2], bbox[3]))
            .minPatchHa(MIN_PATCH_HA.getOrDefault(species, 50.0))
            .methodology("Land-cover raster → reclassify to habitat suitability per species → connected components → drop components below minPatchHa → label by patch quality (source if quality≥0.8, destination otherwise; stepping stones for sub-threshold habitat patches that fall on candidate corridors).")
            .patches(patches)
            .status("STUB")
            .build();
    }
}
