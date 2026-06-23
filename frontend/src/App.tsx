import { useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";
import { GlassFilter } from "@/components/ui/liquid-glass";
import UploadScreen from "@/components/UploadScreen";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import ChartArea from "@/components/ChartArea";
import Papa from "papaparse";
import { uploadCSV, applyFormula } from "@/lib/api";
import type { AppState, LineDash } from "@/types";

const PAL = [
  "#7c6cf8","#f97316","#22c55e","#ef4444","#06b6d4",
  "#f59e0b","#ec4899","#84cc16","#8b5cf6","#14b8a6",
];


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

function initState(data: Record<string, unknown>[], fname: string): AppState {
  const cols = Object.keys(data[0] ?? {});
  const legend: AppState["legend"] = {};
  cols.forEach((c, i) => {
    legend[c] = { label: c, color: PAL[i % PAL.length], visible: true };
  });
  return {
    data,
    cols,
    fname,
    chartType: "line",
    xCol: cols[0] ?? "",
    yCols: cols.slice(1, 3),
    legend,
    showGrid: true,
    showLegend: true,
    showMarkers: true,
    chartTitle: "",
    chartSubtitle: "",
    xLabel: "",
    yLabel: "",
    plotlyTheme: "plotly_white",
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
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout>>();

  function showToast(msg: string) {
    setToast(msg);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3200);
  }

  function loadFile(file: File) {
    uploadCSV(file)
      .then((result) => {
        setAppState(initState(result.data, file.name));
        showToast(`Loaded ${result.shape[0].toLocaleString()} rows · ${result.columns.length} cols`);
      })
      .catch((e: Error) => showToast(`Upload failed: ${e.message}`));
  }

  function loadSample() {
    const data = parseCSV(SAMPLE_CSV);
    setAppState(initState(data, "sample_data.csv"));
    showToast("Loaded sample dataset — 12 rows · 5 cols");
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

  const isDark = theme === "dark";

  return (
    <div className={cn("h-full", isDark ? "dark" : "light")}>
      <GlassFilter />
      {!appState ? (
        <UploadScreen
          theme={theme}
          onFile={loadFile}
          onSample={loadSample}
          onToggleTheme={toggleTheme}
        />
      ) : (
        <div className={cn("flex h-full flex-col", isDark ? "bg-[#0b0b10] text-white" : "bg-gray-50 text-black")}>
          <Navbar
            fname={appState.fname}
            theme={theme}
            onReset={() => setAppState(null)}
            onExport={handleExport}
            onToggleTheme={toggleTheme}
          />
          <main className="flex flex-1 overflow-hidden">
            <h1 className="sr-only">Curve Craft — Chart Editor</h1>
            <Sidebar
              state={appState}
              theme={theme}
              onChange={handleChange}
              onAddColumn={handleAddColumn}
              onExport={handleExport}
            />
            <ChartArea
              state={appState}
              theme={theme}
              onChange={handleChange}
            />
          </main>
        </div>
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
