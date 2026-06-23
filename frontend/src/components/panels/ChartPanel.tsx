import { cn } from "@/lib/utils";
import { GlassBtn } from "@/components/ui/liquid-glass";
import type { AppState, AppTheme, ChartType } from "@/types";

const CHART_TYPES: { id: ChartType; label: string; icon: string; title?: string }[] = [
  {
    id: "line", label: "Line",
    icon: `<polyline points="3 17 8 11 13 14 21 6" stroke="currentColor" stroke-width="1.5" fill="none"/>`,
  },
  {
    id: "bar", label: "Bar",
    icon: `<rect x="3" y="10" width="4" height="10" rx="1" fill="currentColor" opacity=".55"/><rect x="10" y="5" width="4" height="15" rx="1" fill="currentColor"/><rect x="17" y="13" width="4" height="7" rx="1" fill="currentColor" opacity=".55"/>`,
  },
  {
    id: "scatter", label: "Scatter",
    icon: `<circle cx="5" cy="16" r="2" fill="currentColor"/><circle cx="10" cy="9" r="2" fill="currentColor"/><circle cx="16" cy="13" r="2" fill="currentColor"/><circle cx="20" cy="5" r="2" fill="currentColor"/>`,
  },
  {
    id: "area", label: "Area",
    icon: `<path d="M3 17 8 11 13 14 21 6 21 17 3 17Z" fill="currentColor" opacity=".25"/><polyline points="3 17 8 11 13 14 21 6" stroke="currentColor" stroke-width="1.5" fill="none"/>`,
  },
  {
    id: "pie", label: "Pie",
    icon: `<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12 3 A9 9 0 0 1 21 12 L12 12Z" fill="currentColor" opacity=".45"/><path d="M12 12 L21 12 A9 9 0 0 1 6.3 19.5Z" fill="currentColor"/>`,
  },
  {
    id: "histogram", label: "Hist",
    icon: `<rect x="2" y="4" width="4" height="16" rx="1" fill="currentColor" opacity=".5"/><rect x="8" y="9" width="4" height="11" rx="1" fill="currentColor"/><rect x="14" y="12" width="4" height="8" rx="1" fill="currentColor" opacity=".7"/>`,
    title: "Histogram",
  },
  {
    id: "box", label: "Box",
    icon: `<rect x="6" y="7" width="12" height="10" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="6" y1="12" x2="18" y2="12" stroke="currentColor" stroke-width="1.5"/><line x1="12" y1="7" x2="12" y2="4" stroke="currentColor" stroke-width="1.5"/><line x1="12" y1="17" x2="12" y2="20" stroke="currentColor" stroke-width="1.5"/>`,
    title: "Box Plot",
  },
  {
    id: "heatmap", label: "Heatmap",
    icon: `<rect x="3" y="3" width="7" height="7" rx="1" fill="currentColor"/><rect x="14" y="3" width="7" height="7" rx="1" fill="currentColor" opacity=".35"/><rect x="3" y="14" width="7" height="7" rx="1" fill="currentColor" opacity=".6"/><rect x="14" y="14" width="7" height="7" rx="1" fill="currentColor" opacity=".15"/>`,
  },
];

interface Props {
  state: AppState;
  theme: AppTheme;
  onChange: (patch: Partial<AppState>) => void;
}

export default function ChartPanel({ state, theme, onChange }: Props) {
  const isDark = theme === "dark";

  const label = cn("mb-1.5 text-[13px] font-semibold uppercase tracking-[0.08em]", isDark ? "text-white/25" : "text-black/35");
  const input = cn("w-full rounded-[7px] border px-2.5 text-xs outline-none transition-colors duration-150 h-8", isDark ? "border-white/8 bg-white/5 text-white/80 placeholder:text-white/20 focus:border-violet-500/60 focus:bg-white/8" : "border-black/10 bg-black/4 text-black/80 placeholder:text-black/25 focus:border-violet-400/60");
  const select = cn(input, "cursor-pointer appearance-none bg-no-repeat pr-7");

  return (
    <div className="flex flex-col gap-5">
      {/* Chart type grid */}
      <div>
        <div className={label}>Chart type</div>
        <div className="grid grid-cols-4 gap-1.5">
          {CHART_TYPES.map((ct) => {
            const sel = state.chartType === ct.id;
            return (
              <GlassBtn
                key={ct.id}
                onClick={() => onChange({ chartType: ct.id })}
                title={ct.title ?? ct.label}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center gap-1 rounded-[9px] border transition-all duration-150 active:scale-[0.93]",
                  sel
                    ? "border-violet-500 bg-violet-500/15 text-violet-400"
                    : isDark
                    ? "border-white/8 bg-white/4 text-white/40 hover:border-white/14 hover:bg-white/7"
                    : "border-black/8 bg-black/3 text-black/40 hover:border-black/14 hover:bg-black/6",
                )}
                wrapperClassName="flex flex-col items-center justify-center gap-1 w-full h-full"
                style={{ transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-5 w-5"
                  dangerouslySetInnerHTML={{ __html: ct.icon }}
                />
                <span className="text-[12px]">{ct.label}</span>
              </GlassBtn>
            );
          })}
        </div>
      </div>

      <div className={cn("h-px", isDark ? "bg-white/6" : "bg-black/8")} />

      {/* X Axis */}
      <div>
        <div className={label}>X Axis</div>
        <div className="flex flex-col gap-1.5">
          <div className="relative">
            <select
              className={select}
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2352526a' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                backgroundPosition: "right 10px center",
              }}
              value={state.xCol}
              onChange={(e) => onChange({ xCol: e.target.value })}
            >
              <option value="">Select column…</option>
              {state.cols.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <input
            className={input}
            placeholder="Axis label (optional)"
            value={state.xLabel}
            onChange={(e) => onChange({ xLabel: e.target.value })}
          />
          <input
            type="number"
            className={input}
            placeholder="Step size (auto)"
            min={0}
            step="any"
            value={state.xTickStep ?? ""}
            onChange={(e) =>
              onChange({ xTickStep: e.target.value ? Number(e.target.value) : null })
            }
          />
        </div>
      </div>

      {/* Y Axes */}
      <div>
        <div className={cn(label, "flex items-center gap-1")}>
          Y Axes
          <span className={cn("normal-case tracking-normal font-normal text-[13px]", isDark ? "text-white/20" : "text-black/30")}>
            — select one or more
          </span>
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
                    onChange({ yCols: state.yCols.filter((c) => c !== col) });
                  } else {
                    onChange({ yCols: [...state.yCols, col] });
                  }
                }}
                className={cn(
                  "flex h-[30px] items-center gap-1.5 rounded-full border px-3 text-[13px] transition-all duration-150 active:scale-[0.94]",
                  sel
                    ? "border-violet-500 bg-violet-500/15 text-white/80"
                    : isDark
                    ? "border-white/8 bg-white/4 text-white/45 hover:border-white/14"
                    : "border-black/10 bg-black/3 text-black/50 hover:border-black/18",
                )}
                style={{ transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
              >
                <div
                  className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                  style={{ background: cfg?.color }}
                />
                {col}
              </GlassBtn>
            );
          })}
        </div>
        <input
          className={cn(input, "mt-2")}
          placeholder="Y axis label (optional)"
          value={state.yLabel}
          onChange={(e) => onChange({ yLabel: e.target.value })}
        />
        <input
          type="number"
          className={cn(input, "mt-2")}
          placeholder="Y step size (auto)"
          min={0}
          step="any"
          value={state.yTickStep ?? ""}
          onChange={(e) =>
            onChange({ yTickStep: e.target.value ? Number(e.target.value) : null })
          }
        />
      </div>
    </div>
  );
}
