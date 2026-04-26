package com.corridorapi.model.request;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class CommunityReportRequest {

    @NotBlank
    @Pattern(regexp = "roadkill|crossing|observation")
    private String rtype;

    @NotBlank
    @Size(max = 100)
    private String species;

    @Size(max = 1000)
    private String note;

    @NotNull
    @DecimalMin("-90.0") @DecimalMax("90.0")
    private Double lat;

    @NotNull
    @DecimalMin("-180.0") @DecimalMax("180.0")
    private Double lng;

    @NotBlank
    private String date;
}
