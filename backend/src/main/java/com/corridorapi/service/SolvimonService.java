package com.corridorapi.service;

import com.corridorapi.client.SolvimonMcpClient;
import com.corridorapi.config.ExternalApiConfig;
import com.corridorapi.model.request.DonationRequest;
import com.corridorapi.model.response.DonationResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Drives the Solvimon side of NGO donations. We model each donation as a
 * fresh flat pricing plan whose checkout link is opened by the donor.
 *
 * Solvimon's REST API doesn't expose a one-shot "manual invoice with
 * hosted payment URL" endpoint; the only way to obtain a hosted-pay URL
 * is via a pricing-plan-subscription checkout. That's a recurring object
 * by definition — we set the billing period to 12 months so it doesn't
 * accidentally rebill in the demo window. (Cancellation after first
 * payment is a future webhook-driven follow-up.)
 *
 * The flow runs via the Solvimon MCP server because its high-level tools
 * (create_flat_plan, create_checkout_link) wrap several otherwise
 * undocumented REST hops we'd have to re-implement.
 */
@Slf4j
@Service
public class SolvimonService {

    private final SolvimonMcpClient mcp;
    private final ExternalApiConfig.Solvimon config;

    public SolvimonService(SolvimonMcpClient mcp, ExternalApiConfig external) {
        this.mcp = mcp;
        this.config = external.getSolvimon();
    }

    public DonationResponse createDonation(DonationRequest req) {
        if (isDemoMode()) {
            return demoResponse(req);
        }

        String currency = (req.getCurrency() == null || req.getCurrency().isBlank())
            ? "EUR" : req.getCurrency();
        String amountStr = req.getAmountEuros()
            .setScale(2, RoundingMode.HALF_UP)
            .toPlainString();
        String reference = "donation-" + UUID.randomUUID().toString().substring(0, 8);
        String planName = "Donation " + currency + " " + amountStr + " — " + req.getNgoName();

        Map<String, Object> planArgs = new LinkedHashMap<>();
        planArgs.put("name", planName);
        planArgs.put("amount", Map.of("quantity", amountStr, "currency", currency));
        planArgs.put("reference", reference);
        Map<String, Object> plan = mcp.callTool("create_flat_plan", planArgs);

        Object versionId = plan.get("pricing_plan_version_id");
        if (!(versionId instanceof String pricingPlanVersionId) || pricingPlanVersionId.isBlank()) {
            throw new IllegalStateException("create_flat_plan returned no pricing_plan_version_id: " + plan);
        }

        Map<String, Object> linkArgs = new LinkedHashMap<>();
        linkArgs.put("pricing_plan_version_id", pricingPlanVersionId);
        linkArgs.put("billing_period", Map.of("type", "MONTH", "value", 12));
        linkArgs.put("expiry_days", 30);
        Map<String, Object> link = mcp.callTool("create_checkout_link", linkArgs);

        Object checkoutUrl = link.get("checkout_url");
        if (!(checkoutUrl instanceof String url) || url.isBlank()) {
            throw new IllegalStateException("create_checkout_link returned no checkout_url: " + link);
        }

        Object subscriptionId = link.get("pricing_plan_subscription_id");
        log.info("Solvimon donation prepared: reference={}, subscription_id={}, amount={} {}",
            reference, subscriptionId, amountStr, currency);

        return DonationResponse.builder()
            .invoiceId(subscriptionId instanceof String s ? s : reference)
            .invoiceNumber(reference)
            .hostedInvoiceUrl(url)
            .status("checkout_pending")
            .build();
    }

    private boolean isDemoMode() {
        return config.getApiKey() == null || config.getApiKey().isBlank();
    }

    private DonationResponse demoResponse(DonationRequest req) {
        String fakeId = "demo_" + UUID.randomUUID();
        log.warn("Solvimon demo mode (no SOLVIMON_API_KEY set). Would invoice {} {} {} for '{}'",
            req.getContactEmail(), req.getAmountEuros(), req.getCurrency(), req.getNgoName());
        return DonationResponse.builder()
            .invoiceId(fakeId)
            .invoiceNumber("DEMO-" + fakeId.substring(5, 13))
            .hostedInvoiceUrl("https://example.invalid/demo-invoice/" + fakeId)
            .status("demo")
            .build();
    }
}
