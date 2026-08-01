import { useState } from "react";
import { cn } from "@/lib/utils";
import { Search, ChevronDown } from "lucide-react";
import { GlassBtn } from "@/components/ui/liquid-glass";
import { CHART_TYPES, chartTypeMeta } from "@/lib/chartTypes";
import { sectionLabel, card, field, fieldSm, selectField, selectChevron, easeOut } from "@/components/panels/ui";
import { isCartesian } from "@/lib/overlays";
import type { AppState, AppTheme, ChartType, AxisScale } from "@/types";

interface Props {
  state: AppState;
  theme: AppTheme;
  onChange: (patch: Partial<AppState>) => void;
}

/** Linear/Log switch. Log needs strictly positive values, hence the hint. */
function ScaleToggle({
  label, value, onChange,
}: { label: string; value: AxisScale; onChange: (v: AxisScale) => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px]" style={{ color: "var(--text-3)" }}>{label}</span>
      <div className="flex gap-1">
        {(["linear", "log"] as AxisScale[]).map((v) => {
          const on = value === v;
          return (
            <GlassBtn
              key={v}
              onClick={() => onChange(v)}
              aria-pressed={on}
              title={v === "log" ? "Logarithmic — needs values greater than zero" : "Linear scale"}
              className={cn(
                "rounded-[7px] border px-2.5 py-[3px] text-[11px] font-semibold capitalize",
                "transition-colors duration-150 active:scale-[0.95]",
                !on && "hover-device:border-[var(--accent)]",
              )}
              wrapperClassName="inline-flex items-center justify-center"
              style={{
                borderColor: on ? "var(--accent)" : "var(--border)",
                background: on ? "var(--accent-soft)" : "var(--panel)",
                color: on ? "var(--accent-2)" : "var(--text-2)",
                transitionTimingFunction: easeOut,
              }}
            >
              {v}
            </GlassBtn>
          );
        })}
      </div>
    </div>
  );
}

export default function ChartPanel({ state, onChange }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");

  const current = chartTypeMeta(state.chartType);
  const q = query.trim().toLowerCase();
  const matches = q ? CHART_TYPES.filter((t) => t.name.toLowerCase().includes(q)) : CHART_TYPES;

  function pick(id: ChartType) {
    // editMode is reset on every type change — a delete handler wired to the old
    // chart type would map clicks to the wrong rows.
    onChange({ chartType: id, editMode: "off" });
    setPickerOpen(false);
    setQuery("");
  }

  return (
    <div className="flex flex-col gap-3.5">
      {/* ── Chart type ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <div className={sectionLabel}>Chart type</div>

        <GlassBtn
          onClick={() => setPickerOpen((o) => !o)}
          aria-expanded={pickerOpen}
          aria-label={`Chart type: ${current.name}. Click to change.`}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-[10px] border px-3 py-[9px]",
            "transition-colors duration-150 active:scale-[0.98]",
            "hover-device:border-[var(--accent)]",
          )}
          wrapperClassName="flex items-center gap-2.5 w-full"
          style={{ borderColor: "var(--border)", background: "var(--panel)", transitionTimingFunction: easeOut }}
        >
          <span
            className="inline-flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[8px]"
            style={{ background: "var(--accent-soft)", color: "var(--accent-2)" }}
          >
            <svg
              width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={current.sw}
              strokeLinecap="round" strokeLinejoin="round"
            >
              <path d={current.d} />
            </svg>
          </span>
          <span className="flex-1 text-left text-[13.5px] font-semibold" style={{ color: "var(--text)" }}>
            {current.name}
          </span>
          <ChevronDown
            size={14}
            style={{
              color: "var(--text-3)",
              transform: pickerOpen ? "rotate(180deg)" : "none",
              transition: `transform 0.2s ${easeOut}`,
            }}
          />
        </GlassBtn>

        {pickerOpen && (
          <div
            className="flex flex-col gap-2 rounded-[10px] border p-2.5"
            style={{ borderColor: "var(--border)", background: "var(--panel)", boxShadow: "var(--shadow)" }}
          >
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-[9px] top-[9px]"
                style={{ color: "var(--text-3)" }}
              />
              <input
                autoFocus
                className={cn(field, "py-1.5 pl-7 text-[12.5px]")}
                placeholder="Search chart types…"
                aria-label="Search chart types"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") { setPickerOpen(false); setQuery(""); }
                  // A single match + Enter is the fast path for keyboard users.
                  if (e.key === "Enter" && matches.length === 1) pick(matches[0].id);
                }}
              />
            </div>

            <div className="grid grid-cols-4 gap-[5px]">
              {matches.map((t) => {
                const sel = state.chartType === t.id;
                return (
                  <GlassBtn
                    key={t.id}
                    onClick={() => pick(t.id)}
                    title={t.name}
                    aria-label={t.name}
                    aria-pressed={sel}
                    className={cn(
                      "flex flex-col items-center gap-[3px] rounded-[8px] border px-0.5 py-[7px]",
                      "text-[9.5px] font-semibold transition-colors duration-150 active:scale-[0.94]",
                      !sel && "hover-device:border-[var(--accent)]",
                    )}
                    wrapperClassName="flex flex-col items-center gap-[3px] w-full"
                    style={{
                      // Selection uses an inset ring rather than a thicker border, so
                      // picking a type never nudges the grid by a pixel.
                      borderColor: sel ? "var(--accent)" : "var(--border)",
                      boxShadow: sel ? "inset 0 0 0 1px var(--accent)" : undefined,
                      background: sel ? "var(--accent-soft)" : "var(--panel)",
                      color: sel ? "var(--accent-2)" : "var(--text-3)",
                      transitionTimingFunction: easeOut,
                    }}
                  >
                    <svg
                      width="18" height="18" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth={t.sw}
                      strokeLinecap="round" strokeLinejoin="round"
                    >
                      <path d={t.d} />
                    </svg>
                    <span>{t.label}</span>
                  </GlassBtn>
                );
              })}
            </div>

            {!matches.length && (
              <div className="py-1 text-center text-[12px]" style={{ color: "var(--text-3)" }}>
                No chart types match “{query}”
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── X axis ─────────────────────────────────────────────────── */}
      <div className={card}>
        <div className={sectionLabel}>X axis</div>
        <select
          className={selectField}
          style={selectChevron}
          aria-label="X axis column"
          value={state.xCol}
          onChange={(e) => onChange({ xCol: e.target.value })}
        >
          <option value="">Select column…</option>
          {state.cols.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input
            className={fieldSm}
            placeholder="Axis label"
            aria-label="X axis label"
            value={state.xLabel}
            onChange={(e) => onChange({ xLabel: e.target.value })}
          />
          <input
            type="number"
            className={fieldSm}
            placeholder="Step"
            aria-label="X axis step size"
            min={0}
            step="any"
            value={state.xTickStep ?? ""}
            onChange={(e) => onChange({ xTickStep: e.target.value ? Number(e.target.value) : null })}
          />
        </div>
        <ScaleToggle
          label="X scale"
          value={state.xAxisScale}
          onChange={(v) => onChange({ xAxisScale: v })}
        />
      </div>

      {/* ── Y axes ─────────────────────────────────────────────────── */}
      <div className={card}>
        <div className="flex items-baseline gap-1.5">
          <span className={sectionLabel}>Y axes</span>
          <span className="text-[10.5px]" style={{ color: "var(--text-3)" }}>select one or more</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {state.cols.map((col) => {
            const cfg = state.legend[col];
            const sel = state.yCols.includes(col);
            return (
              <GlassBtn
                key={col}
                onClick={() => {
                  if (sel) {
                    if (state.yCols.length === 1) return;
                    const nextYCols = state.yCols.filter((c) => c !== col);
                    // Keep editTargetCol valid — it drives which column click-to-add writes
                    // into, and a stale value silently adds points to a column no longer plotted.
                    const nextEditTargetCol = state.editTargetCol === col ? nextYCols[0] : state.editTargetCol;
                    onChange({ yCols: nextYCols, editTargetCol: nextEditTargetCol });
                  } else {
                    onChange({ yCols: [...state.yCols, col] });
                  }
                }}
                aria-pressed={sel}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[5px]",
                  "text-[12px] font-medium transition-colors duration-150 active:scale-[0.96]",
                  !sel && "hover-device:border-[var(--accent)]",
                )}
                wrapperClassName="inline-flex items-center gap-1.5"
                style={{
                  borderColor: sel ? "var(--accent)" : "var(--border)",
                  background: sel ? "var(--accent-soft)" : "var(--panel)",
                  color: sel ? "var(--accent-2)" : "var(--text-2)",
                  transitionTimingFunction: easeOut,
                }}
              >
                <span className="h-2 w-2 flex-none rounded-full" style={{ background: cfg?.color }} />
                {col}
              </GlassBtn>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <input
            className={fieldSm}
            placeholder="Y label"
            aria-label="Y axis label"
            value={state.yLabel}
            onChange={(e) => onChange({ yLabel: e.target.value })}
          />
          <input
            type="number"
            className={fieldSm}
            placeholder="Step"
            aria-label="Y axis step size"
            min={0}
            step="any"
            value={state.yTickStep ?? ""}
            onChange={(e) => onChange({ yTickStep: e.target.value ? Number(e.target.value) : null })}
          />
        </div>
        <ScaleToggle
          label="Y scale"
          value={state.yAxisScale}
          onChange={(v) => onChange({ yAxisScale: v })}
        />
      </div>

      {/* ── Secondary Y axis — only meaningful on the x/y families ──── */}
      {isCartesian(state) && state.yCols.length > 0 && (
        <div className={card}>
          <div className="flex items-baseline gap-1.5">
            <span className={sectionLabel}>Right axis</span>
            <span className="text-[10.5px]" style={{ color: "var(--text-3)" }}>for different units</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {state.yCols.map((col) => {
              const on = state.secondaryYCols?.includes(col) ?? false;
              return (
                <GlassBtn
                  key={col}
                  onClick={() => onChange({
                    secondaryYCols: on
                      ? state.secondaryYCols.filter((c) => c !== col)
                      : [...(state.secondaryYCols ?? []), col],
                  })}
                  aria-pressed={on}
                  title={on ? `${col} is on the right axis` : `Move ${col} to the right axis`}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[5px]",
                    "text-[12px] font-medium transition-colors duration-150 active:scale-[0.96]",
                    !on && "hover-device:border-[var(--accent)]",
                  )}
                  wrapperClassName="inline-flex items-center gap-1.5"
                  style={{
                    borderColor: on ? "var(--accent)" : "var(--border)",
                    background: on ? "var(--accent-soft)" : "var(--panel)",
                    color: on ? "var(--accent-2)" : "var(--text-2)",
                    transitionTimingFunction: easeOut,
                  }}
                >
                  <span className="h-2 w-2 flex-none rounded-full" style={{ background: state.legend[col]?.color }} />
                  {col}
                </GlassBtn>
              );
            })}
          </div>
          {state.secondaryYCols?.some((c) => state.yCols.includes(c)) && (
            <>
              <input
                className={fieldSm}
                placeholder="Right axis label"
                aria-label="Right axis label"
                value={state.y2Label}
                onChange={(e) => onChange({ y2Label: e.target.value })}
              />
              <ScaleToggle
                label="Right scale"
                value={state.y2AxisScale}
                onChange={(v) => onChange({ y2AxisScale: v })}
              />
            </>
          )}
        </div>
      )}

      {/* ── Bubble size — only meaningful for bubble charts ─────────── */}
      {state.chartType === "bubble" && (
        <div className={card}>
          <div className={sectionLabel}>Bubble size</div>
          <select
            className={selectField}
            style={selectChevron}
            aria-label="Bubble size column"
            value={state.bubbleSizeCol}
            onChange={(e) => onChange({ bubbleSizeCol: e.target.value })}
          >
            <option value="">None (fixed size)</option>
            {state.cols.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
