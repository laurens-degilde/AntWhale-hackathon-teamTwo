package com.corridorapi.model.response;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class ConnectivityResponse {
    String species;
    List<Double> bbox;
    String resolution;
    String engine;                  // CIRCUITSCAPE or OMNISCAPE
    Integer gridWidth;
    Integer gridHeight;
    Double meanCurrentDensity;
    Double maxCurrentDensity;
    /** Down-sampled grid of current density values, row-major from top-left. */
    List<List<Double>> currentDensityGrid;
    String status;
    String message;
}
