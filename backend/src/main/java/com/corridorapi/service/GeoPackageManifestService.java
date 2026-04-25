package com.corridorapi.service;

import com.corridorapi.enums.SpeciesType;
import com.corridorapi.model.response.GeoPackageLayer;
import com.corridorapi.model.response.GeoPackageManifest;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Documents the GeoPackage / Shapefile bundle a renderer would produce. We do
 * not generate binary GIS files here — that is the document-renderer's job;
 * this endpoint emits the manifest of layers it should compose.
 */
@Service
public class GeoPackageManifestService {

    public GeoPackageManifest build(SpeciesType species, double[] bbox) {
        List<GeoPackageLayer> layers = List.of(
            GeoPackageLayer.builder()
                .name("resistance_surface")
                .geometryType("Raster")
                .crs("EPSG:28992")
                .featureCount(null)
                .description("Per-pixel resistance values (1 = easy, 1000 = barrier) for " + species.getKey() + ".")
                .build(),
            GeoPackageLayer.builder()
                .name("current_density")
                .geometryType("Raster")
                .crs("EPSG:28992")
                .featureCount(null)
                .description("Circuitscape / Omniscape current-density output.")
                .build(),
            GeoPackageLayer.builder()
                .name("habitat_patches")
                .geometryType("Polygon")
                .crs("EPSG:28992")
                .featureCount(4)
                .description("Source / destination / stepping-stone patches (kind attribute).")
                .build(),
            GeoPackageLayer.builder()
                .name("pinch_points")
                .geometryType("Point")
                .crs("EPSG:28992")
                .featureCount(8)
                .description("Bottleneck locations with current-density and bottleneck-score attributes.")
                .build(),
            GeoPackageLayer.builder()
                .name("interventions")
                .geometryType("Point")
                .crs("EPSG:28992")
                .featureCount(8)
                .description("Classified interventions with type, cost range, benefit, and rank.")
                .build(),
            GeoPackageLayer.builder()
                .name("affected_parcels")
                .geometryType("Polygon")
                .crs("EPSG:28992")
                .featureCount(5)
                .description("Cadastral parcels intersected by any intervention; includes ownerType.")
                .build()
        );

        return GeoPackageManifest.builder()
            .species(species.getKey())
            .bbox(List.of(bbox[0], bbox[1], bbox[2], bbox[3]))
            .filenameSuggestion("corridor_analysis_" + species.getKey() + ".gpkg")
            .crs("EPSG:28992")
            .layers(layers)
            .status("STUB")
            .note("This endpoint returns the layer manifest. A document-renderer service consumes this manifest plus the live data endpoints to write a real .gpkg / .zip(.shp) file.")
            .build();
    }
}
