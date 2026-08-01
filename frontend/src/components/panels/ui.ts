/**
 * Shared visual language for the side panel, from the "Icon Rail" design handoff.
 *
 * The design ships fixed light-mode hex values; every one is mapped to a theme
 * variable here so the panel works in both themes. Keep new panel chrome in this
 * file rather than re-deriving class strings per panel — that drift is what made
 * the old panels look subtly different from each other.
 *
 * Design token            → variable
 *   #fff  (panel)         → --panel
 *   #fafafb (rail, cards) → --raised-2
 *   #e5e7eb (inputs)      → --border
 *   #eef0f3 (cards)       → --border
 *   #8b5cf6 (accent)      → --accent
 *   #f5f3ff (accent bg)   → --accent-soft
 */

/** Monospace section heading — 10px/600, 1.5px tracking. */
export const sectionLabel =
  "font-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-[var(--text-3)]";

/** Grouping card: 12px radius, subtle raised surface. */
export const card =
  "flex flex-col gap-2 rounded-[12px] border border-[var(--border)] bg-[var(--raised-2)] p-3";

/** Text input / select — 8px radius, accent focus ring. */
export const field =
  "w-full box-border rounded-[8px] border border-[var(--border)] bg-[var(--panel)] px-2.5 py-2 " +
  "text-[13px] text-[var(--text)] outline-none transition-colors duration-150 " +
  "placeholder:text-[var(--text-3)] focus:border-[var(--accent)]";

/** Smaller variant used inside 2-column grids. */
export const fieldSm =
  "w-full box-border rounded-[8px] border border-[var(--border)] bg-[var(--panel)] px-2.5 py-[7px] " +
  "text-[12px] text-[var(--text)] outline-none transition-colors duration-150 " +
  "placeholder:text-[var(--text-3)] focus:border-[var(--accent)]";

export const selectField =
  field + " cursor-pointer appearance-none pr-7 bg-no-repeat";

/** Chevron background for native selects, tinted to the current text colour. */
export const selectChevron = {
  backgroundImage:
    `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%239aa1af' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundPosition: "right 10px center",
};

/**
 * List row used by the non-Chart tabs — 10px radius, hover lifts the border
 * toward the accent. Hover is gated to real pointers so it doesn't stick on touch.
 */
export const row =
  "flex items-center gap-2.5 rounded-[10px] border border-[var(--border)] bg-[var(--panel)] px-3 py-[9px] " +
  "transition-colors duration-150 hover-device:border-[var(--accent-soft)]";

/** Monospace badge chip shown at the right of a row. */
export const badge =
  "font-mono text-[10px] font-semibold text-[var(--text-3)] bg-[var(--raised-2)] px-[7px] py-[3px] rounded-[5px]";

/** Press feedback curve used across the panel. */
export const easeOut = "cubic-bezier(0.23,1,0.32,1)";
