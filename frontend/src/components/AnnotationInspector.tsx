import { useEffect, useState } from "react";
import { Check, RotateCw, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PAL } from "@/lib/palette";
import { Switch } from "@/components/ui/switch";
import type { ChartAnnotation } from "@/types";

interface Props {
  annotation: ChartAnnotation;
  onChange: (patch: Partial<ChartAnnotation>) => void;
  onDelete: () => void;
  onClose: () => void;
}

const SWATCHES = [...PAL.slice(0, 8), "#e8ebf1", "#1f2430"];

/** Floating color + size popover for the currently-selected text label or
 * arrow — opens on creation or by clicking an existing one with Select. */
export default function AnnotationInspector({ annotation: a, onChange, onDelete, onClose }: Props) {
  const isArrow = a.showArrow;
  const size = isArrow ? a.arrowWidth ?? 1 : a.fontSize ?? 12;
  const [min, max] = isArrow ? [1, 6] : [10, 28];

  // Two-tap delete (matches the trash→check confirm pattern used across the
  // app's other panels) — reset whenever the selection changes to a different
  // annotation, so a stray second click can't delete the wrong one.
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => setConfirmDelete(false), [a.id]);

  function handleDeleteClick() {
    if (confirmDelete) onDelete();
    else setConfirmDelete(true);
  }

  return (
    <div
      className="absolute right-16 top-3 z-30 flex w-[196px] flex-col gap-2.5 rounded-[12px] border p-3 shadow-lg backdrop-blur-sm"
      style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--panel) 94%, transparent)" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--text-3)" }}>
          {isArrow ? "Arrow" : "Text"}
        </span>
        <div className="flex items-center gap-1">
          <button
            aria-label={confirmDelete ? "Confirm delete" : "Delete"}
            title={confirmDelete ? "Click again to confirm" : "Delete"}
            onClick={handleDeleteClick}
            onBlur={() => setConfirmDelete(false)}
            className={cn("flex h-6 w-6 items-center justify-center rounded-md transition-colors", confirmDelete && "bg-red-500/15")}
            style={{ color: confirmDelete ? "#ef4444" : "var(--text-3)" }}
          >
            {confirmDelete ? <Check size={13} /> : <Trash2 size={13} />}
          </button>
          <button aria-label="Close" title="Close" onClick={onClose} className="flex h-6 w-6 items-center justify-center rounded-md" style={{ color: "var(--text-3)" }}>
            <X size={13} />
          </button>
        </div>
      </div>

      <div>
        <div className="mb-1 text-[11px]" style={{ color: "var(--text-3)" }}>Color</div>
        <div className="flex flex-wrap gap-1.5">
          {SWATCHES.map((c) => (
            <button
              key={c}
              aria-label={`Set color ${c}`}
              onClick={() => onChange({ color: c })}
              className="h-5 w-5 rounded-full border transition-transform active:scale-90"
              style={{ background: c, borderColor: a.color === c ? "var(--accent)" : "transparent", boxShadow: a.color === c ? "0 0 0 2px var(--accent-soft)" : undefined }}
            />
          ))}
          <label className="relative h-5 w-5 flex-none cursor-pointer overflow-hidden rounded-full border" style={{ borderColor: "var(--border)" }}>
            <input
              type="color"
              aria-label="Custom color"
              value={a.color}
              onChange={(e) => onChange({ color: e.target.value })}
              className="absolute inset-[-4px] h-[calc(100%+8px)] w-[calc(100%+8px)] cursor-pointer opacity-0"
            />
            <span className="pointer-events-none absolute inset-0" style={{ background: a.color }} />
          </label>
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-baseline justify-between text-[11px]" style={{ color: "var(--text-3)" }}>
          <span>{isArrow ? "Thickness" : "Size"}</span>
          <span style={{ color: "var(--text-2)" }}>{size}px</span>
        </div>
        <input
          type="range" min={min} max={max} step={1}
          value={size}
          aria-label={isArrow ? "Arrow thickness" : "Text size"}
          className="w-full accent-[var(--accent)]"
          onChange={(e) => onChange(isArrow ? { arrowWidth: Number(e.target.value) } : { fontSize: Number(e.target.value) })}
        />
      </div>

      <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text-3)" }}>
        <RotateCw size={12} />
        <span>Drag it on the chart to rotate</span>
      </div>

      {!isArrow && (
        <>
          <div>
            <div className="mb-1 flex items-baseline justify-between text-[11px]" style={{ color: "var(--text-3)" }}>
              <span>Weight</span>
              <span style={{ color: "var(--text-2)", fontWeight: a.fontWeight ?? 400 }}>
                {(a.fontWeight ?? 400) <= 200 ? "Thin" : (a.fontWeight ?? 400) <= 500 ? "Regular" : "Bold"}
              </span>
            </div>
            <input
              type="range" min={100} max={900} step={100}
              value={a.fontWeight ?? 400}
              aria-label="Text weight"
              className="w-full accent-[var(--accent)]"
              onChange={(e) => onChange({ fontWeight: Number(e.target.value) })}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px]" style={{ color: "var(--text-3)" }}>Show box</span>
            <Switch
              checked={a.showBox !== false}
              onCheckedChange={(v) => onChange({ showBox: v })}
              aria-label="Show box around text"
            />
          </div>
          <input
            className="rounded-[7px] border px-2 py-1 text-[12px] outline-none"
            style={{ borderColor: "var(--border)", background: "var(--raised)", color: "var(--text)" }}
            value={a.text}
            aria-label="Annotation text"
            onChange={(e) => onChange({ text: e.target.value })}
          />
        </>
      )}
    </div>
  );
}
