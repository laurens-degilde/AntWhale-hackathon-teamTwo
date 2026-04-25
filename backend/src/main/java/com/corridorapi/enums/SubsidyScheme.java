package com.corridorapi.enums;

public enum SubsidyScheme {
    /** Agrarisch Natuur- en Landschapsbeheer — collective farmer-led nature management. */
    ANLB("Agrarisch Natuur- en Landschapsbeheer (ANLb)",
         "Collective scheme; farmers contract via an agrarian collective for hedgerow/strip/pond management.",
         "https://www.boerennatuur.nl/anlb/"),
    /** Common Agricultural Policy eco-schemes (NSP/GLB). */
    GLB_ECO_SCHEMES("GLB / NSP eco-regelingen",
         "Annual eco-scheme payments for biodiversity-friendly land use under the Dutch Strategisch Plan GLB.",
         "https://www.rvo.nl/onderwerpen/glb/eco-regelingen"),
    /** Provinciale Subsidie Natuur- en Landschapsbeheer. */
    SNL("Subsidiestelsel Natuur en Landschap (SNL)",
         "Province-managed scheme for nature reserves and landscape elements outside agricultural land.",
         "https://www.bij12.nl/onderwerpen/natuur-en-landschap/subsidiestelsel-natuur-en-landschap-snl/"),
    /** Provincial biodiversity grants — varies per province. */
    PROVINCIAL_BIODIVERSITY("Provinciale biodiversiteitssubsidie",
         "Per-province biodiversity / ontsnippering grant — application path differs by province.",
         null);

    private final String displayName;
    private final String summary;
    private final String url;

    SubsidyScheme(String displayName, String summary, String url) {
        this.displayName = displayName;
        this.summary = summary;
        this.url = url;
    }

    public String getDisplayName() { return displayName; }
    public String getSummary() { return summary; }
    public String getUrl() { return url; }
}
