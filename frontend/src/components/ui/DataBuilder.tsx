import { useState } from "react";
import { cn } from "@/lib/utils";
import { toNum } from "@/lib/analysis";

interface Props {
  isDark: boolean;
  onCreate: (data: Record<string, unknown>[]) => void;
  onCancel: () => void;
}

const DEFAULT_COLS = ["Column 1", "Column 2"];
const DEFAULT_ROWS = 3;

/** Blank rows/cols the user types into directly — no upload, no formula, just
 * a spreadsheet starting from nothing. Cells stay plain strings while being
 * edited; numeric coercion only happens once, at "Create chart" time, using
 * the same toNum() rule the rest of the app uses for typed cells. */
export default function DataBuilder({ isDark, onCreate, onCancel }: Props) {
  const [cols, setCols] = useState<string[]>(DEFAULT_COLS);
  const [rows, setRows] = useState<string[][]>(
    Array.from({ length: DEFAULT_ROWS }, () => DEFAULT_COLS.map(() => "")),
  );

  const inputCls = cn(
    "w-full min-w-0 rounded-md border bg-transparent px-2 py-1.5 text-[12px] outline-none transition-colors",
    isDark
      ? "border-white/10 text-white/80 placeholder:text-white/25 focus:border-violet-400/60"
      : "border-black/10 text-black/80 placeholder:text-black/25 focus:border-violet-500/60",
  );
  const iconBtnCls = cn(
    "flex h-6 w-6 flex-none items-center justify-center rounded-md transition-colors",
    isDark ? "text-white/30 hover:bg-red-500/15 hover:text-red-400" : "text-black/30 hover:bg-red-500/10 hover:text-red-500",
  );

  function setColName(i: number, name: string) {
    setCols((prev) => prev.map((c, idx) => (idx === i ? name : c)));
  }

  function setCell(r: number, c: number, value: string) {
    setRows((prev) => prev.map((row, idx) => (idx === r ? row.map((v, ci) => (ci === c ? value : v)) : row)));
  }

  function addColumn() {
    setCols((prev) => [...prev, `Column ${prev.length + 1}`]);
    setRows((prev) => prev.map((row) => [...row, ""]));
  }

  function removeColumn(i: number) {
    if (cols.length <= 1) return;
    setCols((prev) => prev.filter((_, idx) => idx !== i));
    setRows((prev) => prev.map((row) => row.filter((_, idx) => idx !== i)));
  }

  function addRow() {
    setRows((prev) => [...prev, cols.map(() => "")]);
  }

  function removeRow(r: number) {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((_, idx) => idx !== r));
  }

  /** Jump straight to N rows/columns instead of clicking + repeatedly — grows
   * with blanks or truncates from the end, same shape addRow/addColumn build. */
  function setRowCount(raw: string) {
    const n = Math.max(1, Math.min(500, Math.round(Number(raw)) || 1));
    setRows((prev) => (n > prev.length
      ? [...prev, ...Array.from({ length: n - prev.length }, () => cols.map(() => ""))]
      : prev.slice(0, n)));
  }

  function setColCount(raw: string) {
    const n = Math.max(1, Math.min(50, Math.round(Number(raw)) || 1));
    setCols((prev) => (n > prev.length
      ? [...prev, ...Array.from({ length: n - prev.length }, (_, i) => `Column ${prev.length + i + 1}`)]
      : prev.slice(0, n)));
    setRows((prev) => prev.map((row) => (n > row.length
      ? [...row, ...Array.from({ length: n - row.length }, () => "")]
      : row.slice(0, n))));
  }

  function handleCreate() {
    // Blank column names would collide as object keys — name them positionally
    // instead of silently dropping the column.
    const names = cols.map((c, i) => c.trim() || `Column ${i + 1}`);
    const seen = new Map<string, number>();
    const uniqueNames = names.map((n) => {
      const count = seen.get(n) ?? 0;
      seen.set(n, count + 1);
      return count === 0 ? n : `${n} (${count + 1})`;
    });

    const nonEmptyRows = rows.filter((row) => row.some((cell) => cell.trim() !== ""));
    const data = nonEmptyRows.map((row) =>
      Object.fromEntries(
        uniqueNames.map((name, i) => {
          const raw = row[i] ?? "";
          const num = toNum(raw);
          return [name, num !== null ? num : raw];
        }),
      ),
    );

    onCreate(data);
  }

  const canCreate = rows.some((row) => row.some((cell) => cell.trim() !== ""));

  const countLabelCls = cn("text-[11px] font-medium", isDark ? "text-white/40" : "text-black/40");
  const countInputCls = cn(
    "w-14 rounded-md border bg-transparent px-1.5 py-1 text-center text-[12px] outline-none transition-colors",
    isDark ? "border-white/10 text-white/80 focus:border-violet-400/60" : "border-black/10 text-black/80 focus:border-violet-500/60",
  );

  return (
    <div className={cn("flex w-full flex-col gap-3 rounded-[14px] border p-4", isDark ? "border-white/8 bg-white/3" : "border-black/8 bg-black/2")}>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-1.5">
          <span className={countLabelCls}>Rows</span>
          <input
            type="number" min={1} max={500}
            className={countInputCls}
            value={rows.length}
            onChange={(e) => setRowCount(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-1.5">
          <span className={countLabelCls}>Columns</span>
          <input
            type="number" min={1} max={50}
            className={countInputCls}
            value={cols.length}
            onChange={(e) => setColCount(e.target.value)}
          />
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-separate" style={{ borderSpacing: "6px 6px" }}>
          <thead>
            <tr>
              {cols.map((c, i) => (
                <th key={i} className="p-0 text-left" style={{ minWidth: 110 }}>
                  <div className="flex items-center gap-1">
                    <input
                      className={cn(inputCls, "font-medium")}
                      value={c}
                      placeholder={`Column ${i + 1}`}
                      onChange={(e) => setColName(i, e.target.value)}
                    />
                    <button aria-label={`Remove column ${i + 1}`} title="Remove column" className={iconBtnCls} onClick={() => removeColumn(i)} disabled={cols.length <= 1}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                </th>
              ))}
              <th className="p-0" style={{ width: 1 }}>
                <button
                  onClick={addColumn}
                  title="Add column"
                  className={cn("flex h-7 w-7 items-center justify-center rounded-md border transition-colors", isDark ? "border-white/10 text-white/40 hover:border-violet-400/40 hover:text-violet-300" : "border-black/10 text-black/40 hover:border-violet-500/40 hover:text-violet-600")}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td key={c} className="p-0">
                    <input
                      className={inputCls}
                      value={cell}
                      placeholder="—"
                      onChange={(e) => setCell(r, c, e.target.value)}
                    />
                  </td>
                ))}
                <td className="p-0">
                  <button aria-label={`Remove row ${r + 1}`} title="Remove row" className={iconBtnCls} onClick={() => removeRow(r)} disabled={rows.length <= 1}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={addRow}
        className={cn(
          "self-start rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors",
          isDark ? "border-white/10 text-white/40 hover:border-violet-400/40 hover:text-violet-300" : "border-black/10 text-black/40 hover:border-violet-500/40 hover:text-violet-600",
        )}
      >
        + Row
      </button>

      <div className="mt-1 flex items-center gap-2">
        <button
          onClick={handleCreate}
          disabled={!canCreate}
          className={cn(
            "flex-1 rounded-lg py-2 text-xs font-semibold text-white transition-all active:scale-[0.97] disabled:opacity-30",
            "bg-violet-500 hover:bg-violet-400",
          )}
        >
          Create chart
        </button>
        <button
          onClick={onCancel}
          className={cn(
            "rounded-lg border px-4 py-2 text-xs font-medium transition-colors",
            isDark ? "border-white/10 text-white/50 hover:border-white/20" : "border-black/10 text-black/50 hover:border-black/20",
          )}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
