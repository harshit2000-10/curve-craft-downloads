import Papa from "papaparse";
import { analyze } from "@/lib/analysis";
import type { AppState } from "@/types";

export const PROJECT_EXTENSION = ".curvecraft.json";

/** Bump when the on-disk shape changes incompatibly, then handle it in loadProject. */
const PROJECT_VERSION = 1;

interface ProjectFile {
  version: number;
  savedAt: string;
  state: Omit<AppState, "editHistory">;
}

/**
 * Serialize the app state to a project file and hand it to the browser as a download.
 * Everything stays on the user's machine — no network involved.
 */
export function saveProject(state: AppState, filename?: string): void {
  // editHistory is the undo stack — up to 20 full copies of the dataset. Pointless
  // to persist and it would dwarf the rest of the file, so it's stripped here.
  const { editHistory: _editHistory, ...persisted } = state;

  const payload: ProjectFile = {
    version: PROJECT_VERSION,
    savedAt: new Date().toISOString(),
    state: persisted,
  };

  const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? defaultProjectName(state.fname);
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Release the blob or every save leaks its memory for the life of the tab.
  URL.revokeObjectURL(url);
}

/**
 * Parse a project file back into app state. Defensive by design — a hand-edited or
 * truncated file should surface a clear error, never a half-applied broken state.
 */
export async function loadProject(file: File): Promise<AppState> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error("Not a valid project file — could not parse JSON");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Not a valid project file");
  }
  const payload = parsed as Partial<ProjectFile>;

  if (typeof payload.version !== "number") {
    throw new Error("Not a Curve Craft project file (missing version)");
  }
  if (payload.version > PROJECT_VERSION) {
    throw new Error(`Project was saved by a newer version (v${payload.version}) — update the app to open it`);
  }
  if (!payload.state || typeof payload.state !== "object") {
    throw new Error("Project file is missing its chart state");
  }

  const state = payload.state as Partial<AppState>;
  if (!Array.isArray(state.data) || !Array.isArray(state.cols)) {
    throw new Error("Project file is missing its dataset");
  }

  // Copy only known AppState keys rather than spreading the parsed object wholesale —
  // a hand-edited or malicious file can carry arbitrary extra keys, and a blind
  // `...state` would let them ride straight into app state.
  const known: (keyof AppState)[] = [
    "data", "cols", "fname", "sheets", "activeSheet", "chartType", "xCol", "yCols", "legend",
    "showGrid", "showLegend", "showMarkers", "chartTitle", "chartSubtitle",
    "xLabel", "yLabel", "plotlyTheme", "exportFormat", "exportWidth",
    "exportHeight", "exportDpi", "xTickStep", "yTickStep", "lineWidth",
    "lineDash", "showChartBorder", "chartBorderWidth", "axisFontSize",
    "axisFontFamily", "axisFontWeight", "labelFontSize", "labelFontFamily",
    "labelFontWeight", "legendFontFamily", "legendFontSize", "legendFontWeight",
    "legendCorner", "legendX", "legendY", "showMajorTicks", "majorTickLen", "majorTickWidth",
    "showMinorTicks", "minorTickLen", "minorTickWidth", "minorTickCount",
    "xRangeMin", "xRangeMax", "yRangeMin", "yRangeMax", "editMode",
    "editTargetCol", "boxShowPoints", "boxPointPos", "boxJitter",
    "bubbleSizeCol", "donutHoleSize", "barMode",
  ];
  const picked: Partial<Record<keyof AppState, unknown>> = {};
  for (const key of known) {
    if (key in state) picked[key] = state[key];
  }

  // editHistory isn't persisted, so a freshly-loaded project starts with an empty
  // undo stack rather than inheriting one from whenever it was saved. The analysis
  // fields are backfilled so projects saved before they existed still open cleanly.
  return {
    ...(picked as Partial<AppState>),
    data: state.data,
    cols: state.cols,
    editHistory: [],
    filters: state.filters ?? [],
    aggFunc: state.aggFunc ?? "none",
    sortMode: state.sortMode ?? "none",
    xAxisScale: state.xAxisScale ?? "linear",
    yAxisScale: state.yAxisScale ?? "linear",
    y2AxisScale: state.y2AxisScale ?? "linear",
    secondaryYCols: state.secondaryYCols ?? [],
    y2Label: state.y2Label ?? "",
    errorBars: state.errorBars ?? {},
    trendline: state.trendline ?? "none",
    trendlineWindow: state.trendlineWindow ?? 5,
    trendlineShowStats: state.trendlineShowStats ?? true,
    trendlineStatsCorner: state.trendlineStatsCorner ?? "bl",
    refLines: state.refLines ?? [],
    annotations: state.annotations ?? [],
    legendX: state.legendX ?? null,
    legendY: state.legendY ?? null,
    chartTool: "select",
    // Projects saved before multi-sheet support carry no `sheets` — treat the
    // single dataset they do have as the only sheet so the tab strip stays hidden.
    sheets: state.sheets?.length ? state.sheets : [{ name: state.fname ?? "Sheet 1", data: state.data }],
    activeSheet: state.activeSheet ?? 0,
  } as AppState;
}

/** "sales.csv" -> "sales.curvecraft.json" */
function defaultProjectName(fname: string): string {
  const base = fname.replace(/\.[^.]+$/, "") || "chart";
  return `${base}${PROJECT_EXTENSION}`;
}

/** Strip the extension off the loaded filename, for deriving export names. */
function baseName(fname: string): string {
  return fname.replace(/\.[^.]+$/, "") || "chart";
}

/** Shared download plumbing — build a blob, click it, release the URL. */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// A cell starting with one of these is interpreted as a formula by Excel/Sheets/
// LibreOffice on open — CSV injection (CWE-1236). Re-exporting a column that came
// from an untrusted upload would otherwise carry that risk straight through.
const CSV_FORMULA_PREFIX = /^[=+\-@\t\r]/;

function escapeCsvFormula(v: unknown): unknown {
  if (typeof v !== "string" || !CSV_FORMULA_PREFIX.test(v)) return v;
  return `'${v}`;
}

function sanitizeRowsForCsv(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const k in row) out[k] = escapeCsvFormula(row[k]);
    return out;
  });
}

/**
 * Export the *current* dataset back to CSV — including any rows added/deleted via
 * click-to-edit and any computed columns added by the formula editor.
 */
export function downloadDataCsv(state: AppState): void {
  if (!state.data.length) throw new Error("No data to export");
  // Export what the chart is actually showing. With filters/aggregation active the
  // raw rows would not match the picture on screen, which is how people ship wrong numbers.
  const { rows, transformed } = analyze(state);
  const columns = transformed && state.aggFunc !== "none"
    ? [state.xCol, ...state.yCols].filter(Boolean)
    : state.cols;
  const csv = Papa.unparse(sanitizeRowsForCsv(rows), { columns });
  const suffix = transformed ? "analysis" : "edited";
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `${baseName(state.fname)}-${suffix}.csv`);
}

/** Read the rendered chart as a PNG data URL at the user's configured export size. */
async function chartPngDataUrl(state: AppState): Promise<string> {
  const Plotly = window.Plotly;
  const el = document.getElementById("cc-chart");
  if (!Plotly || !el) throw new Error("Chart engine not ready");
  return Plotly.toImage(el, {
    format: "png",
    width: state.exportWidth,
    height: state.exportHeight,
    scale: state.exportDpi / 96,
  });
}

/**
 * Copy the chart to the OS clipboard as a PNG. Requires a secure context
 * (https or localhost) — the caller surfaces the error if unavailable.
 */
export async function copyChartToClipboard(state: AppState): Promise<void> {
  if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
    throw new Error("Clipboard images aren't supported in this browser");
  }
  const dataUrl = await chartPngDataUrl(state);
  const blob = await (await fetch(dataUrl)).blob();
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}

/**
 * Export the chart as a single-page PDF sized to the image, so it prints without
 * scaling artifacts. jsPDF is imported lazily — it's ~350 KB and most sessions
 * never export a PDF.
 */
export async function downloadChartPdf(state: AppState): Promise<void> {
  const dataUrl = await chartPngDataUrl(state);
  const { jsPDF } = await import("jspdf");
  const w = state.exportWidth;
  const h = state.exportHeight;
  const pdf = new jsPDF({
    orientation: w >= h ? "landscape" : "portrait",
    unit: "px",
    format: [w, h],
  });
  pdf.addImage(dataUrl, "PNG", 0, 0, w, h);
  pdf.save(`${baseName(state.fname)}.pdf`);
}
