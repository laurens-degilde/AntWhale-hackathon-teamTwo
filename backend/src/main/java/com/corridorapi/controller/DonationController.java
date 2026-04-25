package com.corridorapi.controller;

import com.corridorapi.model.request.DonationRequest;
import com.corridorapi.model.response.DonationResponse;
import com.corridorapi.service.SolvimonService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/donations")
@RequiredArgsConstructor
public class DonationController {

    private final SolvimonService solvimonService;

    @PostMapping
    public DonationResponse create(@Valid @RequestBody DonationRequest body) {
        return solvimonService.createDonation(body);
    }
}
