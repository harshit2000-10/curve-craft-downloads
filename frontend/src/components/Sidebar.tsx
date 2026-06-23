import { useState } from "react";
import { cn } from "@/lib/utils";
import { GlassBtn } from "@/components/ui/liquid-glass";
import ChartPanel from "@/components/panels/ChartPanel";
import DataPanel from "@/components/panels/DataPanel";
import StylePanel from "@/components/panels/StylePanel";
import ExportPanel from "@/components/panels/ExportPanel";
import { CreditCard } from "@/components/ui/social-card";
import type { AppState, AppTheme } from "@/types";

type Tab = "chart" | "data" | "style" | "export";
const TABS: { id: Tab; label: string }[] = [
  { id: "chart",  label: "Chart" },
  { id: "data",   label: "Data" },
  { id: "style",  label: "Style" },
  { id: "export", label: "Download" },
];

interface Props {
  state: AppState;
  theme: AppTheme;
  onChange: (patch: Partial<AppState>) => void;
  onAddColumn: (name: string, expr: string) => void;
  onExport: () => void;
}

export default function Sidebar({ state, theme, onChange, onAddColumn, onExport }: Props) {
  const [tab, setTab] = useState<Tab>("chart");
  const isDark = theme === "dark";

  return (
    <aside
      className={cn(
        "flex w-[330px] flex-shrink-0 flex-col overflow-hidden border-r",
        isDark ? "border-white/7 bg-[#111117]" : "border-black/8 bg-white",
      )}
    >
      {/* Tab bar */}
      <div className={cn("flex gap-0.5 border-b p-1.5", isDark ? "border-white/7" : "border-black/8")}>
        {TABS.map((t) => (
          <GlassBtn
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 h-[28px] rounded-[6px] text-xs font-medium transition-all duration-150 active:scale-[0.97]",
              tab === t.id
                ? isDark ? "bg-white/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" : "bg-black/10 text-black/85 shadow-[inset_0_1px_0_rgba(0,0,0,0.05)]"
                : isDark ? "text-white/40 hover:bg-white/6 hover:text-white/65" : "text-black/40 hover:bg-black/5 hover:text-black/65",
            )}
            wrapperClassName="inline-flex items-center justify-center w-full"
            style={{ transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
          >
            {t.label}
          </GlassBtn>
        ))}
      </div>

      {/* Scrollable content with bottom fade */}
      <div className="relative flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-4">
          {tab === "chart"  && <ChartPanel  state={state} theme={theme} onChange={onChange} />}
          {tab === "data"   && <DataPanel   state={state} theme={theme} onChange={onChange} onAddColumn={onAddColumn} />}
          {tab === "style"  && <StylePanel  state={state} theme={theme} onChange={onChange} />}
          {tab === "export" && <ExportPanel state={state} theme={theme} onChange={onChange} onExport={onExport} />}
        </div>
        {/* Bottom scroll fade */}
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-8"
          style={{
            background: isDark
              ? "linear-gradient(to bottom, transparent, #111117)"
              : "linear-gradient(to bottom, transparent, #ffffff)",
          }}
        />
      </div>

      {/* Credit strip */}
      <div className={cn("flex-shrink-0 border-t pt-3", isDark ? "border-white/7" : "border-black/8")}>
        <CreditCard theme={theme} />
      </div>
    </aside>
  );
}
