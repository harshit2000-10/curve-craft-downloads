import { cn } from "@/lib/utils";
import type { DataSheet } from "@/types";

interface Props {
  sheets: DataSheet[];
  active: number;
  onSelect: (index: number) => void;
  /** Chart-theme colours, so the strip sits on the plot's paper, not the app chrome. */
  paper: string;
  border: string;
  text: string;
  muted: string;
}

/** Workbook tab strip — one button per sheet, shown only when a file actually
 * had more than one. Scrolls horizontally rather than wrapping, so a workbook
 * with a dozen tabs doesn't eat vertical space from the chart. */
export default function SheetTabs({ sheets, active, onSelect, paper, border, text, muted }: Props) {
  if (sheets.length < 2) return null;

  return (
    <div
      className="flex flex-shrink-0 items-center gap-1 overflow-x-auto border-b px-4 py-1.5"
      style={{ borderColor: border, background: paper }}
      role="tablist"
      aria-label="Workbook sheets"
    >
      {sheets.map((s, i) => {
        const sel = i === active;
        return (
          <button
            key={`${s.name}-${i}`}
            role="tab"
            aria-selected={sel}
            title={`${s.name} — ${s.data.length.toLocaleString()} rows`}
            onClick={() => onSelect(i)}
            className={cn(
              "flex-shrink-0 whitespace-nowrap rounded-[7px] border px-2.5 py-1 text-[12px] transition-colors duration-150 active:scale-[0.97]",
              sel ? "font-semibold" : "font-normal",
            )}
            style={{
              borderColor: sel ? "var(--accent)" : "transparent",
              background: sel ? "var(--accent-soft)" : "transparent",
              color: sel ? "var(--accent-2)" : muted,
            }}
            onMouseEnter={(e) => { if (!sel) e.currentTarget.style.color = text; }}
            onMouseLeave={(e) => { if (!sel) e.currentTarget.style.color = muted; }}
          >
            {s.name}
          </button>
        );
      })}
    </div>
  );
}
