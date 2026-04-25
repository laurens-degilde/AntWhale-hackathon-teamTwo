package com.corridorapi.model.response;

import com.corridorapi.enums.InterventionType;
import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class LandownerLetter {
    String parcelId;
    String municipality;
    String ownerType;
    String ownerName;
    InterventionType proposedIntervention;
    String proposedInterventionDescription;
    Double estimatedCostEur;
    Double costToLandowner;
    String summary;
    String body;
    List<SubsidyHint> applicableSubsidies;
    String contactPersonRole;
}
