import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { AppState, AppTheme } from "@/types";

// Plotly loaded from CDN via window global to avoid large bundle
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Plotly: any;
  }
}

const PAL = [
  "#7c6cf8","#f97316","#22c55e","#ef4444","#06b6d4",
  "#f59e0b","#ec4899","#84cc16","#8b5cf6","#14b8a6",
];

const LEGEND_CORNERS: Record<string, { x: number; y: number; xanchor: string; yanchor: string }> = {
  tl: { x: 0.02, y: 0.98, xanchor: "left",  yanchor: "top"    },
  tr: { x: 0.98, y: 0.98, xanchor: "right", yanchor: "top"    },
  bl: { x: 0.02, y: 0.02, xanchor: "left",  yanchor: "bottom" },
  br: { x: 0.98, y: 0.02, xanchor: "right", yanchor: "bottom" },
};

const CHART_THEMES: Record<string, { paper: string; plot: string; grid: string; font: string; axis: string }> = {
  plotly_white: { paper: "#ffffff", plot: "#ffffff", grid: "rgba(0,0,0,0.10)",      font: "#444444", axis: "#444444" },
  plotly_dark:  { paper: "#111117", plot: "#1c1c26", grid: "rgba(255,255,255,0.12)", font: "#cccccc", axis: "#888888" },
  ggplot2:      { paper: "#ffffff", plot: "#e5e5e5", grid: "#ffffff",                font: "#444444", axis: "#444444" },
  seaborn:      { paper: "#eaeaf2", plot: "#eaeaf2", grid: "#ffffff",                font: "#555555", axis: "#555555" },
  simple_white: { paper: "#ffffff", plot: "#ffffff", grid: "rgba(0,0,0,0)",          font: "#000000", axis: "#000000" },
};

interface Props {
  state: AppState;
  theme: AppTheme;
  onChange: (patch: Partial<AppState>) => void;
}

export default function ChartArea({ state, theme, onChange }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isDark = theme === "dark";

  // Inject Plotly CDN once
  useEffect(() => {
    if (window.Plotly) return;
    const s = document.createElement("script");
    s.src = "https://cdn.plot.ly/plotly-2.32.0.min.js";
    s.async = true;
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    if (!window.Plotly || !chartRef.current || !state.data.length) return;
    renderChart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, theme]);

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

    const x = state.data.map((r) => r[state.xCol]);
    const titleText = state.chartSubtitle
      ? `${state.chartTitle}<br><sup>${state.chartSubtitle}</sup>`
      : state.chartTitle;
    const mode = state.showMarkers ? "lines+markers" : "lines";

    let traces: unknown[] = [];

    if (state.chartType === "pie") {
      const col = state.yCols[0];
      if (col) traces = [{ type: "pie", labels: x, values: state.data.map((r) => r[col]), name: state.legend[col]?.label ?? col, marker: { colors: PAL } }];
    } else if (state.chartType === "histogram") {
      traces = state.yCols.map((col) => ({
        type: "histogram", x: state.data.map((r) => r[col]),
        name: state.legend[col]?.label ?? col,
        marker: { color: state.legend[col]?.color ?? PAL[0] },
        visible: state.legend[col]?.visible ? true : "legendonly",
        opacity: 0.75,
      }));
    } else if (state.chartType === "box") {
      traces = state.yCols.map((col) => ({
        type: "box", y: state.data.map((r) => r[col]),
        name: state.legend[col]?.label ?? col,
        marker: { color: state.legend[col]?.color ?? PAL[0] },
        visible: state.legend[col]?.visible ? true : "legendonly",
      }));
    } else if (state.chartType === "heatmap") {
      traces = [{ type: "heatmap", x, y: state.yCols, z: state.yCols.map((col) => state.data.map((r) => r[col])), colorscale: "Viridis" }];
    } else {
      traces = state.yCols.map((col) => {
        const cfg = state.legend[col];
        const y = state.data.map((r) => r[col]);
        const vis = cfg?.visible ? true : "legendonly";
        const color = cfg?.color ?? PAL[0];
        const name = cfg?.label ?? col;
        if (state.chartType === "line")    return { type: "scatter", mode, x, y, name, visible: vis, line: { color, width: state.lineWidth, dash: state.lineDash }, marker: { color, size: state.lineWidth * 2.5 } };
        if (state.chartType === "scatter") return { type: "scatter", mode: "markers", x, y, name, visible: vis, marker: { color, size: state.lineWidth * 3.5, line: { color, width: state.lineWidth * 0.5 } } };
        if (state.chartType === "bar")     return { type: "bar", x, y, name, visible: vis, marker: { color, line: { color: color, width: state.lineWidth * 0.5 } } };
        if (state.chartType === "area")    return { type: "scatter", mode, x, y, name, visible: vis, fill: "tozeroy", fillcolor: color + "28", line: { color, width: state.lineWidth, dash: state.lineDash }, marker: { color, size: state.lineWidth * 2.5 } };
        return {};
      });
    }

    const th = CHART_THEMES[state.plotlyTheme] ?? CHART_THEMES.plotly_white;

    Plotly.react(
      chartRef.current,
      traces,
      {
        title: { text: titleText, font: { family: "Inter", size: 17, color: th.font }, x: 0.03, xanchor: "left" },
        paper_bgcolor: th.paper,
        plot_bgcolor: th.plot,
        xaxis: {
          title: { text: state.xLabel || state.xCol, font: { color: th.axis, family: state.labelFontFamily, size: state.labelFontSize, weight: state.labelFontWeight } },
          showgrid: state.showGrid,
          gridcolor: th.grid,
          tickfont: { color: th.axis, family: state.axisFontFamily, size: state.axisFontSize, weight: state.axisFontWeight },
          zeroline: false,
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
        },
        yaxis: {
          title: { text: state.yLabel || "", font: { color: th.axis, family: state.labelFontFamily, size: state.labelFontSize, weight: state.labelFontWeight } },
          showgrid: state.showGrid,
          gridcolor: th.grid,
          tickfont: { color: th.axis, family: state.axisFontFamily, size: state.axisFontSize, weight: state.axisFontWeight },
          zeroline: false,
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
        },
        showlegend: state.showLegend,
        legend: {
          ...LEGEND_CORNERS[state.legendCorner],
          orientation: "v",
          bgcolor: "rgba(0,0,0,0)",
          borderwidth: 0,
          font: { size: state.legendFontSize, color: th.font, family: state.legendFontFamily },
        },
        margin: { t: 56, r: 20, b: 40, l: 48 },
        font: { family: "Inter", size: 12, color: th.font },
        hoverlabel: { font: { family: "Inter" } },
      },
      { responsive: true, displayModeBar: false },
    );

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
      .js-plotly-plot .ytick text {
        font-weight: ${state.axisFontWeight >= 700 ? 700 : 400} !important;
        stroke: ${th.axis} !important;
        stroke-width: ${tickStroke}px !important;
        paint-order: stroke fill !important;
      }
      .js-plotly-plot .g-xtitle text,
      .js-plotly-plot .g-ytitle text {
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
  }

  const th = CHART_THEMES[state.plotlyTheme] ?? CHART_THEMES.plotly_white;
  const themeDark = state.plotlyTheme === "plotly_dark";

  return (
    <div
      className="flex flex-1 flex-col overflow-hidden transition-colors duration-200"
      style={{ background: th.paper }}
    >
      {/* Title / subtitle bar */}
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

      {/* Chart */}
      <div className="flex-1 p-4">
        <div ref={chartRef} id="cc-chart" className="h-full w-full" />
      </div>
    </div>
  );
}
