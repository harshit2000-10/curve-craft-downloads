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
import { usePanelWidth } from "@/hooks/usePanelWidth";
import Papa from "papaparse";
import { uploadCSV, applyFormula } from "@/lib/api";
import { PAL } from "@/lib/palette";
import { CHART_TYPE_ORDER, cycleChartType } from "@/lib/chartTypes";
import { isNumericCol } from "@/lib/analysis";
import {
  saveProject, loadProject, PROJECT_EXTENSION,
  copyChartToClipboard, downloadChartPdf, downloadDataCsv,
} from "@/lib/project";
import type { AppState, LineDash } from "@/types";


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

function initState(data: Record<string, unknown>[], fname: string, theme: "dark" | "light"): AppState {
  const cols = Object.keys(data[0] ?? {});
  const legend: AppState["legend"] = {};
  cols.forEach((c, i) => {
    legend[c] = { label: c, color: PAL[i % PAL.length], visible: true };
  });

  // Pick defaults by column *type*, not position. Picking positionally means a real
  // file like `date,region,product,revenue` plots two text columns and renders garbage.
  const numericCols = cols.filter((c) => isNumericCol(data, c));
  const textCols = cols.filter((c) => !numericCols.includes(c));
  const defaultX = textCols[0] ?? cols[0] ?? "";
  const defaultY = (numericCols.length ? numericCols : cols.slice(1)).filter((c) => c !== defaultX).slice(0, 2);

  return {
    data,
    cols,
    fname,
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
        setAppState(initState(result.data, file.name, theme));
        if (result.extraSheets) {
          const { loaded, skipped } = result.extraSheets;
          // Longer than the default toast — this is a data-integrity fact the
          // user needs to actually read, not a routine "loaded" confirmation.
          showToast(
            `Loaded sheet "${loaded}" · ${skipped.length} other sheet${skipped.length === 1 ? "" : "s"} skipped (${skipped.join(", ")})`,
            7000,
          );
        } else {
          showToast(`Loaded ${result.shape[0].toLocaleString()} rows · ${result.columns.length} cols`);
        }
      })
      .catch((e: Error) => showToast(`Upload failed: ${e.message}`));
  }

  function loadSample() {
    const data = parseCSV(SAMPLE_CSV);
    setAppState(initState(data, "sample_data.csv", theme));
    showToast("Loaded sample dataset — 12 rows · 5 cols");
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
    handleChange({ data: prev, editHistory: appState.editHistory.slice(0, -1) });
    showToast("Undid last edit");
  }

  const handleChange = useCallback((patch: Partial<AppState>) => {
    setAppState((prev) => prev ? { ...prev, ...patch } : prev);
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
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appState]);

  const isDark = theme === "dark";

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

      {!appState ? (
        <UploadScreen
          theme={theme}
          onFile={loadFile}
          onSample={loadSample}
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
