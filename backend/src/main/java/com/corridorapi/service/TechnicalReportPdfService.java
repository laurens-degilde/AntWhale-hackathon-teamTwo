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

    public byte[] render(TechnicalReport report) {
        String html = buildHtml(report);
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

    private String buildHtml(TechnicalReport report) {
        List<Double> bbox = report.getBbox();
        StringBuilder sb = new StringBuilder(8 * 1024);
        sb.append("""
            <!DOCTYPE html>
            <html lang="en">
            <head><meta charset="UTF-8"/>
            <title>Wildlife Corridor Action Plan</title>
            <style>
              @page { size: A4; margin: 22mm 18mm 22mm 18mm; }
              * { box-sizing: border-box; }
              body { font-family: 'Helvetica', 'Arial', sans-serif; color: #1f2937; font-size: 10.5pt; line-height: 1.45; }
              h1 { font-size: 22pt; margin: 0 0 4mm; color: #0f172a; }
              h2 { font-size: 13pt; margin: 8mm 0 3mm; color: #0f172a; border-bottom: 1px solid #e5e7eb; padding-bottom: 2mm; }
              h3 { font-size: 11pt; margin: 5mm 0 2mm; color: #0f172a; }
              p { margin: 0 0 2.5mm; }
              ul { margin: 0 0 2.5mm 5mm; padding: 0; }
              li { margin-bottom: 1.2mm; }
              .kicker { color: #6b7280; font-size: 9pt; letter-spacing: 0.06em; text-transform: uppercase; }
              .meta { display: table; width: 100%; margin: 3mm 0 6mm; border-collapse: collapse; }
              .meta-row { display: table-row; }
              .meta-cell { display: table-cell; padding: 2mm 3mm; border: 1px solid #e5e7eb; vertical-align: top; }
              .meta-cell .label { color: #6b7280; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.05em; }
              .meta-cell .value { font-size: 11pt; color: #0f172a; font-weight: 600; }
              .perimeter-wrap { margin: 3mm 0 6mm; }
              .perimeter {
                position: relative; width: 100%; height: 90mm;
                background: repeating-linear-gradient(45deg, #f1f5f9, #f1f5f9 6mm, #e2e8f0 6mm, #e2e8f0 6.4mm);
                border: 2px dashed #475569; border-radius: 2mm;
              }
              .perimeter .corner { position: absolute; font-size: 8pt; color: #475569; padding: 1mm 1.5mm; background: #ffffffcc; border-radius: 1mm; }
              .perimeter .nw { top: 1mm; left: 1mm; }
              .perimeter .ne { top: 1mm; right: 1mm; }
              .perimeter .sw { bottom: 1mm; left: 1mm; }
              .perimeter .se { bottom: 1mm; right: 1mm; }
              .perimeter .center-label { position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%);
                color: #94a3b8; font-size: 9pt; letter-spacing: 0.1em; text-transform: uppercase; }
              .marker { position: absolute; transform: translate(-50%,-50%);
                width: 9mm; height: 9mm; line-height: 9mm; text-align: center;
                background: #2563eb; color: #fff; font-weight: 700; font-size: 10pt;
                border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 0 1px #1e40af; }
              .marker.rank-1 { background: #dc2626; box-shadow: 0 0 0 1px #991b1b; }
              .marker.rank-2 { background: #ea580c; box-shadow: 0 0 0 1px #9a3412; }
              .marker.rank-3 { background: #d97706; box-shadow: 0 0 0 1px #92400e; }
              .legend { display: table; width: 100%; margin-top: 3mm; }
              .legend .lcell { display: table-cell; padding: 1mm 2mm; font-size: 8.5pt; color: #475569; }
              table.itable { width: 100%; border-collapse: collapse; margin-top: 2mm; }
              table.itable th, table.itable td { border: 1px solid #e5e7eb; padding: 2mm 2.5mm; text-align: left; vertical-align: top; font-size: 9.5pt; }
              table.itable th { background: #f8fafc; color: #0f172a; font-weight: 600; }
              table.itable td.num { text-align: right; font-variant-numeric: tabular-nums; }
              .badge { display: inline-block; padding: 1mm 2mm; border-radius: 1mm; font-size: 8.5pt;
                background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
              .badge.live { background: #dcfce7; color: #166534; border-color: #bbf7d0; }
              .footer { color: #6b7280; font-size: 8.5pt; margin-top: 6mm; border-top: 1px solid #e5e7eb; padding-top: 2mm; }
              .two-col { display: table; width: 100%; }
              .two-col .col { display: table-cell; width: 50%; padding-right: 4mm; vertical-align: top; }
              .two-col .col + .col { padding-right: 0; padding-left: 4mm; }
            </style>
            </head>
            <body>
            """);

        sb.append("<div class=\"kicker\">Wildlife corridor action plan</div>");
        sb.append("<h1>").append(esc(displaySpecies(report.getSpecies()))).append("</h1>");
        sb.append("<p>").append(esc(report.getSummary())).append("</p>");

        sb.append("<div class=\"meta\"><div class=\"meta-row\">");
        sb.append(metaCell("Species", displaySpecies(report.getSpecies())));
        sb.append(metaCell("Generated at", report.getGeneratedAt()));
        sb.append(metaCell("Status", statusBadge(report.getStatus())));
        sb.append("</div><div class=\"meta-row\">");
        sb.append(metaCell("Perimeter (SW → NE)", bboxLabel(bbox)));
        sb.append(metaCell("Interventions ranked", String.valueOf(safeSize(report.getRankedInterventions()))));
        sb.append(metaCell("Engine", connectivityEngine(report.getConnectivitySummary())));
        sb.append("</div></div>");

        sb.append("<h2>Action perimeter</h2>");
        sb.append("<p>The perimeter below is the bounding box submitted with the analysis. Numbered markers show where each ranked intervention should be placed. Coordinates are WGS84 (EPSG:4326).</p>");
        sb.append("<div class=\"perimeter-wrap\"><div class=\"perimeter\">");
        sb.append("<div class=\"corner nw\">NW ").append(formatCorner(bbox, 0, 3)).append("</div>");
        sb.append("<div class=\"corner ne\">NE ").append(formatCorner(bbox, 2, 3)).append("</div>");
        sb.append("<div class=\"corner sw\">SW ").append(formatCorner(bbox, 0, 1)).append("</div>");
        sb.append("<div class=\"corner se\">SE ").append(formatCorner(bbox, 2, 1)).append("</div>");
        sb.append("<div class=\"center-label\">Action perimeter</div>");
        if (report.getRankedInterventions() != null && bbox != null && bbox.size() == 4) {
            for (Intervention iv : report.getRankedInterventions()) {
                appendMarker(sb, iv, bbox);
            }
        }
        sb.append("</div>");
        sb.append("<div class=\"legend\">");
        sb.append("<div class=\"lcell\"><span style=\"display:inline-block;width:3mm;height:3mm;border-radius:50%;background:#dc2626;\"></span> Top priority (rank 1)</div>");
        sb.append("<div class=\"lcell\"><span style=\"display:inline-block;width:3mm;height:3mm;border-radius:50%;background:#ea580c;\"></span> Rank 2–3</div>");
        sb.append("<div class=\"lcell\"><span style=\"display:inline-block;width:3mm;height:3mm;border-radius:50%;background:#2563eb;\"></span> Lower-ranked</div>");
        sb.append("</div></div>");

        sb.append("<h2>Ranked interventions</h2>");
        sb.append("<table class=\"itable\"><thead><tr>")
            .append("<th>#</th><th>Type</th><th>Location</th><th>Cost range</th><th class=\"num\">Connectivity uplift</th><th class=\"num\">Cost-effectiveness</th><th>Notes</th>")
            .append("</tr></thead><tbody>");
        if (report.getRankedInterventions() != null) {
            for (Intervention iv : report.getRankedInterventions()) {
                sb.append("<tr>")
                    .append("<td>").append(iv.getRank() == null ? "—" : iv.getRank()).append("</td>")
                    .append("<td>").append(esc(humanType(iv.getType() == null ? null : iv.getType().name()))).append("</td>")
                    .append("<td>").append(formatLocation(iv.getLocation())).append("</td>")
                    .append("<td>").append(esc(costRange(iv))).append("</td>")
                    .append("<td class=\"num\">").append(formatPercent(iv.getConnectivityBenefit())).append("</td>")
                    .append("<td class=\"num\">").append(formatScore(iv.getCostEffectivenessScore())).append("</td>")
                    .append("<td>").append(esc(iv.getDescription())).append("</td>")
                    .append("</tr>");
            }
        }
        sb.append("</tbody></table>");

        sb.append("<div class=\"two-col\">");
        sb.append("<div class=\"col\"><h3>Methods</h3>").append(bullets(report.getMethods())).append("</div>");
        sb.append("<div class=\"col\"><h3>Assumptions</h3>").append(bullets(report.getAssumptions())).append("</div>");
        sb.append("</div>");

        if (report.getResistanceCoefficients() != null && !report.getResistanceCoefficients().isEmpty()) {
            sb.append("<h2>Resistance coefficients</h2>");
            sb.append("<table class=\"itable\"><thead><tr><th>Land cover</th><th class=\"num\">Resistance</th><th>Source</th></tr></thead><tbody>");
            for (ResistanceCoefficient rc : report.getResistanceCoefficients()) {
                sb.append("<tr>")
                    .append("<td>").append(esc(rc.getLandCoverClass())).append("</td>")
                    .append("<td class=\"num\">").append(rc.getValue() == null ? "—" : String.format(Locale.ROOT, "%.2f", rc.getValue())).append("</td>")
                    .append("<td>").append(esc(rc.getCitation())).append("</td>")
                    .append("</tr>");
            }
            sb.append("</tbody></table>");
        }

        sb.append("<div class=\"two-col\">");
        sb.append("<div class=\"col\"><h3>Data sources</h3>").append(bullets(report.getDataSources())).append("</div>");
        sb.append("<div class=\"col\"><h3>Next steps</h3>").append(bullets(report.getNextSteps())).append("</div>");
        sb.append("</div>");

        sb.append("<div class=\"footer\">Generated by the Corridor API. Status: ").append(esc(report.getStatus()))
            .append(". Coefficients are population means; site calibration may be required before tendering.</div>");

        sb.append("</body></html>");
        return sb.toString();
    }

    private void appendMarker(StringBuilder sb, Intervention iv, List<Double> bbox) {
        if (iv.getLocation() == null) return;
        Double lat = iv.getLocation().getLat();
        Double lng = iv.getLocation().getLng();
        if (lat == null || lng == null) return;
        double minLng = bbox.get(0), minLat = bbox.get(1), maxLng = bbox.get(2), maxLat = bbox.get(3);
        if (maxLng <= minLng || maxLat <= minLat) return;
        double xPct = clampPct((lng - minLng) / (maxLng - minLng) * 100.0);
        double yPct = clampPct((maxLat - lat) / (maxLat - minLat) * 100.0);
        String rankClass = "";
        if (iv.getRank() != null) {
            if (iv.getRank() == 1) rankClass = " rank-1";
            else if (iv.getRank() <= 3) rankClass = " rank-" + iv.getRank();
        }
        sb.append("<div class=\"marker").append(rankClass).append("\" style=\"left:")
            .append(String.format(Locale.ROOT, "%.1f", xPct)).append("%; top:")
            .append(String.format(Locale.ROOT, "%.1f", yPct)).append("%\">")
            .append(iv.getRank() == null ? "•" : iv.getRank())
            .append("</div>");
    }

    private static double clampPct(double v) {
        if (v < 1.5) return 1.5;
        if (v > 98.5) return 98.5;
        return v;
    }

    private static String metaCell(String label, String value) {
        return "<div class=\"meta-cell\"><div class=\"label\">" + esc(label)
            + "</div><div class=\"value\">" + value + "</div></div>";
    }

    private static String statusBadge(String status) {
        if (status == null) return "<span class=\"badge\">unknown</span>";
        boolean live = !"STUB".equalsIgnoreCase(status);
        return "<span class=\"badge" + (live ? " live" : "") + "\">" + esc(status) + "</span>";
    }

    private static String connectivityEngine(Map<String, Object> conn) {
        if (conn == null) return "—";
        Object engine = conn.get("engine");
        return engine == null ? "—" : esc(engine.toString());
    }

    private static String displaySpecies(String key) {
        if (key == null || key.isBlank()) return "Unknown species";
        String[] parts = key.replace('_', ' ').split(" ");
        StringBuilder out = new StringBuilder();
        for (String p : parts) {
            if (p.isEmpty()) continue;
            if (out.length() > 0) out.append(' ');
            out.append(Character.toUpperCase(p.charAt(0))).append(p.substring(1));
        }
        return out.toString();
    }

    private static String humanType(String type) {
        if (type == null) return "—";
        return type.replace('_', ' ').toLowerCase(Locale.ROOT);
    }

    private static String bboxLabel(List<Double> bbox) {
        if (bbox == null || bbox.size() != 4) return "—";
        return String.format(Locale.ROOT, "%.4f, %.4f → %.4f, %.4f",
            bbox.get(1), bbox.get(0), bbox.get(3), bbox.get(2));
    }

    private static String formatCorner(List<Double> bbox, int lngIdx, int latIdx) {
        if (bbox == null || bbox.size() != 4) return "";
        return String.format(Locale.ROOT, "%.4f, %.4f", bbox.get(latIdx), bbox.get(lngIdx));
    }

    private static String formatLocation(GeoPoint p) {
        if (p == null || p.getLat() == null || p.getLng() == null) return "—";
        return String.format(Locale.ROOT, "%.4f, %.4f", p.getLat(), p.getLng());
    }

    private static String costRange(Intervention iv) {
        if (iv.getMinCostEur() == null && iv.getMaxCostEur() == null) {
            return iv.getCostNote() == null ? "—" : iv.getCostNote();
        }
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
        return String.format(Locale.ROOT, "%.3f", v);
    }

    private static String bullets(List<String> items) {
        if (items == null || items.isEmpty()) return "<p>—</p>";
        StringBuilder sb = new StringBuilder("<ul>");
        for (String it : items) sb.append("<li>").append(esc(it)).append("</li>");
        return sb.append("</ul>").toString();
    }

    private static int safeSize(List<?> list) {
        return list == null ? 0 : list.size();
    }

    private static String esc(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}
