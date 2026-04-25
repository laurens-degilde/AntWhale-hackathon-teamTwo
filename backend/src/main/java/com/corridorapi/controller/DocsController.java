package com.corridorapi.controller;

import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/docs")
public class DocsController {

    @GetMapping
    public ResponseEntity<Resource> docs() {
        Resource r = new ClassPathResource("docs.json");
        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_JSON)
            .body(r);
    }
}
