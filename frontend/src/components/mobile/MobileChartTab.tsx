import { useState } from "react";
import { cn } from "@/lib/utils";
import ChartArea from "@/components/ChartArea";
import { CHART_TYPES } from "@/lib/chartTypes";
import type { AppState, AppTheme, ChartType } from "@/types";

interface Props {
  state: AppState;
  theme: AppTheme;
  onChange: (patch: Partial<AppState>) => void;
}

// Mockup shows 5 tiles: the 4 most common types plus a "More" tile that
// reveals the rest inline — matches the chart-type picker's own principle
// (ChartPanel.tsx) without needing a separate sheet/modal primitive.
const PRIMARY_TYPES: ChartType[] = ["line", "scatter", "bar", "area"];

export default function MobileChartTab({ state, theme, onChange }: Props) {
  const [showMore, setShowMore] = useState(false);
  const moreTypes = CHART_TYPES.filter((t) => !PRIMARY_TYPES.includes(t.id));

  function pick(id: ChartType) {
    // Same reset ChartPanel.tsx does — a delete handler wired to the old
    // chart type would map clicks to the wrong rows.
    onChange({ chartType: id, editMode: "off" });
    setShowMore(false);
  }

  const tileCls = (sel: boolean) =>
    cn(
      "flex h-[60px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl border transition-colors active:scale-[0.96]",
      sel ? "border-[var(--accent)]" : "border-[var(--border)]",
    );
  const tileStyle = (sel: boolean) => ({
    background: sel ? "var(--accent-soft)" : "var(--raised)",
    color: sel ? "var(--accent-2)" : "var(--text-2)",
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1">
        <ChartArea state={state} theme={theme} panelWidth={0} onChange={onChange} />
      </div>

      <div className="flex flex-shrink-0 flex-col gap-2.5 px-4 pb-3 pt-2.5">
        <div className="flex gap-2">
          {PRIMARY_TYPES.map((id) => {
            const meta = CHART_TYPES.find((t) => t.id === id)!;
            const sel = state.chartType === id;
            return (
              <button key={id} className={tileCls(sel)} style={tileStyle(sel)} onClick={() => pick(id)}>
                <svg width="20" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={meta.sw} strokeLinecap="round" strokeLinejoin="round"><path d={meta.d} /></svg>
                <span className="text-[11px]" style={{ fontWeight: sel ? 600 : 400 }}>{meta.label}</span>
              </button>
            );
          })}
          <button
            className={tileCls(showMore || moreTypes.some((t) => t.id === state.chartType))}
            style={tileStyle(showMore || moreTypes.some((t) => t.id === state.chartType))}
            onClick={() => setShowMore((s) => !s)}
            aria-expanded={showMore}
          >
            <svg width="20" height="14" viewBox="0 0 22 18"><circle cx="5" cy="9" r="1.8" fill="currentColor" /><circle cx="11" cy="9" r="1.8" fill="currentColor" /><circle cx="17" cy="9" r="1.8" fill="currentColor" /></svg>
            <span className="text-[11px]">More</span>
          </button>
        </div>

        {showMore && (
          <div className="grid grid-cols-4 gap-2">
            {moreTypes.map((t) => {
              const sel = state.chartType === t.id;
              return (
                <button
                  key={t.id}
                  className={cn(
                    "flex h-[56px] flex-col items-center justify-center gap-1 rounded-xl border transition-colors active:scale-[0.95]",
                    sel ? "border-[var(--accent)]" : "border-[var(--border)]",
                  )}
                  style={tileStyle(sel)}
                  onClick={() => pick(t.id)}
                >
                  <svg width="18" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={t.sw} strokeLinecap="round" strokeLinejoin="round"><path d={t.d} /></svg>
                  <span className="text-[10px]">{t.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* X axis */}
        <label className="flex h-[52px] items-center gap-3 rounded-2xl border px-4" style={{ borderColor: "var(--border)", background: "var(--raised)" }}>
          <span className="w-4 text-[13px]" style={{ color: "var(--text-3)" }}>X</span>
          <select
            className="min-w-0 flex-1 appearance-none bg-transparent font-mono text-[14px] outline-none"
            style={{ color: "var(--text)" }}
            aria-label="X axis column"
            value={state.xCol}
            onChange={(e) => onChange({ xCol: e.target.value })}
          >
            {state.cols.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4 L10 8 L6 12" stroke="var(--text-3)" strokeWidth="1.8" strokeLinecap="round" /></svg>
        </label>

        {/* Y axes */}
        <div className="flex flex-col gap-1.5 rounded-2xl border p-3" style={{ borderColor: "var(--border)", background: "var(--raised)" }}>
          <div className="flex items-center gap-2 px-1">
            <span className="w-4 text-[13px]" style={{ color: "var(--text-3)" }}>Y</span>
            <span className="min-w-0 flex-1 truncate font-mono text-[14px]" style={{ color: "var(--text)" }}>
              {state.yCols.join(" · ") || "None selected"}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 px-1">
            {state.cols.map((col) => {
              const sel = state.yCols.includes(col);
              return (
                <button
                  key={col}
                  onClick={() => {
                    if (sel) {
                      if (state.yCols.length === 1) return;
                      onChange({ yCols: state.yCols.filter((c) => c !== col) });
                    } else {
                      onChange({ yCols: [...state.yCols, col] });
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors active:scale-[0.96]"
                  style={{
                    borderColor: sel ? "var(--accent)" : "var(--border)",
                    background: sel ? "var(--accent-soft)" : "var(--panel)",
                    color: sel ? "var(--accent-2)" : "var(--text-2)",
                  }}
                >
                  <span className="h-2 w-2 flex-none rounded-full" style={{ background: state.legend[col]?.color }} />
                  {col}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
