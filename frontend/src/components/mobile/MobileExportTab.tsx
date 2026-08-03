import { useState } from "react";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";
import ExportPanel from "@/components/panels/ExportPanel";
import MobileAdvanced from "@/components/mobile/MobileAdvanced";
import type { AppState, AppTheme, ExportFormat } from "@/types";

interface Props {
  state: AppState;
  theme: AppTheme;
  onChange: (patch: Partial<AppState>) => void;
  onExport: () => void;
  onCopyChart: () => void;
  onExportPdf: () => void;
  onExportCsv: () => void;
}

type DownloadTarget = "png" | "svg" | "pdf";
const SCALES = [1, 2, 3];

/** Export tab — format (PNG/SVG/PDF), width/height and a 1×/2×/3× scale
 * multiplier are the mockup's primary controls. PDF isn't a real
 * exportFormat value (it's a separate export route via onExportPdf), so
 * it's tracked as local UI state and only the primary button's handler
 * switches on it. Presets, the raw DPI slider, and Copy/PDF/CSV secondary
 * routes sit behind Advanced, reusing ExportPanel as-is. */
export default function MobileExportTab({ state, theme, onChange, onExport, onCopyChart, onExportPdf, onExportCsv }: Props) {
  const [target, setTarget] = useState<DownloadTarget>(state.exportFormat === "svg" ? "svg" : "png");
  const scale = Math.min(3, Math.max(1, Math.round(state.exportDpi / 96)));

  function pickTarget(t: DownloadTarget) {
    setTarget(t);
    if (t === "png" || t === "svg") onChange({ exportFormat: t as ExportFormat });
  }

  function download() {
    if (target === "pdf") onExportPdf();
    else onExport();
  }

  const input = "w-full rounded-xl border px-3.5 text-[14px] outline-none h-[46px]";
  const inputStyle = { borderColor: "var(--border)", background: "var(--raised)", color: "var(--text)" };
  const segStyle = (sel: boolean) => ({
    borderColor: sel ? "var(--accent)" : "var(--border)",
    background: sel ? "var(--accent-soft)" : "var(--raised)",
    color: sel ? "var(--accent-2)" : "var(--text-2)",
  });

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3">
      <div className="flex flex-col gap-5">
        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--text-3)" }}>
            Format
          </div>
          <div className="flex gap-1.5">
            {(["png", "svg", "pdf"] as DownloadTarget[]).map((t) => (
              <button
                key={t}
                onClick={() => pickTarget(t)}
                className="h-10 flex-1 rounded-xl border text-[13px] font-semibold uppercase transition-colors active:scale-[0.97]"
                style={segStyle(target === t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <div className="mb-1.5 text-[12px]" style={{ color: "var(--text-3)" }}>Width (px)</div>
            <input
              type="number"
              className={input}
              style={inputStyle}
              min={100}
              max={7680}
              value={state.exportWidth}
              onChange={(e) => onChange({ exportWidth: Number(e.target.value) })}
            />
          </div>
          <div>
            <div className="mb-1.5 text-[12px]" style={{ color: "var(--text-3)" }}>Height (px)</div>
            <input
              type="number"
              className={input}
              style={inputStyle}
              min={100}
              max={4320}
              value={state.exportHeight}
              onChange={(e) => onChange({ exportHeight: Number(e.target.value) })}
            />
          </div>
        </div>

        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--text-3)" }}>
            Scale
          </div>
          <div className="flex gap-1.5">
            {SCALES.map((n) => (
              <button
                key={n}
                onClick={() => onChange({ exportDpi: 96 * n })}
                className={cn("h-10 flex-1 rounded-xl border text-[13px] font-semibold transition-colors active:scale-[0.97]")}
                style={segStyle(scale === n)}
              >
                {n}×
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={download}
          className="flex h-[46px] items-center justify-center gap-2 rounded-xl text-[14px] font-semibold text-white"
          style={{ background: "var(--accent)" }}
        >
          <Download size={15} />
          Download chart
        </button>

        <MobileAdvanced>
          <ExportPanel
            state={state} theme={theme} onChange={onChange}
            onExport={onExport} onCopyChart={onCopyChart}
            onExportPdf={onExportPdf} onExportCsv={onExportCsv}
          />
        </MobileAdvanced>
      </div>
    </div>
  );
}
