package com.corridorapi.model.response;

import lombok.Builder;
import lombok.Value;

import java.util.List;
import java.util.Map;

@Value
@Builder
public class TechnicalReport {
    String species;
    List<Double> bbox;
    String generatedAt;
    String summary;
    List<String> methods;
    List<String> assumptions;
    List<ResistanceCoefficient> resistanceCoefficients;
    Map<String, Object> connectivitySummary;     // mean / max current density, top-N pinch IDs
    List<Intervention> rankedInterventions;
    List<String> dataSources;
    List<String> nextSteps;
    String status;
}
