import { useState, useCallback, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";
import { X } from "lucide-react";
import { GlassFilter, GlassBtn } from "@/components/ui/liquid-glass";
import UploadScreen from "@/components/UploadScreen";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import PanelDivider from "@/components/PanelDivider";
import ChartArea from "@/components/ChartArea";
import MobileApp from "@/components/mobile/MobileApp";
import { usePanelWidth } from "@/hooks/usePanelWidth";
import { useIsMobile } from "@/hooks/useIsMobile";
import Papa from "papaparse";
import { uploadCSV, applyFormula } from "@/lib/api";
import { PAL } from "@/lib/palette";
import { CHART_TYPE_ORDER, cycleChartType } from "@/lib/chartTypes";
import { isNumericCol, toNum } from "@/lib/analysis";
import { deleteColumn, renameColumn, fillBlanksWithMean } from "@/lib/cleaning";
import {
  saveProject, loadProject, PROJECT_EXTENSION,
  copyChartToClipboard, downloadChartPdf, downloadDataCsv,
} from "@/lib/project";
import type { AppState, DataSheet, LineDash } from "@/types";


// Show the platform-native modifier symbol so the hints match the user's keyboard.
const MOD = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl";

const SAMPLE_CSV = `month,revenue,cost,units,profit
Jan,12400,7200,142,5200
Feb,14800,8100,168,6700
Mar,11200,6900,128,4300
Apr,16300,9200,189,7100
May,19100,10400,215,8700
Jun,17600,9800,201,7800
Jul,21200,11200,238,10000
Aug,23400,12100,262,11300
Sep,20100,10900,224,9200
Oct,24800,13100,278,11700
Nov,28900,14800,321,14100
Dec,32100,16200,358,15900`;

/** Column defaults for a freshly-seen dataset. Picks by column *type*, not
 * position — a real file like `date,region,product,revenue` would otherwise
 * plot two text columns and render garbage. Shared by initial load and sheet
 * switching, so both derive axes the same way. */
function deriveColumns(data: Record<string, unknown>[]) {
  const cols = Object.keys(data[0] ?? {});
  const legend: AppState["legend"] = {};
  cols.forEach((c, i) => {
    legend[c] = { label: c, color: PAL[i % PAL.length], visible: true };
  });

  const numericCols = cols.filter((c) => isNumericCol(data, c));
  const textCols = cols.filter((c) => !numericCols.includes(c));
  const xCol = textCols[0] ?? cols[0] ?? "";
  const yCols = (numericCols.length ? numericCols : cols.slice(1)).filter((c) => c !== xCol).slice(0, 2);

  return { cols, legend, xCol, yCols, numericCols };
}

function initState(
  data: Record<string, unknown>[],
  fname: string,
  theme: "dark" | "light",
  sheets?: DataSheet[],
): AppState {
  const { cols, legend, xCol: defaultX, yCols: defaultY, numericCols } = deriveColumns(data);

  return {
    data,
    cols,
    fname,
    sheets: sheets?.length ? sheets : [{ name: fname, data }],
    activeSheet: 0,
    chartType: "line",
    xCol: defaultX,
    yCols: defaultY,
    legend,
    showGrid: true,
    showLegend: true,
    showMarkers: true,
    chartTitle: "",
    chartSubtitle: "",
    xLabel: "",
    yLabel: "",
    plotlyTheme: theme === "dark" ? "plotly_dark" : "plotly_white",
    exportFormat: "png",
    exportWidth: 1920,
    exportHeight: 1080,
    exportDpi: 150,
    xTickStep: null,
    yTickStep: null,
    lineWidth: 2,
    lineDash: "solid" as LineDash,
    showChartBorder: false,
    chartBorderWidth: 1,
    axisFontSize: 12,
    axisFontFamily: "Arial",
    axisFontWeight: 400,
    labelFontSize: 14,
    labelFontFamily: "Arial",
    labelFontWeight: 400,
    legendFontFamily: "Arial",
    legendFontSize: 12,
    legendFontWeight: 400,
    legendCorner: "tr" as const,
    legendX: null,
    legendY: null,
    showMajorTicks: true,
    majorTickLen: 6,
    majorTickWidth: 1,
    showMinorTicks: false,
    minorTickLen: 3,
    minorTickWidth: 1,
    minorTickCount: 4,
    xRangeMin: null,
    xRangeMax: null,
    yRangeMin: null,
    yRangeMax: null,
    editMode: "off",
    editTargetCol: defaultY[0] ?? cols[0] ?? "",
    editHistory: [],
    redoHistory: [],
    boxShowPoints: true,
    boxPointPos: 0,
    boxJitter: 0.35,
    bubbleSizeCol: numericCols.find((c) => !defaultY.includes(c)) ?? defaultY[0] ?? "",
    donutHoleSize: 0.6,
    barMode: "group",
    filters: [],
    aggFunc: "none",
    sortMode: "none",
    xAxisScale: "linear",
    yAxisScale: "linear",
    y2AxisScale: "linear",
    secondaryYCols: [],
    y2Label: "",
    errorBars: {},
    trendline: "none",
    trendlineWindow: 5,
    trendlineShowStats: true,
    trendlineStatsCorner: "bl",
    refLines: [],
    annotations: [],
    chartTool: "select",
  };
}

function parseCSV(text: string): Record<string, unknown>[] {
  const result = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  });
  return result.data;
}

export default function App() {
  const { theme, toggle } = useTheme();
  function toggleTheme() {
    toggle();
    // Auto-sync chart theme with app theme
    setAppState((prev) => {
      if (!prev) return prev;
      const nextTheme = theme === "dark" ? "light" : "dark";
      const syncedPlotly = nextTheme === "dark" ? "plotly_dark" : "plotly_white";
      // Only auto-switch if user hasn't manually picked a non-default theme
      const isDefault = prev.plotlyTheme === "plotly_dark" || prev.plotlyTheme === "plotly_white";
      return isDefault ? { ...prev, plotlyTheme: syncedPlotly } : prev;
    });
  }
  const [appState, setAppState] = useState<AppState | null>(null);
  const {
    width: panelWidth, setWidth: setPanelWidth,
    commit: commitPanelWidth, reset: resetPanelWidth,
  } = usePanelWidth();
  const [toast, setToast] = useState<string | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  // Below the `lg` breakpoint the side panel becomes a drawer instead of a
  // permanently docked column — this tracks whether it's open. Irrelevant at
  // `lg` and up, where CSS keeps it visible regardless of this value.
  const [panelOpen, setPanelOpen] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const projectInputRef = useRef<HTMLInputElement>(null);

  function showToast(msg: string, durationMs = 3200) {
    setToast(msg);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), durationMs);
  }

  function loadFile(file: File) {
    uploadCSV(file)
      .then((result) => {
        setAppState(initState(result.data, file.name, theme, result.sheets));
        const rows = `${result.shape[0].toLocaleString()} rows · ${result.columns.length} cols`;
        showToast(
          result.sheets.length > 1
            ? `Loaded ${result.sheets.length} sheets — showing "${result.sheets[0].name}" · ${rows}`
            : `Loaded ${rows}`,
        );
      })
      .catch((e: Error) => showToast(`Upload failed: ${e.message}`));
  }

  function loadSample() {
    const data = parseCSV(SAMPLE_CSV);
    setAppState(initState(data, "sample_data.csv", theme));
    showToast("Loaded sample dataset — 12 rows · 5 cols");
  }

  function handleCreateData(data: Record<string, unknown>[]) {
    setAppState(initState(data, "custom_data.csv", theme));
    showToast(`Created ${data.length.toLocaleString()} row${data.length === 1 ? "" : "s"} · ${Object.keys(data[0] ?? {}).length} cols`);
  }

  function handleSaveProject() {
    if (!appState) return;
    try {
      saveProject(appState);
      showToast("Project saved to your downloads");
    } catch (e) {
      showToast(`Save failed: ${(e as Error).message}`);
    }
  }

  function handleOpenProject(file: File) {
    loadProject(file)
      .then((loaded) => {
        setAppState(loaded);
        showToast(`Opened project — ${loaded.data.length.toLocaleString()} rows · ${loaded.cols.length} cols`);
      })
      .catch((e: Error) => showToast(`Open failed: ${e.message}`));
  }

  function handleCopyChart() {
    if (!appState) return;
    copyChartToClipboard(appState)
      .then(() => showToast("Chart copied to clipboard"))
      .catch((e: Error) => showToast(`Copy failed: ${e.message}`));
  }

  function handleExportPdf() {
    if (!appState) return;
    downloadChartPdf(appState)
      .then(() => showToast(`Exported PDF · ${appState.exportWidth}×${appState.exportHeight}`))
      .catch((e: Error) => showToast(`PDF export failed: ${e.message}`));
  }

  function handleExportCsv() {
    if (!appState) return;
    try {
      downloadDataCsv(appState);
      showToast(`Exported ${appState.data.length.toLocaleString()} rows to CSV`);
    } catch (e) {
      showToast(`CSV export failed: ${(e as Error).message}`);
    }
  }

  function handleUndo() {
    if (!appState?.editHistory.length) { showToast("Nothing to undo"); return; }
    const prev = appState.editHistory[appState.editHistory.length - 1];
    // Recompute cols from the restored data rather than trusting the current
    // ones — editHistory only stores rows to stay light, so if anything that
    // changes column count/names ever starts pushing to it, this keeps cols
    // from silently drifting out of sync with what undo just restored.
    handleChange({
      data: prev,
      cols: Object.keys(prev[0] ?? {}),
      editHistory: appState.editHistory.slice(0, -1),
      redoHistory: [...appState.redoHistory, appState.data],
    });
    showToast("Undid last edit");
  }

  function handleRedo() {
    if (!appState?.redoHistory.length) { showToast("Nothing to redo"); return; }
    const next = appState.redoHistory[appState.redoHistory.length - 1];
    handleChange({
      data: next,
      cols: Object.keys(next[0] ?? {}),
      editHistory: [...appState.editHistory, appState.data],
      redoHistory: appState.redoHistory.slice(0, -1),
    });
    showToast("Redid edit");
  }

  const handleChange = useCallback((patch: Partial<AppState>) => {
    setAppState((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      // Any new edit invalidates the redo stack — unless the patch is itself
      // an undo/redo (those set redoHistory explicitly alongside data).
      if ("data" in patch && !("redoHistory" in patch)) next.redoHistory = [];
      return next;
    });
  }, []);

  function handleAddColumn(name: string, expr: string) {
    if (!appState) return;
    applyFormula(appState.data, expr, name)
      .then((result) => {
        const newCols = result.columns;
        setAppState((prev) => {
          if (!prev) return prev;
          const newLegend = { ...prev.legend };
          if (!newLegend[name]) {
            newLegend[name] = { label: name, color: PAL[(newCols.length - 1) % PAL.length], visible: true };
          }
          return { ...prev, data: result.data, cols: newCols, legend: newLegend };
        });
        showToast(`Column "${name}" added`);
      })
      .catch((e: Error) => showToast(`Formula error: ${e.message}`));
  }

  function handleDeleteColumn(col: string) {
    if (!appState) return;
    try {
      handleChange(deleteColumn(appState, col));
      showToast(`Column "${col}" deleted`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Couldn't delete column");
    }
  }

  function handleRenameColumn(oldName: string, newName: string) {
    if (!appState) return;
    try {
      const patch = renameColumn(appState, oldName, newName);
      if (Object.keys(patch).length === 0) return;
      handleChange(patch);
      showToast(`Renamed "${oldName}" → "${newName}"`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Couldn't rename column");
    }
  }

  function handleEditCell(rowIndex: number, col: string, rawValue: string) {
    if (!appState) return;
    // Keep a numeric column numeric so it stays plottable — a cell that was
    // "142" shouldn't turn the whole column into text just because it got
    // clicked and re-typed. Falls back to the raw string when it doesn't
    // parse (or the column was already text), same rule toNum() uses elsewhere.
    const wasNumeric = isNumericCol(appState.data, col);
    const parsed = toNum(rawValue);
    const value = wasNumeric && parsed !== null ? parsed : rawValue;
    const data = appState.data.map((row, i) => (i === rowIndex ? { ...row, [col]: value } : row));
    handleChange({ data });
  }

  function handleSelectSheet(index: number) {
    if (!appState || index === appState.activeSheet) return;
    const target = appState.sheets[index];
    if (!target) return;

    // Write the working rows back first — cell edits, added columns and deleted
    // rows live in `data`, and would be lost on the round trip otherwise.
    const sheets = appState.sheets.map((s, i) =>
      i === appState.activeSheet ? { ...s, data: appState.data } : s,
    );

    const cols = Object.keys(target.data[0] ?? {});
    // Sheets that share a schema (monthly tabs, per-region tabs) are the common
    // case — keep the user's axes and styling when the columns still exist, and
    // only fall back to fresh defaults when the new sheet is shaped differently.
    const sameSchema =
      appState.xCol && cols.includes(appState.xCol) && appState.yCols.every((c) => cols.includes(c));

    const derived = sameSchema ? null : deriveColumns(target.data);

    handleChange({
      sheets,
      activeSheet: index,
      data: target.data,
      cols,
      ...(derived
        ? {
            legend: derived.legend,
            xCol: derived.xCol,
            yCols: derived.yCols,
            editTargetCol: derived.yCols[0] ?? cols[0] ?? "",
            bubbleSizeCol: derived.numericCols.find((c) => !derived.yCols.includes(c)) ?? derived.yCols[0] ?? "",
            // Column-scoped settings can't survive a schema change.
            secondaryYCols: [],
            filters: [],
            errorBars: {},
            refLines: [],
          }
        : {}),
      // Undo history holds rows from the sheet we just left — replaying it here
      // would write another sheet's data into this one.
      editHistory: [],
      redoHistory: [],
      editMode: "off",
    });
    showToast(`Sheet "${target.name}" — ${target.data.length.toLocaleString()} rows · ${cols.length} cols`);
  }

  function handleFillBlanks(col: string) {
    if (!appState) return;
    const patch = fillBlanksWithMean(appState, col);
    if (Object.keys(patch).length === 0) { showToast(`No blank cells in "${col}"`); return; }
    handleChange(patch);
    showToast(`Filled blanks in "${col}" with the column mean`);
  }

  function handleDeleteRow(rowIndex: number) {
    if (!appState) return;
    handleChange({ data: appState.data.filter((_, i) => i !== rowIndex) });
  }

  function handleDeleteRows(rowIndices: number[]) {
    if (!appState || rowIndices.length === 0) return;
    const toDelete = new Set(rowIndices);
    handleChange({ data: appState.data.filter((_, i) => !toDelete.has(i)) });
    showToast(`Deleted ${rowIndices.length} row${rowIndices.length === 1 ? "" : "s"}`);
  }

  function handleExport() {
    if (!appState) return;
    if (!window.Plotly) { showToast("Chart engine not ready — try again in a moment"); return; }
    const chartEl = document.getElementById("cc-chart") as (HTMLElement & {
      data?: unknown[];
      layout?: unknown;
    }) | null;
    if (!chartEl?.data) { showToast("Chart not ready — load a file first"); return; }

    const scale = appState.exportDpi / 96;

    window.Plotly.downloadImage(chartEl, {
      format: appState.exportFormat,
      width: appState.exportWidth,
      height: appState.exportHeight,
      scale,
      filename: `curve_craft_chart`,
    });
    showToast(`Downloaded · ${appState.exportWidth}×${appState.exportHeight} @ ${appState.exportDpi} DPI`);
  }

  // Keyboard shortcuts. Only active once a dataset is loaded, and never while the
  // user is typing into an input — otherwise Ctrl+S in the title field would fight
  // the browser's own save dialog.
  useEffect(() => {
    if (!appState) return;
    function onKeyDown(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      const typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
      // Never hijack keys while the user is editing text — Ctrl+S in the title
      // field should reach the browser, and "1" should type a 1.
      if (typing) return;
      if (e.altKey) return;

      const key = e.key.toLowerCase();

      // Unmodified keys: chart-type switching + the help overlay.
      if (!e.metaKey && !e.ctrlKey) {
        if (key === "?" || (key === "/" && e.shiftKey)) { e.preventDefault(); setShowShortcuts((s) => !s); return; }
        if (key === "escape") { setShowShortcuts(false); setPanelOpen(false); return; }
        if (key === "[") { e.preventDefault(); handleChange({ chartType: cycleChartType(appState!.chartType, -1), editMode: "off" }); return; }
        if (key === "]") { e.preventDefault(); handleChange({ chartType: cycleChartType(appState!.chartType, 1), editMode: "off" }); return; }
        // 1–9 jump straight to the first nine chart types, matching the grid order.
        if (/^[1-9]$/.test(key)) {
          const target = CHART_TYPE_ORDER[Number(key) - 1];
          if (target) { e.preventDefault(); handleChange({ chartType: target, editMode: "off" }); }
        }
        return;
      }

      // Ctrl/⌘ combos.
      if (key === "s") { e.preventDefault(); handleSaveProject(); }
      else if (key === "o") { e.preventDefault(); projectInputRef.current?.click(); }
      else if (key === "e") { e.preventDefault(); handleExport(); }
      else if (key === "c" && e.shiftKey) { e.preventDefault(); handleCopyChart(); }
      else if (key === "z" && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      else if ((key === "z" && e.shiftKey) || key === "y") { e.preventDefault(); handleRedo(); }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appState]);

  const isDark = theme === "dark";
  const isMobile = useIsMobile();

  return (
    <div className={cn("h-full", isDark ? "dark" : "light")}>
      <GlassFilter />

      {/* Shared project-file picker — used by both the upload screen and the navbar */}
      <input
        ref={projectInputRef}
        type="file"
        accept={`${PROJECT_EXTENSION},application/json`}
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleOpenProject(file);
          // Reset so picking the same file twice still fires onChange.
          e.target.value = "";
        }}
      />

      {isMobile ? (
        <MobileApp
          appState={appState}
          theme={theme}
          onFile={loadFile}
          onSample={loadSample}
          onCreateData={handleCreateData}
          onToggleTheme={toggleTheme}
          onOpenProject={() => projectInputRef.current?.click()}
          onReset={() => setAppState(null)}
          onUndo={handleUndo}
          onChange={handleChange}
          onAddColumn={handleAddColumn}
          onDeleteColumn={handleDeleteColumn}
          onRenameColumn={handleRenameColumn}
          onFillBlanks={handleFillBlanks}
          onEditCell={handleEditCell}
          onDeleteRow={handleDeleteRow}
          onDeleteRows={handleDeleteRows}
          onExport={handleExport}
          onCopyChart={handleCopyChart}
          onExportPdf={handleExportPdf}
          onExportCsv={handleExportCsv}
          onSelectSheet={handleSelectSheet}
        />
      ) : !appState ? (
        <UploadScreen
          theme={theme}
          onFile={loadFile}
          onSample={loadSample}
          onCreateData={handleCreateData}
          onToggleTheme={toggleTheme}
          onOpenProject={() => projectInputRef.current?.click()}
        />
      ) : (
        <div className="flex h-full flex-col" style={{ background: "var(--bg)", color: "var(--text)" }}>
          <Navbar
            fname={appState.fname}
            theme={theme}
            onReset={() => setAppState(null)}
            onExport={handleExport}
            onToggleTheme={toggleTheme}
            onSaveProject={handleSaveProject}
            onOpenProject={() => projectInputRef.current?.click()}
            onShowShortcuts={() => setShowShortcuts(true)}
            onTogglePanel={() => setPanelOpen((o) => !o)}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={appState.editHistory.length > 0}
            canRedo={appState.redoHistory.length > 0}
          />
          <main className="relative flex flex-1 overflow-hidden">
            <h1 className="sr-only">Curve Craft — Chart Editor</h1>

            {/* Backdrop — below `lg` only; the panel is a drawer there, docked above it */}
            {panelOpen && (
              <div
                className="fixed inset-0 z-30 bg-black/40 lg:hidden"
                onClick={() => setPanelOpen(false)}
                aria-hidden="true"
              />
            )}

            <Sidebar
              state={appState}
              theme={theme}
              width={panelWidth}
              open={panelOpen}
              onClose={() => setPanelOpen(false)}
              onChange={handleChange}
              onAddColumn={handleAddColumn}
              onDeleteColumn={handleDeleteColumn}
              onRenameColumn={handleRenameColumn}
              onEditCell={handleEditCell}
              onDeleteRow={handleDeleteRow}
              onDeleteRows={handleDeleteRows}
              onExport={handleExport}
              onCopyChart={handleCopyChart}
              onExportPdf={handleExportPdf}
              onExportCsv={handleExportCsv}
            />
            {/* The divider resizes a docked column — meaningless once the panel
                becomes a viewport-relative drawer below `lg`. */}
            <div className="hidden lg:block">
              <PanelDivider
                width={panelWidth}
                onWidth={setPanelWidth}
                onCommit={commitPanelWidth}
                onReset={resetPanelWidth}
              />
            </div>
            <ChartArea
              state={appState}
              theme={theme}
              panelWidth={panelWidth}
              onChange={handleChange}
              onSelectSheet={handleSelectSheet}
            />
          </main>
        </div>
      )}

      {/* Keyboard shortcuts overlay — opened with "?", closed with Esc or a click */}
      {showShortcuts && appState && (
        <>
          <div
            className="fixed inset-0 z-[60] backdrop-blur-sm"
            style={{ background: "color-mix(in srgb, var(--bg) 55%, transparent)" }}
            onClick={() => setShowShortcuts(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard shortcuts"
            className="fixed left-1/2 top-1/2 z-[61] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[14px] border p-5 shadow-2xl"
            style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--text)" }}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--text-3)" }}>
                Keyboard shortcuts
              </span>
              <GlassBtn
                onClick={() => setShowShortcuts(false)}
                aria-label="Close shortcuts"
                className="flex h-6 w-6 items-center justify-center rounded-[6px] hover:opacity-70 active:scale-95"
                style={{ color: "var(--text-3)" }}
              >
                <X size={13} />
              </GlassBtn>
            </div>

            <div className="flex flex-col gap-1">
              {[
                { keys: [MOD, "S"], label: "Save project" },
                { keys: [MOD, "O"], label: "Open project" },
                { keys: [MOD, "E"], label: "Export chart" },
                { keys: [MOD, "⇧", "C"], label: "Copy chart to clipboard" },
                { keys: [MOD, "Z"], label: "Undo last data edit" },
                { keys: ["1", "–", "9"], label: "Jump to chart type" },
                { keys: ["[", "]"], label: "Previous / next chart type" },
                { keys: ["?"], label: "Toggle this panel" },
              ].map(({ keys, label }) => (
                <div key={label} className="flex items-center justify-between py-1.5 text-[13px]">
                  <span style={{ color: "var(--text-2)" }}>{label}</span>
                  <span className="flex items-center gap-1">
                    {keys.map((k, i) => (
                      k === "–" ? (
                        <span key={i} className="text-[11px]" style={{ color: "var(--text-3)" }}>–</span>
                      ) : (
                        <kbd
                          key={i}
                          className="min-w-[22px] rounded-[5px] border px-1.5 py-0.5 text-center font-mono text-[11px]"
                          style={{ borderColor: "var(--border)", background: "var(--raised)", color: "var(--text-2)" }}
                        >
                          {k}
                        </kbd>
                      )
                    ))}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-3 text-[11px] leading-relaxed" style={{ color: "var(--text-3)" }}>
              Shortcuts pause while you're typing in a field.
            </div>
          </div>
        </>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={cn(
            "fixed bottom-5 right-5 z-50 rounded-[10px] border px-4 py-2 text-xs font-medium shadow-xl",
            "animate-in fade-in slide-in-from-bottom-2 duration-200",
            isDark
              ? "border-white/12 bg-[#2a2a36] text-white/80"
              : "border-black/10 bg-white text-black/70 shadow-black/10",
          )}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
