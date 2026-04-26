package com.corridorapi.service;

import com.corridorapi.model.response.LandownerLetter;
import com.corridorapi.model.response.SubsidyHint;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Map;

/**
 * Renders one personalised landowner letter to PDF.
 *
 * Template structure (all in Dutch):
 *  - Header: date + reference
 *  - Salutation
 *  - [SLOT: OPENING]    — personalised opening paragraph
 *  - [SLOT: INTERVENTION] — proposed measure on this parcel
 *  - [SLOT: RATIONALE]  — ecological importance of this location
 *  - Subsidy table      — deterministic from LandownerLetter.applicableSubsidies
 *  - Standard close     — boilerplate contact + sign-off
 *
 * Empty narrative slots fall back to the template prose already written by
 * LandownerLetterService (letter.getBody() is used as a plain-text fallback).
 */
@Slf4j
@Service
public class LandownerLetterPdfService {

    private static final DateTimeFormatter NL_DATE =
            DateTimeFormatter.ofPattern("d MMMM yyyy", new Locale("nl", "NL"));

    public byte[] render(LandownerLetter letter, Map<String, String> narratives) {
        String html = buildHtml(letter, narratives);
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PdfRendererBuilder builder = new PdfRendererBuilder();
            builder.useFastMode();
            builder.withHtmlContent(html, null);
            builder.toStream(out);
            builder.run();
            return out.toByteArray();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to render letter PDF for parcel " + letter.getParcelId(), e);
        }
    }

    public String suggestedFilename(LandownerLetter letter) {
        return "letter-" + letter.getParcelId().replaceAll("[^a-zA-Z0-9_-]", "_") + ".pdf";
    }

    // ── HTML builder ──────────────────────────────────────────────────────────

    private String buildHtml(LandownerLetter letter, Map<String, String> narratives) {
        String dateStr = LocalDate.now().format(NL_DATE);
        String opening      = slot(narratives, "OPENING",      letter.getBody());
        String intervention = slot(narratives, "INTERVENTION", "");
        String rationale    = slot(narratives, "RATIONALE",    "");

        StringBuilder sb = new StringBuilder(4 * 1024);
        sb.append("""
            <!DOCTYPE html>
            <html lang="nl">
            <head><meta charset="UTF-8"/>
            <title>Brief aan perceeleigenaar</title>
            <style>
              @page { size: A4; margin: 25mm 20mm 25mm 20mm; }
              * { box-sizing: border-box; }
              body { font-family: 'Helvetica','Arial',sans-serif; font-size: 10.5pt; line-height: 1.55; color: #1a1a1a; }
              .header { margin-bottom: 10mm; }
              .org-name { font-size: 13pt; font-weight: 700; color: #1a3a10; margin-bottom: 1mm; }
              .org-sub  { font-size: 9pt; color: #555; }
              .meta-table { width: 100%; margin: 6mm 0; font-size: 9.5pt; }
              .meta-table td { padding: 1mm 2mm; vertical-align: top; }
              .meta-table .label { color: #666; width: 35%; }
              .ref-box { border-left: 3px solid #2E6028; padding: 2mm 4mm; margin: 5mm 0; background: #f6faf5; font-size: 9.5pt; }
              p { margin: 0 0 4mm; }
              .subject { font-weight: 700; font-size: 11pt; margin: 6mm 0 4mm; }
              table.subsidies { width: 100%; border-collapse: collapse; margin: 4mm 0; font-size: 9.5pt; }
              table.subsidies th, table.subsidies td { border: 1px solid #d0d0d0; padding: 2mm 3mm; vertical-align: top; }
              table.subsidies th { background: #f0f7ee; color: #1a3a10; text-align: left; }
              .close { margin-top: 10mm; }
              .sig-line { margin-top: 14mm; border-top: 1px solid #aaa; padding-top: 2mm; font-size: 9.5pt; color: #444; }
              .footer { margin-top: 12mm; font-size: 8.5pt; color: #888; border-top: 1px solid #e0e0e0; padding-top: 2mm; }
            </style>
            </head>
            <body>
            """);

        // Header
        sb.append("<div class=\"header\">");
        sb.append("<div class=\"org-name\">Provincie — Coördinatie Natuur &amp; Landschap</div>");
        sb.append("<div class=\"org-sub\">Programma Natuur Netwerk Nederland</div>");
        sb.append("</div>");

        // Meta table
        sb.append("<table class=\"meta-table\"><tbody>");
        sb.append(metaRow("Datum", esc(dateStr)));
        sb.append(metaRow("Kenmerk", "NNN-" + esc(letter.getParcelId())));
        sb.append(metaRow("Betreft perceel", esc(letter.getParcelId()) + ", gemeente " + esc(letter.getMunicipality())));
        sb.append(metaRow("Eigenaar", esc(letter.getOwnerName() != null ? letter.getOwnerName() : "Perceeleigenaar")));
        sb.append("</tbody></table>");

        // Salutation
        String salutation = letter.getOwnerName() != null && !letter.getOwnerName().isBlank()
                ? "Geachte " + esc(letter.getOwnerName()) + ","
                : "Geachte perceeleigenaar,";
        sb.append("<p class=\"subject\">Betreft: ecologische verbindingszone — perceel ")
          .append(esc(letter.getParcelId())).append("</p>");
        sb.append("<p>").append(esc(salutation)).append("</p>");

        // Narrative slots
        appendParagraph(sb, opening);
        appendParagraph(sb, intervention);
        appendParagraph(sb, rationale);

        // Subsidy table
        if (letter.getApplicableSubsidies() != null && !letter.getApplicableSubsidies().isEmpty()) {
            sb.append("<p>De volgende subsidieregelingen zijn naar verwachting van toepassing op deze maatregel:</p>");
            sb.append("<table class=\"subsidies\"><thead><tr>")
              .append("<th>Regeling</th><th>Omschrijving</th><th>Geschat bedrag (per jaar)</th><th>Meer informatie</th>")
              .append("</tr></thead><tbody>");
            for (SubsidyHint h : letter.getApplicableSubsidies()) {
                sb.append("<tr>")
                  .append("<td>").append(esc(h.getDisplayName())).append("</td>")
                  .append("<td>").append(esc(h.getSummary())).append("</td>")
                  .append("<td>€ ").append(String.format(Locale.ROOT, "%,.0f", h.getEstimatedAnnualEur())).append("</td>")
                  .append("<td>").append(h.getUrl() != null ? esc(h.getUrl()) : "—").append("</td>")
                  .append("</tr>");
            }
            sb.append("</tbody></table>");
        }

        // Closing
        sb.append("<div class=\"close\">");
        sb.append("<p>Wij hopen u hiermee voldoende te hebben geïnformeerd en kijken uit naar een constructief overleg. ")
          .append("Voor vragen kunt u contact opnemen met onze coördinator.</p>");
        sb.append("<p>Met vriendelijke groet,</p>");
        sb.append("<div class=\"sig-line\">")
          .append(esc(letter.getContactPersonRole() != null ? letter.getContactPersonRole() : "Provinciale Coördinator NNN"))
          .append("<br/>Provincie — Programma Natuur Netwerk Nederland")
          .append("</div>");
        sb.append("</div>");

        sb.append("<div class=\"footer\">Dit is een geautomatiseerd gegenereerde concept-brief op basis van GIS-analyse. ")
          .append("Alle getallen zijn ramingen; definitieve bedragen worden vastgesteld na technisch onderzoek.</div>");

        sb.append("</body></html>");
        return sb.toString();
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private static String slot(Map<String, String> narratives, String key, String fallback) {
        if (narratives == null) return fallback;
        String v = narratives.get(key);
        return (v != null && !v.isBlank()) ? v : fallback;
    }

    private static void appendParagraph(StringBuilder sb, String text) {
        if (text == null || text.isBlank()) return;
        // Split on double newlines to preserve paragraph structure from Claude output
        for (String part : text.split("\n\n+")) {
            String trimmed = part.trim();
            if (!trimmed.isEmpty()) {
                sb.append("<p>").append(esc(trimmed)).append("</p>");
            }
        }
    }

    private static String metaRow(String label, String value) {
        return "<tr><td class=\"label\">" + esc(label) + "</td><td>" + value + "</td></tr>";
    }

    private static String esc(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}
