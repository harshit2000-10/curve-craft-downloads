import { Download, Copy, FileText, Table } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassBtn } from "@/components/ui/liquid-glass";
import { Slider } from "@/components/ui/slider";
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

export default function ExportPanel({ state, onChange, onExport, onCopyChart, onExportPdf, onExportCsv }: Props) {
  const label = "mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-3)]";
  const input = "w-full rounded-[9px] border px-3 text-xs outline-none transition-colors duration-150 h-[42px] border-[var(--border)] bg-[var(--raised)] text-[var(--text)] placeholder:text-[var(--text-3)] focus:border-[var(--accent)]";

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
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-2)]"
                    : "border-[var(--border)] bg-[var(--raised)] text-[var(--text-2)] hover:border-[var(--border-hover)]",
                )}
                wrapperClassName="flex flex-col items-start gap-0.5 w-full"
                style={{ transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
              >
                <span className="text-[13px] font-semibold">{p.label}</span>
                <span className={cn("text-[11px]", active ? "text-[var(--accent-2)]" : "text-[var(--text-3)]")}>{p.desc}</span>
              </GlassBtn>
            );
          })}
        </div>
      </div>

      <div className={"h-px bg-[var(--border)]"} />

      {/* Dimensions */}
      <div>
        <div className={label}>Dimensions</div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className={"mb-1 text-[14px] text-[var(--text-3)]"}>Width (px)</div>
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
            <div className={"mb-1 text-[14px] text-[var(--text-3)]"}>Height (px)</div>
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
          <span className={"text-[14px] font-semibold normal-case tracking-normal text-[var(--text)]"}>
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
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-2)]"
                  : "border-[var(--border)] bg-[var(--raised)] text-[var(--text-2)] hover:border-[var(--border-hover)]",
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
              className={"flex items-center gap-1 rounded-md border px-2 py-1 text-xs border-[var(--border)] bg-[var(--raised)] text-[var(--text-2)]"}
            >
              <span className={"font-medium text-[var(--text)]"}>{v}</span>
              {l && <span>{l}</span>}
            </div>
          ))}
        </div>
      </div>

      <div className={"h-px bg-[var(--border)]"} />

      <GlassBtn
        onClick={onExport}
        className="flex h-8 w-full items-center justify-center gap-1.5 rounded-[7px] bg-violet-500 text-xs font-medium text-white transition-all duration-150 hover:bg-violet-400 active:scale-[0.97]"
        wrapperClassName="inline-flex items-center gap-1.5"
        style={{ transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
      >
        <Download size={12} />
        Download chart
      </GlassBtn>

      {/* Secondary export routes — same chart/data, different destinations */}
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { label: "Copy", icon: <Copy size={12} />, onClick: onCopyChart, title: "Copy chart image to clipboard" },
          { label: "PDF", icon: <FileText size={12} />, onClick: onExportPdf, title: "Export chart as a PDF" },
          { label: "CSV", icon: <Table size={12} />, onClick: onExportCsv, title: "Download the edited dataset as CSV" },
        ].map(({ label: lbl, icon, onClick, title }) => (
          <GlassBtn
            key={lbl}
            onClick={onClick}
            title={title}
            className="flex h-8 items-center justify-center gap-1.5 rounded-[7px] border text-xs font-medium transition-all duration-150 active:scale-[0.97] border-[var(--border)] bg-[var(--raised)] text-[var(--text-2)] hover:border-[var(--border-hover)] hover:text-[var(--text)]"
            wrapperClassName="inline-flex items-center justify-center gap-1.5 w-full"
            style={{ transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
          >
            {icon}
            {lbl}
          </GlassBtn>
        ))}
      </div>
    </div>
  );
}
