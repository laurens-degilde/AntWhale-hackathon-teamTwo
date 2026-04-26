package com.corridorapi.model.response;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Emitted over SSE during report bundle generation.
 *
 * phase:   data_assembly | narrative_report | narrative_letters |
 *          pdf_report    | pdf_letters      | zip_assembly       |
 *          complete      | error
 * section: human-readable name of the current work unit
 * status:  running | done | error
 * index / total: populated for letter loops
 * token:   populated only on phase=complete; used to retrieve the bundle ZIP
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ProgressEvent(
        String phase,
        String section,
        String status,
        Integer index,
        Integer total,
        String token,
        String message
) {
    public static ProgressEvent running(String phase, String section) {
        return new ProgressEvent(phase, section, "running", null, null, null, null);
    }

    public static ProgressEvent done(String phase, String section) {
        return new ProgressEvent(phase, section, "done", null, null, null, null);
    }

    public static ProgressEvent letter(String section, int index, int total) {
        return new ProgressEvent("narrative_letters", section, "running", index, total, null, null);
    }

    public static ProgressEvent complete(String token) {
        return new ProgressEvent("complete", "done", "ready", null, null, token, null);
    }

    public static ProgressEvent error(String message) {
        return new ProgressEvent("error", "error", "error", null, null, null, message);
    }
}
