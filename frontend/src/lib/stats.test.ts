/**
 * Self-check for the trendline math. Run with:
 *   npx esbuild src/lib/stats.test.ts --bundle --format=esm --platform=node --outfile=/tmp/s.mjs && node /tmp/s.mjs
 */
import assert from "node:assert";
import { fitCurve, polyCoefficients, mean, median, stdDev, stdError } from "./stats";

const close = (a: number, b: number, eps = 1e-6, msg = "") =>
  assert.ok(Math.abs(a - b) < eps, `${msg} expected ${b}, got ${a}`);

// ── exact linear data → perfect fit ────────────────────────────────
{
  const xs = [1, 2, 3, 4, 5];
  const ys = xs.map((x) => 3 * x + 2);
  const f = fitCurve("linear", xs, ys)!;
  close(f.r2, 1, 1e-9, "R² of exact line");
  close(f.predict(10), 32, 1e-6, "extrapolated point");
  assert.ok(f.equation.includes("3") && f.equation.includes("2"), `equation shows coefficients: ${f.equation}`);
}

// ── known least-squares answer ─────────────────────────────────────
{
  // y = 2x on 0..4 with one point nudged; slope/intercept verified by hand.
  const xs = [0, 1, 2, 3, 4];
  const ys = [0, 2, 4, 6, 9];
  const c = polyCoefficients(xs, ys, 1)!;
  close(c[1], 2.2, 1e-9, "slope");
  close(c[0], -0.2, 1e-9, "intercept");
  const f = fitCurve("linear", xs, ys)!;
  assert.ok(f.r2 > 0.99 && f.r2 < 1, `R² just under 1, got ${f.r2}`);
}

// ── quadratic recovers its own coefficients ────────────────────────
{
  const xs = [-3, -2, -1, 0, 1, 2, 3];
  const ys = xs.map((x) => 2 * x * x - 3 * x + 1);
  const f = fitCurve("poly2", xs, ys)!;
  close(f.r2, 1, 1e-9, "R² of exact parabola");
  close(f.predict(5), 2 * 25 - 15 + 1, 1e-6, "parabola prediction");
}

// ── cubic ──────────────────────────────────────────────────────────
{
  const xs = [-2, -1, 0, 1, 2, 3];
  const ys = xs.map((x) => x ** 3 - 2 * x + 5);
  const f = fitCurve("poly3", xs, ys)!;
  close(f.r2, 1, 1e-8, "R² of exact cubic");
  close(f.predict(4), 64 - 8 + 5, 1e-4, "cubic prediction");
}

// ── exponential ────────────────────────────────────────────────────
{
  const xs = [0, 1, 2, 3, 4];
  const ys = xs.map((x) => 3 * Math.exp(0.5 * x));
  const f = fitCurve("exponential", xs, ys)!;
  close(f.r2, 1, 1e-9, "R² of exact exponential");
  close(f.predict(2), 3 * Math.exp(1), 1e-6, "exponential prediction");
}

// ── logarithmic ────────────────────────────────────────────────────
{
  const xs = [1, 2, 3, 4, 5];
  const ys = xs.map((x) => 4 + 2 * Math.log(x));
  const f = fitCurve("logarithmic", xs, ys)!;
  close(f.r2, 1, 1e-9, "R² of exact log curve");
  close(f.predict(Math.E), 6, 1e-6, "log prediction at e");
}

// ── power ──────────────────────────────────────────────────────────
{
  const xs = [1, 2, 3, 4];
  const ys = xs.map((x) => 5 * Math.pow(x, 2));
  const f = fitCurve("power", xs, ys)!;
  close(f.r2, 1, 1e-9, "R² of exact power curve");
  close(f.predict(3), 45, 1e-6, "power prediction");
}

// ── moving average ─────────────────────────────────────────────────
{
  const xs = [1, 2, 3, 4, 5];
  const ys = [10, 20, 30, 40, 50];
  const f = fitCurve("movingAverage", xs, ys, 2)!;
  close(f.predict(1), 10, 1e-9, "first point is itself");
  close(f.predict(2), 15, 1e-9, "trailing mean of 10,20");
  close(f.predict(5), 45, 1e-9, "trailing mean of 40,50");
}

// ── models refuse impossible data instead of guessing ──────────────
assert.strictEqual(fitCurve("logarithmic", [-1, 0], [1, 2]), null, "log rejects non-positive x");
assert.strictEqual(fitCurve("exponential", [1, 2], [-1, -2]), null, "exp rejects non-positive y");
assert.strictEqual(fitCurve("power", [0, 0], [1, 2]), null, "power rejects non-positive x");
assert.strictEqual(fitCurve("linear", [1], [1]), null, "needs at least 2 points");
assert.strictEqual(fitCurve("poly3", [1, 2, 3], [1, 2, 3]), null, "cubic needs 4+ points");
assert.strictEqual(fitCurve("none", [1, 2], [1, 2]), null, "none fits nothing");

// ── R² is reported on the original scale, not the log scale ────────
{
  // Exponential-ish data with noise: a log-space R² would read higher than the
  // honest original-scale one. Just assert it stays a sane fraction.
  const xs = [1, 2, 3, 4, 5, 6];
  const ys = [2.1, 4.2, 7.9, 16.5, 33, 63];
  const f = fitCurve("exponential", xs, ys)!;
  assert.ok(f.r2 > 0.9 && f.r2 <= 1, `original-scale R² in range, got ${f.r2}`);
}

// ── summary statistics ─────────────────────────────────────────────
close(mean([1, 2, 3, 4]), 2.5, 1e-12, "mean");
close(median([3, 1, 2]), 2, 1e-12, "odd median");
close(median([4, 1, 3, 2]), 2.5, 1e-12, "even median");
close(stdDev([2, 4, 4, 4, 5, 5, 7, 9]), 2.13808993529939, 1e-9, "sample stdev (n−1)");
close(stdError([2, 4, 4, 4, 5, 5, 7, 9]), 2.13808993529939 / Math.sqrt(8), 1e-9, "SEM");
assert.strictEqual(stdDev([5]), 0, "stdev of one point is 0");

console.log("stats.ts — all checks passed");
