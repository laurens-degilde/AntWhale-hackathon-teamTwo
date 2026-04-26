package com.corridorapi.controller;

import com.corridorapi.service.DiscoveryAgentService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 *   GET  /api/discoveries        — list everything the discovery agent has surfaced.
 *   POST /api/discoveries/run    — trigger a fresh agent run on demand (returns the new full list).
 */
@RestController
@RequestMapping("/api/discoveries")
@RequiredArgsConstructor
public class DiscoveriesController {

    private final DiscoveryAgentService agent;

    @GetMapping
    public Map<String, Object> list() {
        List<Map<String, Object>> all = agent.all();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("count", all.size());
        body.put("discoveries", all);
        return body;
    }

    @PostMapping("/run")
    public Map<String, Object> runNow() {
        List<Map<String, Object>> all = agent.run();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("count", all.size());
        body.put("discoveries", all);
        return body;
    }
}
