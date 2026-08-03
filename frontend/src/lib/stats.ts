/**
 * Curve fitting for the trendline feature.
 *
 * Every fit reports R² against the ORIGINAL y values, not the transformed ones.
 * Exponential/power fits linearise via logs, and an R² computed in log space
 * flatters the fit — quoting that number next to a curve would be misleading.
 */

export type TrendlineKind =
  | "none" | "linear" | "poly2" | "poly3"
  | "exponential" | "logarithmic" | "power" | "movingAverage";

export const TRENDLINES: { id: TrendlineKind; label: string }[] = [
  { id: "none",          label: "None" },
  { id: "linear",        label: "Linear" },
  { id: "poly2",         label: "Quadratic" },
  { id: "poly3",         label: "Cubic" },
  { id: "exponential",   label: "Exponential" },
  { id: "logarithmic",   label: "Logarithmic" },
  { id: "power",         label: "Power" },
  { id: "movingAverage", label: "Moving avg" },
];

export interface Fit {
  predict: (x: number) => number;
  /** Human-readable equation, e.g. "y = 2.5x + 1.2". */
  equation: string;
  /** Coefficient of determination against the original y values. */
  r2: number;
}

/** Gaussian elimination with partial pivoting. Returns null if the system is singular. */
function solveLinear(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    }
    if (Math.abs(M[pivot][col]) < 1e-12) return null;
    [M[col], M[pivot]] = [M[pivot], M[col]];
    const p = M[col][col];
    for (let c = col; c <= n; c++) M[col][c] /= p;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col];
      if (!f) continue;
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  return M.map((row) => row[n]);
}

/** Least-squares polynomial coefficients, index = power. */
export function polyCoefficients(xs: number[], ys: number[], degree: number): number[] | null {
  const n = degree + 1;
  // Normal equations (XᵀX)c = Xᵀy, assembled from power sums.
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < n; i++) {
    A.push([]);
    for (let j = 0; j < n; j++) A[i].push(xs.reduce((s, x) => s + Math.pow(x, i + j), 0));
    b.push(xs.reduce((s, x, k) => s + Math.pow(x, i) * ys[k], 0));
  }
  return solveLinear(A, b);
}

function rSquared(ys: number[], predicted: number[]): number {
  if (!ys.length) return 0;
  const m = ys.reduce((a, b) => a + b, 0) / ys.length;
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < ys.length; i++) {
    ssRes += (ys[i] - predicted[i]) ** 2;
    ssTot += (ys[i] - m) ** 2;
  }
  if (ssTot === 0) return ssRes === 0 ? 1 : 0;
  return 1 - ssRes / ssTot;
}

/** Readable significant figures without exponent noise in the normal range. */
function fmt(n: number): string {
  if (!Number.isFinite(n)) return "?";
  const a = Math.abs(n);
  if (a !== 0 && (a < 1e-4 || a >= 1e6)) return n.toExponential(3);
  return String(Number(n.toPrecision(4)));
}

function polyEquation(coefs: number[], degree: number): string {
  let out = "";
  for (let p = degree; p >= 0; p--) {
    const c = coefs[p];
    if (p !== degree && Math.abs(c) < 1e-12) continue;
    const mag = fmt(Math.abs(c));
    const body = p === 0 ? mag : p === 1 ? `${mag}x` : `${mag}x^${p}`;
    if (!out) out = (c < 0 ? "−" : "") + body;
    else out += (c < 0 ? " − " : " + ") + body;
  }
  return `y = ${out || "0"}`;
}

/**
 * Fit a curve. Returns null when the data can't support the chosen model — e.g. a
 * log fit with non-positive x — so callers can say so instead of drawing a
 * silently wrong line.
 */
export function fitCurve(kind: TrendlineKind, xs: number[], ys: number[], maWindow = 5): Fit | null {
  if (kind === "none" || xs.length < 2) return null;

  if (kind === "linear" || kind === "poly2" || kind === "poly3") {
    const degree = kind === "linear" ? 1 : kind === "poly2" ? 2 : 3;
    if (xs.length < degree + 1) return null;
    const c = polyCoefficients(xs, ys, degree);
    if (!c) return null;
    const predict = (x: number) => c.reduce((s, coef, p) => s + coef * Math.pow(x, p), 0);
    return { predict, equation: polyEquation(c, degree), r2: rSquared(ys, xs.map(predict)) };
  }

  if (kind === "exponential") {
    // y = a·e^(bx) — linearised as ln y = ln a + bx, so y must be strictly positive.
    const pts = xs.map((x, i) => [x, ys[i]] as const).filter(([, y]) => y > 0);
    if (pts.length < 2) return null;
    const c = polyCoefficients(pts.map(([x]) => x), pts.map(([, y]) => Math.log(y)), 1);
    if (!c) return null;
    const a = Math.exp(c[0]);
    const b = c[1];
    const predict = (x: number) => a * Math.exp(b * x);
    return { predict, equation: `y = ${fmt(a)}e^(${fmt(b)}x)`, r2: rSquared(ys, xs.map(predict)) };
  }

  if (kind === "logarithmic") {
    // y = a + b·ln(x) — x must be strictly positive.
    const pts = xs.map((x, i) => [x, ys[i]] as const).filter(([x]) => x > 0);
    if (pts.length < 2) return null;
    const c = polyCoefficients(pts.map(([x]) => Math.log(x)), pts.map(([, y]) => y), 1);
    if (!c) return null;
    const predict = (x: number) => (x > 0 ? c[0] + c[1] * Math.log(x) : NaN);
    const valid = xs.map((x, i) => [predict(x), ys[i]] as const).filter(([p]) => Number.isFinite(p));
    return {
      predict,
      equation: `y = ${fmt(c[0])} ${c[1] < 0 ? "−" : "+"} ${fmt(Math.abs(c[1]))}ln(x)`,
      r2: rSquared(valid.map(([, y]) => y), valid.map(([p]) => p)),
    };
  }

  if (kind === "power") {
    // y = a·x^b — linearised with logs on both sides, so both must be positive.
    const pts = xs.map((x, i) => [x, ys[i]] as const).filter(([x, y]) => x > 0 && y > 0);
    if (pts.length < 2) return null;
    const c = polyCoefficients(pts.map(([x]) => Math.log(x)), pts.map(([, y]) => Math.log(y)), 1);
    if (!c) return null;
    const a = Math.exp(c[0]);
    const b = c[1];
    const predict = (x: number) => (x > 0 ? a * Math.pow(x, b) : NaN);
    const valid = xs.map((x, i) => [predict(x), ys[i]] as const).filter(([p]) => Number.isFinite(p));
    return {
      predict,
      equation: `y = ${fmt(a)}x^${fmt(b)}`,
      r2: rSquared(valid.map(([, y]) => y), valid.map(([p]) => p)),
    };
  }

  if (kind === "movingAverage") {
    const w = Math.max(2, Math.round(maWindow));
    // Trailing window — how a moving average is normally read on a series.
    const smoothed = ys.map((_, i) => {
      const slice = ys.slice(Math.max(0, i - w + 1), i + 1);
      return slice.reduce((a, b) => a + b, 0) / slice.length;
    });
    const byX = new Map(xs.map((x, i) => [x, smoothed[i]]));
    return {
      predict: (x: number) => byX.get(x) ?? NaN,
      equation: `Moving average (window ${w})`,
      r2: rSquared(ys, smoothed),
    };
  }

  return null;
}

export function mean(ns: number[]): number {
  return ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : NaN;
}

export function median(ns: number[]): number {
  if (!ns.length) return NaN;
  const s = [...ns].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Sample standard deviation (n−1 denominator). */
export function stdDev(ns: number[]): number {
  if (ns.length < 2) return 0;
  const m = mean(ns);
  return Math.sqrt(ns.reduce((s, n) => s + (n - m) ** 2, 0) / (ns.length - 1));
}

/** Standard error of the mean. */
export function stdError(ns: number[]): number {
  return ns.length < 2 ? 0 : stdDev(ns) / Math.sqrt(ns.length);
}

export interface ColumnStats {
  min: number;
  max: number;
  mean: number;
  /** Count of values more than 2 standard deviations from the mean. */
  outliers: number;
  blanks: number;
}

/** Summary stats for the mobile Clean tab's per-column cards. Null for
 * non-numeric columns — there's nothing to summarize. */
export function columnStats(data: Record<string, unknown>[], col: string, toNum: (v: unknown) => number | null): ColumnStats | null {
  let blanks = 0;
  const nums: number[] = [];
  for (const row of data) {
    const v = row[col];
    if (v == null || v === "") { blanks++; continue; }
    const n = toNum(v);
    if (n !== null) nums.push(n);
  }
  if (!nums.length) return null;
  const m = mean(nums);
  const sd = stdDev(nums);
  const outliers = sd > 0 ? nums.filter((n) => Math.abs(n - m) > 2 * sd).length : 0;
  return { min: nums.reduce((a, b) => (b < a ? b : a)), max: nums.reduce((a, b) => (b > a ? b : a)), mean: m, outliers, blanks };
}
