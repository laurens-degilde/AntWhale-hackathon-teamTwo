package com.corridorapi.client;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Talks to the Solvimon MCP server over Streamable HTTP (JSON-RPC 2.0).
 * Each {@link #callTool} performs a fresh handshake (initialize →
 * notifications/initialized → tools/call) which is fine for the donation
 * flow's low call volume; trade simplicity for one extra round-trip.
 */
@Slf4j
@Component
public class SolvimonMcpClient {

    private static final String PROTOCOL_VERSION = "2025-03-26";
    private static final ParameterizedTypeReference<Map<String, Object>> MAP_TYPE =
        new ParameterizedTypeReference<>() {};
    private static final TypeReference<Map<String, Object>> MAP_REF =
        new TypeReference<>() {};

    private final WebClient client;
    private final ObjectMapper mapper;
    private final AtomicLong rpcId = new AtomicLong(1);

    public SolvimonMcpClient(@Qualifier("solvimonWebClient") WebClient client,
                             ObjectMapper mapper) {
        this.client = client;
        this.mapper = mapper;
    }

    public Map<String, Object> callTool(String name, Map<String, Object> arguments) {
        String sessionId = initialize();
        sendInitializedNotification(sessionId);
        return invokeTool(sessionId, name, arguments);
    }

    private String initialize() {
        Map<String, Object> req = jsonRpc(rpcId.getAndIncrement(), "initialize", Map.of(
            "protocolVersion", PROTOCOL_VERSION,
            "capabilities", Map.of(),
            "clientInfo", Map.of("name", "corridor-api", "version", "0.1")
        ));
        var response = client.post()
            .uri("/")
            .bodyValue(req)
            .retrieve()
            .toEntity(MAP_TYPE)
            .block();
        if (response == null) {
            throw new IllegalStateException("Solvimon MCP initialize returned no response");
        }
        String sid = response.getHeaders().getFirst("Mcp-Session-Id");
        if (sid == null || sid.isBlank()) {
            throw new IllegalStateException("Solvimon MCP initialize did not return Mcp-Session-Id header");
        }
        return sid;
    }

    private void sendInitializedNotification(String sessionId) {
        Map<String, Object> notif = new LinkedHashMap<>();
        notif.put("jsonrpc", "2.0");
        notif.put("method", "notifications/initialized");
        notif.put("params", Map.of());
        client.post()
            .uri("/")
            .header("Mcp-Session-Id", sessionId)
            .bodyValue(notif)
            .retrieve()
            .toBodilessEntity()
            .block();
    }

    private Map<String, Object> invokeTool(String sessionId, String name, Map<String, Object> arguments) {
        Map<String, Object> req = jsonRpc(rpcId.getAndIncrement(), "tools/call", Map.of(
            "name", name,
            "arguments", arguments
        ));
        Map<String, Object> resp = client.post()
            .uri("/")
            .header("Mcp-Session-Id", sessionId)
            .header(HttpHeaders.ACCEPT, "application/json, text/event-stream")
            .bodyValue(req)
            .retrieve()
            .bodyToMono(MAP_TYPE)
            .block();
        if (resp == null) {
            throw new IllegalStateException("Solvimon MCP tools/call returned no body for " + name);
        }
        Object error = resp.get("error");
        if (error != null) {
            throw new IllegalStateException("Solvimon MCP error for " + name + ": " + error);
        }
        @SuppressWarnings("unchecked")
        Map<String, Object> result = (Map<String, Object>) resp.get("result");
        if (result == null) {
            throw new IllegalStateException("Solvimon MCP response missing result: " + resp);
        }
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> content = (List<Map<String, Object>>) result.get("content");
        if (content == null || content.isEmpty()) {
            throw new IllegalStateException("Solvimon MCP " + name + " returned empty content");
        }
        Object text = content.get(0).get("text");
        if (!(text instanceof String json)) {
            throw new IllegalStateException("Solvimon MCP " + name + " content[0].text not a string");
        }
        try {
            return mapper.readValue(json, MAP_REF);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to parse Solvimon MCP " + name + " payload: " + json, e);
        }
    }

    private static Map<String, Object> jsonRpc(long id, String method, Map<String, Object> params) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("jsonrpc", "2.0");
        m.put("id", id);
        m.put("method", method);
        m.put("params", params);
        return m;
    }
}
