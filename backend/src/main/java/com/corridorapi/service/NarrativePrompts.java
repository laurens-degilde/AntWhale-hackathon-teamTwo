package com.corridorapi.service;

/**
 * All prompts for narrative slot generation.
 *
 * Design rules (enforced by every prompt below):
 *  1. Claude never invents quantitative facts — every number, name, citation
 *     must come from the JSON data passed in the user prompt.
 *  2. Claude's only job is prose: contextualising and paraphrasing the data.
 *  3. References / citations come from the data; Claude does not generate them.
 *  4. Tone: professional, scientific, restrained — a Dutch ecologist would sign it.
 *  5. Language: formal British English (letters: Dutch).
 *  6. No bullet points — continuous prose paragraphs only.
 *  7. Hard word limit enforced per slot.
 */
final class NarrativePrompts {

    // ── Shared style guide injected into every system prompt ──────────────────

    static final String STYLE_GUIDE = """
            You are a technical writer for a wildlife corridor planning report. \
            Your audience is provincial ecologists and government planners in the Netherlands. \
            Write in formal British English. \
            Use passive voice where appropriate. \
            Do not use first person singular or plural. \
            Do not use bullet points, numbered lists, or headers — write in continuous prose. \
            Do not speculate or add information not present in the data provided. \
            Do not invent any numbers, species names, place names, citations, costs, or proper nouns. \
            All quantitative claims must be taken directly from the JSON data context supplied. \
            If the data context does not contain enough information to write a specific claim, omit that claim. \
            A Dutch landscape ecologist must be able to sign their name to every sentence you write.\
            """;

    // ── Executive summary ─────────────────────────────────────────────────────

    static String execOpeningSystem() {
        return STYLE_GUIDE;
    }

    static String execOpeningUser(String dataJson) {
        return """
                Below is the analysis data for this report in JSON format:

                %s

                Write a single paragraph of 100–120 words for the opening of the executive summary. \
                The paragraph should explain the ecological significance of the target species for \
                landscape connectivity in the Netherlands, why this type of region poses movement \
                challenges for the species, and why a quantitative connectivity analysis was performed. \
                Use only the species name, region, and data provided above. \
                Do not use the word "I" or "we". Do not invent facts.\
                """.formatted(dataJson);
    }

    static String execFindingsSystem() {
        return STYLE_GUIDE;
    }

    static String execFindingsUser(String dataJson) {
        return """
                Below is the analysis data for this report in JSON format:

                %s

                Write a single paragraph of 160–180 words describing the key findings of this \
                connectivity analysis. Cover: the mean and maximum current density values and what \
                they indicate about corridor quality; the number and severity of pinch points identified; \
                the dominant land-cover types at pinch point locations; and the range of intervention \
                types identified. Use only values present in the JSON above. \
                Do not invent or round numbers beyond one decimal place.\
                """.formatted(dataJson);
    }

    static String execRecommendationsSystem() {
        return STYLE_GUIDE;
    }

    static String execRecommendationsUser(String dataJson) {
        return """
                Below is the analysis data for this report in JSON format:

                %s

                Write a single paragraph of 100–120 words recommending the highest-priority \
                intervention. Explain which intervention ranks first, why it has the highest \
                cost-effectiveness score, the expected connectivity benefit (expressed as percentage \
                uplift from the data), and the estimated cost range. Close with a sentence noting \
                that the ranked list of all interventions appears in Section 3. \
                Use only values present in the JSON above.\
                """.formatted(dataJson);
    }

    // ── Methods section ───────────────────────────────────────────────────────

    static String methodsRationaleSystem() {
        return STYLE_GUIDE;
    }

    static String methodsRationaleUser(String speciesKey, String speciesLatin, String engine) {
        return """
                Species: %s (%s)
                Connectivity engine used: %s

                Write a single paragraph of 70–80 words explaining why circuit theory \
                (as implemented in %s) is an appropriate method for modelling landscape \
                connectivity for %s. Reference the analogy between electrical circuits and \
                random-walk movement; mention that the method produces a current-density surface \
                identifying movement bottlenecks. Use only the information above; do not cite \
                specific papers or authors unless they are provided to you here (none are).\
                """.formatted(speciesKey, speciesLatin, engine, engine, speciesKey);
    }

    // ── Interventions overview ────────────────────────────────────────────────

    static String interventionsOverviewSystem() {
        return STYLE_GUIDE;
    }

    static String interventionsOverviewUser(String dataJson) {
        return """
                Below is the ranked intervention list in JSON:

                %s

                Write a single paragraph of 110–120 words providing an overview of the \
                intervention programme before the detailed table. Describe: how many interventions \
                were identified; the range of types present (road crossings, planting, fence \
                modifications, etc.); the total estimated cost range across all interventions; \
                and the basis for the ranking (cost-effectiveness score = connectivity benefit \
                divided by mid-point cost). Do not repeat the table — summarise the pattern. \
                Use only data in the JSON above.\
                """.formatted(dataJson);
    }

    // ── Landowner letters (Dutch) ─────────────────────────────────────────────

    static final String LETTER_STYLE_GUIDE = """
            You are writing a personalised section of a formal Dutch letter to a landowner on behalf \
            of a provincial nature coordination office. \
            Write in formal, polite Dutch (u-form). \
            Do not use bullet points. Write in continuous prose. \
            Do not invent any facts, names, parcel identifiers, costs, or species not present in \
            the data provided. \
            Keep the tone respectful and constructive — the landowner is being invited to participate, \
            not ordered to comply. \
            A provincial ecologist must be able to approve every sentence.\
            """;

    static String letterOpeningSystem() {
        return LETTER_STYLE_GUIDE;
    }

    static String letterOpeningUser(String parcelId, String municipality, String ownerName,
                                    String speciesKey, String speciesLatin, String dominantLandUse,
                                    double areaHa) {
        return """
                Parcel ID: %s
                Municipality: %s
                Owner name (use only if not null/anonymised): %s
                Target species: %s (%s)
                Dominant land use on parcel: %s
                Parcel area: %.1f ha

                Write a single paragraph of 70–80 words in Dutch. This is the personalised opening \
                paragraph of a letter explaining to the landowner that their parcel has been \
                identified as significant for wildlife connectivity. Mention the species and the \
                municipality. If the owner name is provided and not anonymised, address them by name; \
                otherwise use "Geachte eigenaar". Explain in one sentence why this parcel type is \
                relevant for the species. Do not mention costs or interventions yet.\
                """.formatted(parcelId, municipality,
                ownerName != null ? ownerName : "anonymised", speciesKey, speciesLatin,
                dominantLandUse, areaHa);
    }

    static String letterInterventionSystem() {
        return LETTER_STYLE_GUIDE;
    }

    static String letterInterventionUser(String parcelId, String municipality,
                                         String interventionType, String interventionDescription,
                                         double minCost, double maxCost) {
        return """
                Parcel ID: %s
                Municipality: %s
                Proposed intervention type: %s
                Intervention description: %s
                Estimated cost range: € %.0f – € %.0f (not borne by landowner)

                Write a single paragraph of 70–80 words in Dutch describing what is being proposed \
                on this parcel. Name the intervention type, describe briefly what it involves, \
                and state that the cost will be covered by public funding (not charged to the \
                landowner). Reference the parcel ID and municipality. Do not mention specific \
                subsidy scheme names — those appear later in the letter.\
                """.formatted(parcelId, municipality,
                interventionType, interventionDescription, minCost, maxCost);
    }

    static String letterRationaleSystem() {
        return LETTER_STYLE_GUIDE;
    }

    static String letterRationaleUser(String parcelId, String municipality, String speciesKey,
                                      String speciesLatin, double bottleneckScore,
                                      String betweenPatches) {
        return """
                Parcel ID: %s
                Municipality: %s
                Species: %s (%s)
                Bottleneck severity score (0–1): %.2f
                Connects habitat patches: %s

                Write a single paragraph of 70–80 words in Dutch explaining why this specific \
                location is ecologically important for the species. Reference the bottleneck score \
                and what it means (higher = more constrained movement). If patch names are provided, \
                mention that the intervention connects the named patches. Keep the explanation \
                accessible — the landowner is not assumed to be an ecologist.\
                """.formatted(parcelId, municipality, speciesKey, speciesLatin,
                bottleneckScore, betweenPatches != null ? betweenPatches : "identified habitat patches");
    }

    private NarrativePrompts() {}
}
