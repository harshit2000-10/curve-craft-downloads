import { useState } from "react";
import { LineChart, Download, Upload, Sun, Moon, FileText, X, AlertTriangle, Save, FolderOpen, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassBtn } from "@/components/ui/liquid-glass";
import type { AppTheme } from "@/types";

interface Props {
  fname: string;
  theme: AppTheme;
  onReset: () => void;
  onExport: () => void;
  onToggleTheme: () => void;
  onSaveProject: () => void;
  onOpenProject: () => void;
  onShowShortcuts: () => void;
  /** Opens the side panel drawer — only meaningful below the `lg` breakpoint. */
  onTogglePanel: () => void;
}

export default function Navbar({ fname, theme, onReset, onExport, onToggleTheme, onSaveProject, onOpenProject, onShowShortcuts, onTogglePanel }: Props) {
  const isDark = theme === "dark";
  const [confirmReset, setConfirmReset] = useState(false);

  const base = cn(
    "relative flex h-[56px] flex-shrink-0 items-center gap-1.5 px-2.5 backdrop-blur-md border-b sm:gap-3 sm:px-4",
  );
  const baseStyle = {
    background: "color-mix(in srgb, var(--panel) 90%, transparent)",
    borderColor: "var(--border)",
  };

  // Icon-only below `lg` — matches the breakpoint where the side panel docks and
  // the hamburger disappears, so the navbar and panel expand/collapse together.
  const navBtnCls = "flex h-[36px] items-center gap-1.5 rounded-[9px] border px-2.5 lg:px-3.5 text-xs font-medium transition-all duration-150 active:scale-[0.97]";
  const navBtnStyle = { borderColor: "var(--border)", background: "var(--raised)", color: "var(--text-2)" };
  const label = "hidden lg:inline";

  function handleHomeClick() {
    setConfirmReset(true);
  }

  function handleConfirm() {
    setConfirmReset(false);
    onReset();
  }

  return (
    <>
      <nav className={base} style={baseStyle}>
        {/* Panel drawer toggle — only below `lg`, where the side panel isn't docked */}
        <GlassBtn
          onClick={onTogglePanel}
          className="flex h-[36px] w-[36px] flex-shrink-0 items-center justify-center rounded-[9px] border lg:hidden"
          style={{ ...navBtnStyle, transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
          title="Toggle panel"
          aria-label="Toggle panel"
        >
          <Menu size={15} />
        </GlassBtn>

        {/* Logo — home button */}
        <GlassBtn
          onClick={handleHomeClick}
          className={cn(
            "flex items-center gap-2 whitespace-nowrap rounded-[7px] px-2 py-1 text-sm font-semibold tracking-[-0.02em] select-none transition-all duration-150 active:scale-[0.96]",
            isDark ? "text-white hover:bg-white/8" : "text-black hover:bg-black/6",
          )}
          style={{ transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
          title="Back to home"
        >
          <LineChart size={15} className="flex-shrink-0 text-violet-500" strokeWidth={2.2} />
          <span className="hidden sm:inline">Curve Craft</span>
        </GlassBtn>

        {/* Filename — hidden below `md`, there's no room and it's not essential there */}
        <div className="hidden items-center gap-3 lg:flex">
          <div className={cn("h-4 w-px", isDark ? "bg-white/8" : "bg-black/10")} />
          <div className={cn("flex items-center gap-1.5 text-xs", isDark ? "text-white/35" : "text-black/40")}>
            <FileText size={13} />
            <span>{fname}</span>
          </div>
        </div>

        <div className="flex-1" />

        {/* Keyboard shortcuts */}
        <GlassBtn
          onClick={onShowShortcuts}
          className="flex h-[36px] w-[36px] flex-shrink-0 items-center justify-center rounded-[9px] border text-xs font-semibold transition-all duration-150 active:scale-[0.97]"
          style={{ ...navBtnStyle, transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
          title="Keyboard shortcuts (?)"
          aria-label="Keyboard shortcuts"
        >
          ?
        </GlassBtn>

        {/* Theme toggle */}
        <GlassBtn
          onClick={onToggleTheme}
          className={navBtnCls}
          style={{ ...navBtnStyle, transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
          title={isDark ? "Light mode" : "Dark mode"}
        >
          {isDark ? <Sun size={12} /> : <Moon size={12} />}
          <span className={label}>{isDark ? "Light" : "Dark"}</span>
        </GlassBtn>

        {/* Open project */}
        <GlassBtn
          onClick={onOpenProject}
          className={navBtnCls}
          style={{ ...navBtnStyle, transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
          title="Open a saved project file"
        >
          <FolderOpen size={12} />
          <span className={label}>Open</span>
        </GlassBtn>

        {/* Save project */}
        <GlassBtn
          onClick={onSaveProject}
          className={navBtnCls}
          style={{ ...navBtnStyle, transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
          title="Save chart + data as a project file"
        >
          <Save size={12} />
          <span className={label}>Save</span>
        </GlassBtn>

        {/* New file */}
        <GlassBtn
          onClick={handleHomeClick}
          className={navBtnCls}
          style={{ ...navBtnStyle, transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
          title="Start over with a new file"
        >
          <Upload size={12} />
          <span className={label}>New file</span>
        </GlassBtn>

        {/* Export */}
        <GlassBtn
          onClick={onExport}
          className={cn(
            "flex h-[36px] items-center gap-1.5 rounded-[9px] border px-2.5 text-xs font-semibold transition-all duration-150 active:scale-[0.97] lg:px-4",
            "border-violet-500 bg-violet-500 text-white hover:bg-violet-400 hover:border-violet-400 shadow-[rgba(0,0,0,0.15)_0_1px_0]",
          )}
          style={{ transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
          title="Export chart"
        >
          <Download size={12} />
          <span className={label}>Export</span>
        </GlassBtn>
      </nav>

      {/* Confirmation dialog — fixed below navbar, never overlaps content */}
      {confirmReset && (
        <>
          {/* Backdrop — click anywhere to cancel */}
          <div
            className="fixed inset-0 z-[45]"
            onClick={() => setConfirmReset(false)}
          />
          {/* Dialog */}
          <div
            className="fixed left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 rounded-[11px] border px-4 py-2.5 shadow-xl text-xs whitespace-nowrap"
            style={{ top: 64, borderColor: "var(--border)", background: "var(--raised-2)", color: "var(--text-2)" }}
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
              className="rounded-[6px] px-2 py-1 text-[11px] font-medium hover:opacity-70 active:scale-[0.95]"
              style={{ color: "var(--text-3)" }}
            >
              <X size={12} />
            </GlassBtn>
          </div>
        </>
      )}
    </>
  );
}
