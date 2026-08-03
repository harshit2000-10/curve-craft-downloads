import { cn } from "@/lib/utils";

export type MobileTab = "chart" | "data" | "clean" | "style" | "export";

const TABS: { id: MobileTab; label: string; icon: React.ReactNode }[] = [
  {
    id: "chart", label: "Chart",
    icon: <svg width="22" height="22" viewBox="0 0 22 22"><polyline points="3,17 9,9 13,12 19,4" stroke="currentColor" strokeWidth="2" fill="none" /></svg>,
  },
  {
    id: "data", label: "Data",
    icon: <svg width="22" height="22" viewBox="0 0 22 22"><text x="11" y="16" fontSize="15" textAnchor="middle" fill="currentColor" fontFamily="IBM Plex Mono, monospace">fx</text></svg>,
  },
  {
    id: "clean", label: "Clean",
    icon: <svg width="22" height="22" viewBox="0 0 22 22"><rect x="3" y="4" width="16" height="4" rx="1" stroke="currentColor" strokeWidth="1.6" fill="none" /><rect x="3" y="10" width="16" height="4" rx="1" stroke="currentColor" strokeWidth="1.6" fill="none" /><rect x="3" y="16" width="10" height="3" rx="1" stroke="currentColor" strokeWidth="1.6" fill="none" /></svg>,
  },
  {
    id: "style", label: "Style",
    icon: <svg width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" fill="none" /><path d="M11 11 L11 4 A7 7 0 0 1 17 8 Z" fill="currentColor" /></svg>,
  },
  {
    id: "export", label: "Export",
    icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 3 L11 13 M11 3 L7 7 M11 3 L15 7 M4 15 L4 18 L18 18 L18 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" transform="rotate(180 11 10.5)" /></svg>,
  },
];

interface Props {
  active: MobileTab;
  onChange: (tab: MobileTab) => void;
}

export default function MobileTabBar({ active, onChange }: Props) {
  return (
    <div
      className="flex flex-shrink-0 border-t px-1.5 pb-[env(safe-area-inset-bottom,10px)] pt-2"
      style={{ borderColor: "var(--border)", background: "var(--panel)" }}
    >
      {TABS.map((t) => {
        const sel = active === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            aria-current={sel ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1 transition-colors active:opacity-70",
            )}
            style={{ color: sel ? "var(--accent-2)" : "var(--text-3)" }}
          >
            {t.icon}
            <span className={cn("text-[11px]", sel && "font-semibold")}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
