package com.corridorapi.model.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class DonationRequest {
    @NotBlank
    @Size(max = 200)
    private String ngoName;

    @NotBlank
    @Email
    @Size(max = 200)
    private String contactEmail;

    @DecimalMin("1.00")
    @DecimalMax("100000.00")
    private BigDecimal amountEuros;

    @Size(max = 3)
    private String currency = "EUR";

    @Size(max = 500)
    private String message;

    private boolean anonymous;
}
