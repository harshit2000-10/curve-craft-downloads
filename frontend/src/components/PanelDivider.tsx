import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { PANEL_MIN, PANEL_MAX } from "@/hooks/usePanelWidth";

interface Props {
  width: number;
  /** Called continuously while dragging — state only, no persistence. */
  onWidth: (w: number) => void;
  /** Called once the gesture ends, so the width can be saved. */
  onCommit: () => void;
  onReset: () => void;
}

/**
 * Draggable divider between the side panel and the chart.
 *
 * The hit area is 5px wide but the visible rule stays 1px — a 1px grab target
 * would demand pixel-perfect aiming. Exposed as a real `separator` with arrow-key
 * support so it isn't mouse-only.
 */
export default function PanelDivider({ width, onWidth, onCommit, onReset }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  // While dragging, force the resize cursor everywhere and kill text selection —
  // otherwise sweeping across the chart selects labels and flickers the cursor.
  useEffect(() => {
    if (!dragging) return;
    const { cursor, userSelect } = document.body.style;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.body.style.cursor = cursor;
      document.body.style.userSelect = userSelect;
    };
  }, [dragging]);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    ref.current?.setPointerCapture(e.pointerId);
    setDragging(true);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    // Measure from <main>'s left edge rather than assuming the panel starts at x=0.
    const left = ref.current?.parentElement?.getBoundingClientRect().left ?? 0;
    onWidth(e.clientX - left);
  }

  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    ref.current?.releasePointerCapture(e.pointerId);
    setDragging(false);
    onCommit();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const step = e.shiftKey ? 32 : 8;
    if (e.key === "ArrowLeft")  { e.preventDefault(); onWidth(width - step); onCommit(); }
    else if (e.key === "ArrowRight") { e.preventDefault(); onWidth(width + step); onCommit(); }
    else if (e.key === "Home" || e.key === "Enter") { e.preventDefault(); onReset(); }
  }

  return (
    <div
      ref={ref}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize side panel"
      aria-valuenow={width}
      aria-valuemin={PANEL_MIN}
      aria-valuemax={PANEL_MAX}
      tabIndex={0}
      title="Drag to resize · double-click to reset"
      className="group relative z-20 w-[5px] flex-shrink-0 cursor-col-resize touch-none outline-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={onReset}
      onKeyDown={handleKeyDown}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 transition-colors duration-150",
          dragging
            ? "bg-[var(--accent)]"
            : "bg-[var(--border)] group-hover-device:bg-[var(--accent)] group-focus-visible:bg-[var(--accent)]",
        )}
      />
    </div>
  );
}
