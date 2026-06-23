import { Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassBtn } from "@/components/ui/liquid-glass";
import { Slider } from "@/components/ui/slider";
import type { AppState, AppTheme, ExportFormat } from "@/types";

interface Props {
  state: AppState;
  theme: AppTheme;
  onChange: (patch: Partial<AppState>) => void;
  onExport: () => void;
}

export default function ExportPanel({ state, theme, onChange, onExport }: Props) {
  const isDark = theme === "dark";
  const label = cn("mb-1.5 text-[13px] font-semibold uppercase tracking-[0.08em]", isDark ? "text-white/25" : "text-black/35");
  const input = cn("w-full rounded-[7px] border px-2.5 text-xs outline-none transition-colors duration-150 h-8", isDark ? "border-white/8 bg-white/5 text-white/80 placeholder:text-white/20 focus:border-violet-500/60 focus:bg-white/8" : "border-black/10 bg-black/4 text-black/80 placeholder:text-black/25 focus:border-violet-400/60");

  const scale = (state.exportDpi / 96).toFixed(1);
  const formats: ExportFormat[] = ["png", "svg", "jpeg", "webp"];

  const PRESETS = [
    { label: "Screen", desc: "1920×1080 · 96 DPI", w: 1920, h: 1080, dpi: 96 },
    { label: "Print", desc: "2480×3508 · 300 DPI", w: 2480, h: 3508, dpi: 300 },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Presets */}
      <div>
        <div className={label}>Presets</div>
        <div className="grid grid-cols-2 gap-1.5">
          {PRESETS.map((p) => {
            const active = state.exportWidth === p.w && state.exportHeight === p.h && state.exportDpi === p.dpi;
            return (
              <GlassBtn
                key={p.label}
                onClick={() => onChange({ exportWidth: p.w, exportHeight: p.h, exportDpi: p.dpi })}
                className={cn(
                  "flex flex-col items-start gap-0.5 rounded-[8px] border px-3 py-2 text-left transition-all duration-150 active:scale-[0.96]",
                  active
                    ? "border-violet-500 bg-violet-500/15 text-violet-400"
                    : isDark
                    ? "border-white/8 bg-white/4 text-white/60 hover:border-white/14"
                    : "border-black/8 bg-black/3 text-black/60 hover:border-black/14",
                )}
                wrapperClassName="flex flex-col items-start gap-0.5 w-full"
                style={{ transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
              >
                <span className="text-[13px] font-semibold">{p.label}</span>
                <span className={cn("text-[11px]", active ? "text-violet-300/70" : isDark ? "text-white/30" : "text-black/35")}>{p.desc}</span>
              </GlassBtn>
            );
          })}
        </div>
      </div>

      <div className={cn("h-px", isDark ? "bg-white/6" : "bg-black/8")} />

      {/* Dimensions */}
      <div>
        <div className={label}>Dimensions</div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className={cn("mb-1 text-[14px]", isDark ? "text-white/30" : "text-black/40")}>Width (px)</div>
            <input
              type="number"
              className={input}
              min={100}
              max={7680}
              value={state.exportWidth}
              onChange={(e) => onChange({ exportWidth: Number(e.target.value) })}
            />
          </div>
          <div>
            <div className={cn("mb-1 text-[14px]", isDark ? "text-white/30" : "text-black/40")}>Height (px)</div>
            <input
              type="number"
              className={input}
              min={100}
              max={4320}
              value={state.exportHeight}
              onChange={(e) => onChange({ exportHeight: Number(e.target.value) })}
            />
          </div>
        </div>
      </div>

      {/* DPI */}
      <div>
        <div className={cn(label, "flex items-baseline gap-1")}>
          Resolution —
          <span className={cn("text-[14px] font-semibold normal-case tracking-normal", isDark ? "text-white/70" : "text-black/70")}>
            {state.exportDpi} DPI
          </span>
        </div>
        <Slider min={72} max={600} step={1} value={[state.exportDpi]}
          aria-label={`Export resolution, ${state.exportDpi} DPI`}
          showTooltip tooltipContent={(v) => `${v} DPI`}
          onValueChange={([v]) => onChange({ exportDpi: v })} />
      </div>

      {/* Format */}
      <div>
        <div className={label}>Format</div>
        <div className="grid grid-cols-4 gap-1">
          {formats.map((fmt) => (
            <GlassBtn
              key={fmt}
              onClick={() => onChange({ exportFormat: fmt })}
              className={cn(
                "h-[28px] rounded-[6px] border text-[15px] font-medium uppercase transition-all duration-150 active:scale-[0.94]",
                state.exportFormat === fmt
                  ? "border-violet-500 bg-violet-500/15 text-violet-400"
                  : isDark
                  ? "border-white/8 bg-white/4 text-white/35 hover:border-white/14"
                  : "border-black/8 bg-black/3 text-black/40 hover:border-black/14",
              )}
              wrapperClassName="inline-flex items-center justify-center w-full"
              style={{ transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
            >
              {fmt}
            </GlassBtn>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div>
        <div className={label}>Export summary</div>
        <div className="flex flex-wrap gap-1.5">
          {[
            { v: `${state.exportWidth} × ${state.exportHeight}`, l: "" },
            { v: `${scale}×`, l: "scale" },
          ].map(({ v, l }, i) => (
            <div
              key={i}
              className={cn("flex items-center gap-1 rounded-md border px-2 py-1 text-xs", isDark ? "border-white/8 bg-white/4 text-white/35" : "border-black/8 bg-black/3 text-black/40")}
            >
              <span className={isDark ? "font-medium text-white/70" : "font-medium text-black/70"}>{v}</span>
              {l && <span>{l}</span>}
            </div>
          ))}
        </div>
      </div>

      <div className={cn("h-px", isDark ? "bg-white/6" : "bg-black/8")} />

      <GlassBtn
        onClick={onExport}
        className="flex h-8 w-full items-center justify-center gap-1.5 rounded-[7px] bg-violet-500 text-xs font-medium text-white transition-all duration-150 hover:bg-violet-400 active:scale-[0.97]"
        wrapperClassName="inline-flex items-center gap-1.5"
        style={{ transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
      >
        <Download size={12} />
        Download chart
      </GlassBtn>
    </div>
  );
}
