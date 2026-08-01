import type { AppState } from "@/types";

/** How duplicate X values get collapsed into one plotted point. */
export type AggFunc = "none" | "sum" | "mean" | "median" | "count" | "min" | "max";
export type FilterOp = "=" | "!=" | ">" | ">=" | "<" | "<=" | "contains";
export type SortMode = "none" | "x-asc" | "x-desc" | "y-asc" | "y-desc";

export interface Filter {
  col: string;
  op: FilterOp;
  value: string;
  enabled: boolean;
}

export const AGG_FUNCS: { id: AggFunc; label: string }[] = [
  { id: "none",   label: "None" },
  { id: "sum",    label: "Sum" },
  { id: "mean",   label: "Mean" },
  { id: "median", label: "Median" },
  { id: "count",  label: "Count" },
  { id: "min",    label: "Min" },
  { id: "max",    label: "Max" },
];

export const FILTER_OPS: FilterOp[] = ["=", "!=", ">", ">=", "<", "<=", "contains"];

export const SORT_MODES: { id: SortMode; label: string }[] = [
  { id: "none",   label: "Original order" },
  { id: "x-asc",  label: "X ascending" },
  { id: "x-desc", label: "X descending" },
  { id: "y-asc",  label: "Y ascending" },
  { id: "y-desc", label: "Y descending" },
];

type Row = Record<string, unknown>;

/**
 * Coerce a cell to a number the way a spreadsheet would: strip currency symbols,
 * thousands separators, a trailing percent sign, and accounting-style parens for
 * negatives ("(1,234.56)" → -1234.56). Returns null for anything that isn't a
 * real number, so callers can count what they had to throw away.
 *
 * Known gap: assumes comma-thousands/dot-decimal (US/UK/IN style). A European
 * "1.234,56" is ambiguous without knowing the file's locale — guessing wrong
 * would silently corrupt the far more common comma-thousands format, so this
 * deliberately doesn't attempt it.
 */
export function toNum(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "boolean" || v == null) return null;
  let s = String(v).trim();
  if (!s) return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) { negative = true; s = s.slice(1, -1); }
  const cleaned = s.replace(/[$£€¥₹,\s]/g, "").replace(/%$/, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return negative ? -Math.abs(n) : n;
}

/**
 * True if a clear majority of non-blank values in a column parse as numbers.
 * Deliberately tolerant: a real revenue column peppered with "N/A" is still a
 * revenue column, and demanding near-purity here would drop it from the chart
 * defaults exactly when the user most needs to see it.
 */
export function isNumericCol(data: Row[], col: string): boolean {
  let seen = 0;
  let numeric = 0;
  for (const r of data) {
    const v = r[col];
    if (v == null || v === "") continue;
    seen++;
    if (toNum(v) !== null) numeric++;
    if (seen >= 50) break;
  }
  return seen > 0 && numeric / seen >= 0.6;
}

// Shapes that read as a date, beyond ISO. Requiring one of these first (rather
// than trusting Date.parse alone) keeps "Jan" or "3/4" from being read as dates —
// Date.parse tolerates both, but neither is one in a spreadsheet column.
const DATE_SHAPES = [
  /^\d{4}[-/]\d{1,2}([-/]\d{1,2})?/,            // 2026-07-15, 2026/07/15
  /^\d{1,2}[\s-][A-Za-z]{3,9}[\s-]\d{2,4}\b/,   // 15-Jan-2026, 15 Jan 2026
  /^[A-Za-z]{3,9}\s\d{1,2},?\s\d{2,4}\b/,       // Jan 15 2026, January 15, 2026
];
// D/M/Y or M/D/Y with a 2–4 digit year — day-first dates ("15-07-2026") are
// common outside the US, but V8's Date.parse only trusts month-first for
// dash/slash format and rejects day-first as invalid. The shape itself (three
// numeric groups, last one year-length) is distinctive enough on its own, so
// this skips the Date.parse gate rather than mislabeling valid dates as text.
const NUMERIC_DATE_SHAPE = /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/;

function looksLikeDate(s: string): boolean {
  if (NUMERIC_DATE_SHAPE.test(s)) return true;
  return DATE_SHAPES.some((re) => re.test(s)) && !Number.isNaN(Date.parse(s));
}

/**
 * Rough type of a column, for the Data-tab badges. Numeric wins first because that's
 * what actually decides whether a column can be plotted or aggregated.
 *
 * Known gap: an Excel serial date that leaks through as a bare number (e.g. 45870)
 * reads as "number" here, not "date" — there's no way to tell that apart from a
 * real numeric value by pattern alone. Fixed at the source instead: the Excel
 * reader requests real Date objects from SheetJS rather than raw serials.
 */
export function columnKind(data: Row[], col: string): "number" | "date" | "text" {
  if (isNumericCol(data, col)) return "number";
  let seen = 0;
  let dates = 0;
  for (const r of data) {
    const v = r[col];
    if (v == null || v === "") continue;
    seen++;
    if (v instanceof Date || looksLikeDate(String(v).trim())) dates++;
    if (seen >= 50) break;
  }
  return seen > 0 && dates / seen >= 0.8 ? "date" : "text";
}

function passes(row: Row, f: Filter): boolean {
  const raw = row[f.col];
  if (f.op === "contains") {
    return String(raw ?? "").toLowerCase().includes(f.value.toLowerCase());
  }
  // Compare numerically when both sides are numbers, so "10" > "9" is true.
  const a = toNum(raw);
  const b = toNum(f.value);
  if (b !== null) {
    // The threshold is a number, so this is a numeric comparison. A cell that isn't a
    // number has no position on that scale — falling back to string ordering here would
    // make "N/A" > "99" true and silently let junk rows through the filter.
    if (a === null) return f.op === "!=";
    switch (f.op) {
      case "=":  return a === b;
      case "!=": return a !== b;
      case ">":  return a > b;
      case ">=": return a >= b;
      case "<":  return a < b;
      case "<=": return a <= b;
    }
  }
  const s = String(raw ?? "");
  switch (f.op) {
    case "=":  return s === f.value;
    case "!=": return s !== f.value;
    case ">":  return s > f.value;
    case ">=": return s >= f.value;
    case "<":  return s < f.value;
    case "<=": return s <= f.value;
  }
  return true;
}

/** Reduce a group of numbers. `groupSize` is used by count, which counts rows not values. */
function reduce(nums: number[], fn: AggFunc, groupSize: number): number | null {
  if (fn === "count") return groupSize;
  if (!nums.length) return null;
  switch (fn) {
    case "sum":    return nums.reduce((a, b) => a + b, 0);
    case "mean":   return nums.reduce((a, b) => a + b, 0) / nums.length;
    case "median": {
      const s = [...nums].sort((a, b) => a - b);
      const m = s.length >> 1;
      return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
    }
    // Reduce rather than Math.min(...nums) — spreading a 50k-element array blows the stack.
    case "min": return nums.reduce((a, b) => (b < a ? b : a));
    case "max": return nums.reduce((a, b) => (b > a ? b : a));
    default:    return null;
  }
}

function aggregate(rows: Row[], xCol: string, yCols: string[], fn: AggFunc): Row[] {
  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    const key = String(r[xCol] ?? "");
    const g = groups.get(key);
    if (g) g.push(r);
    else groups.set(key, [r]);
  }
  return [...groups.values()].map((g) => {
    // Keep the original X value (not the stringified key) so dates stay dates.
    const out: Row = { [xCol]: g[0][xCol] };
    for (const c of yCols) {
      const nums: number[] = [];
      for (const r of g) {
        const n = toNum(r[c]);
        if (n !== null) nums.push(n);
      }
      out[c] = reduce(nums, fn, g.length);
    }
    return out;
  });
}

function sortRows(rows: Row[], xCol: string, yCol: string, mode: SortMode): Row[] {
  if (mode === "none") return rows;
  const col = mode.startsWith("x") ? xCol : yCol;
  if (!col) return rows;
  const desc = mode.endsWith("desc");
  const sorted = [...rows].sort((ra, rb) => {
    const a = toNum(ra[col]);
    const b = toNum(rb[col]);
    if (a !== null && b !== null) return a - b;
    return String(ra[col] ?? "").localeCompare(String(rb[col] ?? ""));
  });
  return desc ? sorted.reverse() : sorted;
}

export interface ColumnIssue {
  col: string;
  blank: number;
  nonNumeric: number;
}

export interface AnalysisResult {
  /** Rows the chart should actually plot, after filter → aggregate → sort. */
  rows: Row[];
  sourceRows: number;
  filteredOut: number;
  /** Rows collapsed away by grouping (0 when aggregation is off). */
  groupedFrom: number;
  issues: ColumnIssue[];
  /** True when any transform is active — click-to-edit is unsafe in that case. */
  transformed: boolean;
}

/**
 * The whole data pipeline in one pure pass: filter rows, collapse duplicate X
 * values with the chosen aggregate, then sort. Also reports what it had to drop
 * so the UI can warn instead of silently plotting a partial dataset.
 */
export function analyze(state: AppState): AnalysisResult {
  const { data, xCol, yCols } = state;
  const filters = (state.filters ?? []).filter((f) => f.enabled && f.col && f.value !== "");
  const aggFunc = state.aggFunc ?? "none";
  const sortMode = state.sortMode ?? "none";

  const filtered = filters.length ? data.filter((r) => filters.every((f) => passes(r, f))) : data;

  // Data-quality scan runs on the filtered rows — that's what the chart draws from.
  const issues: ColumnIssue[] = [];
  for (const col of yCols) {
    let blank = 0;
    let nonNumeric = 0;
    for (const r of filtered) {
      const v = r[col];
      if (v == null || v === "") blank++;
      else if (toNum(v) === null) nonNumeric++;
    }
    if (blank || nonNumeric) issues.push({ col, blank, nonNumeric });
  }

  const grouped = aggFunc !== "none" && xCol ? aggregate(filtered, xCol, yCols, aggFunc) : filtered;
  const rows = sortRows(grouped, xCol, yCols[0] ?? "", sortMode);

  return {
    rows,
    sourceRows: data.length,
    filteredOut: data.length - filtered.length,
    groupedFrom: aggFunc !== "none" ? filtered.length - grouped.length : 0,
    issues,
    transformed: filters.length > 0 || aggFunc !== "none" || sortMode !== "none",
  };
}

/** "Sum of revenue" — used to label the Y axis honestly when aggregation is on. */
export function aggAxisLabel(aggFunc: AggFunc, yCols: string[]): string {
  if (aggFunc === "none" || !yCols.length) return "";
  const name = AGG_FUNCS.find((a) => a.id === aggFunc)?.label ?? aggFunc;
  return `${name} of ${yCols.join(", ")}`;
}
