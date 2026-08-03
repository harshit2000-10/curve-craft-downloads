import { useState, useEffect } from "react";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { columnKind } from "@/lib/analysis";
import { row, badge, field } from "@/components/panels/ui";
import type { AppState, AppTheme } from "@/types";

interface Props {
  state: AppState;
  theme: AppTheme;
  onDeleteColumn: (col: string) => void;
  onRenameColumn: (oldName: string, newName: string) => void;
  onEditCell: (rowIndex: number, col: string, rawValue: string) => void;
  onDeleteRow: (rowIndex: number) => void;
  onDeleteRows: (rowIndices: number[]) => void;
}

/** Where a column is currently plotted, so deleting it isn't a surprise. */
function usage(state: AppState, col: string): string | null {
  const roles: string[] = [];
  if (state.xCol === col) roles.push("X axis");
  if (state.yCols.includes(col)) roles.push("Y axis");
  if (state.secondaryYCols.includes(col)) roles.push("right axis");
  return roles.length ? roles.join(", ") : null;
}

export default function CleanPanel({ state, onDeleteColumn, onRenameColumn, onEditCell, onDeleteRow, onDeleteRows }: Props) {
  const [editingCol, setEditingCol] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [confirmingCol, setConfirmingCol] = useState<string | null>(null);

  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [cellValue, setCellValue] = useState("");
  const [confirmingRow, setConfirmingRow] = useState<number | null>(null);

  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [confirmingBulk, setConfirmingBulk] = useState(false);

  // Row indices shift under any row-count change, whatever triggered it — stale
  // selections would otherwise point at the wrong rows after a delete.
  useEffect(() => {
    setSelectedRows(new Set());
    setConfirmingBulk(false);
  }, [state.data.length]);

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

  function handleRowDeleteClick(rowIndex: number) {
    if (confirmingRow === rowIndex) {
      onDeleteRow(rowIndex);
      setConfirmingRow(null);
    } else {
      setConfirmingRow(rowIndex);
    }
  }

  function toggleRow(rowIndex: number) {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowIndex)) next.delete(rowIndex);
      else next.add(rowIndex);
      return next;
    });
    setConfirmingBulk(false);
  }

  function toggleSelectAll() {
    setSelectedRows((prev) =>
      prev.size === state.data.length ? new Set() : new Set(state.data.map((_, i) => i)),
    );
    setConfirmingBulk(false);
  }

  function handleBulkDeleteClick() {
    if (confirmingBulk) {
      onDeleteRows([...selectedRows]);
    } else {
      setConfirmingBulk(true);
    }
  }

  const label = cn("mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em]", "text-[var(--text-3)]");

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
    if (confirmingCol === col) {
      onDeleteColumn(col);
      setConfirmingCol(null);
    } else {
      setEditingCol(null);
      setConfirmingCol(col);
    }
  }

  return (
    <div className="flex flex-col gap-5 p-4">
      <div>
        <div className={label}>Data cleaning</div>
        <div className={cn("text-[11px] leading-relaxed", "text-[var(--text-3)]")}>
          Rename or delete columns. Changes apply to every chart setting that
          references them — axes, filters, ref lines, error bars.
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {state.cols.map((c) => {
          const inUse = usage(state, c);
          const editing = editingCol === c;
          const confirming = confirmingCol === c;

          return (
            <div key={c} className={row}>
              <span className="h-2 w-2 flex-none rounded-full" style={{ background: state.legend[c]?.color }} />

              {editing ? (
                <input
                  autoFocus
                  className={cn(field, "h-7 flex-1 px-2 py-0 text-[13px]")}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitEdit(c);
                    else if (e.key === "Escape") setEditingCol(null);
                  }}
                  onBlur={() => commitEdit(c)}
                />
              ) : (
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px]" style={{ color: "var(--text-2)" }}>{c}</div>
                  {inUse && (
                    <div className="truncate text-[10px]" style={{ color: "var(--text-3)" }}>{inUse}</div>
                  )}
                </div>
              )}

              {!editing && <span className={badge}>{columnKind(state.data, c)}</span>}

              {editing ? (
                <button
                  aria-label="Cancel rename"
                  className={cn("flex h-6 w-6 flex-none items-center justify-center rounded-md transition-colors", "hover-device:bg-[var(--accent-soft)]")}
                  style={{ color: "var(--text-3)" }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setEditingCol(null)}
                >
                  <X size={13} />
                </button>
              ) : (
                <button
                  aria-label={`Rename ${c}`}
                  title="Rename"
                  className={cn("flex h-6 w-6 flex-none items-center justify-center rounded-md transition-colors", "hover-device:bg-[var(--accent-soft)]")}
                  style={{ color: "var(--text-3)" }}
                  onClick={() => startEdit(c)}
                >
                  <Pencil size={12} />
                </button>
              )}

              <button
                aria-label={confirming ? `Confirm delete ${c}` : `Delete ${c}`}
                title={confirming ? "Click again to confirm" : "Delete column"}
                disabled={state.cols.length <= 1}
                className={cn(
                  "flex h-6 flex-none items-center justify-center rounded-md px-1.5 transition-colors disabled:opacity-30",
                  confirming
                    ? "bg-red-500/15 text-red-500"
                    : "hover-device:bg-red-500/10 hover-device:text-red-500",
                )}
                style={{ color: confirming ? undefined : "var(--text-3)" }}
                onClick={() => handleDeleteClick(c)}
              >
                {confirming ? <Check size={13} /> : <Trash2 size={12} />}
              </button>
            </div>
          );
        })}
      </div>

      {state.cols.length <= 1 && (
        <div className={cn("text-[11px] leading-relaxed", "text-[var(--text-3)]")}>
          At least one column has to stay — this is the last one.
        </div>
      )}

      <div className={cn("h-px", "bg-[var(--border)]")} />

      <div>
        <div className={cn(label, "flex items-center justify-between")}>
          <span>All rows</span>
          {selectedRows.size > 0 && (
            <button
              className={cn(
                "flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold normal-case tracking-normal transition-colors",
                confirmingBulk ? "bg-red-500/15 text-red-500" : "bg-red-500/10 text-red-500 hover-device:bg-red-500/20",
              )}
              onClick={handleBulkDeleteClick}
            >
              {confirmingBulk ? <Check size={11} /> : <Trash2 size={11} />}
              {confirmingBulk ? `Confirm delete ${selectedRows.size}` : `Delete ${selectedRows.size} selected`}
            </button>
          )}
        </div>
        <div className={cn("mb-2 text-[11px] leading-relaxed", "text-[var(--text-3)]")}>
          Click a cell to edit it, or check rows to delete several at once. {state.data.length.toLocaleString()} row{state.data.length === 1 ? "" : "s"}.
        </div>

        {state.data.length === 0 ? (
          <div className={cn("text-[11px]", "text-[var(--text-3)]")}>No rows.</div>
        ) : (
          <div
            className={cn("overflow-auto rounded-lg border", "border-[var(--border)]")}
            style={{ maxHeight: 420 }}
          >
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr>
                  <th
                    className={cn("sticky top-0 px-2 py-1.5", "bg-[var(--raised)] border-b border-[var(--border)]")}
                    style={{ width: 1 }}
                  >
                    <input
                      type="checkbox"
                      aria-label="Select all rows"
                      checked={selectedRows.size === state.data.length}
                      ref={(el) => { if (el) el.indeterminate = selectedRows.size > 0 && selectedRows.size < state.data.length; }}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th
                    className={cn("sticky top-0 whitespace-nowrap px-2 py-1.5 text-left font-medium", "bg-[var(--raised)] text-[var(--text-3)] border-b border-[var(--border)]")}
                    style={{ width: 1 }}
                  >
                    #
                  </th>
                  {state.cols.map((c) => (
                    <th
                      key={c}
                      className={cn("sticky top-0 whitespace-nowrap px-2.5 py-1.5 text-left font-medium", "bg-[var(--raised)] text-[var(--text-2)] border-b border-[var(--border)]")}
                    >
                      {c}
                    </th>
                  ))}
                  <th className={cn("sticky top-0 bg-[var(--raised)] border-b border-[var(--border)]")} style={{ width: 1 }} />
                </tr>
              </thead>
              <tbody>
                {state.data.map((dataRow, rowIndex) => {
                  const confirming = confirmingRow === rowIndex;
                  return (
                    <tr key={rowIndex} style={selectedRows.has(rowIndex) ? { background: "var(--accent-soft)" } : undefined}>
                      <td className={cn("px-2 py-1 border-b", "border-[var(--border)]")}>
                        <input
                          type="checkbox"
                          aria-label={`Select row ${rowIndex + 1}`}
                          checked={selectedRows.has(rowIndex)}
                          onChange={() => toggleRow(rowIndex)}
                        />
                      </td>
                      <td
                        className={cn("whitespace-nowrap px-2 py-1 border-b text-right", "text-[var(--text-3)] border-[var(--border)]")}
                      >
                        {rowIndex + 1}
                      </td>
                      {state.cols.map((c) => {
                        const editingThis = editingCell?.row === rowIndex && editingCell.col === c;
                        return (
                          <td
                            key={c}
                            onClick={() => !editingThis && startCellEdit(rowIndex, c, dataRow[c])}
                            className={cn(
                              "whitespace-nowrap px-2.5 py-1 border-b cursor-text",
                              "text-[var(--text-2)] border-[var(--border)]",
                              !editingThis && "hover-device:bg-[var(--accent-soft)]",
                            )}
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
                                className="w-full min-w-[60px] border-none bg-transparent text-[11px] outline-none"
                                style={{ color: "var(--text)" }}
                              />
                            ) : (
                              String(dataRow[c] ?? "—")
                            )}
                          </td>
                        );
                      })}
                      <td className={cn("border-b px-1 py-1", "border-[var(--border)]")}>
                        <button
                          aria-label={confirming ? `Confirm delete row ${rowIndex + 1}` : `Delete row ${rowIndex + 1}`}
                          title={confirming ? "Click again to confirm" : "Delete row"}
                          className={cn(
                            "flex h-5 w-5 flex-none items-center justify-center rounded transition-colors",
                            confirming ? "bg-red-500/15 text-red-500" : "hover-device:bg-red-500/10 hover-device:text-red-500",
                          )}
                          style={{ color: confirming ? undefined : "var(--text-3)" }}
                          onClick={() => handleRowDeleteClick(rowIndex)}
                        >
                          {confirming ? <Check size={12} /> : <Trash2 size={11} />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
