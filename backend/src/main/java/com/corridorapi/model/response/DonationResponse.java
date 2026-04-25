package com.corridorapi.model.response;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class DonationResponse {
    String invoiceId;
    String invoiceNumber;
    String hostedInvoiceUrl;
    String status;
}
