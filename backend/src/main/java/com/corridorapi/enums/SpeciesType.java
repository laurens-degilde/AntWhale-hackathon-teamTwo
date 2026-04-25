package com.corridorapi.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import java.util.Arrays;
import java.util.stream.Collectors;

public enum SpeciesType {
    BADGER("badger", "Meles meles"),
    OTTER("otter", "Lutra lutra"),
    RED_DEER("red_deer", "Cervus elaphus"),
    PINE_MARTEN("pine_marten", "Martes martes"),
    GREAT_CRESTED_NEWT("great_crested_newt", "Triturus cristatus"),
    HAZEL_DORMOUSE("hazel_dormouse", "Muscardinus avellanarius");

    private final String key;
    private final String latin;

    SpeciesType(String key, String latin) {
        this.key = key;
        this.latin = latin;
    }

    @JsonValue
    public String getKey() { return key; }

    public String getLatin() { return latin; }

    @JsonCreator
    public static SpeciesType fromKey(String value) {
        if (value == null) return null;
        String norm = value.toLowerCase().replace('-', '_');
        return Arrays.stream(values())
            .filter(s -> s.key.equals(norm))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException(
                "Invalid species '" + value + "'. Allowed: " + allowedKeys()));
    }

    public static String allowedKeys() {
        return Arrays.stream(values()).map(SpeciesType::getKey).collect(Collectors.joining(", "));
    }
}
