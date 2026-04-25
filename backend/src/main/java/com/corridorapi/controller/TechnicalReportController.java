package com.corridorapi.controller;

import com.corridorapi.enums.SpeciesType;
import com.corridorapi.model.response.TechnicalReport;
import com.corridorapi.service.TechnicalReportPdfService;
import com.corridorapi.service.TechnicalReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/outputs/technical-report")
@RequiredArgsConstructor
public class TechnicalReportController {

    private final TechnicalReportService service;
    private final TechnicalReportPdfService pdfService;

    @GetMapping
    public TechnicalReport get(
            @RequestParam String species,
            @RequestParam String bbox) {
        SpeciesType s = SpeciesType.fromKey(species);
        double[] b = LandCoverController.parseBbox(bbox);
        return service.build(s, b);
    }

    @GetMapping("/pdf")
    public ResponseEntity<byte[]> pdf(
            @RequestParam String species,
            @RequestParam String bbox,
            @RequestParam(defaultValue = "attachment") String disposition) {
        SpeciesType s = SpeciesType.fromKey(species);
        double[] b = LandCoverController.parseBbox(bbox);
        TechnicalReport report = service.build(s, b);
        byte[] body = pdfService.render(report);
        ContentDisposition cd = ContentDisposition
            .builder("inline".equalsIgnoreCase(disposition) ? "inline" : "attachment")
            .filename(pdfService.suggestedFilename(report))
            .build();
        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_PDF)
            .header(HttpHeaders.CONTENT_DISPOSITION, cd.toString())
            .body(body);
    }
}
