package com.corridorapi.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.w3c.dom.Document;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;

import javax.xml.parsers.DocumentBuilderFactory;
import java.io.StringReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Periodic agent: pulls a curated allowlist of legal-to-consume RSS feeds (NL/EU
 * conservation NGOs + government press) and asks OpenAI to extract any items
 * relevant to wildlife corridors — new roadkill clusters, infrastructure
 * announcements, policy changes. Discoveries that aren't already known get
 * appended to discoveries.json.
 *
 * Each persisted entry includes the source URL so the user can verify (the only
 * defense against LLM hallucination at this scale). RSS feeds are explicitly
 * published for syndication — no robots.txt or ToS issues.
 */
@Slf4j
@Service
public class DiscoveryAgentService {

    /**
     * Allowlist — RSS / Atom feeds that are explicitly published for consumption.
     * Verified working as of 2026-04-26. If a feed disappears, the agent logs a
     * warning and moves on; replace the URL here.
     */
    private static final List<Feed> FEEDS = List.of(
        new Feed("nu.nl Algemeen",    "https://www.nu.nl/rss/Algemeen"),
        new Feed("NOS Algemeen",      "https://feeds.nos.nl/nosnieuwsalgemeen"),
        new Feed("BIJ12 (interprovincial nature org)",
                                       "https://www.bij12.nl/feed/"),
        new Feed("Wikipedia (NL ecology recent changes)",
                                       "https://nl.wikipedia.org/w/api.php?action=feedrecentchanges&format=atom&namespace=0&tagfilter=ecologie")
    );

    private record Feed(String name, String url) {}

    @Value("${agent.openai.api-key:}")
    private String openAiKey;

    @Value("${agent.openai.model:gpt-4o-mini}")
    private String openAiModel;

    @Value("${agent.discoveries-file:discoveries.json}")
    private String outputFile;

    @Value("${agent.run-on-startup:false}")
    private boolean runOnStartup;

    @Value("${agent.max-items-per-feed:10}")
    private int maxItemsPerFeed;

    private final HttpClient http = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(15))
        .followRedirects(HttpClient.Redirect.NORMAL)  // RSS feeds frequently 301 to a new path
        .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @EventListener(ApplicationReadyEvent.class)
    @Async
    public void runAtStartup() {
        if (!runOnStartup) return;
        log.info("Discovery agent: triggering startup run.");
        run();
    }

    /** Daily 03:00 by default; configurable via `agent.schedule-cron`. */
    @Scheduled(cron = "${agent.schedule-cron:0 0 3 * * *}")
    public void scheduledRun() {
        log.info("Discovery agent: scheduled run starting.");
        run();
    }

    public synchronized List<Map<String, Object>> run() {
        if (openAiKey == null || openAiKey.isBlank()) {
            log.warn("Discovery agent: OPENAI_API_KEY not set — skipping. Set agent.openai.api-key to enable.");
            return List.of();
        }

        Path persistPath = Paths.get(outputFile).toAbsolutePath();
        List<Map<String, Object>> existing = readExisting(persistPath);
        Set<String> seenUrls = new java.util.HashSet<>();
        for (Map<String, Object> e : existing) {
            Object url = e.get("sourceUrl");
            if (url != null) seenUrls.add(url.toString());
        }
        log.info("Discovery agent: {} known discoveries; checking {} feeds.", existing.size(), FEEDS.size());

        int newCount = 0;
        for (Feed feed : FEEDS) {
            try {
                List<RssItem> items = fetchFeed(feed.url());
                int processed = 0;
                for (RssItem item : items) {
                    if (processed >= maxItemsPerFeed) break;
                    if (seenUrls.contains(item.link)) continue; // already processed in a prior run
                    Map<String, Object> extracted = extractWithOpenAi(feed.name(), item);
                    if (extracted != null) {
                        extracted.put("discoveredAt", Instant.now().toString());
                        existing.add(extracted);
                        seenUrls.add(item.link);
                        newCount++;
                        log.info("Discovery agent: NEW [{}] {}", extracted.get("type"), extracted.get("title"));
                    }
                    processed++;
                }
            } catch (Exception ex) {
                log.warn("Discovery agent: feed '{}' failed: {}", feed.name(), ex.getMessage());
            }
        }

        writeJson(persistPath, existing);
        log.info("Discovery agent: run complete — {} new discoveries persisted to {}.",
            newCount, persistPath);
        return existing;
    }

    public List<Map<String, Object>> all() {
        return readExisting(Paths.get(outputFile).toAbsolutePath());
    }

    // ── RSS / Atom fetch + parse ─────────────────────────────────────────────

    private record RssItem(String title, String link, String description, String pubDate) {}

    private List<RssItem> fetchFeed(String url) throws Exception {
        HttpRequest req = HttpRequest.newBuilder(URI.create(url))
            .header("User-Agent", "AntWhale-discovery-agent/1.0 (conservation research)")
            .timeout(Duration.ofSeconds(30))
            .GET()
            .build();
        HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
        if (resp.statusCode() != 200) {
            throw new RuntimeException("HTTP " + resp.statusCode());
        }
        return parseRss(resp.body());
    }

    private List<RssItem> parseRss(String xml) throws Exception {
        Document doc = DocumentBuilderFactory.newInstance().newDocumentBuilder()
            .parse(new InputSource(new StringReader(xml)));
        List<RssItem> out = new ArrayList<>();

        // RSS 2.0 → channel/item
        NodeList items = doc.getElementsByTagName("item");
        for (int i = 0; i < items.getLength(); i++) {
            out.add(new RssItem(
                getText(items.item(i), "title"),
                getText(items.item(i), "link"),
                getText(items.item(i), "description"),
                getText(items.item(i), "pubDate")));
        }
        if (!out.isEmpty()) return out;

        // Atom → entry
        NodeList entries = doc.getElementsByTagName("entry");
        for (int i = 0; i < entries.getLength(); i++) {
            Node entry = entries.item(i);
            String link = "";
            // Atom <link href="..."/>
            NodeList linkNodes = entry.getChildNodes();
            for (int j = 0; j < linkNodes.getLength(); j++) {
                Node n = linkNodes.item(j);
                if ("link".equals(n.getNodeName()) && n.hasAttributes()
                    && n.getAttributes().getNamedItem("href") != null) {
                    link = n.getAttributes().getNamedItem("href").getNodeValue();
                    break;
                }
            }
            out.add(new RssItem(
                getText(entry, "title"),
                link,
                getText(entry, "summary"),
                getText(entry, "updated")));
        }
        return out;
    }

    private static String getText(Node parent, String tag) {
        if (parent == null) return "";
        NodeList kids = parent.getChildNodes();
        for (int i = 0; i < kids.getLength(); i++) {
            Node n = kids.item(i);
            if (tag.equals(n.getNodeName())) {
                String s = n.getTextContent();
                return s == null ? "" : s.trim();
            }
        }
        return "";
    }

    // ── OpenAI structured extraction ─────────────────────────────────────────

    /**
     * Ask gpt-4o-mini to decide if this item is relevant + return structured JSON if yes.
     * Returns null if irrelevant. Schema: {type, title, location, date, description, sourceUrl}.
     * type ∈ {roadkill, infrastructure, policy, restoration, other_relevant}.
     */
    private Map<String, Object> extractWithOpenAi(String feedName, RssItem item) {
        String prompt = """
                You are an assistant filtering news items for a wildlife-corridor planning tool.
                Decide if THIS item is relevant to: animal roadkill incidents, new road/highway/railway construction,
                wildlife crossings (ecoducts/underpasses) being built or removed, policy changes affecting habitat
                connectivity in the Netherlands or Europe, or major habitat-restoration announcements.

                If NOT relevant, output exactly: {"relevant": false}
                If relevant, output JSON with:
                  - relevant: true
                  - type: one of "roadkill", "infrastructure", "policy", "restoration", "other_relevant"
                  - title: a short headline (max 12 words)
                  - location: where it happened (city/region/road name; "" if not stated)
                  - date: ISO date if mentioned, else ""
                  - description: 1-2 factual sentences
                  - sourceUrl: %s
                  - sourceFeed: %s

                Output ONLY the JSON object. No prose, no markdown.

                Article title: %s
                Article body: %s
                """.formatted(safe(item.link), safe(feedName), safe(item.title), safe(item.description));

        try {
            Map<String, Object> body = Map.of(
                "model", openAiModel,
                "messages", List.of(Map.of("role", "user", "content", prompt)),
                "response_format", Map.of("type", "json_object"),
                "temperature", 0
            );
            String json = objectMapper.writeValueAsString(body);
            HttpRequest req = HttpRequest.newBuilder(URI.create("https://api.openai.com/v1/chat/completions"))
                .header("Authorization", "Bearer " + openAiKey)
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(45))
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();
            HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() != 200) {
                log.warn("OpenAI returned {}: {}", resp.statusCode(),
                    resp.body().length() > 300 ? resp.body().substring(0, 300) : resp.body());
                return null;
            }
            Map<String, Object> root = objectMapper.readValue(resp.body(), new TypeReference<>() {});
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> choices = (List<Map<String, Object>>) root.get("choices");
            if (choices == null || choices.isEmpty()) return null;
            @SuppressWarnings("unchecked")
            Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
            String content = message == null ? "" : String.valueOf(message.get("content"));
            Map<String, Object> extracted = objectMapper.readValue(content, new TypeReference<>() {});
            Object relevant = extracted.get("relevant");
            if (Boolean.TRUE.equals(relevant)) {
                extracted.remove("relevant");
                if (!extracted.containsKey("sourceUrl")) extracted.put("sourceUrl", item.link);
                if (!extracted.containsKey("sourceFeed")) extracted.put("sourceFeed", feedName);
                return extracted;
            }
            return null;
        } catch (Exception ex) {
            log.warn("OpenAI extraction failed for '{}': {}", item.title, ex.getMessage());
            return null;
        }
    }

    // ── persistence ──────────────────────────────────────────────────────────

    private List<Map<String, Object>> readExisting(Path path) {
        if (!Files.exists(path)) return new ArrayList<>();
        try {
            String json = Files.readString(path);
            if (json.isBlank()) return new ArrayList<>();
            Map<String, Object> root = objectMapper.readValue(json, new TypeReference<>() {});
            Object raw = root.get("discoveries");
            if (raw instanceof List<?> list) {
                return objectMapper.convertValue(list, new TypeReference<List<Map<String, Object>>>() {});
            }
            return new ArrayList<>();
        } catch (Exception ex) {
            log.warn("Failed to read {}: {}", path, ex.getMessage());
            return new ArrayList<>();
        }
    }

    private void writeJson(Path path, List<Map<String, Object>> discoveries) {
        try {
            Map<String, Object> root = new LinkedHashMap<>();
            root.put("generated", Instant.now().toString());
            root.put("count", discoveries.size());
            root.put("discoveries", discoveries);
            ObjectMapper indent = objectMapper.copy().enable(SerializationFeature.INDENT_OUTPUT);
            Files.writeString(path, indent.writeValueAsString(root));
        } catch (Exception ex) {
            log.warn("Failed to write {}: {}", path, ex.getMessage());
        }
    }

    private static String safe(String s) {
        if (s == null) return "";
        // strip HTML tags + collapse whitespace; keep prompt token-light.
        String stripped = s.replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ").trim();
        return stripped.length() > 1500 ? stripped.substring(0, 1500) : stripped;
    }
}
