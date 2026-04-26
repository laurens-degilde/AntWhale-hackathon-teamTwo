package com.corridorapi.service;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.models.messages.ContentBlock;
import com.anthropic.models.messages.Message;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.Model;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.stream.Collectors;

/**
 * Single façade over the Anthropic Java SDK.
 * All other services call only this class — the SDK never leaks into domain code.
 *
 * Contract:
 *  - Every call is synchronous and blocking (called from a virtual thread via the
 *    SSE controller, so no reactive context needed).
 *  - On any failure the method logs and returns an empty string; callers must
 *    handle empty strings gracefully (use placeholder text).
 *  - Claude is instructed via the system prompt; user prompt carries data context.
 */
@Slf4j
@Service
public class AnthropicService {

    @Value("${anthropic.api.key:}")
    private String apiKey;

    @Value("${anthropic.model:claude-sonnet-4-6}")
    private String modelId;

    @Value("${anthropic.narrative.max-tokens:512}")
    private int defaultMaxTokens;

    private AnthropicClient client;

    @PostConstruct
    void init() {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("ANTHROPIC_API_KEY is not set — narrative generation will return placeholder text");
            return;
        }
        client = AnthropicOkHttpClient.builder()
                .apiKey(apiKey)
                .build();
        log.info("Anthropic client initialised with model={}", modelId);
    }

    /**
     * Generate a block of prose for a narrative slot.
     *
     * @param systemPrompt style guide + role + constraints
     * @param userPrompt   section-specific task + JSON data context
     * @param maxTokens    hard ceiling; keep tight per slot to control cost + latency
     * @return prose string, or empty string on failure / missing key
     */
    public String generateText(String systemPrompt, String userPrompt, int maxTokens) {
        if (client == null) {
            log.debug("Anthropic client not available; returning empty narrative");
            return "";
        }
        try {
            Message response = client.messages().create(
                    MessageCreateParams.builder()
                            .model(Model.of(modelId))
                            .maxTokens((long) maxTokens)
                            .system(systemPrompt)
                            .addUserMessage(userPrompt)
                            .build()
            );
            return response.content().stream()
                    .filter(ContentBlock::isText)
                    .map(b -> b.asText().text())
                    .collect(Collectors.joining(" "))
                    .trim();
        } catch (Exception e) {
            log.error("Claude generation failed: {}", e.getMessage());
            return "";
        }
    }

    /** Convenience overload using the configured default token limit. */
    public String generateText(String systemPrompt, String userPrompt) {
        return generateText(systemPrompt, userPrompt, defaultMaxTokens);
    }
}
