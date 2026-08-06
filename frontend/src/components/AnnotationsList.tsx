import { useState } from "react";
import { Check, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChartAnnotation } from "@/types";

interface Props {
  annotations: ChartAnnotation[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  onDelete: (index: number) => void;
  onClose: () => void;
}

/** Toolbar-driven list of every text label and arrow on the chart, each
 * with its own delete — a guaranteed way in regardless of how small or
 * awkward the shape is to click directly on the plot (an arrow especially,
 * since it's just a thin line). */
export default function AnnotationsList({ annotations, selectedIndex, onSelect, onDelete, onClose }: Props) {
  const [confirmIndex, setConfirmIndex] = useState<number | null>(null);

  function handleDeleteClick(i: number) {
    if (confirmIndex === i) { onDelete(i); setConfirmIndex(null); }
    else setConfirmIndex(i);
  }

  return (
    <div
      className="absolute right-16 top-3 z-30 flex max-h-[280px] w-[216px] flex-col gap-1 overflow-hidden rounded-[12px] border shadow-lg backdrop-blur-sm"
      style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--panel) 94%, transparent)" }}
    >
      <div className="flex flex-shrink-0 items-center justify-between border-b px-3 py-2" style={{ borderColor: "var(--border)" }}>
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--text-3)" }}>
          Labels &amp; arrows
        </span>
        <button aria-label="Close" onClick={onClose} className="flex h-5 w-5 items-center justify-center rounded-md" style={{ color: "var(--text-3)" }}>
          <X size={12} />
        </button>
      </div>

      <div className="flex flex-col gap-0.5 overflow-y-auto px-1.5 pb-1.5">
        {annotations.map((a, i) => {
          const confirming = confirmIndex === i;
          return (
            <div
              key={a.id}
              onClick={() => onSelect(i)}
              className="flex cursor-pointer items-center gap-2 rounded-[8px] px-2 py-1.5 transition-colors"
              style={{ background: selectedIndex === i ? "var(--accent-soft)" : "transparent" }}
            >
              <span className="h-2 w-2 flex-none rounded-full" style={{ background: a.color }} />
              <span className="min-w-0 flex-1 truncate text-[12px]" style={{ color: selectedIndex === i ? "var(--accent-2)" : "var(--text-2)" }}>
                {a.showArrow ? (a.text ? `Arrow — ${a.text}` : "Arrow") : (a.text || "Text label")}
              </span>
              <button
                aria-label={confirming ? "Confirm delete" : "Delete"}
                title={confirming ? "Click again to confirm" : "Delete"}
                onClick={(e) => { e.stopPropagation(); handleDeleteClick(i); }}
                onBlur={() => setConfirmIndex(null)}
                className={cn("flex h-6 w-6 flex-none items-center justify-center rounded-md transition-colors", confirming && "bg-red-500/15")}
                style={{ color: confirming ? "#ef4444" : "var(--text-3)" }}
              >
                {confirming ? <Check size={12} /> : <Trash2 size={12} />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
