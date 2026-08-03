import { toNum } from "@/lib/analysis";
import { fitCurve, stdDev, stdError, mean, median } from "@/lib/stats";
import type { AppState, ChartCorner } from "@/types";

type Row = Record<string, unknown>;

/** Shared corner→paper-coordinate table — used by the legend and the trendline stats box. */
export const CORNER_POSITIONS: Record<ChartCorner, { x: number; y: number; xanchor: string; yanchor: string }> = {
  tl: { x: 0.02, y: 0.98, xanchor: "left",  yanchor: "top"    },
  tr: { x: 0.98, y: 0.98, xanchor: "right", yanchor: "top"    },
  bl: { x: 0.02, y: 0.02, xanchor: "left",  yanchor: "bottom" },
  br: { x: 0.98, y: 0.02, xanchor: "right", yanchor: "bottom" },
};

/** Chart families that sit on a normal x/y grid and can carry overlays. */
export const CARTESIAN_TYPES = ["line", "scatter", "bar", "area", "bubble"];

export function isCartesian(state: AppState): boolean {
  return CARTESIAN_TYPES.includes(state.chartType);
}

/** Numeric y values of a column, blanks and junk dropped. */
function numericCol(rows: Row[], col: string): number[] {
  const out: number[] = [];
  for (const r of rows) {
    const n = toNum(r[col]);
    if (n !== null) out.push(n);
  }
  return out;
}

export interface LogScaleIssue {
  axis: "x" | "y" | "y2";
  col: string;
  count: number;
}

/**
 * A log axis silently drops any point ≤ 0 — Plotly just omits it, with no error
 * and no visual gap marker. That's a real value the user had, not a data-quality
 * problem, so it's tracked separately from `analyze()`'s blank/non-numeric scan.
 */
export function logScaleIssues(state: AppState, rows: Row[]): LogScaleIssue[] {
  if (!isCartesian(state)) return [];
  const out: LogScaleIssue[] = [];

  const countNonPositive = (col: string) =>
    numericCol(rows, col).filter((n) => n <= 0).length;

  if (state.xAxisScale === "log" && state.xCol) {
    const n = countNonPositive(state.xCol);
    if (n > 0) out.push({ axis: "x", col: state.xCol, count: n });
  }

  const secondary = new Set(state.secondaryYCols ?? []);
  if (state.yAxisScale === "log") {
    for (const col of state.yCols) {
      if (secondary.has(col)) continue;
      const n = countNonPositive(col);
      if (n > 0) out.push({ axis: "y", col, count: n });
    }
  }
  if (state.y2AxisScale === "log") {
    for (const col of state.yCols) {
      if (!secondary.has(col)) continue;
      const n = countNonPositive(col);
      if (n > 0) out.push({ axis: "y2", col, count: n });
    }
  }

  return out;
}

/**
 * Plotly `error_y` for one series, or undefined when the series has none.
 * stddev/stderr collapse to a single constant — that's the usual "±1 SD of this
 * series" reading, as opposed to a per-point value which needs its own column.
 */
export function errorBarFor(state: AppState, col: string, rows: Row[]): unknown {
  const cfg = state.errorBars?.[col];
  if (!cfg || cfg.mode === "none") return undefined;
  const base = { visible: true, color: state.legend[col]?.color, thickness: 1.2, width: 3 };

  if (cfg.mode === "column") {
    if (!cfg.col) return undefined;
    return { ...base, type: "data", symmetric: true, array: rows.map((r) => toNum(r[cfg.col]) ?? 0) };
  }
  if (cfg.mode === "percent")  return { ...base, type: "percent", value: cfg.value };
  if (cfg.mode === "constant") return { ...base, type: "constant", value: cfg.value };
  if (cfg.mode === "stddev")   return { ...base, type: "constant", value: stdDev(numericCol(rows, col)) };
  if (cfg.mode === "stderr")   return { ...base, type: "constant", value: stdError(numericCol(rows, col)) };
  return undefined;
}

export interface TrendlineResult {
  traces: unknown[];
  /** One "col: y = … (R² = …)" line per fitted series. */
  stats: string[];
  /** Series that couldn't be fitted, with the reason. */
  failures: string[];
}

/**
 * Fit a trendline per Y series and return the traces to overlay.
 *
 * On a numeric x axis the curve is sampled densely so it renders smooth. On a
 * category or date axis it's evaluated at the data points instead — a fractional
 * category index has no meaning to Plotly.
 */
export function buildTrendlines(state: AppState, rows: Row[]): TrendlineResult {
  const empty: TrendlineResult = { traces: [], stats: [], failures: [] };
  if (!isCartesian(state) || state.trendline === "none" || rows.length < 2) return empty;

  const rawX = rows.map((r) => r[state.xCol]);
  const numericX = rawX.map(toNum);
  const xIsNumeric = numericX.every((n) => n !== null);

  const traces: unknown[] = [];
  const stats: string[] = [];
  const failures: string[] = [];

  for (const col of state.yCols) {
    if (state.legend[col]?.visible === false) continue;

    // Pair up x/y, dropping rows where either side isn't usable.
    const pairs: [number, number][] = [];
    rows.forEach((r, i) => {
      const y = toNum(r[col]);
      const x = xIsNumeric ? numericX[i] : i;
      if (y !== null && x !== null) pairs.push([x as number, y]);
    });
    if (pairs.length < 2) { failures.push(`${col}: not enough numeric points`); continue; }

    const xs = pairs.map((p) => p[0]);
    const ys = pairs.map((p) => p[1]);
    const fit = fitCurve(state.trendline, xs, ys, state.trendlineWindow);
    if (!fit) { failures.push(`${col}: data doesn't suit this model`); continue; }

    let tx: unknown[];
    let ty: number[];
    if (state.trendline === "movingAverage" || !xIsNumeric) {
      // Evaluate at the real points and reuse the original x values verbatim.
      tx = xIsNumeric ? xs : pairs.map((_, i) => rawX[i]);
      ty = xs.map((x) => fit.predict(x));
    } else {
      const min = Math.min(...xs);
      const max = Math.max(...xs);
      const N = 120;
      const sampled = Array.from({ length: N }, (_, i) => min + ((max - min) * i) / (N - 1));
      tx = sampled;
      ty = sampled.map((x) => fit.predict(x));
    }

    // Drop non-finite predictions (log/power below their domain) so Plotly gaps them.
    const cleanY = ty.map((v) => (Number.isFinite(v) ? v : null));

    traces.push({
      type: "scatter",
      mode: "lines",
      x: tx,
      y: cleanY,
      name: `${state.legend[col]?.label ?? col} · fit`,
      line: { color: state.legend[col]?.color, width: Math.max(1, state.lineWidth * 0.9), dash: "dash" },
      hoverinfo: "skip",
      showlegend: true,
      ...(state.secondaryYCols?.includes(col) ? { yaxis: "y2" } : {}),
    });

    stats.push(`${state.legend[col]?.label ?? col}: ${fit.equation}   R² = ${fit.r2.toFixed(4)}`);
  }

  return { traces, stats, failures };
}

/** Resolve a reference line to its actual axis position. */
function refLineValue(line: AppState["refLines"][number], rows: Row[]): number {
  if (line.mode === "value") return line.value;
  const nums = numericCol(rows, line.col);
  if (!nums.length) return NaN;
  return line.mode === "mean" ? mean(nums) : median(nums);
}

const DASH_MAP: Record<string, string> = { solid: "solid", dot: "dot", dash: "dash", dashdot: "dashdot" };

/** Plotly `shapes` for the reference lines. */
export function buildShapes(state: AppState, rows: Row[]): unknown[] {
  if (!isCartesian(state)) return [];
  const shapes: unknown[] = [];
  for (const line of state.refLines ?? []) {
    const v = refLineValue(line, rows);
    if (!Number.isFinite(v)) continue;
    const common = {
      type: "line",
      line: { color: line.color, width: line.width, dash: DASH_MAP[line.dash] ?? "dash" },
      layer: "above",
    };
    if (line.axis === "y") {
      // Horizontal: spans the full plot width, pinned to a y value.
      shapes.push({ ...common, xref: "paper", x0: 0, x1: 1, yref: "y", y0: v, y1: v });
    } else {
      shapes.push({ ...common, yref: "paper", y0: 0, y1: 1, xref: "x", x0: v, x1: v });
    }
  }
  return shapes;
}

/** Plotly `annotations`: reference-line labels, callouts, and the fit stats block. */
export function buildAnnotations(
  state: AppState,
  rows: Row[],
  stats: string[],
  fontColor: string,
): unknown[] {
  const out: unknown[] = [];

  if (isCartesian(state)) {
    for (const line of state.refLines ?? []) {
      if (!line.label) continue;
      const v = refLineValue(line, rows);
      if (!Number.isFinite(v)) continue;
      if (line.axis === "y") {
        out.push({
          xref: "paper", x: 1, xanchor: "right",
          yref: "y", y: v, yanchor: "bottom",
          text: line.label, showarrow: false,
          font: { size: 11, color: line.color },
          bgcolor: "rgba(0,0,0,0)",
        });
      } else {
        out.push({
          xref: "x", x: v, xanchor: "left",
          yref: "paper", y: 1, yanchor: "top",
          text: line.label, showarrow: false,
          font: { size: 11, color: line.color },
        });
      }
    }

    for (const a of state.annotations ?? []) {
      if (!a.text) continue;
      // x stays a string when the axis is categorical or date-based; Plotly copes.
      const nx = toNum(a.x);
      out.push({
        x: nx !== null ? nx : a.x,
        y: a.y,
        text: a.text,
        showarrow: a.showArrow,
        arrowhead: 2,
        arrowsize: 1,
        arrowwidth: 1,
        arrowcolor: a.color,
        ax: 0,
        ay: -34,
        font: { size: 12, color: a.color },
        bordercolor: a.color,
        borderpad: 3,
        borderwidth: a.showArrow ? 0 : 1,
      });
    }
  }

  if (state.trendlineShowStats && stats.length) {
    const corner = state.trendlineStatsCorner ?? "bl";
    const pos = CORNER_POSITIONS[corner];
    // Padding nudges the box off the very edge — a raw 0.02/0.98 anchor point
    // clips the text against the plot border on tight layouts.
    const pad = 0.01;
    // The legend defaults to the same corner as this box. Sharing a corner is a
    // one-click mistake (or just the default), so push the box further in along y
    // rather than let it print on top of the legend text. Row count includes the
    // fit-line entries the trendline itself adds to the legend, not just yCols.
    const sharesLegendCorner = state.showLegend && corner === state.legendCorner;
    const legendRows = state.yCols.length + stats.length;
    out.push({
      xref: "paper", yref: "paper",
      x: pos.xanchor === "left" ? pos.x + pad : pos.x - pad,
      y: pos.yanchor === "bottom" ? pos.y + pad : pos.y - pad,
      xanchor: pos.xanchor, yanchor: pos.yanchor,
      ...(sharesLegendCorner ? { yshift: (pos.yanchor === "bottom" ? 1 : -1) * (20 * legendRows + 22) } : {}),
      text: stats.join("<br>"),
      showarrow: false,
      align: pos.xanchor === "left" ? "left" : "right",
      font: { size: 11, family: "IBM Plex Mono, monospace", color: fontColor },
      bgcolor: "rgba(127,127,127,0.10)",
      borderpad: 5,
    });
  }

  return out;
}
