import { useState } from "react";
import { LineChart, Download, Upload, Sun, Moon, FileText, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassBtn } from "@/components/ui/liquid-glass";
import type { AppTheme } from "@/types";

interface Props {
  fname: string;
  theme: AppTheme;
  onReset: () => void;
  onExport: () => void;
  onToggleTheme: () => void;
}

export default function Navbar({ fname, theme, onReset, onExport, onToggleTheme }: Props) {
  const isDark = theme === "dark";
  const [confirmReset, setConfirmReset] = useState(false);

  const base = cn(
    "relative flex h-[50px] flex-shrink-0 items-center gap-3 px-4 backdrop-blur-md",
    isDark ? "border-b border-white/7 bg-[#111117]/85" : "border-b border-black/8 bg-white/85",
  );

  const navBtnCls = cn(
    "flex h-[30px] items-center gap-1.5 rounded-[7px] border px-3 text-xs font-medium transition-all duration-150 active:scale-[0.97]",
    isDark
      ? "border-white/8 bg-white/5 text-white/70 hover:border-white/14 hover:text-white/90"
      : "border-black/10 bg-black/4 text-black/60 hover:border-black/18 hover:text-black/80",
  );

  function handleHomeClick() {
    setConfirmReset(true);
  }

  function handleConfirm() {
    setConfirmReset(false);
    onReset();
  }

  return (
    <>
      <nav className={base}>
        {/* Logo — home button */}
        <GlassBtn
          onClick={handleHomeClick}
          className={cn(
            "flex items-center gap-2 rounded-[7px] px-2 py-1 text-sm font-semibold tracking-[-0.02em] select-none transition-all duration-150 active:scale-[0.96]",
            isDark ? "text-white hover:bg-white/8" : "text-black hover:bg-black/6",
          )}
          style={{ transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
          title="Back to home"
        >
          <LineChart size={15} className="text-violet-500" strokeWidth={2.2} />
          Curve Craft
        </GlassBtn>

        <div className={cn("h-4 w-px", isDark ? "bg-white/8" : "bg-black/10")} />

        {/* Filename */}
        <div className={cn("flex items-center gap-1.5 text-xs", isDark ? "text-white/35" : "text-black/40")}>
          <FileText size={13} />
          <span>{fname}</span>
        </div>

        <div className="flex-1" />

        {/* Theme toggle */}
        <GlassBtn
          onClick={onToggleTheme}
          className={navBtnCls}
          style={{ transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
          title={isDark ? "Light mode" : "Dark mode"}
        >
          {isDark ? <Sun size={12} /> : <Moon size={12} />}
          {isDark ? "Light" : "Dark"}
        </GlassBtn>

        {/* New file */}
        <GlassBtn
          onClick={handleHomeClick}
          className={navBtnCls}
          style={{ transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
        >
          <Upload size={12} />
          New file
        </GlassBtn>

        {/* Export */}
        <GlassBtn
          onClick={onExport}
          className={cn(
            "flex h-[30px] items-center gap-1.5 rounded-[7px] border px-3 text-xs font-medium transition-all duration-150 active:scale-[0.97]",
            "border-violet-500 bg-violet-500 text-white hover:bg-violet-400 hover:border-violet-400",
          )}
          style={{ transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
        >
          <Download size={12} />
          Export
        </GlassBtn>
      </nav>

      {/* Confirmation dialog — fixed below navbar, never overlaps content */}
      {confirmReset && (
        <>
          {/* Backdrop — click anywhere to cancel */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setConfirmReset(false)}
          />
          {/* Dialog */}
          <div
            className={cn(
              "fixed left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 rounded-[11px] border px-4 py-2.5 shadow-xl text-xs whitespace-nowrap",
              isDark
                ? "border-white/12 bg-[#1e1e28] text-white/80 shadow-black/40"
                : "border-black/10 bg-white text-black/70 shadow-black/12",
            )}
            style={{ top: 58 }}
          >
            <AlertTriangle size={13} className="text-amber-400 flex-shrink-0" />
            <span className="font-medium">Go back to home? Unsaved work will be lost.</span>
            <GlassBtn
              onClick={handleConfirm}
              className="rounded-[6px] bg-red-500/90 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-red-500 active:scale-[0.95]"
            >
              Yes, go home
            </GlassBtn>
            <GlassBtn
              onClick={() => setConfirmReset(false)}
              className={cn(
                "rounded-[6px] px-2 py-1 text-[11px] font-medium hover:opacity-70 active:scale-[0.95]",
                isDark ? "text-white/50" : "text-black/40",
              )}
            >
              <X size={12} />
            </GlassBtn>
          </div>
        </>
      )}
    </>
  );
}
