import { useEffect, useState } from "react";
import { Pencil, Trash2, Check, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { columnKind, toNum } from "@/lib/analysis";
import { columnStats } from "@/lib/stats";
import type { AppState, AppTheme } from "@/types";

type Segment = "columns" | "grid";

interface Props {
  state: AppState;
  theme: AppTheme;
  onDeleteColumn: (col: string) => void;
  onRenameColumn: (oldName: string, newName: string) => void;
  onFillBlanks: (col: string) => void;
  onEditCell: (rowIndex: number, col: string, rawValue: string) => void;
  onDeleteRow: (rowIndex: number) => void;
  onDeleteRows: (rowIndices: number[]) => void;
}

function usage(state: AppState, col: string): string | null {
  const roles: string[] = [];
  if (state.xCol === col) roles.push("X axis");
  if (state.yCols.includes(col)) roles.push("Y axis");
  if (state.secondaryYCols.includes(col)) roles.push("right axis");
  return roles.length ? roles.join(", ") : null;
}

function fmtStat(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

/** Clean tab — Columns view mirrors CleanPanel's rename/delete pattern plus
 * a new "Fill blanks" action (fills with the column mean) and inline
 * min/max/mean/outlier stats. Grid view freezes xCol as the left index
 * column, matching the mockup's frozen-column spreadsheet. */
export default function MobileCleanTab({
  state, onDeleteColumn, onRenameColumn, onFillBlanks, onEditCell, onDeleteRow, onDeleteRows,
}: Props) {
  const [segment, setSegment] = useState<Segment>("columns");

  const [editingCol, setEditingCol] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [confirmingCol, setConfirmingCol] = useState<string | null>(null);

  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [cellValue, setCellValue] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [confirmingBulk, setConfirmingBulk] = useState(false);
  const [confirmingRow, setConfirmingRow] = useState<number | null>(null);

  useEffect(() => {
    setSelectedRows(new Set());
    setConfirmingBulk(false);
  }, [state.data.length]);

  function startEdit(col: string) {
    setConfirmingCol(null);
    setEditingCol(col);
    setEditValue(col);
  }
  function commitEdit(col: string) {
    const next = editValue.trim();
    setEditingCol(null);
    if (next && next !== col) onRenameColumn(col, next);
  }
  function handleDeleteClick(col: string) {
    if (confirmingCol === col) { onDeleteColumn(col); setConfirmingCol(null); }
    else { setEditingCol(null); setConfirmingCol(col); }
  }

  function startCellEdit(rowIndex: number, col: string, current: unknown) {
    setEditingCell({ row: rowIndex, col });
    setCellValue(current == null ? "" : String(current));
  }
  function commitCellEdit() {
    if (!editingCell) return;
    const { row: rowIndex, col } = editingCell;
    setEditingCell(null);
    onEditCell(rowIndex, col, cellValue);
  }
  function toggleRow(rowIndex: number) {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowIndex)) next.delete(rowIndex); else next.add(rowIndex);
      return next;
    });
    setConfirmingBulk(false);
  }
  function handleRowDeleteClick(rowIndex: number) {
    if (confirmingRow === rowIndex) { onDeleteRow(rowIndex); setConfirmingRow(null); }
    else setConfirmingRow(rowIndex);
  }
  function handleBulkDeleteClick() {
    if (confirmingBulk) { onDeleteRows([...selectedRows]); setSelectMode(false); }
    else setConfirmingBulk(true);
  }

  const card = "flex flex-col gap-2.5 rounded-2xl border p-3.5";
  const cardStyle = { borderColor: "var(--border)", background: "var(--raised)" };
  const gridCols = [state.xCol, ...state.cols.filter((c) => c !== state.xCol)].filter(Boolean);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-shrink-0 gap-1.5 px-4 pb-2 pt-3">
        {(["columns", "grid"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSegment(s)}
            className="h-9 flex-1 rounded-xl border text-[13px] font-semibold capitalize transition-colors active:scale-[0.97]"
            style={{
              borderColor: segment === s ? "var(--accent)" : "var(--border)",
              background: segment === s ? "var(--accent-soft)" : "var(--raised)",
              color: segment === s ? "var(--accent-2)" : "var(--text-2)",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {segment === "columns" ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          <div className="flex flex-col gap-2 pt-1">
            {state.cols.map((c) => {
              const editing = editingCol === c;
              const confirming = confirmingCol === c;
              const inUse = usage(state, c);
              const stats = columnStats(state.data, c, toNum);
              return (
                <div key={c} className={card} style={cardStyle}>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: state.legend[c]?.color }} />
                    {editing ? (
                      <input
                        autoFocus
                        className="h-8 min-w-0 flex-1 rounded-lg border px-2 text-[14px] outline-none"
                        style={{ borderColor: "var(--accent)", background: "var(--panel)", color: "var(--text)" }}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitEdit(c);
                          else if (e.key === "Escape") setEditingCol(null);
                        }}
                        onBlur={() => commitEdit(c)}
                      />
                    ) : (
                      <span className="min-w-0 flex-1 truncate text-[14px] font-medium" style={{ color: "var(--text)" }}>{c}</span>
                    )}
                    {!editing && (
                      <span className="rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold" style={{ background: "var(--raised-2)", color: "var(--text-3)" }}>
                        {columnKind(state.data, c)}
                      </span>
                    )}
                    {editing ? (
                      <button aria-label="Cancel rename" className="flex h-7 w-7 flex-none items-center justify-center rounded-lg" style={{ color: "var(--text-3)" }} onClick={() => setEditingCol(null)}>
                        <X size={14} />
                      </button>
                    ) : (
                      <button aria-label={`Rename ${c}`} className="flex h-7 w-7 flex-none items-center justify-center rounded-lg" style={{ color: "var(--text-3)" }} onClick={() => startEdit(c)}>
                        <Pencil size={13} />
                      </button>
                    )}
                    <button
                      aria-label={confirming ? `Confirm delete ${c}` : `Delete ${c}`}
                      disabled={state.cols.length <= 1}
                      className={cn("flex h-7 flex-none items-center justify-center rounded-lg px-1.5 disabled:opacity-30", confirming && "bg-red-500/15 text-red-500")}
                      style={{ color: confirming ? undefined : "var(--text-3)" }}
                      onClick={() => handleDeleteClick(c)}
                    >
                      {confirming ? <Check size={14} /> : <Trash2 size={13} />}
                    </button>
                  </div>

                  {inUse && <div className="truncate text-[11px]" style={{ color: "var(--text-3)" }}>{inUse}</div>}

                  {stats && (
                    <div className="flex flex-wrap gap-1.5 text-[11px]" style={{ color: "var(--text-3)" }}>
                      <span className="rounded-md px-2 py-1" style={{ background: "var(--raised-2)" }}>min {fmtStat(stats.min)}</span>
                      <span className="rounded-md px-2 py-1" style={{ background: "var(--raised-2)" }}>max {fmtStat(stats.max)}</span>
                      <span className="rounded-md px-2 py-1" style={{ background: "var(--raised-2)" }}>mean {fmtStat(stats.mean)}</span>
                      {stats.outliers > 0 && (
                        <span className="rounded-md px-2 py-1" style={{ background: "var(--raised-2)" }}>{stats.outliers} outlier{stats.outliers === 1 ? "" : "s"}</span>
                      )}
                      {stats.blanks > 0 && (
                        <button
                          onClick={() => onFillBlanks(c)}
                          className="flex items-center gap-1 rounded-md border px-2 py-1 font-medium transition-colors active:scale-[0.96]"
                          style={{ borderColor: "var(--accent)", color: "var(--accent-2)", background: "var(--accent-soft)" }}
                        >
                          <Sparkles size={11} />
                          Fill {stats.blanks} blank{stats.blanks === 1 ? "" : "s"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {state.cols.length <= 1 && (
              <div className="text-[11px] leading-relaxed" style={{ color: "var(--text-3)" }}>
                At least one column has to stay — this is the last one.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
          <div className="mb-2 flex flex-shrink-0 items-center justify-between">
            <span className="text-[11px]" style={{ color: "var(--text-3)" }}>
              {state.data.length.toLocaleString()} row{state.data.length === 1 ? "" : "s"} — {state.xCol} frozen
            </span>
            <div className="flex items-center gap-1.5">
              {selectMode && selectedRows.size > 0 && (
                <button
                  onClick={handleBulkDeleteClick}
                  className={cn("flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold", confirmingBulk ? "bg-red-500/15 text-red-500" : "bg-red-500/10 text-red-500")}
                >
                  {confirmingBulk ? <Check size={11} /> : <Trash2 size={11} />}
                  {confirmingBulk ? `Confirm ${selectedRows.size}` : `Delete ${selectedRows.size}`}
                </button>
              )}
              <button
                onClick={() => { setSelectMode((s) => !s); setSelectedRows(new Set()); setConfirmingBulk(false); }}
                className="rounded-md border px-2 py-1 text-[11px] font-medium"
                style={{
                  borderColor: selectMode ? "var(--accent)" : "var(--border)",
                  color: selectMode ? "var(--accent-2)" : "var(--text-2)",
                  background: selectMode ? "var(--accent-soft)" : "var(--raised)",
                }}
              >
                {selectMode ? "Done" : "Select"}
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto rounded-xl border" style={{ borderColor: "var(--border)" }}>
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr>
                  <th
                    className="sticky left-0 top-0 z-20 whitespace-nowrap px-2.5 py-2 text-left font-semibold"
                    style={{ background: "var(--raised)", color: "var(--text)", borderBottom: "1px solid var(--border)" }}
                  >
                    {gridCols[0] || "—"}
                  </th>
                  {gridCols.slice(1).map((c) => (
                    <th
                      key={c}
                      className="sticky top-0 z-10 whitespace-nowrap px-2.5 py-2 text-left font-medium"
                      style={{ background: "var(--raised)", color: "var(--text-2)", borderBottom: "1px solid var(--border)" }}
                    >
                      {c}
                    </th>
                  ))}
                  <th className="sticky top-0 z-10" style={{ background: "var(--raised)", borderBottom: "1px solid var(--border)", width: 1 }} />
                </tr>
              </thead>
              <tbody>
                {state.data.map((dataRow, rowIndex) => {
                  const confirming = confirmingRow === rowIndex;
                  const selected = selectedRows.has(rowIndex);
                  return (
                    <tr key={rowIndex} style={selected ? { background: "var(--accent-soft)" } : undefined}>
                      {gridCols.map((c, ci) => {
                        const editingThis = editingCell?.row === rowIndex && editingCell.col === c;
                        return (
                          <td
                            key={c}
                            onClick={() => {
                              if (selectMode) { toggleRow(rowIndex); return; }
                              if (!editingThis) startCellEdit(rowIndex, c, dataRow[c]);
                            }}
                            className={cn("whitespace-nowrap px-2.5 py-1.5", ci === 0 && "sticky left-0 z-10 font-medium")}
                            style={{
                              color: ci === 0 ? "var(--text)" : "var(--text-2)",
                              background: ci === 0 ? (selected ? "var(--accent-soft)" : "var(--panel)") : undefined,
                              borderBottom: "1px solid var(--border)",
                            }}
                          >
                            {editingThis ? (
                              <input
                                autoFocus
                                value={cellValue}
                                onChange={(e) => setCellValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") commitCellEdit();
                                  else if (e.key === "Escape") setEditingCell(null);
                                }}
                                onBlur={commitCellEdit}
                                className="w-full min-w-[60px] border-none bg-transparent text-[12px] outline-none"
                                style={{ color: "var(--text)" }}
                              />
                            ) : (
                              String(dataRow[c] ?? "—")
                            )}
                          </td>
                        );
                      })}
                      <td className="px-1.5 py-1" style={{ borderBottom: "1px solid var(--border)" }}>
                        {selectMode ? (
                          <input type="checkbox" aria-label={`Select row ${rowIndex + 1}`} checked={selected} onChange={() => toggleRow(rowIndex)} />
                        ) : (
                          <button
                            aria-label={confirming ? `Confirm delete row ${rowIndex + 1}` : `Delete row ${rowIndex + 1}`}
                            className={cn("flex h-6 w-6 flex-none items-center justify-center rounded", confirming && "bg-red-500/15 text-red-500")}
                            style={{ color: confirming ? undefined : "var(--text-3)" }}
                            onClick={() => handleRowDeleteClick(rowIndex)}
                          >
                            {confirming ? <Check size={13} /> : <Trash2 size={12} />}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
