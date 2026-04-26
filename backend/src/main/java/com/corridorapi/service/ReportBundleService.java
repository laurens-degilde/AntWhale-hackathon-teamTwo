package com.corridorapi.service;

import com.corridorapi.controller.LandCoverController;
import com.corridorapi.enums.SpeciesType;
import com.corridorapi.model.response.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Consumer;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/**
 * Orchestrates the full report bundle generation pipeline.
 *
 * Pipeline stages (each emitting a ProgressEvent via the callback):
 *  1. data_assembly   — build TechnicalReport + LandownerLetterResponse + SubsidyApplicationResponse
 *  2. narrative_report — generate Claude narrative slots for the main report (5 calls)
 *  3. narrative_letters — generate Claude narrative slots per letter (3 calls × N letters)
 *  4. pdf_report      — render main report PDF
 *  5. pdf_letters     — render each letter PDF
 *  6. zip_assembly    — assemble ZIP with all outputs
 *
 * Returns the download token via the "complete" ProgressEvent.
 * Called from ReportBundleController on a virtual thread.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReportBundleService {

    private final TechnicalReportService reportService;
    private final TechnicalReportPdfService reportPdfService;
    private final LandownerLetterService letterService;
    private final LandownerLetterPdfService letterPdfService;
    private final SubsidyApplicationService subsidyService;
    private final ReportNarrativeService reportNarrative;
    private final LetterNarrativeService letterNarrative;
    private final BundleCache bundleCache;
    private final ObjectMapper objectMapper;

    public void generate(String speciesParam, String bboxParam,
                         Consumer<ProgressEvent> progress) {
        try {
            SpeciesType species = SpeciesType.fromKey(speciesParam);
            double[] bbox = LandCoverController.parseBbox(bboxParam);

            // ── 1. Data assembly ──────────────────────────────────────────────
            progress.accept(ProgressEvent.running("data_assembly", "Assembling analysis data"));
            TechnicalReport report = reportService.build(species, bbox);
            LandownerLetterResponse letters = letterService.compose(species, bbox);
            SubsidyApplicationResponse subsidies = subsidyService.compose(species, bbox);
            progress.accept(ProgressEvent.done("data_assembly", "Analysis data ready"));

            // ── 2. Narrative — main report ────────────────────────────────────
            progress.accept(ProgressEvent.running("narrative_report", "Drafting executive summary…"));
            Map<String, String> reportNarratives = reportNarrative.generate(report);
            progress.accept(ProgressEvent.done("narrative_report", "Report narrative complete"));

            // ── 3. Narrative — landowner letters ──────────────────────────────
            int total = letters.getLetters().size();
            @SuppressWarnings("unchecked")
            Map<String, String>[] letterNarratives = new Map[total];
            for (int i = 0; i < total; i++) {
                LandownerLetter letter = letters.getLetters().get(i);
                progress.accept(ProgressEvent.letter(
                        "Letter " + (i + 1) + "/" + total + " — " + letter.getParcelId(),
                        i + 1, total));
                letterNarratives[i] = letterNarrative.generate(letter, 0.65, null);
            }
            progress.accept(ProgressEvent.done("narrative_letters",
                    total + " letter narratives complete"));

            // ── 4. PDF — main report ──────────────────────────────────────────
            progress.accept(ProgressEvent.running("pdf_report", "Rendering technical report PDF"));
            byte[] reportPdf = reportPdfService.renderWithNarratives(report, reportNarratives);
            progress.accept(ProgressEvent.done("pdf_report", "Report PDF ready"));

            // ── 5. PDF — letters ──────────────────────────────────────────────
            progress.accept(ProgressEvent.running("pdf_letters",
                    "Rendering " + total + " landowner letters"));
            byte[][] letterPdfs = new byte[total][];
            for (int i = 0; i < total; i++) {
                letterPdfs[i] = letterPdfService.render(letters.getLetters().get(i), letterNarratives[i]);
            }
            progress.accept(ProgressEvent.done("pdf_letters", "Letter PDFs ready"));

            // ── 6. ZIP assembly ───────────────────────────────────────────────
            progress.accept(ProgressEvent.running("zip_assembly", "Assembling download bundle"));
            byte[] zip = assembleZip(report, reportPdf, letters, letterPdfs, subsidies);
            String filename = "corridor-bundle-" + species.getKey() + ".zip";
            String token = bundleCache.store(zip, filename);
            progress.accept(ProgressEvent.done("zip_assembly", "Bundle ready"));

            progress.accept(ProgressEvent.complete(token));

        } catch (Exception e) {
            log.error("Bundle generation failed", e);
            progress.accept(ProgressEvent.error(e.getMessage()));
        }
    }

    // ── ZIP assembly ──────────────────────────────────────────────────────────

    private byte[] assembleZip(TechnicalReport report,
                                byte[] reportPdf,
                                LandownerLetterResponse letters,
                                byte[][] letterPdfs,
                                SubsidyApplicationResponse subsidies) throws Exception {
        try (ByteArrayOutputStream bos = new ByteArrayOutputStream();
             ZipOutputStream zip = new ZipOutputStream(bos)) {

            // Main report PDF
            addEntry(zip, "corridor-action-plan-" + report.getSpecies() + ".pdf", reportPdf);

            // Landowner letters
            List<LandownerLetter> ls = letters.getLetters();
            for (int i = 0; i < ls.size(); i++) {
                String name = "letters/" + letterPdfService.suggestedFilename(ls.get(i));
                addEntry(zip, name, letterPdfs[i]);
            }

            // GIS exports (GeoJSON)
            addEntry(zip, "gis/pinch_points.geojson", pinchPointsGeojson(report).getBytes(StandardCharsets.UTF_8));
            addEntry(zip, "gis/proposed_interventions.geojson", interventionsGeojson(report).getBytes(StandardCharsets.UTF_8));

            // Subsidy applications JSON
            String subsidyJson = objectMapper.writerWithDefaultPrettyPrinter()
                    .writeValueAsString(subsidies);
            addEntry(zip, "subsidy_applications.json", subsidyJson.getBytes(StandardCharsets.UTF_8));

            // README
            addEntry(zip, "README.txt", readme(report, ls.size()).getBytes(StandardCharsets.UTF_8));

            zip.finish();
            return bos.toByteArray();
        }
    }

    private static void addEntry(ZipOutputStream zip, String name, byte[] data) throws Exception {
        ZipEntry entry = new ZipEntry(name);
        zip.putNextEntry(entry);
        zip.write(data);
        zip.closeEntry();
    }

    // ── GeoJSON builders ──────────────────────────────────────────────────────

    private String pinchPointsGeojson(TechnicalReport report) {
        // Pinch points derived from intervention locations (proxy for demo)
        StringBuilder sb = new StringBuilder();
        sb.append("{\"type\":\"FeatureCollection\",\"name\":\"pinch_points\",\"features\":[");
        List<Intervention> ivs = report.getRankedInterventions();
        if (ivs != null) {
            boolean first = true;
            for (Intervention iv : ivs) {
                if (iv.getLocation() == null) continue;
                if (!first) sb.append(",");
                first = false;
                sb.append(pointFeature(
                        iv.getLocation().getLng(), iv.getLocation().getLat(),
                        Map.of(
                                "id",         iv.getPinchPointId() != null ? iv.getPinchPointId() : iv.getId(),
                                "rank",        iv.getRank() != null ? iv.getRank() : 0,
                                "type",        iv.getType() != null ? iv.getType().name() : "unknown"
                        )
                ));
            }
        }
        sb.append("]}");
        return sb.toString();
    }

    private String interventionsGeojson(TechnicalReport report) {
        StringBuilder sb = new StringBuilder();
        sb.append("{\"type\":\"FeatureCollection\",\"name\":\"proposed_interventions\",\"features\":[");
        List<Intervention> ivs = report.getRankedInterventions();
        if (ivs != null) {
            boolean first = true;
            for (Intervention iv : ivs) {
                if (iv.getLocation() == null) continue;
                if (!first) sb.append(",");
                first = false;
                sb.append(pointFeature(
                        iv.getLocation().getLng(), iv.getLocation().getLat(),
                        Map.of(
                                "id",                    iv.getId(),
                                "type",                  iv.getType() != null ? iv.getType().name() : "unknown",
                                "rank",                  iv.getRank() != null ? iv.getRank() : 0,
                                "minCostEur",            iv.getMinCostEur() != null ? iv.getMinCostEur() : 0,
                                "maxCostEur",            iv.getMaxCostEur() != null ? iv.getMaxCostEur() : 0,
                                "connectivityBenefit",   iv.getConnectivityBenefit() != null ? iv.getConnectivityBenefit() : 0,
                                "description",           iv.getDescription() != null ? iv.getDescription() : ""
                        )
                ));
            }
        }
        sb.append("]}");
        return sb.toString();
    }

    private static String pointFeature(Double lng, Double lat, Map<String, Object> props) {
        StringBuilder sb = new StringBuilder();
        sb.append("{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[");
        sb.append(String.format(Locale.ROOT, "%.6f,%.6f", lng, lat));
        sb.append("]},\"properties\":{");
        boolean first = true;
        for (var e : props.entrySet()) {
            if (!first) sb.append(",");
            first = false;
            sb.append("\"").append(e.getKey()).append("\":");
            Object v = e.getValue();
            if (v instanceof String s) sb.append("\"").append(jsonEsc(s)).append("\"");
            else if (v instanceof Number n) sb.append(n);
            else sb.append("\"").append(v).append("\"");
        }
        sb.append("}}");
        return sb.toString();
    }

    private static String jsonEsc(String s) {
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    // ── README ────────────────────────────────────────────────────────────────

    private static String readme(TechnicalReport report, int letterCount) {
        return """
                Wildlife Corridor Action Plan — Download Bundle
                ================================================

                Species : %s
                Region  : %.4f, %.4f → %.4f, %.4f (WGS84)
                Generated: %s

                Contents
                --------
                corridor-action-plan-*.pdf
                    Technical report. Contains executive summary, methods, resistance
                    coefficients, ranked interventions with cost estimates, and next steps.

                letters/ (%d files)
                    One personalised PDF letter per affected cadastral parcel.
                    Each letter identifies the proposed measure, applicable subsidy
                    schemes, and contact information.

                gis/pinch_points.geojson
                    GeoJSON FeatureCollection of connectivity pinch points.
                    Load in QGIS, ArcGIS, or Felt.

                gis/proposed_interventions.geojson
                    GeoJSON FeatureCollection of ranked intervention locations with
                    cost and connectivity-benefit attributes.

                subsidy_applications.json
                    Pre-filled JSON payloads for ANLb and GLB eco-scheme applications.
                    These are drafts — submission must be performed by the landowner
                    via the scheme's official portal.

                Notes
                -----
                · All cost figures are order-of-magnitude planning estimates.
                  Engineering surveys are required before tendering.
                · Resistance coefficients are population-mean values from peer-reviewed
                  literature; site calibration may be required.
                · Re-run the analysis quarterly to detect landscape changes
                  via /api/change-detection.

                Produced by the Corridor API — wildcross.nl
                """.formatted(
                report.getSpecies(),
                report.getBbox() != null ? report.getBbox().get(0) : 0,
                report.getBbox() != null ? report.getBbox().get(1) : 0,
                report.getBbox() != null ? report.getBbox().get(2) : 0,
                report.getBbox() != null ? report.getBbox().get(3) : 0,
                Instant.now().toString(),
                letterCount
        );
    }
}
