package com.corridorapi.service;

import com.corridorapi.model.response.Intervention;
import com.corridorapi.model.response.TechnicalReport;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Generates all narrative prose slots for the technical report.
 *
 * Slot keys (used as placeholders in TechnicalReportPdfService):
 *   EXEC_OPENING          — executive summary opening paragraph
 *   EXEC_FINDINGS         — executive summary findings paragraph
 *   EXEC_RECOMMENDATIONS  — executive summary priority recommendation
 *   METHODS_RATIONALE     — why circuit theory for this species
 *   INTERVENTIONS_OVERVIEW — overview paragraph before the ranked table
 *
 * All Claude calls are synchronous. The caller (ReportBundleService) runs this
 * on a virtual thread and emits SSE progress events around it.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReportNarrativeService {

    public static final String EXEC_OPENING         = "EXEC_OPENING";
    public static final String EXEC_FINDINGS        = "EXEC_FINDINGS";
    public static final String EXEC_RECOMMENDATIONS = "EXEC_RECOMMENDATIONS";
    public static final String METHODS_RATIONALE    = "METHODS_RATIONALE";
    public static final String INTERVENTIONS_OVERVIEW = "INTERVENTIONS_OVERVIEW";

    private final AnthropicService anthropic;
    private final ObjectMapper objectMapper;

    /**
     * Generate all narrative slots for the given report.
     * Returns a map of slotKey → prose string.
     * Any slot that fails returns an empty string; the PDF renderer uses a
     * deterministic fallback for empty slots.
     */
    public Map<String, String> generate(TechnicalReport report) {
        Map<String, String> slots = new LinkedHashMap<>();

        String speciesKey   = report.getSpecies();
        String speciesLatin = speciesLatin(speciesKey);
        String dataJson     = toJson(buildExecContext(report));
        String engine       = engine(report);

        log.info("Generating narrative: EXEC_OPENING for species={}", speciesKey);
        slots.put(EXEC_OPENING, anthropic.generateText(
                NarrativePrompts.execOpeningSystem(),
                NarrativePrompts.execOpeningUser(dataJson),
                300));

        log.info("Generating narrative: EXEC_FINDINGS");
        slots.put(EXEC_FINDINGS, anthropic.generateText(
                NarrativePrompts.execFindingsSystem(),
                NarrativePrompts.execFindingsUser(dataJson),
                450));

        log.info("Generating narrative: EXEC_RECOMMENDATIONS");
        slots.put(EXEC_RECOMMENDATIONS, anthropic.generateText(
                NarrativePrompts.execRecommendationsSystem(),
                NarrativePrompts.execRecommendationsUser(dataJson),
                300));

        log.info("Generating narrative: METHODS_RATIONALE");
        slots.put(METHODS_RATIONALE, anthropic.generateText(
                NarrativePrompts.methodsRationaleSystem(),
                NarrativePrompts.methodsRationaleUser(speciesKey, speciesLatin, engine),
                200));

        log.info("Generating narrative: INTERVENTIONS_OVERVIEW");
        String ivsJson = toJson(buildInterventionsContext(report));
        slots.put(INTERVENTIONS_OVERVIEW, anthropic.generateText(
                NarrativePrompts.interventionsOverviewSystem(),
                NarrativePrompts.interventionsOverviewUser(ivsJson),
                300));

        return slots;
    }

    // ── data context builders ─────────────────────────────────────────────────

    private Map<String, Object> buildExecContext(TechnicalReport r) {
        Map<String, Object> ctx = new LinkedHashMap<>();
        ctx.put("species", r.getSpecies());
        ctx.put("speciesLatin", speciesLatin(r.getSpecies()));
        ctx.put("bbox", r.getBbox());
        ctx.put("generatedAt", r.getGeneratedAt());
        ctx.put("connectivitySummary", r.getConnectivitySummary());
        if (r.getRankedInterventions() != null && !r.getRankedInterventions().isEmpty()) {
            Intervention top = r.getRankedInterventions().get(0);
            ctx.put("topIntervention", Map.of(
                    "rank",   top.getRank(),
                    "type",   top.getType() != null ? top.getType().name() : "unknown",
                    "minCostEur", top.getMinCostEur(),
                    "maxCostEur", top.getMaxCostEur(),
                    "connectivityBenefit", top.getConnectivityBenefit(),
                    "costEffectivenessScore", top.getCostEffectivenessScore(),
                    "description", top.getDescription()
            ));
        }
        ctx.put("interventionCount", r.getRankedInterventions() != null ? r.getRankedInterventions().size() : 0);
        return ctx;
    }

    private List<Map<String, Object>> buildInterventionsContext(TechnicalReport r) {
        if (r.getRankedInterventions() == null) return List.of();
        return r.getRankedInterventions().stream()
                .map(iv -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("rank",   iv.getRank());
                    m.put("type",   iv.getType() != null ? iv.getType().name() : "unknown");
                    m.put("minCostEur", iv.getMinCostEur());
                    m.put("maxCostEur", iv.getMaxCostEur());
                    m.put("connectivityBenefit", iv.getConnectivityBenefit());
                    m.put("costEffectivenessScore", iv.getCostEffectivenessScore());
                    m.put("description", iv.getDescription());
                    return m;
                })
                .toList();
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private String toJson(Object obj) {
        try {
            return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(obj);
        } catch (Exception e) {
            return "{}";
        }
    }

    private static String speciesLatin(String key) {
        if (key == null) return "unknown";
        return switch (key) {
            case "badger"             -> "Meles meles";
            case "otter"              -> "Lutra lutra";
            case "red_deer"           -> "Cervus elaphus";
            case "pine_marten"        -> "Martes martes";
            case "great_crested_newt" -> "Triturus cristatus";
            case "hazel_dormouse"     -> "Muscardinus avellanarius";
            default -> key;
        };
    }

    private static String engine(TechnicalReport r) {
        if (r.getConnectivitySummary() == null) return "Circuitscape";
        Object e = r.getConnectivitySummary().get("engine");
        return e != null ? e.toString() : "Circuitscape";
    }
}
