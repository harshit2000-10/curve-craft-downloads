import React, { useRef, useState } from "react";
import { Eye, EyeOff, GripVertical, Bookmark, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassBtn } from "@/components/ui/liquid-glass";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import type { AppState, AppTheme, LineDash, PlotlyTheme } from "@/types";

const STYLE_STORAGE_KEY = "cc_styles";
const MAX_STYLE_SAVED = 4;

const STYLE_KEYS = [
  "plotlyTheme", "showGrid", "showLegend", "showMarkers",
  "lineWidth", "lineDash", "showChartBorder", "chartBorderWidth",
  "axisFontSize", "axisFontFamily", "axisFontWeight",
  "labelFontSize", "labelFontFamily", "labelFontWeight",
  "legendFontFamily", "legendFontSize", "legendFontWeight", "legendCorner", "legendX", "legendY",
  "showMajorTicks", "majorTickLen", "majorTickWidth",
  "showMinorTicks", "minorTickLen", "minorTickWidth", "minorTickCount",
  "boxShowPoints", "boxPointPos", "boxJitter", "donutHoleSize", "barMode",
] as const;
type StyleKeys = typeof STYLE_KEYS[number];

interface StyleTemplate {
  name: string;
  style: Pick<AppState, StyleKeys>;
}

function loadStyleTemplates(): StyleTemplate[] {
  try { return JSON.parse(localStorage.getItem(STYLE_STORAGE_KEY) ?? "[]"); }
  catch { return []; }
}
function persistStyleTemplates(list: StyleTemplate[]) {
  // Best-effort — a storage-restricted browser shouldn't break saving a
  // template for the current session, only its persistence across visits.
  try { localStorage.setItem(STYLE_STORAGE_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

const LEGEND_CORNERS: { id: "tl" | "tr" | "bl" | "br"; row: number; col: number }[] = [
  { id: "tl", row: 0, col: 0 },
  { id: "tr", row: 0, col: 1 },
  { id: "bl", row: 1, col: 0 },
  { id: "br", row: 1, col: 1 },
];

const PLOTLY_THEMES: { id: PlotlyTheme; label: string }[] = [
  { id: "plotly_white", label: "Light" },
  { id: "plotly_dark",  label: "Dark" },
  { id: "ggplot2",      label: "GGPlot2" },
  { id: "seaborn",      label: "Seaborn" },
  { id: "simple_white", label: "Minimal" },
];

interface Props {
  state: AppState;
  theme: AppTheme;
  onChange: (patch: Partial<AppState>) => void;
}

function Toggle({
  on, onToggle, label: ariaLabel,
}: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <Switch
      checked={on}
      onCheckedChange={onToggle}
      aria-label={ariaLabel}
    />
  );
}

export default function StylePanel({ state, theme, onChange }: Props) {
  const isDark = theme === "dark";
  const label = "mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-3)]";
  const dragFrom = useRef<number | null>(null);
  const canDrag  = useRef(false);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [savedStyles, setSavedStyles] = useState<StyleTemplate[]>(loadStyleTemplates);
  const [templateName, setTemplateName] = useState("");

  function saveStyleTemplate() {
    if (!templateName.trim()) return;
    const style = Object.fromEntries(STYLE_KEYS.map((k) => [k, state[k]])) as Pick<AppState, StyleKeys>;
    const entry: StyleTemplate = { name: templateName.trim(), style };
    const next = [entry, ...savedStyles.filter((t) => t.name !== entry.name)].slice(0, MAX_STYLE_SAVED);
    setSavedStyles(next);
    persistStyleTemplates(next);
    setTemplateName("");
  }
  function deleteStyleTemplate(name: string) {
    const next = savedStyles.filter((t) => t.name !== name);
    setSavedStyles(next);
    persistStyleTemplates(next);
  }
  function loadStyleTemplate(t: StyleTemplate) {
    onChange(t.style);
  }

  function patchLegend(col: string, patch: Partial<{ label: string; color: string; visible: boolean }>) {
    onChange({
      legend: {
        ...state.legend,
        [col]: { ...state.legend[col], ...patch },
      },
    });
  }

  function handleDrop(toIndex: number) {
    const from = dragFrom.current;
    if (from === null || from === toIndex) { setDragOver(null); return; }
    const next = [...state.yCols];
    const [moved] = next.splice(from, 1);
    next.splice(toIndex, 0, moved);
    onChange({ yCols: next });
    dragFrom.current = null;
    setDragOver(null);
  }

  function handleKeyReorder(i: number, dir: -1 | 1) {
    const to = i + dir;
    if (to < 0 || to >= state.yCols.length) return;
    const next = [...state.yCols];
    const [moved] = next.splice(i, 1);
    next.splice(to, 0, moved);
    onChange({ yCols: next });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Style Templates */}
      <div>
        <div className={cn(label, "flex items-center justify-between")}>
          <span>Style templates</span>
          <span className={cn("normal-case tracking-normal font-normal text-[12px]", "text-[var(--text-3)]")}>
            {savedStyles.length}/{MAX_STYLE_SAVED}
          </span>
        </div>
        <div className="flex gap-1.5">
          <input
            aria-label="Style template name"
            className={cn(
              // min-w-0: without it the input refuses to shrink past its placeholder
              // width and pushes the whole row wider than the panel.
              "h-[42px] min-w-0 flex-1 rounded-[9px] border bg-transparent px-3 text-xs outline-none transition-colors duration-150",
              isDark
                ? "border-white/8 text-white/80 placeholder:text-white/40 focus:border-violet-500/50"
                : "border-black/10 text-black/80 placeholder:text-black/40 focus:border-violet-400/50",
            )}
            placeholder="Template name…"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
          />
          <GlassBtn
            onClick={saveStyleTemplate}
            title="Save current style"
            className={cn(
              "flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-[9px] border transition-all duration-150 active:scale-[0.97]",
              !templateName.trim()
                ? "border-[var(--border)] text-[var(--text-3)] cursor-not-allowed opacity-40"
                : "border-[var(--border)] bg-[var(--raised)] text-[var(--text-2)] hover:border-[var(--accent)] hover:text-[var(--accent)]",
            )}
            style={{ transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
          >
            <Bookmark size={13} />
          </GlassBtn>
        </div>
        {savedStyles.length > 0 && (
          <div className="mt-2 flex flex-col gap-1.5">
            {savedStyles.map((t) => (
              <div
                key={t.name}
                className={cn(
                  "flex items-center gap-2 rounded-[8px] border px-3 py-2 transition-all duration-150",
                  "border-[var(--border)] bg-[var(--raised)] hover:border-[var(--border-hover)]",
                )}
              >
                <div
                  className="flex flex-1 min-w-0 cursor-pointer items-center"
                  onClick={() => loadStyleTemplate(t)}
                >
                  <span className={cn("text-[12px] font-semibold truncate", "text-[var(--text)]")}>
                    {t.name}
                  </span>
                </div>
                <GlassBtn
                  onClick={() => deleteStyleTemplate(t.name)}
                  aria-label={`Delete template ${t.name}`}
                  className={cn(
                    "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[4px] transition-all duration-150 hover:scale-110 active:scale-95",
                    isDark ? "text-white/40 hover:text-red-400" : "text-black/40 hover:text-red-500",
                  )}
                  wrapperClassName="inline-flex items-center justify-center"
                >
                  <X size={11} />
                </GlassBtn>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="h-px bg-[var(--border)]" />

      {/* Legend */}
      <div>
        <div className={label}>Legend</div>
        <div className="flex flex-col gap-1.5">
          {state.yCols.map((col, i) => {
            const cfg = state.legend[col];
            if (!cfg) return null;
            const isOver = dragOver === i;
            return (
              <div
                key={col}
                draggable
                onDragStart={(e) => {
                  if (!canDrag.current) { e.preventDefault(); return; }
                  dragFrom.current = i;
                  e.dataTransfer.setData('text/plain', String(i));
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOver(i); }}
                onDrop={(e) => { e.preventDefault(); handleDrop(i); }}
                onDragEnd={() => { canDrag.current = false; dragFrom.current = null; setDragOver(null); }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowUp") { e.preventDefault(); handleKeyReorder(i, -1); }
                  if (e.key === "ArrowDown") { e.preventDefault(); handleKeyReorder(i, 1); }
                }}
                tabIndex={0}
                aria-label={`Series ${col}, position ${i + 1} of ${state.yCols.length}. Use arrow keys to reorder.`}
                className={cn(
                  "flex items-center gap-2 rounded-[8px] border p-2 transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500",
                  isOver
                    ? "border-violet-500 bg-violet-500/10"
                    : isDark
                    ? "border-white/8 bg-white/4 hover:border-white/12"
                    : "border-black/8 bg-black/3 hover:border-black/12",
                )}
              >
                {/* Drag handle — only this triggers the drag */}
                <div
                  className={cn("flex-shrink-0 cursor-grab active:cursor-grabbing select-none", isDark ? "text-white/40" : "text-black/35")}
                  onMouseDown={() => { canDrag.current = true; }}
                  onMouseUp={() => { canDrag.current = false; }}
                  aria-hidden="true"
                >
                  <GripVertical size={13} />
                </div>

                {/* Color swatch */}
                <div
                  draggable={false}
                  role="button"
                  aria-label={`Change color for ${col}`}
                  className="relative h-5 w-5 flex-shrink-0 cursor-pointer overflow-hidden rounded-[5px] transition-transform duration-150 active:scale-[0.88]"
                  style={{ background: cfg.color, transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
                >
                  <input
                    type="color"
                    value={cfg.color}
                    aria-label={`Color picker for ${col}`}
                    className="absolute inset-[-4px] h-[calc(100%+8px)] w-[calc(100%+8px)] cursor-pointer opacity-0"
                    onInput={(e) => patchLegend(col, { color: (e.target as HTMLInputElement).value })}
                    onChange={(e) => patchLegend(col, { color: e.target.value })}
                  />
                </div>

                {/* Name input */}
                <input
                  draggable={false}
                  aria-label={`Legend label for ${col}`}
                  className={cn("h-[26px] min-w-0 flex-1 rounded-[5px] border border-transparent bg-transparent px-1.5 text-xs outline-none transition-colors duration-150", isDark ? "text-white/80 placeholder:text-white/45 focus:border-violet-500/40 focus:bg-white/6" : "text-black/80 placeholder:text-black/45 focus:border-violet-400/40 focus:bg-black/4")}
                  value={cfg.label}
                  onChange={(e) => patchLegend(col, { label: e.target.value })}
                  placeholder={col}
                />

                {/* Visibility toggle */}
                <GlassBtn
                  onClick={() => patchLegend(col, { visible: !cfg.visible })}
                  aria-label={`${cfg.visible ? "Hide" : "Show"} series ${col}`}
                  aria-pressed={cfg.visible}
                  className={cn("flex h-6 w-6 items-center justify-center rounded-[5px] transition-all duration-150 active:scale-[0.88]", cfg.visible ? isDark ? "text-white/50 hover:bg-white/8" : "text-black/50 hover:bg-black/8" : "text-white/30 opacity-50")}
                  wrapperClassName="inline-flex items-center justify-center"
                  style={{ transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
                >
                  {cfg.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                </GlassBtn>
              </div>
            );
          })}
        </div>

        {/* Legend position — 2×2 grid with labels */}
        <div className="mt-3">
          <div className={cn("mb-1.5 text-[12px] font-medium uppercase tracking-[0.06em]", "text-[var(--text-3)]")}>
            Position
            <span className="ml-1.5 normal-case tracking-normal font-normal text-[11px]" style={{ color: "var(--text-3)" }}>
              {state.legendX !== null ? "— dragged on chart, pick a corner to reset" : "— or drag the legend directly on the chart"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {(
              [
                { id: "tl" as const, label: "Top left" },
                { id: "tr" as const, label: "Top right" },
                { id: "bl" as const, label: "Bot left" },
                { id: "br" as const, label: "Bot right" },
              ] as { id: "tl" | "tr" | "bl" | "br"; label: string }[]
            ).map(({ id, label }) => {
              const sel = state.legendCorner === id;
              const isTop = id.startsWith("t");
              const isLeft = id.endsWith("l");
              return (
                <GlassBtn
                  key={id}
                  onClick={() => onChange({ legendCorner: id, legendX: null, legendY: null })}
                  className={cn(
                    "relative flex h-[44px] flex-col overflow-hidden rounded-[8px] border transition-all duration-150 active:scale-[0.95]",
                    sel
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                      : "border-[var(--border)] bg-[var(--raised)] hover:border-[var(--border-hover)]",
                  )}
                  wrapperClassName="w-full h-full"
                  style={{ transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
                  title={label}
                >
                  {/* Mini chart lines */}
                  <div className="absolute inset-0">
                    <div className="absolute bottom-0 left-0 w-[2px] h-[70%]" style={{ background: sel ? "var(--accent-soft)" : "var(--border)" }} />
                    <div className="absolute bottom-0 left-0 h-[2px] w-[85%]" style={{ background: sel ? "var(--accent-soft)" : "var(--border)" }} />
                  </div>
                  {/* Legend chip positioned in the correct corner */}
                  <div
                    className="absolute flex items-center gap-1 rounded-[3px] border px-1.5 py-0.5"
                    style={{
                      borderColor: sel ? "color-mix(in srgb, var(--accent) 50%, transparent)" : "var(--border)",
                      background:  sel ? "var(--accent-soft)" : "var(--raised-2)",
                      top: isTop ? 5 : undefined,
                      bottom: isTop ? undefined : 5,
                      left: isLeft ? 5 : undefined,
                      right: isLeft ? undefined : 5,
                    }}
                  >
                    <div className="h-1.5 w-1.5 rounded-full" style={{ background: sel ? "var(--accent)" : "var(--text-3)" }} />
                    <span className="text-[9px] font-medium" style={{ color: sel ? "var(--accent-2)" : "var(--text-3)" }}>
                      {label.split(" ")[0]}
                    </span>
                  </div>
                </GlassBtn>
              );
            })}
          </div>
        </div>

        {/* Legend font */}
        <div className="mt-3 flex flex-col gap-2">
          <div className={cn("text-[12px] font-medium uppercase tracking-[0.06em]", "text-[var(--text-3)]")}>Font</div>
          <div className="grid grid-cols-2 gap-1.5">
            {(["Arial", "Helvetica", "Times New Roman", "Calibri"] as const).map((font) => {
              const sel = state.legendFontFamily === font;
              return (
                <GlassBtn
                  key={font}
                  onClick={() => onChange({ legendFontFamily: font })}
                  className={cn(
                    "h-[36px] rounded-[9px] border px-2 text-[13px] transition-all duration-150 active:scale-[0.95]",
                    sel
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)]"
                      : "border-[var(--border)] bg-[var(--raised)] text-[var(--text-2)] hover:border-[var(--border-hover)] hover:text-[var(--text)]",
                  )}
                  style={{ fontFamily: font, transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
                >
                  {font}
                </GlassBtn>
              );
            })}
          </div>
          {/* Size */}
          <div>
            <div className={cn("mb-1.5 flex items-baseline gap-1 text-[12px] font-medium uppercase tracking-[0.06em]", "text-[var(--text-3)]")}>
              Size — <span className={cn("text-[13px] font-semibold normal-case tracking-normal", "text-[var(--text-2)]")}>{state.legendFontSize}px</span>
            </div>
            <Slider min={10} max={40} step={1} value={[state.legendFontSize]}
              aria-label={`Legend font size, ${state.legendFontSize}px`}
              showTooltip tooltipContent={(v) => `${v}px`}
              onValueChange={([v]) => onChange({ legendFontSize: v })} />
            <div className={cn("mt-1 flex justify-between text-[12px]", "text-[var(--text-3)]")}><span>10</span><span>40</span></div>
          </div>
          {/* Weight */}
          <div>
            <div className={cn("mb-1.5 flex items-baseline gap-1 text-[12px] font-medium uppercase tracking-[0.06em]", "text-[var(--text-3)]")}>
              Weight — <span className={cn("text-[13px] font-semibold normal-case tracking-normal", "text-[var(--text-2)]")} style={{ fontWeight: state.legendFontWeight }}>{state.legendFontWeight <= 200 ? "Thin" : state.legendFontWeight <= 500 ? "Regular" : "Bold"}</span>
            </div>
            <Slider min={100} max={900} step={100} value={[state.legendFontWeight]}
              aria-label={`Legend font weight, ${state.legendFontWeight}`}
              showTooltip tooltipContent={(v) => v <= 200 ? "Thin" : v <= 500 ? "Regular" : "Bold"}
              onValueChange={([v]) => onChange({ legendFontWeight: v })} />
            <div className={cn("mt-1 flex justify-between text-[12px]", "text-[var(--text-3)]")}><span>100</span><span style={{ fontWeight: 500 }}>500</span><span style={{ fontWeight: 900 }}>900</span></div>
          </div>
        </div>
      </div>

      <div className="h-px bg-[var(--border)]" />

      {/* Chart theme */}
      <div>
        <div className={label}>Chart theme</div>
        <select
          className="w-full h-[42px] appearance-none rounded-[9px] border px-3 pr-8 text-xs outline-none transition-colors duration-150 cursor-pointer bg-no-repeat border-[var(--border)] bg-[var(--raised)] text-[var(--text)] focus:border-[var(--accent)]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2352526a' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
            backgroundPosition: "right 10px center",
          }}
          value={state.plotlyTheme}
          onChange={(e) => onChange({ plotlyTheme: e.target.value as PlotlyTheme })}
        >
          {PLOTLY_THEMES.map((t) => (
            <option key={t.id} value={t.id} style={{ background: isDark ? "#18181f" : "#fff" }}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="h-px bg-[var(--border)]" />

      {/* Axis labels */}
      <div className="flex flex-col gap-3">
        <div className={label}>Axis labels</div>

        {/* Font family */}
        <div>
          <div className={cn("mb-1.5 text-[12px] font-medium uppercase tracking-[0.06em]", "text-[var(--text-3)]")}>Font</div>
          <div className="grid grid-cols-2 gap-1.5">
            {(["Arial", "Helvetica", "Times New Roman", "Calibri"] as const).map((font) => {
              const sel = state.axisFontFamily === font;
              return (
                <GlassBtn
                  key={font}
                  onClick={() => onChange({ axisFontFamily: font })}
                  className={cn(
                    "h-[36px] rounded-[9px] border px-2 text-[13px] transition-all duration-150 active:scale-[0.95]",
                    sel
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)]"
                      : "border-[var(--border)] bg-[var(--raised)] text-[var(--text-2)] hover:border-[var(--border-hover)] hover:text-[var(--text)]",
                  )}
                  style={{ fontFamily: font, transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
                >
                  {font}
                </GlassBtn>
              );
            })}
          </div>
        </div>

        {/* Font size */}
        <div>
          <div className={cn("mb-1.5 flex items-baseline gap-1 text-[12px] font-medium uppercase tracking-[0.06em]", "text-[var(--text-3)]")}>
            Size —
            <span className={cn("text-[13px] font-semibold normal-case tracking-normal", "text-[var(--text-2)]")}>{state.axisFontSize}px</span>
          </div>
          <Slider min={10} max={40} step={1} value={[state.axisFontSize]}
            aria-label={`Axis label font size, ${state.axisFontSize}px`}
            showTooltip tooltipContent={(v) => `${v}px`}
            onValueChange={([v]) => onChange({ axisFontSize: v })} />
          <div className={cn("mt-1 flex justify-between text-[12px]", "text-[var(--text-3)]")}>
            <span>10</span><span>40</span>
          </div>
        </div>

        {/* Font weight */}
        <div>
          <div className={cn("mb-1.5 flex items-baseline gap-1 text-[12px] font-medium uppercase tracking-[0.06em]", "text-[var(--text-3)]")}>
            Weight —
            <span className={cn("text-[13px] font-semibold normal-case tracking-normal", "text-[var(--text-2)]")} style={{ fontWeight: state.axisFontWeight }}>
              {state.axisFontWeight <= 200 ? "Thin" : state.axisFontWeight <= 500 ? "Regular" : "Bold"}
            </span>
          </div>
          <Slider min={100} max={900} step={100} value={[state.axisFontWeight]}
            aria-label={`Axis label font weight, ${state.axisFontWeight}`}
            showTooltip tooltipContent={(v) => v <= 200 ? "Thin" : v <= 500 ? "Regular" : "Bold"}
            onValueChange={([v]) => onChange({ axisFontWeight: v })} />
          <div className={cn("mt-1 flex justify-between text-[12px]", "text-[var(--text-3)]")}>
            <span>Thin</span><span style={{ fontWeight: 500 }}>Regular</span><span style={{ fontWeight: 900 }}>Bold</span>
          </div>
        </div>
      </div>

      <div className="h-px bg-[var(--border)]" />

      {/* Axis title labels */}
      <div className="flex flex-col gap-3">
        <div className={label}>Axis title labels</div>

        {/* Font family */}
        <div>
          <div className={cn("mb-1.5 text-[12px] font-medium uppercase tracking-[0.06em]", "text-[var(--text-3)]")}>Font</div>
          <div className="grid grid-cols-2 gap-1.5">
            {(["Arial", "Helvetica", "Times New Roman", "Calibri"] as const).map((font) => {
              const sel = state.labelFontFamily === font;
              return (
                <GlassBtn
                  key={font}
                  onClick={() => onChange({ labelFontFamily: font })}
                  className={cn(
                    "h-[36px] rounded-[9px] border px-2 text-[13px] transition-all duration-150 active:scale-[0.95]",
                    sel
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)]"
                      : "border-[var(--border)] bg-[var(--raised)] text-[var(--text-2)] hover:border-[var(--border-hover)] hover:text-[var(--text)]",
                  )}
                  style={{ fontFamily: font, transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
                >
                  {font}
                </GlassBtn>
              );
            })}
          </div>
        </div>

        {/* Font size */}
        <div>
          <div className={cn("mb-1.5 flex items-baseline gap-1 text-[12px] font-medium uppercase tracking-[0.06em]", "text-[var(--text-3)]")}>
            Size —
            <span className={cn("text-[13px] font-semibold normal-case tracking-normal", "text-[var(--text-2)]")}>{state.labelFontSize}px</span>
          </div>
          <Slider min={10} max={40} step={1} value={[state.labelFontSize]}
            aria-label={`Axis title font size, ${state.labelFontSize}px`}
            showTooltip tooltipContent={(v) => `${v}px`}
            onValueChange={([v]) => onChange({ labelFontSize: v })} />
          <div className={cn("mt-1 flex justify-between text-[12px]", "text-[var(--text-3)]")}>
            <span>10</span><span>40</span>
          </div>
        </div>

        {/* Font weight */}
        <div>
          <div className={cn("mb-1.5 flex items-baseline gap-1 text-[12px] font-medium uppercase tracking-[0.06em]", "text-[var(--text-3)]")}>
            Weight —
            <span className={cn("text-[13px] font-semibold normal-case tracking-normal", "text-[var(--text-2)]")} style={{ fontWeight: state.labelFontWeight }}>
              {state.labelFontWeight <= 200 ? "Thin" : state.labelFontWeight <= 500 ? "Regular" : "Bold"}
            </span>
          </div>
          <Slider min={100} max={900} step={100} value={[state.labelFontWeight]}
            aria-label={`Axis title font weight, ${state.labelFontWeight}`}
            showTooltip tooltipContent={(v) => v <= 200 ? "Thin" : v <= 500 ? "Regular" : "Bold"}
            onValueChange={([v]) => onChange({ labelFontWeight: v })} />
          <div className={cn("mt-1 flex justify-between text-[12px]", "text-[var(--text-3)]")}>
            <span>Thin</span><span style={{ fontWeight: 500 }}>Regular</span><span style={{ fontWeight: 900 }}>Bold</span>
          </div>
        </div>
      </div>

      <div className="h-px bg-[var(--border)]" />

      {/* Ticks */}
      <div className="flex flex-col gap-3">
        <div className={label}>Ticks</div>

        {/* Major ticks */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className={cn("text-xs", "text-[var(--text-3)]")}>Major ticks</span>
            <Toggle on={state.showMajorTicks} onToggle={() => onChange({ showMajorTicks: !state.showMajorTicks })} label="Toggle major ticks" />
          </div>
          {state.showMajorTicks && (
            <div className="flex flex-col gap-2">
              <div>
                <div className={cn("mb-1.5 flex items-baseline gap-1 text-[12px] font-medium uppercase tracking-[0.06em]", "text-[var(--text-3)]")}>
                  Length —
                  <span className={cn("text-[13px] font-semibold normal-case tracking-normal", "text-[var(--text-2)]")}>{state.majorTickLen}px</span>
                </div>
                <Slider min={2} max={16} step={1} value={[state.majorTickLen]}
                  aria-label={`Major tick length, ${state.majorTickLen}px`}
                  showTooltip tooltipContent={(v) => `${v}px`}
                  onValueChange={([v]) => onChange({ majorTickLen: v })} />
                <div className={cn("mt-1 flex justify-between text-[12px]", "text-[var(--text-3)]")}>
                  <span>2</span><span>16</span>
                </div>
              </div>
              <div>
                <div className={cn("mb-1.5 flex items-baseline gap-1 text-[12px] font-medium uppercase tracking-[0.06em]", "text-[var(--text-3)]")}>
                  Width —
                  <span className={cn("text-[13px] font-semibold normal-case tracking-normal", "text-[var(--text-2)]")}>{state.majorTickWidth}px</span>
                </div>
                <Slider min={1} max={6} step={1} value={[state.majorTickWidth]}
                  aria-label={`Major tick width, ${state.majorTickWidth}px`}
                  showTooltip tooltipContent={(v) => `${v}px`}
                  onValueChange={([v]) => onChange({ majorTickWidth: v })} />
                <div className={cn("mt-1 flex justify-between text-[12px]", "text-[var(--text-3)]")}>
                  <span>1</span><span>6</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Minor ticks */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className={cn("text-xs", "text-[var(--text-3)]")}>Minor ticks</span>
            <Toggle on={state.showMinorTicks} onToggle={() => onChange({ showMinorTicks: !state.showMinorTicks })} label="Toggle minor ticks" />
          </div>
          {state.showMinorTicks && (
            <>
              <div>
                <div className={cn("mb-1.5 flex items-baseline gap-1 text-[12px] font-medium uppercase tracking-[0.06em]", "text-[var(--text-3)]")}>
                  Count between majors —
                  <span className={cn("text-[13px] font-semibold normal-case tracking-normal", "text-[var(--text-2)]")}>{state.minorTickCount}</span>
                </div>
                <Slider min={1} max={9} step={1} value={[state.minorTickCount]}
                  aria-label={`Minor tick count between majors, ${state.minorTickCount}`}
                  showTooltip
                  onValueChange={([v]) => onChange({ minorTickCount: v })} />
                <div className={cn("mt-1 flex justify-between text-[12px]", "text-[var(--text-3)]")}>
                  <span>1</span><span>9</span>
                </div>
              </div>
              <div>
                <div className={cn("mb-1.5 flex items-baseline gap-1 text-[12px] font-medium uppercase tracking-[0.06em]", "text-[var(--text-3)]")}>
                  Length —
                  <span className={cn("text-[13px] font-semibold normal-case tracking-normal", "text-[var(--text-2)]")}>{state.minorTickLen}px</span>
                </div>
                <Slider min={1} max={10} step={1} value={[state.minorTickLen]}
                  aria-label={`Minor tick length, ${state.minorTickLen}px`}
                  showTooltip tooltipContent={(v) => `${v}px`}
                  onValueChange={([v]) => onChange({ minorTickLen: v })} />
                <div className={cn("mt-1 flex justify-between text-[12px]", "text-[var(--text-3)]")}>
                  <span>1</span><span>10</span>
                </div>
              </div>
              <div>
                <div className={cn("mb-1.5 flex items-baseline gap-1 text-[12px] font-medium uppercase tracking-[0.06em]", "text-[var(--text-3)]")}>
                  Width —
                  <span className={cn("text-[13px] font-semibold normal-case tracking-normal", "text-[var(--text-2)]")}>{state.minorTickWidth}px</span>
                </div>
                <Slider min={1} max={6} step={1} value={[state.minorTickWidth]}
                  aria-label={`Minor tick width, ${state.minorTickWidth}px`}
                  showTooltip tooltipContent={(v) => `${v}px`}
                  onValueChange={([v]) => onChange({ minorTickWidth: v })} />
                <div className={cn("mt-1 flex justify-between text-[12px]", "text-[var(--text-3)]")}>
                  <span>1</span><span>6</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="h-px bg-[var(--border)]" />

      {/* Line style */}
      <div>
        <div className={label}>Line style</div>
        <div className="grid grid-cols-3 gap-1.5">
          {(
            [
              {
                id: "solid" as LineDash,
                label: "Solid",
                svg: <line x1="2" y1="8" x2="34" y2="8" stroke="currentColor" strokeWidth="2" />,
              },
              {
                id: "dot" as LineDash,
                label: "Dotted",
                svg: <line x1="2" y1="8" x2="34" y2="8" stroke="currentColor" strokeWidth="2" strokeDasharray="2 3" />,
              },
              {
                id: "dashdot" as LineDash,
                label: "Dash · dot",
                svg: <line x1="2" y1="8" x2="34" y2="8" stroke="currentColor" strokeWidth="2" strokeDasharray="8 3 2 3" />,
              },
            ] as { id: LineDash; label: string; svg: React.ReactNode }[]
          ).map(({ id, label: lbl, svg }) => {
            const sel = state.lineDash === id;
            return (
              <GlassBtn
                key={id}
                onClick={() => onChange({ lineDash: id })}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-[9px] border py-2 transition-all duration-150 active:scale-[0.93]",
                  sel
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-2)]"
                    : "border-[var(--border)] bg-[var(--raised)] text-[var(--text-2)] hover:border-[var(--border-hover)] hover:text-[var(--text)]",
                )}
                wrapperClassName="flex flex-col items-center gap-1.5 w-full"
                style={{ transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
              >
                <svg viewBox="0 0 36 16" className="h-4 w-full">{svg}</svg>
                <span className="text-[12px]">{lbl}</span>
              </GlassBtn>
            );
          })}
        </div>
      </div>

      <div className="h-px bg-[var(--border)]" />

      {/* Box/violin plot points — only meaningful for box + violin charts */}
      {(state.chartType === "box" || state.chartType === "violin") && (
        <>
          <div>
            <div className={cn(label, "flex items-center justify-between")}>
              <span>Data points</span>
              <Toggle on={state.boxShowPoints} onToggle={() => onChange({ boxShowPoints: !state.boxShowPoints })} label="Toggle box plot points" />
            </div>

            {state.boxShowPoints && (
              <div className="flex flex-col gap-4">
                <div className={cn("text-[11px] leading-relaxed", "text-[var(--text-3)]")}>
                  Points take each series' own legend color.
                </div>

                {/* Position — where relative to the box the points sit */}
                <div>
                  <div className={cn(label, "flex items-baseline gap-1")}>
                    Position —
                    <span className={cn("text-[14px] font-semibold normal-case tracking-normal", "text-[var(--text)]")}>
                      {state.boxPointPos < -0.3 ? "Left" : state.boxPointPos > 0.3 ? "Right" : "Center"}
                    </span>
                  </div>
                  <Slider min={-2} max={2} step={0.1} value={[state.boxPointPos]}
                    aria-label={`Point position, ${state.boxPointPos}`}
                    showTooltip tooltipContent={(v) => v < -0.3 ? "Left" : v > 0.3 ? "Right" : "Center"}
                    onValueChange={([v]) => onChange({ boxPointPos: v })} />
                  <div className={cn("mt-1 flex justify-between text-[12px]", "text-[var(--text-3)]")}>
                    <span>Left</span><span>Center</span><span>Right</span>
                  </div>
                </div>

                {/* Jitter — how spread out points are within their lane */}
                <div>
                  <div className={cn(label, "flex items-baseline gap-1")}>
                    Spread —
                    <span className={cn("text-[14px] font-semibold normal-case tracking-normal", "text-[var(--text)]")}>
                      {Math.round(state.boxJitter * 100)}%
                    </span>
                  </div>
                  <Slider min={0} max={1} step={0.05} value={[state.boxJitter]}
                    aria-label={`Point spread, ${Math.round(state.boxJitter * 100)}%`}
                    showTooltip tooltipContent={(v) => `${Math.round(v * 100)}%`}
                    onValueChange={([v]) => onChange({ boxJitter: v })} />
                </div>
              </div>
            )}
          </div>

          <div className="h-px bg-[var(--border)]" />
        </>
      )}

      {/* Bar layout — grouped side-by-side vs stacked, multi-series bar charts only */}
      {state.chartType === "bar" && (
        <>
          <div>
            <div className={label}>Bar layout</div>
            <div className="grid grid-cols-2 gap-1.5">
              {([
                { id: "group" as const, label: "Grouped" },
                { id: "stack" as const, label: "Stacked" },
              ]).map(({ id, label: lbl }) => {
                const sel = state.barMode === id;
                return (
                  <GlassBtn
                    key={id}
                    onClick={() => onChange({ barMode: id })}
                    className={cn(
                      "h-[36px] rounded-[8px] border text-xs font-semibold transition-all duration-150 active:scale-[0.97]",
                      sel
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-2)]"
                        : "border-[var(--border)] bg-[var(--raised)] text-[var(--text-2)] hover:border-[var(--border-hover)]",
                    )}
                    wrapperClassName="inline-flex items-center justify-center w-full"
                    style={{ transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
                  >
                    {lbl}
                  </GlassBtn>
                );
              })}
            </div>
          </div>

          <div className="h-px bg-[var(--border)]" />
        </>
      )}

      {/* Donut hole size — only meaningful for donut charts */}
      {state.chartType === "donut" && (
        <>
          <div>
            <div className={cn(label, "flex items-baseline gap-1")}>
              Hole size —
              <span className={cn("text-[14px] font-semibold normal-case tracking-normal", "text-[var(--text)]")}>
                {Math.round(state.donutHoleSize * 100)}%
              </span>
            </div>
            <Slider min={0.1} max={0.85} step={0.05} value={[state.donutHoleSize]}
              aria-label={`Donut hole size, ${Math.round(state.donutHoleSize * 100)}%`}
              showTooltip tooltipContent={(v) => `${Math.round(v * 100)}%`}
              onValueChange={([v]) => onChange({ donutHoleSize: v })} />
          </div>

          <div className="h-px bg-[var(--border)]" />
        </>
      )}

      {/* Border / line width */}
      <div>
        <div className={cn(label, "flex items-baseline gap-1")}>
          Border width —
          <span className={cn("text-[14px] font-semibold normal-case tracking-normal", "text-[var(--text)]")}>
            {state.lineWidth}px
          </span>
        </div>
        <Slider min={1} max={8} step={0.5} value={[state.lineWidth]}
          aria-label={`Line width, ${state.lineWidth}px`}
          showTooltip tooltipContent={(v) => `${v}px`}
          onValueChange={([v]) => onChange({ lineWidth: v })} />
        <div className={cn("mt-1 flex justify-between text-[13px]", "text-[var(--text-3)]")}>
          <span>1</span>
          <span>4</span>
          <span>8</span>
        </div>
      </div>

      <div className="h-px bg-[var(--border)]" />

      {/* Chart border box */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className={label} style={{ marginBottom: 0 }}>Chart border</div>
          <Toggle on={state.showChartBorder} onToggle={() => onChange({ showChartBorder: !state.showChartBorder })} label="Toggle chart border" />
        </div>
        {state.showChartBorder && (
          <div className="flex flex-col gap-2">
            {/* Border preview box */}
            <div
              className="flex items-center justify-center rounded-[7px] h-14 bg-[var(--raised-2)]"
            >
              <div
                className={cn("w-24 h-8", isDark ? "" : "")}
                style={{
                  border: `${state.chartBorderWidth}px solid ${isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)"}`,
                  borderRadius: 3,
                }}
              />
            </div>
            <Slider min={1} max={6} step={0.5} value={[state.chartBorderWidth]}
              aria-label={`Chart border width, ${state.chartBorderWidth}px`}
              showTooltip tooltipContent={(v) => `${v}px`}
              onValueChange={([v]) => onChange({ chartBorderWidth: v })} />
            <div className={cn("flex justify-between text-[13px]", "text-[var(--text-3)]")}>
              <span>1px</span>
              <span className={cn("font-semibold", "text-[var(--text-2)]")}>{state.chartBorderWidth}px</span>
              <span>6px</span>
            </div>
          </div>
        )}
      </div>

      <div className="h-px bg-[var(--border)]" />

      {/* Display toggles */}
      <div>
        <div className={label}>Display</div>
        <div className="flex flex-col gap-2.5">
          {[
            { key: "showGrid" as const,    label: "Show grid lines" },
            { key: "showLegend" as const,  label: "Show legend" },
            { key: "showMarkers" as const, label: "Show markers" },
          ].map(({ key, label: lbl }) => (
            <div key={key} className="flex items-center justify-between">
              <span className={cn("text-xs", "text-[var(--text-3)]")}>{lbl}</span>
              <Toggle
                on={state[key]}
                onToggle={() => onChange({ [key]: !state[key] })}
               
                label={lbl}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
