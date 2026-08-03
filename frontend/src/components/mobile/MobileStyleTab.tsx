import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import StylePanel from "@/components/panels/StylePanel";
import MobileAdvanced from "@/components/mobile/MobileAdvanced";
import type { AppState, AppTheme } from "@/types";

interface Props {
  state: AppState;
  theme: AppTheme;
  onChange: (patch: Partial<AppState>) => void;
}

const FONTS = ["Arial", "Helvetica", "Times New Roman", "Calibri"] as const;
type TickDensity = "off" | "normal" | "dense";

function tickDensity(state: AppState): TickDensity {
  if (!state.showMajorTicks) return "off";
  return state.showMinorTicks ? "dense" : "normal";
}

/** Style tab — series colors, legend/gridline/marker toggles, legend font
 * and tick density are the mockup's primary controls. Everything else
 * StylePanel offers (templates, legend position, axis fonts, tick length,
 * line style, border, per-chart-type extras) sits behind Advanced, reusing
 * the desktop panel as-is. */
export default function MobileStyleTab({ state, theme, onChange }: Props) {
  const density = tickDensity(state);

  function setDensity(d: TickDensity) {
    onChange({
      showMajorTicks: d !== "off",
      showMinorTicks: d === "dense",
    });
  }

  function patchLegend(col: string, patch: Partial<{ label: string; color: string; visible: boolean }>) {
    onChange({ legend: { ...state.legend, [col]: { ...state.legend[col], ...patch } } });
  }

  const segBtn = (sel: boolean) =>
    cn("h-9 flex-1 rounded-xl border text-[13px] font-semibold transition-colors active:scale-[0.97]");
  const segStyle = (sel: boolean) => ({
    borderColor: sel ? "var(--accent)" : "var(--border)",
    background: sel ? "var(--accent-soft)" : "var(--raised)",
    color: sel ? "var(--accent-2)" : "var(--text-2)",
  });

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3">
      <div className="flex flex-col gap-5">
        {/* Series colors */}
        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--text-3)" }}>
            Series
          </div>
          <div className="flex flex-col gap-1.5">
            {state.yCols.map((col) => {
              const cfg = state.legend[col];
              if (!cfg) return null;
              return (
                <div
                  key={col}
                  className="flex items-center gap-2.5 rounded-xl border p-2.5"
                  style={{ borderColor: "var(--border)", background: "var(--raised)" }}
                >
                  <div
                    className="relative h-6 w-6 flex-shrink-0 overflow-hidden rounded-md"
                    style={{ background: cfg.color }}
                  >
                    <input
                      type="color"
                      aria-label={`Color picker for ${col}`}
                      value={cfg.color}
                      className="absolute inset-[-4px] h-[calc(100%+8px)] w-[calc(100%+8px)] cursor-pointer opacity-0"
                      onChange={(e) => patchLegend(col, { color: e.target.value })}
                    />
                  </div>
                  <span className="min-w-0 flex-1 truncate text-[14px]" style={{ color: "var(--text)" }}>{col}</span>
                  <button
                    aria-label={`${cfg.visible ? "Hide" : "Show"} series ${col}`}
                    aria-pressed={cfg.visible}
                    onClick={() => patchLegend(col, { visible: !cfg.visible })}
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
                    style={{ color: cfg.visible ? "var(--text-2)" : "var(--text-3)", opacity: cfg.visible ? 1 : 0.5 }}
                  >
                    {cfg.visible ? <Eye size={15} /> : <EyeOff size={15} />}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend font */}
        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--text-3)" }}>
            Font
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {FONTS.map((font) => {
              const sel = state.legendFontFamily === font;
              return (
                <button
                  key={font}
                  onClick={() => onChange({ legendFontFamily: font })}
                  className="h-10 rounded-xl border text-[13px] transition-colors active:scale-[0.97]"
                  style={{ ...segStyle(sel), fontFamily: font }}
                >
                  {font}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tick density */}
        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--text-3)" }}>
            Tick density
          </div>
          <div className="flex gap-1.5">
            {(["off", "normal", "dense"] as TickDensity[]).map((d) => (
              <button key={d} onClick={() => setDensity(d)} className={cn(segBtn(density === d), "capitalize")} style={segStyle(density === d)}>
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Display toggles */}
        <div className="flex flex-col gap-2.5 rounded-2xl border p-3.5" style={{ borderColor: "var(--border)", background: "var(--raised)" }}>
          {[
            { key: "showLegend" as const, label: "Show legend" },
            { key: "showGrid" as const, label: "Show gridlines" },
            { key: "showMarkers" as const, label: "Show markers" },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-[13px]" style={{ color: "var(--text-2)" }}>{label}</span>
              <Switch checked={state[key]} onCheckedChange={() => onChange({ [key]: !state[key] })} aria-label={label} />
            </div>
          ))}
        </div>

        <MobileAdvanced>
          <StylePanel state={state} theme={theme} onChange={onChange} />
        </MobileAdvanced>
      </div>
    </div>
  );
}
