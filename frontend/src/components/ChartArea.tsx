import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { PAL } from "@/lib/palette";
import { AlertTriangle } from "lucide-react";
import { analyze, aggAxisLabel, AGG_FUNCS } from "@/lib/analysis";
import { errorBarFor, buildTrendlines, buildShapes, buildAnnotations, isCartesian, CORNER_POSITIONS, logScaleIssues } from "@/lib/overlays";
import type { AppState, AppTheme, ChartType } from "@/types";

const AGG_LABELS: Record<string, string> = Object.fromEntries(AGG_FUNCS.map((a) => [a.id, a.label]));

// Chart types where a plotted point maps 1:1 to a data row, so click-to-edit is safe.
// Aggregates (histogram/box/heatmap) have no single source row, so they're excluded.
const EDITABLE_TYPES: ChartType[] = ["line", "scatter", "bar", "area", "pie"];

// Plotly loaded from CDN via window global to avoid large bundle
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Plotly: any;
  }
}

const CHART_THEMES: Record<string, { paper: string; plot: string; grid: string; font: string; axis: string }> = {
  plotly_white: { paper: "#ffffff", plot: "#ffffff", grid: "rgba(0,0,0,0.10)",      font: "#444444", axis: "#444444" },
  plotly_dark:  { paper: "#0a0c11", plot: "#0f1218", grid: "rgba(255,255,255,0.08)", font: "#e8ebf1", axis: "#5f6772" },
  ggplot2:      { paper: "#ffffff", plot: "#e5e5e5", grid: "#ffffff",                font: "#444444", axis: "#444444" },
  seaborn:      { paper: "#eaeaf2", plot: "#eaeaf2", grid: "#ffffff",                font: "#555555", axis: "#555555" },
  simple_white: { paper: "#ffffff", plot: "#ffffff", grid: "rgba(0,0,0,0)",          font: "#000000", axis: "#000000" },
};

// Build the Plotly trace array for the current chart type. Pure over `state` and the
// already-transformed `rows` — extracted from renderChart so each chart family stays
// readable and testable. Always plot `rows`, never state.data: rows is what survives
// the analysis pipeline (filter → aggregate → sort).
function buildTraces(state: AppState, rows: Record<string, unknown>[]): unknown[] {
  const x = rows.map((r) => r[state.xCol]);
  const mode = state.showMarkers ? "lines+markers" : "lines";

  if (state.chartType === "pie" || state.chartType === "donut") {
    const col = state.yCols[0];
    if (!col) return [];
    return [{
      type: "pie", labels: x, values: rows.map((r) => r[col]),
      name: state.legend[col]?.label ?? col,
      marker: { colors: PAL },
      hole: state.chartType === "donut" ? state.donutHoleSize : 0,
    }];
  }
  if (state.chartType === "histogram") {
    return state.yCols.map((col) => ({
      type: "histogram", x: rows.map((r) => r[col]),
      name: state.legend[col]?.label ?? col,
      marker: { color: state.legend[col]?.color ?? PAL[0] },
      visible: state.legend[col]?.visible ? true : "legendonly",
      opacity: 0.75,
    }));
  }
  if (state.chartType === "box") {
    return state.yCols.map((col) => {
      const color = state.legend[col]?.color ?? PAL[0];
      return {
        type: "box", y: rows.map((r) => r[col]),
        name: state.legend[col]?.label ?? col,
        fillcolor: color + "40",
        line: { color },
        marker: { color },
        boxpoints: state.boxShowPoints ? "all" : false,
        pointpos: state.boxPointPos,
        jitter: state.boxJitter,
        visible: state.legend[col]?.visible ? true : "legendonly",
      };
    });
  }
  if (state.chartType === "heatmap") {
    return [{ type: "heatmap", x, y: state.yCols, z: state.yCols.map((col) => rows.map((r) => r[col])), colorscale: "Viridis" }];
  }
  if (state.chartType === "violin") {
    return state.yCols.map((col) => {
      const color = state.legend[col]?.color ?? PAL[0];
      return {
        type: "violin", y: rows.map((r) => r[col]),
        name: state.legend[col]?.label ?? col,
        fillcolor: color + "40",
        line: { color },
        marker: { color },
        points: state.boxShowPoints ? "all" : false,
        pointpos: state.boxPointPos,
        jitter: state.boxJitter,
        box: { visible: true },
        meanline: { visible: true },
        visible: state.legend[col]?.visible ? true : "legendonly",
      };
    });
  }
  if (state.chartType === "treemap") {
    const col = state.yCols[0];
    if (!col) return [];
    return [{
      type: "treemap",
      labels: x,
      parents: rows.map(() => ""),
      values: rows.map((r) => r[col]),
      name: state.legend[col]?.label ?? col,
      marker: { colors: PAL },
    }];
  }

  // Cartesian families: line / scatter / bar / area / bubble
  return state.yCols.map((col) => {
    const cfg = state.legend[col];
    const y = rows.map((r) => r[col]);
    const vis = cfg?.visible ? true : "legendonly";
    const color = cfg?.color ?? PAL[0];
    const name = cfg?.label ?? col;
    // Overlays shared by every cartesian family: ± bars and right-axis assignment.
    const errorY = errorBarFor(state, col, rows);
    const extra = {
      ...(errorY ? { error_y: errorY } : {}),
      ...(state.secondaryYCols?.includes(col) ? { yaxis: "y2" } : {}),
    };
    if (state.chartType === "line")    return { type: "scatter", mode, x, y, name, visible: vis, line: { color, width: state.lineWidth, dash: state.lineDash }, marker: { color, size: state.lineWidth * 2.5 }, ...extra };
    if (state.chartType === "scatter") return { type: "scatter", mode: "markers", x, y, name, visible: vis, marker: { color, size: state.lineWidth * 3.5, line: { color, width: state.lineWidth * 0.5 } }, ...extra };
    if (state.chartType === "bar")     return { type: "bar", x, y, name, visible: vis, marker: { color, line: { color: color, width: state.lineWidth * 0.5 } }, ...extra };
    if (state.chartType === "area")    return { type: "scatter", mode, x, y, name, visible: vis, fill: "tozeroy", fillcolor: color + "28", line: { color, width: state.lineWidth, dash: state.lineDash }, marker: { color, size: state.lineWidth * 2.5 }, ...extra };
    if (state.chartType === "bubble") {
      const sizeCol = state.bubbleSizeCol;
      const sizes = sizeCol ? rows.map((r) => Number(r[sizeCol]) || 0) : y.map(() => 1);
      const maxSize = Math.max(1, ...sizes);
      return {
        type: "scatter", mode: "markers", x, y, name, visible: vis,
        marker: {
          color, size: sizes, sizemode: "area",
          sizeref: (2 * maxSize) / (40 * 40), sizemin: 4,
          line: { color, width: state.lineWidth * 0.5 }, opacity: 0.75,
        },
        ...extra,
      };
    }
    return {};
  });
}

interface Props {
  state: AppState;
  theme: AppTheme;
  /** Side-panel width. Only used as a signal that the chart's container changed. */
  panelWidth: number;
  onChange: (patch: Partial<AppState>) => void;
  /** Drops the title/subtitle bar and data-quality strip and tightens padding,
   * for docking a small preview (e.g. the mobile Style/Export tabs' 216px
   * strip) where those controls have no room and duplicate the Chart tab. */
  compact?: boolean;
}

export default function ChartArea({ state, theme, panelWidth, onChange, compact = false }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isDark = theme === "dark";

  // Inject Plotly CDN once
  useEffect(() => {
    if (window.Plotly) return;
    const s = document.createElement("script");
    s.src = "https://cdn.plot.ly/plotly-2.32.0.min.js";
    // SRI pin: if cdn.plot.ly is ever compromised or DNS-hijacked, a tampered
    // bundle fails the hash check and refuses to execute rather than running with
    // full page access to every dataset the user has loaded.
    s.integrity = "sha384-7TVmlZWH60iKX5Uk7lSvQhjtcgw2tkFjuwLcXoRSR4zXTyWFJRm9aPAguMh7CIra";
    s.crossOrigin = "anonymous";
    s.async = true;
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    if (!window.Plotly || !chartRef.current || !state.data.length) return;
    renderChart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, theme]);

  // Plotly's `responsive: true` only listens for *window* resize, so dragging the
  // panel divider changes the container without the chart ever re-laying out.
  // Resize explicitly off the width instead of watching the element: a
  // ResizeObserver would be more general, but its callbacks (and rAF) are
  // suspended whenever the tab isn't painting, which makes the behaviour
  // untestable and skippable. This fires on the same render as the width change.
  useEffect(() => {
    const el = chartRef.current;
    if (!el || !window.Plotly || !el.querySelector(".main-svg")) return;
    window.Plotly.Plots.resize(el);
  }, [panelWidth]);

  // Retry after Plotly loads — caps at 30 attempts (~6s) to avoid infinite poll if CDN blocked
  useEffect(() => {
    if (window.Plotly) return;
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (window.Plotly && state.data.length && chartRef.current) {
        renderChart();
        clearInterval(interval);
      } else if (attempts >= 30) {
        clearInterval(interval);
      }
    }, 200);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.data]);

  function renderChart() {
    const Plotly = window.Plotly;
    if (!Plotly || !chartRef.current) return;

    const titleText = state.chartSubtitle
      ? `${state.chartTitle}<br><sup>${state.chartSubtitle}</sup>`
      : state.chartTitle;

    const th = CHART_THEMES[state.plotlyTheme] ?? CHART_THEMES.plotly_white;
    const { rows, transformed } = analyze(state);
    const trend = buildTrendlines(state, rows);
    const traces = [...buildTraces(state, rows), ...trend.traces];
    // When aggregating, say so on the axis — a bar labelled "revenue" that actually
    // shows summed revenue is how people publish the wrong number.
    const yAxisTitle = state.yLabel || aggAxisLabel(state.aggFunc, state.yCols);

    // Only set an explicit axis `type` for log. Forcing "linear" would override
    // Plotly's own date/category detection and break those axes.
    const logX = state.xAxisScale === "log" ? { type: "log" } : {};
    const logY = state.yAxisScale === "log" ? { type: "log" } : {};

    const hasSecondary = isCartesian(state) && (state.secondaryYCols ?? []).some((c) => state.yCols.includes(c));

    const plot = Plotly.react(
      chartRef.current,
      traces,
      {
        shapes: buildShapes(state, rows),
        annotations: buildAnnotations(state, rows, trend.stats, th.font),
        ...(hasSecondary ? {
          yaxis2: {
            title: {
              text: state.y2Label || state.secondaryYCols.filter((c) => state.yCols.includes(c)).join(", "),
              font: { color: th.axis, family: state.labelFontFamily, size: state.labelFontSize, weight: state.labelFontWeight },
            },
            overlaying: "y",
            side: "right",
            automargin: true,
            showgrid: false,
            zeroline: false,
            tickfont: { color: th.axis, family: state.axisFontFamily, size: state.axisFontSize, weight: state.axisFontWeight },
            showspikes: true,
            spikemode: "across",
            spikesnap: "cursor",
            spikethickness: 1,
            spikedash: "dot",
            spikecolor: th.axis,
            ticks: state.showMajorTicks ? "outside" : "",
            ticklen: state.majorTickLen,
            tickwidth: state.majorTickWidth,
            tickcolor: th.axis,
            minor: {
              ticks: state.showMinorTicks ? "outside" : "",
              ticklen: state.minorTickLen,
              tickwidth: state.minorTickWidth,
              tickcolor: th.axis,
              nticks: state.minorTickCount + 1,
            },
            ...(state.showChartBorder ? { showline: true, mirror: true, linewidth: state.chartBorderWidth, linecolor: th.axis } : { showline: false, mirror: false }),
            ...(state.y2AxisScale === "log" ? { type: "log" } : {}),
          },
        } : {}),
        title: { text: titleText, font: { family: "IBM Plex Sans", size: 17, color: th.font }, x: 0.03, xanchor: "left" },
        paper_bgcolor: th.paper,
        plot_bgcolor: th.plot,
        dragmode: state.editMode === "off" ? "zoom" : false,
        barmode: state.barMode,
        xaxis: {
          title: { text: state.xLabel || state.xCol, font: { color: th.axis, family: state.labelFontFamily, size: state.labelFontSize, weight: state.labelFontWeight } },
          automargin: true,
          showgrid: state.showGrid,
          gridcolor: th.grid,
          tickfont: { color: th.axis, family: state.axisFontFamily, size: state.axisFontSize, weight: state.axisFontWeight },
          zeroline: false,
          showspikes: true,
          spikemode: "across",
          spikesnap: "cursor",
          spikethickness: 1,
          spikedash: "dot",
          spikecolor: th.axis,
          ticks: state.showMajorTicks ? "outside" : "",
          ticklen: state.majorTickLen,
          tickwidth: state.majorTickWidth,
          tickcolor: th.axis,
          minor: {
            ticks: state.showMinorTicks ? "outside" : "",
            ticklen: state.minorTickLen,
            tickwidth: state.minorTickWidth,
            tickcolor: th.axis,
            nticks: state.minorTickCount + 1,
          },
          ...(state.xTickStep ? { tickmode: "linear", tick0: 0, dtick: state.xTickStep } : {}),
          ...(state.xRangeMin !== null && state.xRangeMax !== null ? { range: [state.xRangeMin, state.xRangeMax] } : {}),
          ...(state.showChartBorder ? { showline: true, mirror: true, linewidth: state.chartBorderWidth, linecolor: th.axis } : { showline: false, mirror: false }),
          ...logX,
        },
        yaxis: {
          title: { text: yAxisTitle, font: { color: th.axis, family: state.labelFontFamily, size: state.labelFontSize, weight: state.labelFontWeight } },
          automargin: true,
          showgrid: state.showGrid,
          gridcolor: th.grid,
          tickfont: { color: th.axis, family: state.axisFontFamily, size: state.axisFontSize, weight: state.axisFontWeight },
          zeroline: false,
          showspikes: true,
          spikemode: "across",
          spikesnap: "cursor",
          spikethickness: 1,
          spikedash: "dot",
          spikecolor: th.axis,
          ticks: state.showMajorTicks ? "outside" : "",
          ticklen: state.majorTickLen,
          tickwidth: state.majorTickWidth,
          tickcolor: th.axis,
          minor: {
            ticks: state.showMinorTicks ? "outside" : "",
            ticklen: state.minorTickLen,
            tickwidth: state.minorTickWidth,
            tickcolor: th.axis,
            nticks: state.minorTickCount + 1,
          },
          ...(state.yTickStep ? { tickmode: "linear", tick0: 0, dtick: state.yTickStep } : {}),
          ...(state.yRangeMin !== null && state.yRangeMax !== null ? { range: [state.yRangeMin, state.yRangeMax] } : {}),
          ...(state.showChartBorder ? { showline: true, mirror: true, linewidth: state.chartBorderWidth, linecolor: th.axis } : { showline: false, mirror: false }),
          ...logY,
        },
        showlegend: state.showLegend,
        legend: {
          ...CORNER_POSITIONS[state.legendCorner],
          orientation: "v",
          bgcolor: "rgba(0,0,0,0)",
          borderwidth: 0,
          font: { size: state.legendFontSize, color: th.font, family: state.legendFontFamily },
        },
        margin: { t: 56, r: hasSecondary ? 62 : 20, b: 40, l: 48 },
        font: { family: "IBM Plex Sans", size: 12, color: th.font },
        hoverlabel: { font: { family: "IBM Plex Sans" } },
      },
      { responsive: true, displayModeBar: false },
    );

    // Wire up click-to-edit once the plot is drawn. Handlers close over the current
    // `state`/`onChange`, so they stay fresh because renderChart re-runs every render.
    if (plot && typeof plot.then === "function") {
      plot.then(attachEditHandlers).catch((err: unknown) => console.error("Plotly render failed", err));
    } else {
      attachEditHandlers();
    }

    // System fonts only support 400/700. We simulate a full 100–900 range by scaling
    // SVG stroke-width with a sqrt curve: sqrt gives bigger perceptual steps at the low
    // end (100–500) where the font-weight snap hasn't fired yet.
    const tickStroke   = (Math.sqrt((state.axisFontWeight  - 100) / 800) * 1.2).toFixed(3);
    const labelStroke  = (Math.sqrt((state.labelFontWeight - 100) / 800) * 1.5).toFixed(3);
    const styleId = "cc-axis-font-override";
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `
      .js-plotly-plot .xtick text,
      .js-plotly-plot .ytick text,
      .js-plotly-plot .y2tick text {
        font-weight: ${state.axisFontWeight >= 700 ? 700 : 400} !important;
        stroke: ${th.axis} !important;
        stroke-width: ${tickStroke}px !important;
        paint-order: stroke fill !important;
      }
      .js-plotly-plot .g-xtitle text,
      .js-plotly-plot .g-ytitle text,
      .js-plotly-plot .g-y2title text {
        font-weight: ${state.labelFontWeight >= 700 ? 700 : 400} !important;
        stroke: ${th.axis} !important;
        stroke-width: ${labelStroke}px !important;
        paint-order: stroke fill !important;
      }
      .js-plotly-plot .legend .legendtext {
        font-weight: ${state.legendFontWeight >= 700 ? 700 : 400} !important;
        stroke: ${th.font} !important;
        stroke-width: ${(Math.sqrt((state.legendFontWeight - 100) / 800) * 1.2).toFixed(3)}px !important;
        paint-order: stroke fill !important;
      }
    `;

    // ── Click-to-edit wiring (delete a point / add a point) ──────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function attachEditHandlers() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gd = chartRef.current as any;
      if (!gd) return;

      // With a transform active, plotted points no longer map 1:1 to source rows —
      // deleting "point 3" would delete an unrelated row. Refuse rather than corrupt.
      const canDelete = EDITABLE_TYPES.includes(state.chartType) && !transformed;
      const canAdd = ["line", "scatter", "bar", "area"].includes(state.chartType) && !transformed;

      // Cap the undo stack so it can't grow unbounded on a long editing session.
      const MAX_HISTORY = 20;
      function pushHistory() {
        const next = [...state.editHistory, state.data].slice(-MAX_HISTORY);
        return next;
      }

      // Delete: Plotly's point-click event maps pointIndex 1:1 to a data row here
      // (traces are built straight from state.data with no slicing).
      gd.removeAllListeners?.("plotly_click");
      if (state.editMode === "delete" && canDelete) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        gd.on("plotly_click", (e: any) => {
          const pt = e?.points?.[0];
          const idx = pt?.pointIndex ?? pt?.pointNumber;
          if (idx == null) return;
          // Trendline traces are appended after the data traces, and their points
          // don't correspond to rows. Clicking one must not delete row N.
          if (pt?.curveNumber != null && pt.curveNumber >= state.yCols.length) return;
          onChange({ data: state.data.filter((_, i) => i !== idx), editHistory: pushHistory() });
        });
      }

      // Add: point-click only fires on existing points, so we listen for raw clicks
      // on the plotting rect and convert pixel → data coords. onclick (not
      // addEventListener) so it replaces rather than stacks across re-renders.
      const drag = gd.querySelector?.(".nsewdrag") as HTMLElement | null;
      if (drag) {
        drag.onclick = null;
        drag.style.cursor = state.editMode === "off" ? "" : "crosshair";
        if (state.editMode === "add" && canAdd) {
          drag.onclick = (evt: MouseEvent) => {
            const xa = gd._fullLayout?.xaxis;
            const ya = gd._fullLayout?.yaxis;
            if (!xa || !ya) return;
            // Add is only meaningful on a numeric X — categorical/date are disabled
            // (the panel disables the Add button too, this is the defensive guard).
            if (xa.type !== "linear" && xa.type !== "log") return;
            const rect = gd.getBoundingClientRect();
            const xVal = xa.p2d(evt.clientX - rect.left - xa._offset);
            const yVal = ya.p2d(evt.clientY - rect.top - ya._offset);
            // editTargetCol can go stale if its column gets deselected from Y axes after being
            // picked — fall back to the first active Y column, same guard DataPanel's select uses.
            const col = state.yCols.includes(state.editTargetCol) ? state.editTargetCol : state.yCols[0];
            if (!col) return;
            onChange({ data: [...state.data, { [state.xCol]: xVal, [col]: yVal }], editHistory: pushHistory() });
          };
        }
      }
    }
  }

  const th = CHART_THEMES[state.plotlyTheme] ?? CHART_THEMES.plotly_white;
  const themeDark = state.plotlyTheme === "plotly_dark";

  // Surfaced next to the chart, not only in the Analysis tab — a chart silently
  // missing rows is the failure mode worth interrupting someone for.
  const summary = analyze(state);
  const droppedValues = summary.issues.reduce((n, i) => n + i.blank + i.nonNumeric, 0);
  // A log axis just omits points ≤ 0 with no marker of any kind — a different
  // failure mode from blank/non-numeric cells, so it gets its own count and message.
  const logIssues = logScaleIssues(state, summary.rows);
  const logHiddenCount = logIssues.reduce((n, i) => n + i.count, 0);

  return (
    <div
      className="flex flex-1 flex-col overflow-hidden transition-colors duration-200"
      style={{ background: th.paper }}
    >
      {/* Title / subtitle bar */}
      {!compact && (
      <div
        className="flex flex-shrink-0 flex-col gap-0.5 border-b px-5 py-3 backdrop-blur-sm transition-colors duration-200"
        style={{
          borderColor: themeDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)",
          background: th.paper + "b3",
        }}
      >
        <input
          className={cn(
            "w-full rounded-[5px] bg-transparent px-1 text-[15px] font-medium tracking-[-0.01em] outline-none transition-colors duration-150",
            "border border-transparent hover:border-current/10 focus:border-current/20",
          )}
          style={{ color: th.font, caretColor: th.font, borderColor: "transparent" }}
          onFocus={(e) => { e.currentTarget.style.borderColor = th.axis + "33"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "transparent"; }}
          onMouseEnter={(e) => { if (document.activeElement !== e.currentTarget) e.currentTarget.style.borderColor = th.axis + "1a"; }}
          onMouseLeave={(e) => { if (document.activeElement !== e.currentTarget) e.currentTarget.style.borderColor = "transparent"; }}
          placeholder="Chart title…"
          aria-label="Chart title"
          value={state.chartTitle}
          onChange={(e) => onChange({ chartTitle: e.target.value })}
        />
        <input
          className={cn(
            "w-full rounded-[5px] bg-transparent px-1 text-xs outline-none transition-colors duration-150",
            "border border-transparent",
          )}
          style={{ color: th.axis, caretColor: th.axis, borderColor: "transparent" }}
          onFocus={(e) => { e.currentTarget.style.borderColor = th.axis + "33"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "transparent"; }}
          onMouseEnter={(e) => { if (document.activeElement !== e.currentTarget) e.currentTarget.style.borderColor = th.axis + "1a"; }}
          onMouseLeave={(e) => { if (document.activeElement !== e.currentTarget) e.currentTarget.style.borderColor = "transparent"; }}
          placeholder="Subtitle or description…"
          aria-label="Chart subtitle"
          value={state.chartSubtitle}
          onChange={(e) => onChange({ chartSubtitle: e.target.value })}
        />
      </div>
      )}

      {/* Analysis / data-quality status strip */}
      {!compact && (summary.transformed || droppedValues > 0 || logHiddenCount > 0) && (
        <div
          className="flex flex-shrink-0 flex-wrap items-center gap-2 border-b px-5 py-1.5 text-[11px]"
          style={{
            borderColor: themeDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)",
            background: th.paper,
            color: th.axis,
          }}
        >
          {state.aggFunc !== "none" && (
            <span className="rounded-full border px-2 py-0.5" style={{ borderColor: th.axis + "44" }}>
              {AGG_LABELS[state.aggFunc]} by {state.xCol}
            </span>
          )}
          {summary.filteredOut > 0 && (
            <span className="rounded-full border px-2 py-0.5" style={{ borderColor: th.axis + "44" }}>
              {summary.filteredOut.toLocaleString()} rows filtered out
            </span>
          )}
          {state.sortMode !== "none" && (
            <span className="rounded-full border px-2 py-0.5" style={{ borderColor: th.axis + "44" }}>
              sorted
            </span>
          )}
          <span style={{ opacity: 0.75 }}>
            showing {summary.rows.length.toLocaleString()} of {summary.sourceRows.toLocaleString()} rows
          </span>
          <div className="ml-auto flex items-center gap-3">
            {droppedValues > 0 && (
              <span className="flex items-center gap-1 font-medium text-amber-500">
                <AlertTriangle size={11} />
                {droppedValues.toLocaleString()} value{droppedValues === 1 ? "" : "s"} skipped — see Analysis
              </span>
            )}
            {logHiddenCount > 0 && (
              <span
                className="flex items-center gap-1 font-medium text-amber-500"
                title={logIssues.map((i) => `${i.col} (${i.axis}): ${i.count} value${i.count === 1 ? "" : "s"} ≤ 0 hidden`).join(", ")}
              >
                <AlertTriangle size={11} />
                {logHiddenCount.toLocaleString()} value{logHiddenCount === 1 ? "" : "s"} ≤ 0 hidden by log scale
              </span>
            )}
          </div>
        </div>
      )}

      {/* Chart */}
      <div className={cn("relative flex-1", compact ? "p-1.5" : "p-4")}>
        {!compact && state.editMode !== "off" && (
          <div
            className="pointer-events-none absolute left-1/2 top-6 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-medium shadow-lg"
            style={{
              borderColor: "var(--border)",
              background: "color-mix(in srgb, var(--panel) 92%, transparent)",
              color: "var(--text-2)",
            }}
          >
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: state.editMode === "delete" ? "#ef4444" : "var(--accent)" }}
            />
            {state.editMode === "delete"
              ? "Delete mode — click a point to remove it"
              : "Add mode — click on the plot to add a point"}
          </div>
        )}
        <div ref={chartRef} id="cc-chart" className={cn("mx-auto", compact ? "h-full w-full" : "h-[90%] w-[90%]")} />
      </div>
    </div>
  );
}
