package com.corridorapi.model.response;

import com.corridorapi.enums.SubsidyScheme;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class SubsidyHint {
    SubsidyScheme scheme;
    String displayName;
    String summary;
    Double estimatedAnnualEur;
    String url;
}
