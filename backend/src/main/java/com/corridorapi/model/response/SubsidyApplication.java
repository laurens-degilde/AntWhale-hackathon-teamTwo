package com.corridorapi.model.response;

import com.corridorapi.enums.SubsidyScheme;
import lombok.Builder;
import lombok.Value;

import java.util.Map;

@Value
@Builder
public class SubsidyApplication {
    String parcelId;
    SubsidyScheme scheme;
    String schemeDisplayName;
    String submissionPortal;
    Map<String, Object> prefilledFields;
    Double requestedAnnualEur;
    String status;
}
