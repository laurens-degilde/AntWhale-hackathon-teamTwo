package com.corridorapi.service;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Smoke test: confirm the Java↔Julia↔Circuitscape bridge round-trips on a synthetic
 * 16×16 resistance grid with two focal nodes on opposite sides, separated by a low-resistance
 * corridor with a high-resistance "road" pinch point in the middle.
 *
 * Skipped automatically if `julia` is not on PATH so CI without Julia stays green.
 */
class CircuitscapeRunnerIT {

    @Test
    void runsAndProducesCurrentDensity() throws Exception {
        org.junit.jupiter.api.Assumptions.assumeTrue(juliaAvailable(), "julia not on PATH");

        CircuitscapeRunner runner = new CircuitscapeRunner();
        ReflectionTestUtils.setField(runner, "juliaBin", "julia");
        ReflectionTestUtils.setField(runner, "timeoutSeconds", 240);
        ReflectionTestUtils.setField(runner, "cellSizeMeters", 100);

        int n = 16;
        double[][] r = new double[n][n];
        // forest (low resistance) everywhere; carve a "road" with high resistance through the middle row
        for (int y = 0; y < n; y++) {
            for (int x = 0; x < n; x++) {
                r[y][x] = 1.0;
            }
        }
        for (int x = 0; x < n; x++) {
            r[n / 2][x] = 1000.0;
        }
        // leave one gap in the road
        r[n / 2][n / 2] = 5.0;

        List<CircuitscapeRunner.FocalNode> focals = List.of(
            new CircuitscapeRunner.FocalNode("a", 2, 2),
            new CircuitscapeRunner.FocalNode("b", n - 3, n - 3)
        );

        CircuitscapeRunner.Result result = runner.run(r, focals);
        assertNotNull(result);
        assertEquals(n, result.height());
        assertEquals(n, result.width());
        assertTrue(result.maxCurrentDensity() > 0, "current density should be positive somewhere");

        // The single gap at (n/2, n/2) should carry the highest current.
        double gap = result.currentDensity()[n / 2][n / 2];
        // It should be near the global max — allow a bit of slack.
        assertTrue(gap >= 0.5 * result.maxCurrentDensity(),
            "expected gap cell (" + (n / 2) + "," + (n / 2) + ") to be near max, got "
            + gap + " vs max " + result.maxCurrentDensity());
    }

    private static boolean juliaAvailable() {
        try {
            Process p = new ProcessBuilder("julia", "--version").redirectErrorStream(true).start();
            p.waitFor();
            return p.exitValue() == 0;
        } catch (Exception e) {
            return false;
        }
    }
}
