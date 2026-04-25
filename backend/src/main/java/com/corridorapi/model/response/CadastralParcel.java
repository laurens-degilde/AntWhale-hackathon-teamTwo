package com.corridorapi.model.response;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class CadastralParcel {
    String id;                 // BRK kadastrale aanduiding e.g. "EPE00-K-1234"
    String municipality;
    String section;
    Integer parcelNumber;
    Double areaHa;
    String dominantLandUse;
    String ownerType;          // "private", "municipality", "province", "state", "ngo", "water_board"
    String ownerName;          // anonymised in BRK Public; populate from BRK auth where allowed
    GeoPoint centroid;
}
