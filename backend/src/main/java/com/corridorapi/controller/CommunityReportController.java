package com.corridorapi.controller;

import com.corridorapi.model.request.CommunityReportRequest;
import com.corridorapi.model.response.CommunityReportResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;

@RestController
@RequestMapping("/api/community-reports")
public class CommunityReportController {

    private final List<CommunityReportRequest> store = new CopyOnWriteArrayList<>();

    @PostMapping
    public CommunityReportResponse submit(@Valid @RequestBody CommunityReportRequest body) {
        store.add(body);
        return new CommunityReportResponse(UUID.randomUUID().toString(), "accepted");
    }

    @GetMapping
    public List<CommunityReportRequest> list() {
        return new ArrayList<>(store);
    }
}
