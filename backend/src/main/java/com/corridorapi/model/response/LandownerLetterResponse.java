package com.corridorapi.model.response;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class LandownerLetterResponse {
    String species;
    List<Double> bbox;
    List<LandownerLetter> letters;
    String status;
    String note;
}
