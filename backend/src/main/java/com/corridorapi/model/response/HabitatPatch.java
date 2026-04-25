package com.corridorapi.model.response;

import com.corridorapi.enums.HabitatPatchKind;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class HabitatPatch {
    String id;
    HabitatPatchKind kind;
    Double areaHa;
    GeoPoint centroid;
    String dominantLandCover;
    Double habitatQuality;   // 0-1
}
