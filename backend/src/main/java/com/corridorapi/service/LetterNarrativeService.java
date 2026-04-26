package com.corridorapi.service;

import com.corridorapi.model.response.Intervention;
import com.corridorapi.model.response.LandownerLetter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Fills three personalised prose slots for each landowner letter.
 *
 * Existing LandownerLetterService provides the letter's structure, subsidy hints,
 * and legal boilerplate. This service adds Claude-written personalisation:
 *
 *   OPENING      — personalised opening paragraph (Dutch, 70-80 words)
 *   INTERVENTION — specific intervention description for this parcel (Dutch, 70-80 words)
 *   RATIONALE    — why this location matters ecologically (Dutch, 70-80 words)
 *
 * All three slots are in Dutch. The surrounding template (salutation, subsidy table,
 * sign-off) is kept as deterministic template text in LandownerLetterPdfService.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LetterNarrativeService {

    public static final String OPENING      = "OPENING";
    public static final String INTERVENTION = "INTERVENTION";
    public static final String RATIONALE    = "RATIONALE";

    private final AnthropicService anthropic;

    /**
     * Generate the three narrative slots for one letter.
     *
     * @param letter    the assembled letter from LandownerLetterService
     * @param bottleneckScore normalised score 0-1 for the intervention's pinch point
     * @param betweenPatches  human-readable patch pair e.g. "patch-1 ↔ patch-2" (nullable)
     * @return map of slotKey → Dutch prose
     */
    public Map<String, String> generate(LandownerLetter letter,
                                        double bottleneckScore,
                                        String betweenPatches) {
        Map<String, String> slots = new LinkedHashMap<>();

        String speciesKey   = letter.getProposedIntervention() != null
                ? letter.getProposedInterventionDescription() : "target species";
        // The species key is not directly on LandownerLetter; we infer from summary.
        // For the letter prompts we use what we have.
        String parcelId     = letter.getParcelId();
        String municipality = letter.getMunicipality();
        String ownerName    = letter.getOwnerName();
        String interventionType = letter.getProposedIntervention() != null
                ? letter.getProposedIntervention().name().toLowerCase().replace('_', ' ')
                : "ecological measure";
        String interventionDesc = letter.getProposedInterventionDescription();
        double minCost = letter.getEstimatedCostEur() != null ? letter.getEstimatedCostEur() * 0.7 : 0;
        double maxCost = letter.getEstimatedCostEur() != null ? letter.getEstimatedCostEur() * 1.3 : 0;

        log.debug("Generating letter narratives for parcel={}", parcelId);

        slots.put(OPENING, anthropic.generateText(
                NarrativePrompts.letterOpeningSystem(),
                NarrativePrompts.letterOpeningUser(
                        parcelId, municipality, ownerName,
                        extractSpecies(letter.getSummary()), extractSpeciesLatin(letter.getSummary()),
                        "agricultural / private land", 0),
                200));

        slots.put(INTERVENTION, anthropic.generateText(
                NarrativePrompts.letterInterventionSystem(),
                NarrativePrompts.letterInterventionUser(
                        parcelId, municipality,
                        interventionType, interventionDesc,
                        minCost, maxCost),
                200));

        slots.put(RATIONALE, anthropic.generateText(
                NarrativePrompts.letterRationaleSystem(),
                NarrativePrompts.letterRationaleUser(
                        parcelId, municipality,
                        extractSpecies(letter.getSummary()),
                        extractSpeciesLatin(letter.getSummary()),
                        bottleneckScore, betweenPatches),
                200));

        return slots;
    }

    // Quick extraction from the summary string produced by LandownerLetterService.
    // Summary format: "Parcel X in Y is identified ... <species> connectivity."
    private static String extractSpecies(String summary) {
        if (summary == null) return "target species";
        int idx = summary.lastIndexOf("support ");
        if (idx < 0) return "target species";
        String rest = summary.substring(idx + 8);
        int end = rest.indexOf(" connectivity");
        return end > 0 ? rest.substring(0, end) : rest;
    }

    private static String extractSpeciesLatin(String summary) {
        String key = extractSpecies(summary);
        return switch (key) {
            case "badger"             -> "Meles meles";
            case "otter"              -> "Lutra lutra";
            case "red deer"           -> "Cervus elaphus";
            case "pine marten"        -> "Martes martes";
            case "great crested newt" -> "Triturus cristatus";
            case "hazel dormouse"     -> "Muscardinus avellanarius";
            default -> key;
        };
    }
}
