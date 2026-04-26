package com.corridorapi.service;

import com.corridorapi.model.response.GeoPoint;
import com.corridorapi.model.response.Intervention;
import com.corridorapi.model.response.ResistanceCoefficient;
import com.corridorapi.model.response.TechnicalReport;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.text.NumberFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Slf4j
@Service
public class TechnicalReportPdfService {

    private static final NumberFormat EUROS = NumberFormat.getCurrencyInstance(Locale.GERMANY);

    public byte[] renderWithNarratives(TechnicalReport report, Map<String, String> narratives) {
        return renderHtml(buildHtml(report, narratives));
    }

    public byte[] render(TechnicalReport report) {
        return renderHtml(buildHtml(report, Map.of()));
    }

    private byte[] renderHtml(String html) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PdfRendererBuilder builder = new PdfRendererBuilder();
            builder.useFastMode();
            builder.withHtmlContent(html, null);
            builder.toStream(out);
            builder.run();
            return out.toByteArray();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to render technical report PDF", e);
        }
    }

    public String suggestedFilename(TechnicalReport report) {
        String species = report.getSpecies() == null ? "report" : report.getSpecies().replaceAll("[^a-zA-Z0-9_-]", "_");
        return "corridor-action-plan-" + species + ".pdf";
    }

    private String buildHtml(TechnicalReport report, Map<String, String> narratives) {
        List<Double> bbox = report.getBbox();
        StringBuilder sb = new StringBuilder(32 * 1024);

        sb.append("""
            <!DOCTYPE html>
            <html lang="en">
            <head><meta charset="UTF-8"/>
            <title>Wildlife Corridor Action Plan</title>
            <style>
              @page {
                size: A4;
                margin: 0;
              }
              * { box-sizing: border-box; margin: 0; padding: 0; }

              body {
                font-family: Helvetica, Arial, sans-serif;
                color: #1a2818;
                font-size: 9.5pt;
                line-height: 1.55;
                background: #ffffff;
              }

              /* ── COVER PAGE ── */
              .cover-page {
                background-color: #0e1a0d;
                width: 210mm;
                height: 297mm;
                page-break-after: always;
                position: relative;
              }

              /* Left accent bar */
              .cover-accent-bar {
                position: absolute;
                left: 0;
                top: 0;
                width: 5mm;
                height: 297mm;
                background-color: #3d8a50;
              }

              /* Top thin line */
              .cover-top-line {
                position: absolute;
                left: 5mm;
                top: 0;
                right: 0;
                height: 0.6mm;
                background-color: #2e6b3a;
              }

              .cover-inner {
                padding: 24mm 22mm 0 22mm;
                margin-left: 5mm;
              }

              .cover-eyebrow {
                font-size: 6.5pt;
                letter-spacing: 0.35em;
                text-transform: uppercase;
                color: #3d8a50;
                margin-bottom: 10mm;
              }

              .cover-headline {
                font-size: 44pt;
                font-weight: 700;
                color: #f0ede4;
                line-height: 1.0;
                margin-bottom: 3mm;
                letter-spacing: -0.5pt;
              }

              .cover-latin {
                font-size: 13pt;
                font-style: italic;
                color: #7aaa7e;
                margin-bottom: 14mm;
              }

              .cover-divider {
                height: 1px;
                background-color: #2a3d28;
                margin-bottom: 14mm;
              }

              /* Stats grid — 2×2 with thick left-border accents */
              .cover-stats {
                display: table;
                width: 100%;
                border-collapse: separate;
                border-spacing: 0;
              }
              .cover-stats-row {
                display: table-row;
              }
              .cover-stat {
                display: table-cell;
                width: 50%;
                vertical-align: top;
                padding: 0 0 10mm 0;
              }
              .cover-stat:first-child {
                padding-right: 10mm;
                border-right: 1px solid #2a3d28;
              }
              .cover-stat:last-child {
                padding-left: 10mm;
              }
              .cover-stat-inner {
                border-left: 2.5px solid #3d8a50;
                padding-left: 4mm;
              }
              .cover-stat-label {
                font-size: 6pt;
                letter-spacing: 0.22em;
                text-transform: uppercase;
                color: #8abf8e;
                margin-bottom: 2mm;
              }
              .cover-stat-value {
                font-size: 18pt;
                font-weight: 700;
                color: #f0ede4;
                line-height: 1;
                margin-bottom: 1.5mm;
              }
              .cover-stat-sub {
                font-size: 7pt;
                color: #7aaa7e;
              }

              /* Cover footer — anchored to bottom */
              .cover-footer {
                position: absolute;
                bottom: 0;
                left: 5mm;
                right: 0;
                padding: 5mm 22mm 7mm 22mm;
                border-top: 1px solid rgba(255,255,255,0.07);
              }
              .cover-footer-table {
                display: table;
                width: 100%;
              }
              .cover-footer-left {
                display: table-cell;
                font-size: 7.5pt;
                color: #7aaa7e;
                vertical-align: middle;
              }
              .cover-footer-right {
                display: table-cell;
                font-size: 7.5pt;
                color: #7aaa7e;
                text-align: right;
                vertical-align: middle;
              }

              /* ── MAIN CONTENT AREA ── */
              .page {
                padding: 14mm 18mm 14mm 18mm;
                background: #ffffff;
              }

              /* ── SECTION HEADERS ── */
              .section-block {
                margin-top: 10mm;
                margin-bottom: 4mm;
              }
              .section-block:first-child { margin-top: 0; }

              .section-tag {
                display: inline-block;
                font-size: 6pt;
                letter-spacing: 0.3em;
                text-transform: uppercase;
                color: #3d8a50;
                border: 1px solid #3d8a50;
                padding: 0.8mm 2.5mm;
                border-radius: 2px;
                margin-bottom: 3mm;
              }
              .section-title {
                font-size: 17pt;
                font-weight: 700;
                color: #0e1a0d;
                line-height: 1.12;
                margin-bottom: 2mm;
                letter-spacing: -0.3pt;
              }
              .section-desc {
                font-size: 8.5pt;
                color: #5a6e58;
                margin-bottom: 3mm;
              }
              h3 {
                font-size: 7.5pt;
                font-weight: 700;
                color: #1a2818;
                text-transform: uppercase;
                letter-spacing: 0.12em;
                margin-bottom: 2.5mm;
                margin-top: 4mm;
              }
              p { margin-bottom: 2.5mm; color: #2c3c2a; font-size: 9.5pt; }

              /* ── NARRATIVE BLOCK ── */
              .narrative {
                border-left: 3px solid #3d8a50;
                background-color: #f5faf5;
                padding: 4mm 5.5mm;
                margin: 2mm 0 5mm;
                border-radius: 0 3px 3px 0;
              }
              .narrative p { margin-bottom: 2mm; color: #2c3c2a; font-size: 9pt; }
              .narrative p:last-child { margin-bottom: 0; }

              /* ── MAP SVG WRAPPER ── */
              .map-container {
                margin: 3mm 0 2mm;
                border: 1.5px solid #d4e4d0;
                border-radius: 4px;
                overflow: hidden;
              }
              .map-legend {
                display: table;
                width: 100%;
                padding: 2mm 0;
                background-color: #f8fbf7;
                border-top: 1px solid #d4e4d0;
              }
              .map-legend-item {
                display: table-cell;
                font-size: 7pt;
                color: #4a5a48;
                padding: 0 4mm 0 0;
                vertical-align: middle;
                white-space: nowrap;
              }
              .map-legend-item:first-child { padding-left: 3mm; }
              .legend-swatch {
                display: inline-block;
                width: 3mm;
                height: 3mm;
                border-radius: 50%;
                vertical-align: middle;
                margin-right: 1.2mm;
              }

              /* ── PRIORITY INTERVENTIONS TABLE ── */
              .iv-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 8.5pt;
                margin-top: 2mm;
              }
              .iv-table thead tr {
                background-color: #0e1a0d;
              }
              .iv-table th {
                color: rgba(255,255,255,0.65);
                font-size: 6pt;
                letter-spacing: 0.2em;
                text-transform: uppercase;
                padding: 3mm 3.5mm;
                text-align: left;
                font-weight: 600;
              }
              .iv-table th.right { text-align: right; }
              .iv-table td {
                padding: 3mm 3.5mm;
                vertical-align: middle;
                color: #1a2818;
                border-bottom: 1px solid #eaefea;
              }
              .iv-table tbody tr:nth-child(odd) td  { background-color: #ffffff; }
              .iv-table tbody tr:nth-child(even) td { background-color: #f7faf7; }
              .iv-table tbody tr:last-child td { border-bottom: 2px solid #c8d8c4; }
              .iv-table td.right { text-align: right; }

              .rank-circle {
                display: inline-block;
                width: 6.5mm;
                height: 6.5mm;
                border-radius: 50%;
                text-align: center;
                line-height: 6.5mm;
                font-size: 8pt;
                font-weight: 700;
                color: #ffffff;
              }
              .type-pill {
                display: inline-block;
                padding: 0.6mm 2.5mm;
                border-radius: 2px;
                font-size: 6.5pt;
                font-weight: 700;
                letter-spacing: 0.06em;
                text-transform: uppercase;
              }

              /* ── MINI BAR CHART ── */
              .bar-track {
                display: inline-block;
                width: 22mm;
                height: 2mm;
                background-color: #e4ece4;
                border-radius: 1px;
                vertical-align: middle;
                margin-right: 1.5mm;
              }
              .bar-fill {
                height: 100%;
                border-radius: 1px;
              }

              /* ── RESISTANCE TABLE ── */
              .rc-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 8.5pt;
                margin-top: 2mm;
              }
              .rc-table thead tr {
                border-bottom: 2px solid #c8d8c4;
              }
              .rc-table th {
                font-size: 6pt;
                letter-spacing: 0.2em;
                text-transform: uppercase;
                color: #6a8268;
                padding: 2mm 3mm;
                text-align: left;
              }
              .rc-table th.right { text-align: right; }
              .rc-table td {
                padding: 2.5mm 3mm;
                border-bottom: 1px solid #edf5ed;
                color: #1a2818;
                vertical-align: middle;
              }
              .rc-table td.right { text-align: right; }
              .rc-table tbody tr:last-child td { border-bottom: none; }

              /* ── TWO-COLUMN LAYOUT ── */
              .two-col { display: table; width: 100%; border-collapse: collapse; }
              .col-left  { display: table-cell; width: 50%; vertical-align: top; padding-right: 6mm; }
              .col-right { display: table-cell; width: 50%; vertical-align: top; padding-left: 6mm;
                           border-left: 1px solid #e0ebe0; }

              /* ── BULLET LISTS ── */
              ul.clean { list-style: none; padding: 0; margin: 0; }
              ul.clean li {
                padding: 1.8mm 0 1.8mm 5mm;
                border-bottom: 1px solid #f0f5f0;
                font-size: 8.5pt;
                color: #2c3c2a;
                position: relative;
              }
              ul.clean li:before {
                content: "";
                position: absolute;
                left: 0;
                top: 3.8mm;
                width: 1.8mm;
                height: 1.8mm;
                border-radius: 50%;
                background-color: #3d8a50;
              }
              ul.clean li:last-child { border-bottom: none; }

              /* ── HORIZONTAL RULE ── */
              .rule { height: 1px; background-color: #dce8dc; margin: 7mm 0; }

              /* ── FOOTER BAR ── */
              .page-footer {
                margin-top: 10mm;
                padding-top: 3.5mm;
                border-top: 1.5px solid #c8d8c4;
                display: table;
                width: 100%;
              }
              .pf-left, .pf-right {
                display: table-cell;
                font-size: 7pt;
                color: #8a9e88;
                vertical-align: middle;
              }
              .pf-right { text-align: right; }

              /* ── UTILITY ── */
              .green  { color: #26602a; }
              .muted  { color: #8a9e88; }
              .bold   { font-weight: 700; }
              .small  { font-size: 7.5pt; }
            </style>
            </head>
            <body>
            """);

        // ── COVER PAGE ─────────────────────────────────────────────────────────
        String speciesDisplay = displaySpecies(report.getSpecies());
        String latinName      = latinName(report.getSpecies());
        int    ivCount        = safeSize(report.getRankedInterventions());
        String totalCost      = totalCostRange(report.getRankedInterventions());
        String topBenefit     = topBenefitPct(report.getRankedInterventions());
        String engine         = connectivityEngine(report.getConnectivitySummary());
        String generatedDate  = report.getGeneratedAt() != null
                ? report.getGeneratedAt().substring(0, Math.min(10, report.getGeneratedAt().length())) : "—";

        sb.append("<div class=\"cover-page\">");
        sb.append("<div class=\"cover-accent-bar\"></div>");
        sb.append("<div class=\"cover-top-line\"></div>");
        sb.append("<div class=\"cover-inner\">");
        sb.append("<div class=\"cover-eyebrow\">Wildlife Corridor Action Plan &#160;&#183;&#160; Corridor API</div>");
        sb.append("<div class=\"cover-headline\">").append(esc(speciesDisplay)).append("</div>");
        if (!latinName.isEmpty()) {
            sb.append("<div class=\"cover-latin\">").append(esc(latinName)).append("</div>");
        }
        sb.append("<div class=\"cover-divider\"></div>");
        // 2×2 stats grid
        sb.append("<div class=\"cover-stats\">");
        sb.append("<div class=\"cover-stats-row\">");
        sb.append(coverStat(String.valueOf(ivCount), "Interventions", "ranked by cost-effectiveness"));
        sb.append(coverStat(totalCost, "Total cost range", "planning-level estimate"));
        sb.append("</div>");
        sb.append("<div class=\"cover-stats-row\">");
        sb.append(coverStat(topBenefit, "Top uplift", "best connectivity gain"));
        sb.append(coverStat(engine, "Analysis engine", "circuit-theory model"));
        sb.append("</div>");
        sb.append("</div>");
        sb.append("</div>"); // /cover-inner
        sb.append("<div class=\"cover-footer\">");
        sb.append("<div class=\"cover-footer-table\">");
        sb.append("<div class=\"cover-footer-left\">Region: ").append(esc(bboxShort(bbox))).append("</div>");
        sb.append("<div class=\"cover-footer-right\">Generated ").append(esc(generatedDate)).append("</div>");
        sb.append("</div>");
        sb.append("</div>");
        sb.append("</div>"); // /cover-page

        // ── CONTENT PAGES ──────────────────────────────────────────────────────
        sb.append("<div class=\"page\">");

        // ── 01 Executive Summary ───────────────────────────────────────────
        sb.append("<div class=\"section-block\">");
        sb.append("<div class=\"section-tag\">01 — Executive summary</div>");
        sb.append("<div class=\"section-title\">Findings &amp; Recommendations</div>");
        sb.append("</div>");
        appendNarrativeBlock(sb, narratives, ReportNarrativeService.EXEC_OPENING, report.getSummary());
        appendNarrativeBlock(sb, narratives, ReportNarrativeService.EXEC_FINDINGS, null);
        appendNarrativeBlock(sb, narratives, ReportNarrativeService.EXEC_RECOMMENDATIONS, null);

        // ── 02 Map ─────────────────────────────────────────────────────────
        sb.append("<div class=\"section-block\">");
        sb.append("<div class=\"section-tag\">02 — Action perimeter</div>");
        sb.append("<div class=\"section-title\">Spatial Overview</div>");
        sb.append("<div class=\"section-desc\">Numbered markers show ranked intervention points. "
                + "Red = top priority · Orange = high priority · Blue = standard. Coordinates WGS84.</div>");
        sb.append("</div>");
        appendSvgMap(sb, report, bbox);

        // ── 03 Ranked Interventions ───────────────────────────────────────
        sb.append("<div class=\"section-block\">");
        sb.append("<div class=\"section-tag\">03 — Ranked interventions</div>");
        sb.append("<div class=\"section-title\">Priority Action List</div>");
        sb.append("</div>");
        appendNarrativeBlock(sb, narratives, ReportNarrativeService.INTERVENTIONS_OVERVIEW, null);
        appendInterventionsTable(sb, report.getRankedInterventions());

        sb.append("<div class=\"rule\"></div>");

        // ── 04 Methods ────────────────────────────────────────────────────
        sb.append("<div class=\"section-block\">");
        sb.append("<div class=\"section-tag\">04 — Methodology</div>");
        sb.append("<div class=\"section-title\">Methods &amp; Assumptions</div>");
        sb.append("</div>");
        appendNarrativeBlock(sb, narratives, ReportNarrativeService.METHODS_RATIONALE, null);
        sb.append("<div class=\"two-col\">");
        sb.append("<div class=\"col-left\"><h3>Analytical methods</h3>").append(cleanBullets(report.getMethods())).append("</div>");
        sb.append("<div class=\"col-right\"><h3>Key assumptions</h3>").append(cleanBullets(report.getAssumptions())).append("</div>");
        sb.append("</div>");

        // ── 05 Resistance Coefficients ────────────────────────────────────
        if (report.getResistanceCoefficients() != null && !report.getResistanceCoefficients().isEmpty()) {
            sb.append("<div class=\"rule\"></div>");
            sb.append("<div class=\"section-block\">");
            sb.append("<div class=\"section-tag\">05 — Resistance model</div>");
            sb.append("<div class=\"section-title\">Species Resistance Coefficients</div>");
            sb.append("<div class=\"section-desc\">Values sourced from peer-reviewed literature. "
                    + "Higher = harder to cross. Site calibration recommended before tendering.</div>");
            sb.append("</div>");
            appendResistanceTable(sb, report.getResistanceCoefficients());
        }

        sb.append("<div class=\"rule\"></div>");

        // ── 06 Data & Next Steps ──────────────────────────────────────────
        sb.append("<div class=\"section-block\">");
        sb.append("<div class=\"section-tag\">06 — Data &amp; next steps</div>");
        sb.append("<div class=\"section-title\">Sources &amp; Recommended Actions</div>");
        sb.append("</div>");
        sb.append("<div class=\"two-col\">");
        sb.append("<div class=\"col-left\"><h3>Data sources</h3>").append(cleanBullets(report.getDataSources())).append("</div>");
        sb.append("<div class=\"col-right\"><h3>Recommended next steps</h3>").append(cleanBullets(report.getNextSteps())).append("</div>");
        sb.append("</div>");

        // ── Footer ─────────────────────────────────────────────────────────
        sb.append("<div class=\"page-footer\">");
        sb.append("<div class=\"pf-left\">Generated by Corridor API &#8212; wildcross.nl &#160;&#183;&#160; "
                + "Cost figures are order-of-magnitude estimates; engineering surveys required before tendering.</div>");
        sb.append("<div class=\"pf-right\">").append(esc(report.getStatus() != null ? report.getStatus() : "")).append("</div>");
        sb.append("</div>");

        sb.append("</div>"); // /page
        sb.append("</body></html>");
        return sb.toString();
    }

    // ── SVG MAP ────────────────────────────────────────────────────────────────

    private void appendSvgMap(StringBuilder sb, TechnicalReport report, List<Double> bbox) {
        // SVG canvas: 174mm wide × 90mm tall (fits A4 content width at 18mm margins)
        // We'll use a viewBox of 0 0 620 320 (SVG units ~ pixels at 96dpi approx)
        int W = 620, H = 320;

        sb.append("<div class=\"map-container\">");
        sb.append(String.format(
            "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"100%%\" viewBox=\"0 0 %d %d\" "
            + "style=\"display:block;\">", W, H));

        // ── Background fill ──
        sb.append("<rect width=\"").append(W).append("\" height=\"").append(H).append("\" fill=\"#c8ddb8\"/>");

        // ── Subtle terrain patches (forest) ──
        String[][] patches = {
            {"50",  "30",  "160", "90",  "#5a9048", "0.32"},
            {"340", "20",  "130", "80",  "#4a8038", "0.28"},
            {"450", "180", "140", "100", "#527040", "0.30"},
            {"80",  "190", "120", "80",  "#4e8040", "0.27"},
            {"220", "230", "170", "70",  "#56884a", "0.25"},
            {"510", "60",  "90",  "140", "#4a7838", "0.26"},
        };
        for (String[] p : patches) {
            sb.append(String.format(
                "<rect x=\"%s\" y=\"%s\" width=\"%s\" height=\"%s\" fill=\"%s\" opacity=\"%s\" rx=\"8\"/>",
                p[0], p[1], p[2], p[3], p[4], p[5]));
        }

        // ── Grid lines ──
        sb.append("<g stroke=\"rgba(255,255,255,0.22)\" stroke-width=\"0.6\">");
        for (int x = 0; x <= W; x += 62) sb.append(String.format("<line x1=\"%d\" y1=\"0\" x2=\"%d\" y2=\"%d\"/>", x, x, H));
        for (int y = 0; y <= H; y += 64) sb.append(String.format("<line x1=\"0\" y1=\"%d\" x2=\"%d\" y2=\"%d\"/>", y, W, y));
        sb.append("</g>");

        // ── Road (horizontal) ──
        sb.append(String.format(
            "<path d=\"M0,%d L%d,%d\" stroke=\"#b08050\" stroke-width=\"3.5\" opacity=\"0.55\" fill=\"none\"/>",
            (int)(H * 0.44), W, (int)(H * 0.44)));
        // ── Road (vertical) ──
        sb.append(String.format(
            "<path d=\"M%d,0 L%d,%d\" stroke=\"#b08050\" stroke-width=\"3\" opacity=\"0.45\" fill=\"none\"/>",
            (int)(W * 0.34), (int)(W * 0.34), H));
        // ── River ──
        sb.append(String.format(
            "<path d=\"M0,%d Q%d,%d %d,%d Q%d,%d %d,%d\" stroke=\"#4a7ab8\" stroke-width=\"4\" opacity=\"0.5\" fill=\"none\"/>",
            (int)(H * 0.64),
            W/4, (int)(H * 0.67),
            W/2, (int)(H * 0.62),
            3*W/4, (int)(H * 0.65),
            W, (int)(H * 0.63)));

        // ── Intervention markers ──
        if (report.getRankedInterventions() != null && bbox != null && bbox.size() == 4) {
            double minLng = bbox.get(0), minLat = bbox.get(1),
                   maxLng = bbox.get(2), maxLat = bbox.get(3);
            double lngSpan = maxLng - minLng, latSpan = maxLat - minLat;
            int MAP_PAD = 24;
            for (Intervention iv : report.getRankedInterventions()) {
                if (iv.getLocation() == null) continue;
                Double lat = iv.getLocation().getLat(), lng = iv.getLocation().getLng();
                if (lat == null || lng == null) continue;
                if (lngSpan <= 0 || latSpan <= 0) continue;
                double xFrac = clamp01((lng - minLng) / lngSpan);
                double yFrac = clamp01((maxLat - lat)  / latSpan);
                int cx = MAP_PAD + (int)((W - 2 * MAP_PAD) * xFrac);
                int cy = MAP_PAD + (int)((H - 2 * MAP_PAD) * yFrac);
                String col = markerColor(iv.getRank());
                String rankStr = iv.getRank() == null ? "?" : iv.getRank().toString();
                // Halo
                sb.append(String.format(
                    "<circle cx=\"%d\" cy=\"%d\" r=\"14\" fill=\"%s\" opacity=\"0.22\"/>",
                    cx, cy, col));
                // Circle
                sb.append(String.format(
                    "<circle cx=\"%d\" cy=\"%d\" r=\"9\" fill=\"%s\" stroke=\"white\" stroke-width=\"1.5\"/>",
                    cx, cy, col));
                // Label
                sb.append(String.format(
                    "<text x=\"%d\" y=\"%d\" text-anchor=\"middle\" dominant-baseline=\"central\" "
                    + "fill=\"white\" font-family=\"Helvetica,Arial,sans-serif\" font-size=\"8\" font-weight=\"700\">%s</text>",
                    cx, cy, esc(rankStr)));
            }
        }

        // ── Corner coordinates ──
        if (bbox != null && bbox.size() == 4) {
            double minLng = bbox.get(0), minLat = bbox.get(1), maxLng = bbox.get(2), maxLat = bbox.get(3);
            String coordStyle = "fill=\"rgba(26,40,24,0.6)\" font-family=\"Helvetica,Arial,sans-serif\" font-size=\"8\"";
            sb.append(String.format("<text x=\"4\" y=\"12\" %s>%.4f N, %.4f E</text>", coordStyle, maxLat, minLng));
            sb.append(String.format("<text x=\"%d\" y=\"12\" text-anchor=\"end\" %s>%.4f N, %.4f E</text>",
                W - 4, coordStyle, maxLat, maxLng));
            sb.append(String.format("<text x=\"4\" y=\"%d\" dominant-baseline=\"auto\" %s>%.4f N, %.4f E</text>",
                H - 5, coordStyle, minLat, minLng));
            sb.append(String.format("<text x=\"%d\" y=\"%d\" text-anchor=\"end\" %s>%.4f N, %.4f E</text>",
                W - 4, H - 5, coordStyle, minLat, maxLng));
        }

        // ── Compass rose ──
        int cx = W - 20, cy = H - 20, r = 10;
        sb.append(String.format("<circle cx=\"%d\" cy=\"%d\" r=\"%d\" fill=\"rgba(255,255,255,0.88)\" stroke=\"rgba(0,0,0,0.15)\" stroke-width=\"0.8\"/>", cx, cy, r));
        sb.append(String.format("<text x=\"%d\" y=\"%d\" text-anchor=\"middle\" dominant-baseline=\"central\" "
            + "fill=\"#1a2818\" font-family=\"Helvetica,Arial,sans-serif\" font-size=\"8\" font-weight=\"700\">N</text>",
            cx, cy));

        // ── Scale bar ──
        sb.append(String.format(
            "<rect x=\"8\" y=\"%d\" width=\"50\" height=\"5\" fill=\"rgba(255,255,255,0.75)\" rx=\"2\"/>", H - 20));
        sb.append(String.format(
            "<rect x=\"8\" y=\"%d\" width=\"25\" height=\"5\" fill=\"rgba(26,40,24,0.5)\" rx=\"1\"/>", H - 20));
        sb.append(String.format(
            "<text x=\"8\" y=\"%d\" fill=\"rgba(26,40,24,0.65)\" font-family=\"Helvetica,Arial,sans-serif\" "
            + "font-size=\"7\">~5 km</text>", H - 8));

        sb.append("</svg>");

        // Legend below the map
        sb.append("<div class=\"map-legend\">");
        sb.append(svgLegendItem("#c0392b", "Top priority (rank 1)"));
        sb.append(svgLegendItem("#e07020", "High priority (rank 2–3)"));
        sb.append(svgLegendItem("#2563eb", "Standard priority"));
        sb.append(svgLegendItem("#5a9048", "Vegetation patch"));
        sb.append(svgLegendItem("#4a7ab8", "Waterway"));
        sb.append("</div>");
        sb.append("</div>"); // /map-container
    }

    private static String svgLegendItem(String color, String label) {
        return "<div class=\"map-legend-item\">"
            + "<span class=\"legend-swatch\" style=\"background-color:" + color + ";\"></span>"
            + esc(label) + "</div>";
    }

    // ── INTERVENTIONS TABLE ────────────────────────────────────────────────────

    private void appendInterventionsTable(StringBuilder sb, List<Intervention> ivs) {
        if (ivs == null || ivs.isEmpty()) {
            sb.append("<p class=\"muted\">No interventions available.</p>");
            return;
        }
        double maxBenefit = ivs.stream()
            .mapToDouble(i -> i.getConnectivityBenefit() == null ? 0 : i.getConnectivityBenefit())
            .max().orElse(1.0);
        if (maxBenefit < 0.001) maxBenefit = 1.0;

        sb.append("<table class=\"iv-table\"><thead><tr>")
            .append("<th style=\"width:9mm;\">#</th>")
            .append("<th>Intervention type</th>")
            .append("<th>Coordinates</th>")
            .append("<th>Cost estimate</th>")
            .append("<th class=\"right\">Connectivity uplift</th>")
            .append("<th class=\"right\">Score</th>")
            .append("</tr></thead><tbody>");

        for (Intervention iv : ivs) {
            String markerBg  = markerColor(iv.getRank());
            String typeLabel = humanType(iv.getType() == null ? null : iv.getType().name());
            String typeBg    = typeTagBg(iv.getType() == null ? null : iv.getType().name());
            String typeFg    = typeTagFg(iv.getType() == null ? null : iv.getType().name());
            double benFrac   = iv.getConnectivityBenefit() == null ? 0 : iv.getConnectivityBenefit() / maxBenefit;
            int    barW      = (int) Math.round(benFrac * 100);
            String barColor  = barColor(iv.getRank());

            sb.append("<tr>")
                // Rank
                .append("<td style=\"text-align:center;\">")
                    .append("<span class=\"rank-circle\" style=\"background-color:").append(markerBg).append(";\">")
                    .append(iv.getRank() == null ? "—" : iv.getRank())
                    .append("</span></td>")
                // Type + description
                .append("<td>")
                    .append("<span class=\"type-pill\" style=\"background-color:").append(typeBg)
                    .append(";color:").append(typeFg).append(";\">").append(esc(typeLabel)).append("</span>")
                    .append("<br/><span class=\"muted small\">")
                    .append(esc(iv.getDescription() != null ? truncate(iv.getDescription(), 60) : ""))
                    .append("</span></td>")
                // Coordinates
                .append("<td class=\"small\">").append(formatLocation(iv.getLocation())).append("</td>")
                // Cost
                .append("<td style=\"white-space:nowrap;\" class=\"bold\">").append(esc(costRange(iv))).append("</td>")
                // Benefit bar + %
                .append("<td class=\"right\">")
                    .append("<div class=\"bar-track\"><div class=\"bar-fill\" style=\"width:").append(barW)
                    .append("%;background-color:").append(barColor).append(";\"></div></div>")
                    .append("<span class=\"small\">").append(formatPercent(iv.getConnectivityBenefit())).append("</span></td>")
                // Score
                .append("<td class=\"right bold\">").append(formatScore(iv.getCostEffectivenessScore())).append("</td>")
                .append("</tr>");
        }
        sb.append("</tbody></table>");
    }

    // ── RESISTANCE TABLE ──────────────────────────────────────────────────────

    private void appendResistanceTable(StringBuilder sb, List<ResistanceCoefficient> coeffs) {
        double maxVal = coeffs.stream()
            .mapToDouble(r -> r.getValue() == null ? 0 : r.getValue())
            .max().orElse(1.0);
        if (maxVal < 0.001) maxVal = 1.0;

        sb.append("<table class=\"rc-table\"><thead><tr>")
            .append("<th>Land cover class</th>")
            .append("<th class=\"right\">Resistance</th>")
            .append("<th>Level</th>")
            .append("<th>Citation</th>")
            .append("</tr></thead><tbody>");

        for (ResistanceCoefficient rc : coeffs) {
            double frac    = rc.getValue() == null ? 0 : rc.getValue() / maxVal;
            int    barW    = (int) Math.round(frac * 100);
            String barCol  = frac > 0.7 ? "#c0392b" : frac > 0.4 ? "#e07020" : "#4a9e5c";
            sb.append("<tr>")
                .append("<td class=\"bold\">").append(esc(rc.getLandCoverClass())).append("</td>")
                .append("<td class=\"right bold\">")
                    .append(rc.getValue() == null ? "—" : String.format(Locale.ROOT, "%.1f", rc.getValue()))
                    .append("</td>")
                .append("<td>")
                    .append("<div class=\"bar-track\"><div class=\"bar-fill\" style=\"width:")
                    .append(barW).append("%;background-color:").append(barCol).append(";\"></div></div>")
                    .append("</td>")
                .append("<td class=\"muted small\">").append(esc(rc.getCitation())).append("</td>")
                .append("</tr>");
        }
        sb.append("</tbody></table>");
    }

    // ── NARRATIVE ─────────────────────────────────────────────────────────────

    private static void appendNarrativeBlock(StringBuilder sb, Map<String, String> narratives,
                                              String key, String fallback) {
        String text    = (narratives != null) ? narratives.getOrDefault(key, "") : "";
        String content = (text != null && !text.isBlank()) ? text : (fallback != null ? fallback : "");
        if (content.isBlank()) return;
        sb.append("<div class=\"narrative\">");
        for (String para : content.split("\n\n+")) {
            String t = para.trim();
            if (!t.isEmpty()) sb.append("<p>").append(esc(t)).append("</p>");
        }
        sb.append("</div>");
    }

    // ── HELPERS ───────────────────────────────────────────────────────────────

    private static String coverStat(String value, String label, String sub) {
        return "<div class=\"cover-stat\">"
            + "<div class=\"cover-stat-inner\">"
            + "<div class=\"cover-stat-label\">" + esc(label) + "</div>"
            + "<div class=\"cover-stat-value\">" + esc(value != null ? value : "—") + "</div>"
            + "<div class=\"cover-stat-sub\">" + esc(sub) + "</div>"
            + "</div>"
            + "</div>";
    }

    private static String cleanBullets(List<String> items) {
        if (items == null || items.isEmpty()) return "<p class=\"muted\">—</p>";
        StringBuilder sb = new StringBuilder("<ul class=\"clean\">");
        for (String it : items) sb.append("<li>").append(esc(it)).append("</li>");
        return sb.append("</ul>").toString();
    }

    private static String displaySpecies(String key) {
        if (key == null || key.isBlank()) return "Unknown Species";
        String[] parts = key.replace('_', ' ').split(" ");
        StringBuilder out = new StringBuilder();
        for (String p : parts) {
            if (p.isEmpty()) continue;
            if (out.length() > 0) out.append(' ');
            out.append(Character.toUpperCase(p.charAt(0))).append(p.substring(1));
        }
        return out.toString();
    }

    private static String latinName(String key) {
        if (key == null) return "";
        return switch (key.toLowerCase(Locale.ROOT)) {
            case "badger"             -> "Meles meles";
            case "otter"              -> "Lutra lutra";
            case "red_deer"           -> "Cervus elaphus";
            case "pine_marten"        -> "Martes martes";
            case "great_crested_newt" -> "Triturus cristatus";
            case "hazel_dormouse"     -> "Muscardinus avellanarius";
            default                   -> "";
        };
    }

    private static String humanType(String type) {
        if (type == null) return "—";
        return type.replace('_', ' ').toLowerCase(Locale.ROOT);
    }

    private static String bboxShort(List<Double> bbox) {
        if (bbox == null || bbox.size() != 4) return "—";
        return String.format(Locale.ROOT, "%.3f, %.3f → %.3f, %.3f",
            bbox.get(1), bbox.get(0), bbox.get(3), bbox.get(2));
    }

    private static String connectivityEngine(Map<String, Object> conn) {
        if (conn == null) return "—";
        Object e = conn.get("engine");
        return e == null ? "—" : e.toString();
    }

    private static String totalCostRange(List<Intervention> ivs) {
        if (ivs == null || ivs.isEmpty()) return "—";
        long minTotal = 0, maxTotal = 0;
        for (Intervention iv : ivs) {
            if (iv.getMinCostEur() != null) minTotal += iv.getMinCostEur().longValue();
            if (iv.getMaxCostEur() != null) maxTotal += iv.getMaxCostEur().longValue();
        }
        if (minTotal == 0 && maxTotal == 0) return "—";
        return "€" + formatK(minTotal) + "–" + formatK(maxTotal);
    }

    private static String formatK(long v) {
        if (v >= 1_000_000) return String.format(Locale.ROOT, "%.1fM", v / 1_000_000.0);
        if (v >= 1_000)     return String.format(Locale.ROOT, "%.0fk", v / 1_000.0);
        return String.valueOf(v);
    }

    private static String topBenefitPct(List<Intervention> ivs) {
        if (ivs == null || ivs.isEmpty()) return "—";
        double best = ivs.stream()
            .mapToDouble(i -> i.getConnectivityBenefit() == null ? 0 : i.getConnectivityBenefit())
            .max().orElse(0);
        if (best <= 0) return "—";
        return String.format(Locale.ROOT, "+%.0f%%", best * 100.0);
    }

    private static String formatLocation(GeoPoint p) {
        if (p == null || p.getLat() == null || p.getLng() == null) return "—";
        return String.format(Locale.ROOT, "%.4f, %.4f", p.getLat(), p.getLng());
    }

    private static String costRange(Intervention iv) {
        if (iv.getMinCostEur() == null && iv.getMaxCostEur() == null)
            return iv.getCostNote() == null ? "—" : iv.getCostNote();
        String lo = iv.getMinCostEur() == null ? "—" : EUROS.format(iv.getMinCostEur());
        String hi = iv.getMaxCostEur() == null ? "—" : EUROS.format(iv.getMaxCostEur());
        return lo + " – " + hi;
    }

    private static String formatPercent(Double v) {
        if (v == null) return "—";
        return String.format(Locale.ROOT, "+%.0f%%", v * 100.0);
    }

    private static String formatScore(Double v) {
        if (v == null) return "—";
        return String.format(Locale.ROOT, "%.2f", v);
    }

    private static String markerColor(Integer rank) {
        if (rank == null) return "#2563eb";
        if (rank == 1) return "#c0392b";
        if (rank <= 3) return "#e07020";
        return "#2563eb";
    }

    private static String barColor(Integer rank) {
        if (rank == null) return "#2563eb";
        if (rank == 1) return "#c0392b";
        if (rank <= 3) return "#e07020";
        return "#4a9e5c";
    }

    private static String typeTagBg(String type) {
        if (type == null) return "#eaefea";
        return switch (type.toUpperCase(Locale.ROOT)) {
            case "CULVERT_RETROFIT", "WILDLIFE_UNDERPASS", "ECODUCT" -> "#dbeafe";
            case "HEDGEROW_PLANTING", "WOODLAND_CREATION"             -> "#dcfce7";
            case "POND_CREATION"                                       -> "#dbeafe";
            case "FENCE_MODIFICATION"                                  -> "#fef9c3";
            default                                                    -> "#eaefea";
        };
    }

    private static String typeTagFg(String type) {
        if (type == null) return "#4a5a48";
        return switch (type.toUpperCase(Locale.ROOT)) {
            case "CULVERT_RETROFIT", "WILDLIFE_UNDERPASS", "ECODUCT" -> "#1d4ed8";
            case "HEDGEROW_PLANTING", "WOODLAND_CREATION"             -> "#166534";
            case "POND_CREATION"                                       -> "#1d4ed8";
            case "FENCE_MODIFICATION"                                  -> "#854d0e";
            default                                                    -> "#4a5a48";
        };
    }

    private static double clamp01(double v) {
        return Math.max(0.0, Math.min(1.0, v));
    }

    private static double clamp(double v) {
        return Math.max(2.0, Math.min(98.0, v));
    }

    private static int safeSize(List<?> list) { return list == null ? 0 : list.size(); }

    private static String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max) + "…";
    }

    private static String esc(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}
