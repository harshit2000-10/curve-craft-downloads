import { isNumericCol, toNum } from "@/lib/analysis";
import type { AppState } from "@/types";

/**
 * Column-name references live scattered across AppState as raw strings (xCol,
 * yCols, filters[].col, errorBars keyed by col, etc — see the field list in
 * types/index.ts). Deleting or renaming a column has to walk every one of
 * those or the chart silently points at a column that no longer exists.
 */

/** Same text-first-for-X, numeric-for-Y heuristic initState() uses, so a
 * deleted axis column gets replaced with something sensible instead of "". */
function pickFallbackX(cols: string[], data: Record<string, unknown>[]): string {
  const textCols = cols.filter((c) => !isNumericCol(data, c));
  return textCols[0] ?? cols[0] ?? "";
}
function pickFallbackY(cols: string[], data: Record<string, unknown>[], exclude: string): string[] {
  const numericCols = cols.filter((c) => c !== exclude && isNumericCol(data, c));
  return (numericCols.length ? numericCols : cols.filter((c) => c !== exclude)).slice(0, 2);
}

export function deleteColumn(state: AppState, col: string): Partial<AppState> {
  if (!state.cols.includes(col)) return {};
  if (state.cols.length <= 1) throw new Error("Can't delete the last remaining column");

  const cols = state.cols.filter((c) => c !== col);
  const data = state.data.map((row) => {
    const next = { ...row };
    delete next[col];
    return next;
  });

  const legend = { ...state.legend };
  delete legend[col];

  const xCol = state.xCol === col ? pickFallbackX(cols, data) : state.xCol;
  let yCols = state.yCols.filter((c) => c !== col);
  if (yCols.length === 0) yCols = pickFallbackY(cols, data, xCol);
  const secondaryYCols = state.secondaryYCols.filter((c) => c !== col);

  const editTargetCol = state.editTargetCol === col ? (yCols[0] ?? cols[0] ?? "") : state.editTargetCol;
  const bubbleSizeCol = state.bubbleSizeCol === col
    ? (cols.filter((c) => !yCols.includes(c) && isNumericCol(data, c))[0] ?? yCols[0] ?? "")
    : state.bubbleSizeCol;

  const filters = state.filters.filter((f) => f.col !== col);
  const refLines = state.refLines.filter((r) => r.col !== col);

  const errorBars: AppState["errorBars"] = {};
  for (const [key, cfg] of Object.entries(state.errorBars)) {
    if (key === col) continue; // that Y series is gone
    errorBars[key] = cfg.col === col ? { ...cfg, mode: "none", col: "" } : cfg;
  }

  return { cols, data, legend, xCol, yCols, secondaryYCols, editTargetCol, bubbleSizeCol, filters, refLines, errorBars };
}

/** Fills blank cells in a numeric column with that column's mean — leaves
 * non-blank cells (numeric or not) untouched. */
export function fillBlanksWithMean(state: AppState, col: string): Partial<AppState> {
  if (!state.cols.includes(col)) return {};
  const nums: number[] = [];
  for (const row of state.data) {
    const v = row[col];
    if (v == null || v === "") continue;
    const n = toNum(v);
    if (n !== null) nums.push(n);
  }
  if (!nums.length) return {};
  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;

  const data = state.data.map((row) => {
    const v = row[col];
    return v == null || v === "" ? { ...row, [col]: avg } : row;
  });
  return { data };
}

export function renameColumn(state: AppState, oldName: string, rawNewName: string): Partial<AppState> {
  const newName = rawNewName.trim();
  if (!state.cols.includes(oldName)) return {};
  if (!newName || newName === oldName) return {};
  if (state.cols.includes(newName)) throw new Error(`"${newName}" is already a column name`);

  const rename = (c: string) => (c === oldName ? newName : c);

  const cols = state.cols.map(rename);
  const data = state.data.map((row) => {
    const next: Record<string, unknown> = {};
    for (const c of state.cols) next[rename(c)] = row[c];
    return next;
  });

  const legend: AppState["legend"] = {};
  for (const [key, cfg] of Object.entries(state.legend)) {
    // The display label defaults to the column name at load time and is also
    // independently editable — only follow the rename if it's still that
    // untouched default, so a custom legend label survives a column rename.
    const label = key === oldName && cfg.label === oldName ? newName : cfg.label;
    legend[rename(key)] = label === cfg.label ? cfg : { ...cfg, label };
  }

  const xCol = rename(state.xCol);
  const yCols = state.yCols.map(rename);
  const secondaryYCols = state.secondaryYCols.map(rename);
  const editTargetCol = rename(state.editTargetCol);
  const bubbleSizeCol = rename(state.bubbleSizeCol);

  const filters = state.filters.map((f) => (f.col === oldName ? { ...f, col: newName } : f));
  const refLines = state.refLines.map((r) => (r.col === oldName ? { ...r, col: newName } : r));

  const errorBars: AppState["errorBars"] = {};
  for (const [key, cfg] of Object.entries(state.errorBars)) {
    errorBars[rename(key)] = cfg.col === oldName ? { ...cfg, col: newName } : cfg;
  }

  return { cols, data, legend, xCol, yCols, secondaryYCols, editTargetCol, bubbleSizeCol, filters, refLines, errorBars };
}
