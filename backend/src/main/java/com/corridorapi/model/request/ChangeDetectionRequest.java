package com.corridorapi.model.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ChangeDetectionRequest {
    @NotNull
    private RegionSnapshot previous;
    @NotNull
    private RegionSnapshot current;
}
