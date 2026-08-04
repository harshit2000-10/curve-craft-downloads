import type { AggFunc, Filter, SortMode } from "@/lib/analysis";
import type { TrendlineKind } from "@/lib/stats";

export type LineDash = "solid" | "dot" | "dash" | "dashdot";

export type AxisScale = "linear" | "log";

export type ChartCorner = "tl" | "tr" | "bl" | "br";

/** How a series' error bars are derived. */
export interface ErrorBarConfig {
  mode: "none" | "column" | "percent" | "constant" | "stddev" | "stderr";
  /** Column holding the ± value, when mode is "column". */
  col: string;
  /** Magnitude for percent/constant modes. */
  value: number;
}

/** A horizontal or vertical marker line — target, threshold, mean, median. */
export interface RefLine {
  id: string;
  axis: "x" | "y";
  mode: "value" | "mean" | "median";
  /** Column the mean/median is computed from. */
  col: string;
  value: number;
  label: string;
  color: string;
  dash: LineDash;
  width: number;
}

/** Free-placed callout text. */
export interface ChartAnnotation {
  id: string;
  /** Kept as a string so date and category axes work, not just numeric ones. */
  x: string;
  y: number;
  text: string;
  showArrow: boolean;
  color: string;
}

export type ChartType =
  | "line"
  | "bar"
  | "scatter"
  | "area"
  | "pie"
  | "histogram"
  | "box"
  | "heatmap"
  | "violin"
  | "bubble"
  | "donut"
  | "treemap";

export type ExportFormat = "png" | "svg" | "jpeg" | "webp";
export type AppTheme = "dark" | "light";
export type EditMode = "off" | "add" | "delete";
export type PlotlyTheme =
  | "plotly_white"
  | "plotly_dark"
  | "ggplot2"
  | "seaborn"
  | "simple_white";

export interface LegendConfig {
  label: string;
  color: string;
  visible: boolean;
}

export interface AppState {
  data: Record<string, unknown>[];
  cols: string[];
  fname: string;
  chartType: ChartType;
  xCol: string;
  yCols: string[];
  legend: Record<string, LegendConfig>;
  showGrid: boolean;
  showLegend: boolean;
  showMarkers: boolean;
  chartTitle: string;
  chartSubtitle: string;
  xLabel: string;
  yLabel: string;
  plotlyTheme: PlotlyTheme;
  exportFormat: ExportFormat;
  exportWidth: number;
  exportHeight: number;
  exportDpi: number;
  xTickStep: number | null;
  yTickStep: number | null;
  lineWidth: number;
  lineDash: LineDash;
  showChartBorder: boolean;
  chartBorderWidth: number;
  axisFontSize: number;
  axisFontFamily: string;
  axisFontWeight: number;
  labelFontSize: number;
  labelFontFamily: string;
  labelFontWeight: number;
  legendFontFamily: string;
  legendFontSize: number;
  legendFontWeight: number;
  legendCorner: ChartCorner;
  /** Free-drag legend position (paper-fraction 0–1), set once the user drags
   * the legend on the chart. Null means "use legendCorner's preset". */
  legendX: number | null;
  legendY: number | null;
  showMajorTicks: boolean;
  majorTickLen: number;
  majorTickWidth: number;
  showMinorTicks: boolean;
  minorTickLen: number;
  minorTickWidth: number;
  minorTickCount: number;
  xRangeMin: string | number | null;
  xRangeMax: string | number | null;
  yRangeMin: number | null;
  yRangeMax: number | null;
  editMode: EditMode;
  editTargetCol: string;
  editHistory: Record<string, unknown>[][];
  boxShowPoints: boolean;
  boxPointPos: number;
  boxJitter: number;
  bubbleSizeCol: string;
  donutHoleSize: number;
  barMode: "group" | "stack";
  /** Analysis pipeline — applied in order: filters → aggregation → sort. */
  filters: Filter[];
  aggFunc: AggFunc;
  sortMode: SortMode;

  // ── Publication-grade overlays ────────────────────────────────────
  xAxisScale: AxisScale;
  yAxisScale: AxisScale;
  y2AxisScale: AxisScale;
  /** Y columns drawn against the right-hand axis instead of the left. */
  secondaryYCols: string[];
  y2Label: string;
  /** Error-bar config per Y column. */
  errorBars: Record<string, ErrorBarConfig>;
  trendline: TrendlineKind;
  /** Window size for the moving-average trendline. */
  trendlineWindow: number;
  trendlineShowStats: boolean;
  /** Corner the equation/R² box sits in — defaults away from where data usually is. */
  trendlineStatsCorner: ChartCorner;
  refLines: RefLine[];
  annotations: ChartAnnotation[];
}
