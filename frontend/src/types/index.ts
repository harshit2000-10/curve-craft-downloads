export type LineDash = "solid" | "dot" | "dash" | "dashdot";

export type ChartType =
  | "line"
  | "bar"
  | "scatter"
  | "area"
  | "pie"
  | "histogram"
  | "box"
  | "heatmap";

export type ExportFormat = "png" | "svg" | "jpeg" | "webp";
export type AppTheme = "dark" | "light";
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
  legendCorner: "tl" | "tr" | "bl" | "br";
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
}
