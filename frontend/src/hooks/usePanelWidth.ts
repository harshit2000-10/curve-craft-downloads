import { useCallback, useRef, useState } from "react";

const STORAGE_KEY = "cc-panel-width";

export const PANEL_MIN = 240;
export const PANEL_MAX = 560;
export const PANEL_DEFAULT = 320;

export function clampPanelWidth(w: number): number {
  return Math.min(PANEL_MAX, Math.max(PANEL_MIN, Math.round(w)));
}

/**
 * Width of the side panel, remembered across sessions.
 *
 * `setWidth` runs on every pointermove during a drag, so it only touches React
 * state; the localStorage write is deferred to `commit()` on pointer-up. Writing
 * on each move would mean a synchronous storage write every frame.
 */
export function usePanelWidth() {
  const [width, setWidthState] = useState<number>(() => {
    try {
      const raw = Number(localStorage.getItem(STORAGE_KEY));
      return Number.isFinite(raw) && raw > 0 ? clampPanelWidth(raw) : PANEL_DEFAULT;
    } catch {
      return PANEL_DEFAULT;
    }
  });

  const latest = useRef(width);

  const setWidth = useCallback((w: number) => {
    const next = clampPanelWidth(w);
    latest.current = next;
    setWidthState(next);
  }, []);

  const commit = useCallback(() => {
    try { localStorage.setItem(STORAGE_KEY, String(latest.current)); } catch { /* storage unavailable — width just won't persist */ }
  }, []);

  const reset = useCallback(() => {
    setWidth(PANEL_DEFAULT);
    try { localStorage.setItem(STORAGE_KEY, String(PANEL_DEFAULT)); } catch { /* ignore */ }
  }, [setWidth]);

  return { width, setWidth, commit, reset };
}
