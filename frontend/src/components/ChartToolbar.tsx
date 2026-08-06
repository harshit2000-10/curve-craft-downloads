import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { ChartTool } from "@/types";

interface Props {
  tool: ChartTool;
  onTool: (tool: ChartTool) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  /** Greyed out while data-point editing owns the cursor. */
  disabled: boolean;
  /** Text/arrow count — badges the manage-annotations button, hidden at 0. */
  annotationCount: number;
  listOpen: boolean;
  onToggleList: () => void;
}

const TOOLS: { id: ChartTool; label: string; icon: React.ReactNode }[] = [
  {
    id: "select", label: "Select — drag to zoom into a region",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3l14 7.5-6 1.7-2.6 5.8z" /></svg>,
  },
  {
    id: "text", label: "Text — click the chart to write a label",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 6V4h14v2M12 4v16M9 20h6" /></svg>,
  },
  {
    id: "arrow", label: "Arrow — drag on the chart to draw one",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20L20 4M20 4h-7M20 4v7" /></svg>,
  },
];

const ZOOMS: { id: string; label: string; icon: React.ReactNode; key: "in" | "out" | "reset" }[] = [
  {
    id: "in", key: "in", label: "Zoom in",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5M8 11h6M11 8v6" /></svg>,
  },
  {
    id: "out", key: "out", label: "Zoom out",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5M8 11h6" /></svg>,
  },
  {
    id: "reset", key: "reset", label: "Reset zoom",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11a8 8 0 1 1 2.5 5.8M3 11V6M3 11h5" /></svg>,
  },
];

/** Floating vertical rail on the plot — tool modes on top, zoom actions
 * below. Mirrors the design-tool pattern (cursor / text / arrow) rather
 * than Plotly's own modebar, which we keep hidden. Drag the grip at the top
 * to move it anywhere over the chart; double-click the grip to snap it back. */
export default function ChartToolbar({
  tool, onTool, onZoomIn, onZoomOut, onResetZoom, disabled, annotationCount, listOpen, onToggleList,
}: Props) {
  const railRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  function startDrag(e: React.MouseEvent) {
    e.preventDefault();
    const rail = railRef.current;
    const parent = rail?.offsetParent as HTMLElement | null;
    if (!rail || !parent) return;
    const railRect = rail.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    const origX = railRect.left - parentRect.left;
    const origY = railRect.top - parentRect.top;
    const startX = e.clientX;
    const startY = e.clientY;
    const maxX = Math.max(0, parentRect.width - railRect.width);
    const maxY = Math.max(0, parentRect.height - railRect.height);

    function move(ev: MouseEvent) {
      const nx = Math.min(Math.max(0, origX + (ev.clientX - startX)), maxX);
      const ny = Math.min(Math.max(0, origY + (ev.clientY - startY)), maxY);
      setPos({ x: nx, y: ny });
    }
    function up() {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    }
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  const btn = (active: boolean) =>
    cn(
      "flex h-8 w-8 items-center justify-center rounded-[9px] border transition-colors duration-150 active:scale-[0.94]",
      disabled && "pointer-events-none opacity-40",
      active ? "border-[var(--accent)]" : "border-transparent hover-device:border-[var(--border)]",
    );
  const btnStyle = (active: boolean) => ({
    background: active ? "var(--accent-soft)" : "transparent",
    color: active ? "var(--accent-2)" : "var(--text-3)",
  });

  return (
    <div
      ref={railRef}
      className={cn(
        "absolute z-20 flex flex-col gap-1 rounded-[13px] border p-1.5 shadow-lg backdrop-blur-sm",
        pos ? "right-auto top-auto" : "right-3 top-1/2 -translate-y-1/2",
      )}
      style={{
        borderColor: "var(--border)",
        background: "color-mix(in srgb, var(--panel) 92%, transparent)",
        ...(pos ? { left: pos.x, top: pos.y } : {}),
      }}
      role="toolbar"
      aria-label="Chart tools"
    >
      <div
        onMouseDown={startDrag}
        onDoubleClick={() => setPos(null)}
        title="Drag to move — double-click to reset"
        aria-label="Move toolbar"
        className="flex h-4 w-full cursor-grab items-center justify-center active:cursor-grabbing"
      >
        <svg width="14" height="6" viewBox="0 0 14 6" fill="currentColor" style={{ color: "var(--text-3)" }}>
          <circle cx="2" cy="1.5" r="1.3" /><circle cx="7" cy="1.5" r="1.3" /><circle cx="12" cy="1.5" r="1.3" />
          <circle cx="2" cy="4.5" r="1.3" /><circle cx="7" cy="4.5" r="1.3" /><circle cx="12" cy="4.5" r="1.3" />
        </svg>
      </div>

      {TOOLS.map((t) => (
        <button
          key={t.id}
          onClick={() => onTool(t.id)}
          title={t.label}
          aria-label={t.label}
          aria-pressed={tool === t.id}
          className={btn(tool === t.id)}
          style={btnStyle(tool === t.id)}
        >
          {t.icon}
        </button>
      ))}

      <div className="my-0.5 h-px" style={{ background: "var(--border)" }} />

      {ZOOMS.map((z) => (
        <button
          key={z.id}
          onClick={z.key === "in" ? onZoomIn : z.key === "out" ? onZoomOut : onResetZoom}
          title={z.label}
          aria-label={z.label}
          className={btn(false)}
          style={btnStyle(false)}
        >
          {z.icon}
        </button>
      ))}

      {annotationCount > 0 && (
        <>
          <div className="my-0.5 h-px" style={{ background: "var(--border)" }} />
          <button
            onClick={onToggleList}
            title="Manage text labels and arrows"
            aria-label="Manage text labels and arrows"
            aria-pressed={listOpen}
            className={cn(btn(listOpen), "relative")}
            style={btnStyle(listOpen)}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="13" y2="18" />
            </svg>
            <span
              className="absolute -right-1 -top-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full px-[3px] text-[9px] font-bold text-white"
              style={{ background: "var(--accent)" }}
            >
              {annotationCount}
            </span>
          </button>
        </>
      )}
    </div>
  );
}
