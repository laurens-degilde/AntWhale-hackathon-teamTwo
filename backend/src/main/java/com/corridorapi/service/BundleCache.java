package com.corridorapi.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory store for completed report bundles (ZIP bytes).
 *
 * Each bundle is keyed by a random UUID token returned in the SSE "complete"
 * event. The frontend exchanges this token for the ZIP download.
 *
 * TTL is configurable (default 15 minutes). A scheduled task cleans up
 * expired entries every 5 minutes to prevent memory leaks during long demos.
 */
@Slf4j
@Component
public class BundleCache {

    @Value("${bundle.cache.ttl-seconds:900}")
    private long ttlSeconds;

    private record Entry(byte[] data, String filename, Instant expiry) {}

    private final ConcurrentHashMap<String, Entry> cache = new ConcurrentHashMap<>();

    /** Store a bundle and return its download token. */
    public String store(byte[] data, String filename) {
        String token = UUID.randomUUID().toString();
        cache.put(token, new Entry(data, filename, Instant.now().plusSeconds(ttlSeconds)));
        log.info("Bundle stored: token={} size={}KB filename={}", token, data.length / 1024, filename);
        return token;
    }

    /** Retrieve a bundle by token. Returns empty if expired or not found. */
    public Optional<Entry> retrieve(String token) {
        Entry e = cache.get(token);
        if (e == null) return Optional.empty();
        if (Instant.now().isAfter(e.expiry())) {
            cache.remove(token);
            return Optional.empty();
        }
        return Optional.of(e);
    }

    public Optional<byte[]> retrieveData(String token) {
        return retrieve(token).map(Entry::data);
    }

    public Optional<String> retrieveFilename(String token) {
        return retrieve(token).map(Entry::filename);
    }

    @Scheduled(fixedDelay = 300_000) // every 5 minutes
    public void cleanup() {
        Instant now = Instant.now();
        int removed = 0;
        var it = cache.entrySet().iterator();
        while (it.hasNext()) {
            if (now.isAfter(it.next().getValue().expiry())) {
                it.remove();
                removed++;
            }
        }
        if (removed > 0) log.info("Bundle cache cleanup: removed {} expired entries", removed);
    }
}
