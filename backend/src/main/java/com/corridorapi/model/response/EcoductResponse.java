package com.corridorapi.model.response;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class EcoductResponse {
    List<Ecoduct> results;
}
