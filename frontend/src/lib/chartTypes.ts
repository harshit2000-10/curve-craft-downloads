import type { ChartType } from "@/types";

export interface ChartTypeMeta {
  id: ChartType;
  /** Short label shown on picker tiles. */
  label: string;
  /** Full name for tooltips and the picker trigger. */
  name: string;
  /** Single-path 24×24 stroke icon, from the side-panel design handoff. */
  d: string;
  sw: number;
}

/**
 * Canonical chart-type list: display order, labels and icons in one place. Drives
 * the picker grid, the picker trigger and the number-key shortcuts, so those three
 * can't drift out of sync.
 */
export const CHART_TYPES: ChartTypeMeta[] = [
  { id: "line",      label: "Line",    name: "Line",        d: "M3 17l5-6 4 3 6-8", sw: 1.8 },
  { id: "bar",       label: "Bar",     name: "Bar",         d: "M5 20v-9M10 20V5M15 20v-6M20 20V9", sw: 2.4 },
  { id: "scatter",   label: "Scatter", name: "Scatter",     d: "M6 16h.01M10 8h.01M14 13h.01M18 6h.01M8 11h.01", sw: 3 },
  { id: "area",      label: "Area",    name: "Area",        d: "M3 18l5-6 4 3 6-8v11H3z", sw: 1.8 },
  { id: "pie",       label: "Pie",     name: "Pie",         d: "M12 4a8 8 0 1 1-8 8h8z", sw: 1.8 },
  { id: "histogram", label: "Hist",    name: "Histogram",   d: "M4 20v-5h4v5zM8 20V7h4v13zM12 20v-9h4v9zM16 20v-3h4v3z", sw: 1.5 },
  { id: "box",       label: "Box",     name: "Box plot",    d: "M6 8h10v9H6zM11 8V4M11 17v4M6 12.5h10", sw: 1.6 },
  { id: "heatmap",   label: "Heatmap", name: "Heatmap",     d: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z", sw: 1.5 },
  { id: "violin",    label: "Violin",  name: "Violin plot", d: "M12 3c4 3-4 6 0 9s-4 6 0 9", sw: 1.8 },
  { id: "bubble",    label: "Bubble",  name: "Bubble",      d: "M8 13a3 3 0 1 0 .01 0M16 7a2 2 0 1 0 .01 0M15.5 16a1.5 1.5 0 1 0 .01 0", sw: 1.6 },
  { id: "donut",     label: "Donut",   name: "Donut",       d: "M12 3a9 9 0 1 1-.01 0M12 8a4 4 0 1 0 .01 0", sw: 1.7 },
  { id: "treemap",   label: "Treemap", name: "Treemap",     d: "M4 4h16v16H4zM13 4v10M13 14h7M4 14h9", sw: 1.5 },
];

export const CHART_TYPE_ORDER: ChartType[] = CHART_TYPES.map((c) => c.id);

export function chartTypeMeta(id: ChartType): ChartTypeMeta {
  return CHART_TYPES.find((c) => c.id === id) ?? CHART_TYPES[0];
}

/** Step forward/backward through the chart types, wrapping at both ends. */
export function cycleChartType(current: ChartType, dir: 1 | -1): ChartType {
  const i = CHART_TYPE_ORDER.indexOf(current);
  const next = (i + dir + CHART_TYPE_ORDER.length) % CHART_TYPE_ORDER.length;
  return CHART_TYPE_ORDER[next];
}
