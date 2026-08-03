import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassBtn } from "@/components/ui/liquid-glass";
import ChartPanel from "@/components/panels/ChartPanel";
import DataPanel from "@/components/panels/DataPanel";
import CleanPanel from "@/components/panels/CleanPanel";
import StylePanel from "@/components/panels/StylePanel";
import ExportPanel from "@/components/panels/ExportPanel";
import AnalysisPanel from "@/components/panels/AnalysisPanel";
import { CreditCard } from "@/components/ui/social-card";
import { easeOut } from "@/components/panels/ui";
import type { AppState, AppTheme } from "@/types";

type Tab = "chart" | "data" | "clean" | "analysis" | "style" | "export";

/** Vertical icon rail. Icon paths are the 24×24 stroke paths from the design handoff. */
const TABS: { id: Tab; label: string; d: string }[] = [
  { id: "chart",    label: "Chart",    d: "M4 19h16M7 15l3-4 3 2 4-6" },
  { id: "data",     label: "Data",     d: "M4 5h16v14H4zM4 10h16M10 5v14" },
  { id: "clean",    label: "Clean",    d: "M5 3h9l5 5v13H5zM14 3v5h5M9 12l2 2 4-4" },
  { id: "analysis", label: "Analysis", d: "M4 18l5-7 4 3 6-8" },
  { id: "style",    label: "Style",    d: "M12 3s6 7 6 11a6 6 0 1 1-12 0c0-4 6-11 6-11z" },
  { id: "export",   label: "Save",     d: "M5 4h11l3 3v13H5zM8 4v4h6V4M8 20v-6h8v6" },
];

interface Props {
  state: AppState;
  theme: AppTheme;
  /** Set by the draggable divider; the rule itself is drawn by PanelDivider. Only
   * applied at the `lg` breakpoint and up — below that the panel is a fixed-width
   * drawer, sized by viewport rather than by drag. */
  width: number;
  /** Below `lg` the panel is a slide-in drawer; this is whether it's open. Ignored
   * at `lg` and up, where the panel is always visible in its docked column. */
  open: boolean;
  onClose: () => void;
  onChange: (patch: Partial<AppState>) => void;
  onAddColumn: (name: string, expr: string) => void;
  onDeleteColumn: (col: string) => void;
  onRenameColumn: (oldName: string, newName: string) => void;
  onEditCell: (rowIndex: number, col: string, rawValue: string) => void;
  onDeleteRow: (rowIndex: number) => void;
  onDeleteRows: (rowIndices: number[]) => void;
  onExport: () => void;
  onCopyChart: () => void;
  onExportPdf: () => void;
  onExportCsv: () => void;
}

export default function Sidebar({
  state, theme, width, open, onClose, onChange, onAddColumn, onDeleteColumn, onRenameColumn,
  onEditCell, onDeleteRow, onDeleteRows, onExport, onCopyChart, onExportPdf, onExportCsv,
}: Props) {
  const [tab, setTab] = useState<Tab>("chart");
  const active = TABS.find((t) => t.id === tab) ?? TABS[0];

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-[86vw] max-w-[340px] flex-shrink-0 overflow-hidden border-r shadow-2xl",
        "transition-transform duration-300 lg:static lg:z-auto lg:w-[var(--panel-w)] lg:max-w-none lg:translate-x-0 lg:shadow-none",
        open ? "translate-x-0" : "-translate-x-full",
      )}
      style={{
        background: "var(--panel)",
        borderColor: "var(--border)",
        transitionTimingFunction: easeOut,
        ["--panel-w" as string]: `${width}px`,
      }}
    >
      {/* ── Icon rail ─────────────────────────────────────────────── */}
      <nav
        className="relative flex w-[52px] flex-shrink-0 flex-col items-center gap-1 border-r py-3"
        style={{ background: "var(--raised-2)", borderColor: "var(--border)" }}
        aria-label="Panel sections"
      >
        {TABS.map((t) => {
          const sel = tab === t.id;
          return (
            // The tooltip lives outside GlassBtn: GlassBtn sets overflow-hidden on its
            // own <button> for the glass sheen, which would clip anything escaping the
            // 38×38 box. The group wrapper is what the hover variant keys off.
            <div key={t.id} className="group relative">
              <GlassBtn
                onClick={() => setTab(t.id)}
                aria-label={t.label}
                aria-current={sel ? "page" : undefined}
                className={cn(
                  "flex h-[38px] w-[38px] items-center justify-center rounded-[10px]",
                  "transition-[background,color,transform] duration-150 active:scale-[0.94]",
                  !sel && "hover-device:bg-[var(--accent-soft)]",
                )}
                wrapperClassName="inline-flex items-center justify-center"
                style={{
                  background: sel ? "var(--accent-soft)" : "transparent",
                  color: sel ? "var(--accent-2)" : "var(--text-3)",
                  transitionTimingFunction: easeOut,
                }}
              >
                <svg
                  width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.8"
                  strokeLinecap="round" strokeLinejoin="round"
                >
                  <path d={t.d} />
                </svg>
              </GlassBtn>

              {/* Name on hover — pointer devices only, so it can't stick after a tap */}
              <span
                role="tooltip"
                className={cn(
                  "pointer-events-none absolute left-[46px] top-1/2 z-50 -translate-y-1/2 translate-x-[-4px]",
                  "whitespace-nowrap rounded-[6px] px-2 py-1 text-[10.5px] font-semibold opacity-0 shadow-lg",
                  "transition-[opacity,transform] duration-[125ms] ease-out",
                  "group-hover-device:translate-x-0 group-hover-device:opacity-100",
                )}
                style={{ background: "var(--text)", color: "var(--panel)" }}
              >
                {t.label}
              </span>
            </div>
          );
        })}
      </nav>

      {/* ── Content column ────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="relative flex-1 overflow-hidden">
          <div className="flex h-full flex-col gap-3.5 overflow-y-auto px-4 pb-5 pt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-bold tracking-[-0.01em]" style={{ color: "var(--text)" }}>
                {active.label}
              </h2>
              {/* Only the drawer needs an explicit close — the docked column has nothing to close */}
              <GlassBtn
                onClick={onClose}
                aria-label="Close panel"
                className="flex h-7 w-7 items-center justify-center rounded-[7px] lg:hidden"
                wrapperClassName="inline-flex items-center justify-center"
                style={{ color: "var(--text-3)" }}
              >
                <X size={15} />
              </GlassBtn>
            </div>

            {tab === "chart"    && <ChartPanel    state={state} theme={theme} onChange={onChange} />}
            {tab === "data"     && <DataPanel     state={state} theme={theme} onChange={onChange} onAddColumn={onAddColumn} />}
            {tab === "clean"    && <CleanPanel    state={state} theme={theme} onDeleteColumn={onDeleteColumn} onRenameColumn={onRenameColumn} onEditCell={onEditCell} onDeleteRow={onDeleteRow} onDeleteRows={onDeleteRows} />}
            {tab === "analysis" && <AnalysisPanel state={state} theme={theme} onChange={onChange} />}
            {tab === "style"    && <StylePanel    state={state} theme={theme} onChange={onChange} />}
            {tab === "export"   && (
              <ExportPanel
                state={state} theme={theme} onChange={onChange}
                onExport={onExport} onCopyChart={onCopyChart}
                onExportPdf={onExportPdf} onExportCsv={onExportCsv}
              />
            )}
          </div>
          {/* Bottom scroll fade */}
          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 h-8"
            style={{ background: "linear-gradient(to bottom, transparent, var(--panel))" }}
          />
        </div>

        {/* Credit strip */}
        <div className="flex-shrink-0 border-t pt-3" style={{ borderColor: "var(--border)" }}>
          <CreditCard theme={theme} />
        </div>
      </div>
    </aside>
  );
}
