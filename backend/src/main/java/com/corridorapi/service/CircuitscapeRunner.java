package com.corridorapi.service;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.ReentrantLock;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Java↔Julia bridge for Circuitscape, served by a long-lived Julia daemon to amortise
 * the ~3–5s Julia startup tax across many requests.
 *
 * Daemon protocol (line-oriented over stdin/stdout):
 *   1. Java spawns one `julia daemon.jl` process at server boot.
 *   2. Daemon emits `__READY__` after `using Circuitscape` finishes precompiling.
 *   3. Each Java request writes one line: the absolute path to a Circuitscape `.ini`.
 *      Daemon runs `Circuitscape.compute(path)`, then prints `__DONE__:OK` (success)
 *      or `__DONE__:ERR:<message>` (failure). Both are followed by `flush(stdout)`.
 *   4. Java reads stdout line-by-line, skipping Circuitscape's own progress output,
 *      until it finds the sentinel.
 *   5. A `ReentrantLock` serialises concurrent Java requests onto the single daemon.
 *
 * On daemon crash (`readLine()` returns null) Java marks it dead and the next
 * request transparently respawns.
 *
 * Pairwise mode reference: McRae et al. 2008, Ecology 89:2712-24.
 */
@Slf4j
@Service
public class CircuitscapeRunner {

    @Value("${circuitscape.julia-bin:julia}")
    private String juliaBin;

    @Value("${circuitscape.timeout-seconds:300}")
    private int timeoutSeconds;

    @Value("${circuitscape.cell-size-m:100}")
    private int cellSizeMeters;

    @Value("${circuitscape.startup-seconds:120}")
    private int startupSeconds;

    private static final double BARRIER_THRESHOLD = 1e6;
    private static final int NODATA_INT = -9999;

    private static final String READY_TOKEN = "__READY__";
    private static final String DONE_OK = "__DONE__:OK";
    private static final String DONE_ERR_PREFIX = "__DONE__:ERR:";

    public record FocalNode(String patchId, int x, int y) {}

    public record Result(
            int width,
            int height,
            double[][] currentDensity,
            double meanCurrentDensity,
            double maxCurrentDensity) {}

    private final ReentrantLock daemonLock = new ReentrantLock();
    private Process daemon;
    private BufferedReader daemonStdout;
    private Writer daemonStdin;
    private Path daemonScript;

    @PostConstruct
    void startDaemon() {
        try {
            ensureDaemonAlive();
        } catch (Exception e) {
            log.warn("Circuitscape daemon failed to start at boot ({}). " +
                "First Circuitscape call will retry.", e.getMessage());
            if (e instanceof InterruptedException) Thread.currentThread().interrupt();
        }
    }

    @PreDestroy
    void stopDaemon() {
        Process p = daemon;
        if (p == null) return;
        try {
            if (daemonStdin != null) {
                try { daemonStdin.close(); } catch (IOException ignored) {}
            }
            if (!p.waitFor(5, TimeUnit.SECONDS)) p.destroyForcibly();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            p.destroyForcibly();
        }
    }

    /** Boot or reboot the Julia daemon. Caller must NOT hold daemonLock while waiting on startup. */
    private void ensureDaemonAlive() throws IOException, InterruptedException {
        if (daemon != null && daemon.isAlive()) return;
        if (daemonScript == null) daemonScript = writeDaemonScript();

        log.info("Starting Circuitscape daemon: {} {}", juliaBin, daemonScript);
        // redirectErrorStream(true) merges stderr into stdout so we see Circuitscape's progress output
        // on the same channel we read sentinels from.
        Process p = new ProcessBuilder(juliaBin, daemonScript.toString())
            .redirectErrorStream(true)
            .start();
        BufferedReader stdout = new BufferedReader(new InputStreamReader(p.getInputStream(), StandardCharsets.UTF_8));
        Writer stdin = new BufferedWriter(new OutputStreamWriter(p.getOutputStream(), StandardCharsets.UTF_8));

        // Wait for __READY__. First-ever boot includes Julia's package precompile; subsequent boots are quicker.
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(startupSeconds);
        String line;
        while ((line = stdout.readLine()) != null) {
            log.debug("circuitscape daemon: {}", line);
            if (line.equals(READY_TOKEN)) {
                this.daemon = p;
                this.daemonStdout = stdout;
                this.daemonStdin = stdin;
                log.info("Circuitscape daemon ready.");
                return;
            }
            if (System.nanoTime() > deadline) {
                p.destroyForcibly();
                throw new IOException("Circuitscape daemon did not become ready within " + startupSeconds + "s");
            }
        }
        // EOF before READY_TOKEN — Julia died during boot
        p.destroyForcibly();
        throw new IOException("Circuitscape daemon exited before ready (Julia or Circuitscape.jl install issue?)");
    }

    public Result run(double[][] resistance, List<FocalNode> focals) throws IOException, InterruptedException {
        if (focals.size() < 2) {
            throw new IllegalArgumentException("Need at least 2 focal nodes; got " + focals.size());
        }
        int height = resistance.length;
        int width = resistance[0].length;

        Path tmp = Files.createTempDirectory("circuitscape-");
        log.debug("Circuitscape work dir: {}", tmp);

        Path resPath = tmp.resolve("resistance.asc");
        writeResistance(resPath, resistance, width, height);

        Path focalPath = tmp.resolve("focal_nodes.asc");
        writeFocalNodes(focalPath, focals, width, height);

        Path outBase = tmp.resolve("out");
        Path iniPath = tmp.resolve("config.ini");
        writeIni(iniPath, resPath, focalPath, outBase);

        daemonLock.lock();
        try {
            ensureDaemonAlive();
            // Send the job
            daemonStdin.write(iniPath.toAbsolutePath() + "\n");
            daemonStdin.flush();

            // Drain stdout until we see our sentinel
            long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(timeoutSeconds);
            String line;
            while ((line = daemonStdout.readLine()) != null) {
                log.debug("circuitscape: {}", line);
                if (line.equals(DONE_OK)) break;
                if (line.startsWith(DONE_ERR_PREFIX)) {
                    throw new IOException("Circuitscape failed: " + line.substring(DONE_ERR_PREFIX.length()));
                }
                if (System.nanoTime() > deadline) {
                    log.warn("Circuitscape exceeded {}s; killing daemon to recover.", timeoutSeconds);
                    daemon.destroyForcibly();
                    daemon = null;
                    throw new IOException("Circuitscape timed out after " + timeoutSeconds + "s");
                }
            }
            if (line == null) {
                // Daemon died mid-request
                daemon = null;
                throw new IOException("Circuitscape daemon exited unexpectedly");
            }
        } finally {
            daemonLock.unlock();
        }

        Path curmap = tmp.resolve("out_cum_curmap.asc");
        if (!Files.exists(curmap)) {
            throw new IOException("Circuitscape did not produce " + curmap);
        }
        double[][] grid = readAsciiGrid(curmap, width, height);

        double sum = 0;
        double max = 0;
        int n = 0;
        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                double v = grid[y][x];
                if (Double.isFinite(v) && v >= 0) {
                    sum += v;
                    if (v > max) max = v;
                    n++;
                }
            }
        }
        return new Result(width, height, grid, n > 0 ? sum / n : 0, max);
    }

    private static Path writeDaemonScript() throws IOException {
        // Embedded so deployment is one .jar — no separate resource to ship.
        // Reads .ini paths line-by-line from stdin; emits __READY__ once and
        // __DONE__:OK / __DONE__:ERR:<msg> after every solve. flush(stdout) is mandatory:
        // Julia's stdout is block-buffered when piped, and Java would otherwise block forever.
        String script = """
                using Circuitscape

                println("__READY__")
                flush(stdout)

                while !eof(stdin)
                    line = readline(stdin)
                    path = strip(line)
                    if isempty(path)
                        continue
                    end
                    try
                        Circuitscape.compute(String(path))
                        println("__DONE__:OK")
                    catch e
                        msg = sprint(showerror, e)
                        # The line-based protocol can't handle embedded newlines
                        msg = replace(msg, '\\n' => ' ')
                        println("__DONE__:ERR:", msg)
                    end
                    flush(stdout)
                end
                """;
        Path f = Files.createTempFile("circuitscape-daemon-", ".jl");
        Files.writeString(f, script, StandardCharsets.UTF_8);
        f.toFile().deleteOnExit();
        return f;
    }

    private void writeResistance(Path file, double[][] grid, int width, int height) throws IOException {
        try (BufferedWriter w = Files.newBufferedWriter(file, StandardCharsets.UTF_8)) {
            writeHeader(w, width, height);
            StringBuilder row = new StringBuilder();
            for (int y = 0; y < height; y++) {
                row.setLength(0);
                for (int x = 0; x < width; x++) {
                    double v = grid[y][x];
                    if (!Double.isFinite(v) || v >= BARRIER_THRESHOLD) {
                        row.append(NODATA_INT);
                    } else {
                        row.append(formatNumber(Math.max(1.0, v)));
                    }
                    if (x < width - 1) row.append(' ');
                }
                row.append('\n');
                w.write(row.toString());
            }
        }
    }

    /**
     * Focal nodes as a raster: each focal-node pixel carries its integer ID (1..N),
     * everything else is NoData. Circuitscape pairwise mode uses every pair of
     * non-NoData pixels as a source/ground pair.
     */
    private void writeFocalNodes(Path file, List<FocalNode> focals, int width, int height) throws IOException {
        int[][] mask = new int[height][width];
        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) mask[y][x] = NODATA_INT;
        }
        for (int i = 0; i < focals.size(); i++) {
            FocalNode f = focals.get(i);
            int id = i + 1;
            if (f.x() >= 0 && f.x() < width && f.y() >= 0 && f.y() < height) {
                mask[f.y()][f.x()] = id;
            }
        }
        try (BufferedWriter w = Files.newBufferedWriter(file, StandardCharsets.UTF_8)) {
            writeHeader(w, width, height);
            StringBuilder row = new StringBuilder();
            for (int y = 0; y < height; y++) {
                row.setLength(0);
                for (int x = 0; x < width; x++) {
                    row.append(mask[y][x]);
                    if (x < width - 1) row.append(' ');
                }
                row.append('\n');
                w.write(row.toString());
            }
        }
    }

    private void writeHeader(BufferedWriter w, int width, int height) throws IOException {
        w.write("ncols " + width + "\n");
        w.write("nrows " + height + "\n");
        w.write("xllcorner 0\n");
        w.write("yllcorner 0\n");
        w.write("cellsize " + cellSizeMeters + "\n");
        w.write("NODATA_value " + NODATA_INT + "\n");
    }

    private void writeIni(Path file, Path resistance, Path focals, Path outBase) throws IOException {
        String ini = """
                [Circuitscape Mode]
                data_type = raster
                scenario = pairwise

                [Habitat raster or graph]
                habitat_file = %s
                habitat_map_is_resistances = True

                [Options for pairwise and one-to-all and all-to-one modes]
                point_file = %s
                use_included_pairs = False

                [Calculation options]
                solver = cg+amg
                low_memory_mode = False
                print_timings = False

                [Output options]
                output_file = %s
                write_cur_maps = True
                write_cum_cur_map_only = True
                write_volt_maps = False
                set_focal_node_currents_to_zero = True
                compress_grids = False
                log_transform_maps = False

                [Connection scheme for raster habitat data]
                connect_four_neighbors_only = False
                connect_using_avg_resistances = True

                [Short circuit regions (aka polygons)]
                use_polygons = False

                [Mask file]
                use_mask = False

                [Options for one-to-all and all-to-one modes]
                use_variable_source_strengths = False

                [Version]
                version = 5.0
                """.formatted(
                resistance.toAbsolutePath(),
                focals.toAbsolutePath(),
                outBase.toAbsolutePath());
        Files.writeString(file, ini, StandardCharsets.UTF_8);
    }

    private static double[][] readAsciiGrid(Path file, int expectedWidth, int expectedHeight) throws IOException {
        List<String> lines = Files.readAllLines(file, StandardCharsets.UTF_8);
        int ncols = expectedWidth;
        int nrows = expectedHeight;
        double nodata = NODATA_INT;
        int dataStart = 0;
        Pattern hdr = Pattern.compile("^([A-Za-z_]+)\\s+(\\S+)\\s*$");
        for (int i = 0; i < lines.size(); i++) {
            Matcher m = hdr.matcher(lines.get(i).trim());
            if (!m.matches()) {
                dataStart = i;
                break;
            }
            String key = m.group(1).toLowerCase();
            String val = m.group(2);
            switch (key) {
                case "ncols" -> ncols = Integer.parseInt(val);
                case "nrows" -> nrows = Integer.parseInt(val);
                case "nodata_value" -> nodata = Double.parseDouble(val);
                default -> { /* ignore */ }
            }
        }
        double[][] grid = new double[nrows][ncols];
        int row = 0;
        for (int i = dataStart; i < lines.size() && row < nrows; i++) {
            String[] parts = lines.get(i).trim().split("\\s+");
            if (parts.length == 0 || parts[0].isEmpty()) continue;
            for (int x = 0; x < ncols && x < parts.length; x++) {
                double v = Double.parseDouble(parts[x]);
                grid[row][x] = (v == nodata) ? Double.NaN : v;
            }
            row++;
        }
        return grid;
    }

    private static String formatNumber(double v) {
        if (v == Math.floor(v) && Math.abs(v) < 1e9) return Integer.toString((int) v);
        return Double.toString(v);
    }
}
