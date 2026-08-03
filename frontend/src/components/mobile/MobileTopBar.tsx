import { cn } from "@/lib/utils";
import type { AppTheme } from "@/types";

interface Props {
  fname: string;
  theme: AppTheme;
  canUndo: boolean;
  onBack: () => void;
  onUndo: () => void;
  onToggleTheme: () => void;
}

/** Identical across every mobile tab per the design's shell rule #3: back to
 * upload, filename, undo, theme toggle. */
export default function MobileTopBar({ fname, theme, canUndo, onBack, onUndo, onToggleTheme }: Props) {
  const isDark = theme === "dark";
  const iconBtn = cn(
    "flex h-10 w-10 flex-none items-center justify-center rounded-full transition-opacity active:opacity-60",
    "disabled:opacity-30",
  );

  return (
    <div
      className="flex h-12 flex-shrink-0 items-center gap-2.5 px-3.5"
      style={{ background: "var(--bg)" }}
    >
      <button aria-label="Back to upload" className={iconBtn} onClick={onBack} style={{ color: "var(--text-2)" }}>
        <svg width="18" height="18" viewBox="0 0 22 22" fill="none"><path d="M13.5 5 L8 11 L13.5 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
      </button>
      <div
        className="min-w-0 flex-1 truncate font-mono text-[13px]"
        style={{ color: "var(--text)" }}
      >
        {fname}
      </div>
      <button
        aria-label="Undo last edit"
        className={cn(iconBtn, "bg-[var(--raised)]")}
        onClick={onUndo}
        disabled={!canUndo}
        style={{ color: "var(--text-2)" }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 7 A6 5 0 1 1 4 12 M4 7 L4 3 M4 7 L8 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" /></svg>
      </button>
      <button
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        className={cn(iconBtn, "bg-[var(--raised)]")}
        onClick={onToggleTheme}
        style={{ color: "var(--text-2)" }}
      >
        {isDark ? (
          <svg width="16" height="16" viewBox="0 0 18 18"><path d="M9 2 A7 7 0 0 0 9 16 A5.5 7 0 0 1 9 2 Z" fill="currentColor" /></svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
        )}
      </button>
    </div>
  );
}
