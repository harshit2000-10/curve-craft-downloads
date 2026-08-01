import { useState, useRef } from "react";
import { Code2, ChevronDown, ChevronUp, Delete, Bookmark, BookmarkCheck, X, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassBtn } from "@/components/ui/liquid-glass";
import { analyze, columnKind } from "@/lib/analysis";
import { row, badge } from "@/components/panels/ui";
import type { AppState, AppTheme } from "@/types";

const STORAGE_KEY = "cc_formulas";
const MAX_SAVED = 5;

interface SavedFormula { name: string; expr: string; }

function loadSaved(): SavedFormula[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); }
  catch { return []; }
}
function persistSaved(list: SavedFormula[]) {
  // Best-effort — a storage-restricted browser shouldn't block saving a
  // formula for the current session, only its persistence across visits.
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

interface Props {
  state: AppState;
  theme: AppTheme;
  onChange: (patch: Partial<AppState>) => void;
  onAddColumn: (name: string, expr: string) => void;
}

const SCI_FUNS: { label: string; insert: string; title: string }[] = [
  { label: "sin",   insert: "Math.sin(",   title: "Sine" },
  { label: "cos",   insert: "Math.cos(",   title: "Cosine" },
  { label: "tan",   insert: "Math.tan(",   title: "Tangent" },
  { label: "asin",  insert: "Math.asin(",  title: "Arcsine" },
  { label: "acos",  insert: "Math.acos(",  title: "Arccosine" },
  { label: "atan",  insert: "Math.atan(",  title: "Arctangent" },
  { label: "√(",    insert: "Math.sqrt(",  title: "Square root" },
  { label: "x²",    insert: "**2",         title: "Square" },
  { label: "xʸ",    insert: "**",          title: "Power" },
  { label: "log",   insert: "Math.log10(", title: "Log base 10" },
  { label: "ln",    insert: "Math.log(",   title: "Natural log" },
  { label: "exp",   insert: "Math.exp(",   title: "e^x" },
  { label: "abs",   insert: "Math.abs(",   title: "Absolute value" },
  { label: "ceil",  insert: "Math.ceil(",  title: "Round up" },
  { label: "floor", insert: "Math.floor(", title: "Round down" },
  { label: "round", insert: "Math.round(", title: "Round" },
  { label: "π",     insert: "Math.PI",     title: "Pi ≈ 3.14159" },
  { label: "e",     insert: "Math.E",      title: "Euler's number ≈ 2.71828" },
];

const NUMPAD_ROWS = [
  ["7", "8", "9", "÷", "⌫"],
  ["4", "5", "6", "×", "C"],
  ["1", "2", "3", "−", "("],
  ["0", ".", "+", ")", ""],
];

export default function DataPanel({ state, theme, onChange, onAddColumn }: Props) {
  const [colName, setColName] = useState("");
  const [expr, setExpr] = useState("");
  const [showCalc, setShowCalc] = useState(false);
  const [saved, setSaved] = useState<SavedFormula[]>(loadSaved);
  const inputRef = useRef<HTMLInputElement>(null);
  const isDark = theme === "dark";

  function saveFormula() {
    if (!colName.trim() || !expr.trim()) return;
    const entry: SavedFormula = { name: colName.trim(), expr: expr.trim() };
    const next = [entry, ...saved.filter((f) => f.name !== entry.name)].slice(0, MAX_SAVED);
    setSaved(next);
    persistSaved(next);
  }

  function deleteFormula(name: string) {
    const next = saved.filter((f) => f.name !== name);
    setSaved(next);
    persistSaved(next);
  }

  function loadFormula(f: SavedFormula) {
    setColName(f.name);
    setExpr(f.expr);
    inputRef.current?.focus();
  }

  // Click-to-edit availability. Delete works wherever a point maps to a row;
  // add also needs a numeric X so a clicked pixel resolves to a real X value.
  // An active analysis transform breaks the 1:1 map between plotted points and source
  // rows, so click-to-edit has to stand down until it's cleared.
  const transformed = analyze(state).transformed;
  const canDelete = ["line", "scatter", "bar", "area", "pie"].includes(state.chartType) && !transformed;
  const canAddType = ["line", "scatter", "bar", "area"].includes(state.chartType) && !transformed;
  const xIsNumeric = state.data.length > 0 && typeof state.data[0][state.xCol] === "number";
  const canAdd = canAddType && xIsNumeric;

  const label  = cn("mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em]", "text-[var(--text-3)]");
  const inputCls = "w-full rounded-[9px] border px-3 text-xs outline-none transition-colors duration-150 h-[42px] border-[var(--border)] bg-[var(--raised)] text-[var(--text)] placeholder:text-[var(--text-3)] focus:border-[var(--accent)]";

  function append(str: string) {
    const el = inputRef.current;
    if (!el) { setExpr(p => p + str); return; }
    const start = el.selectionStart ?? expr.length;
    const end   = el.selectionEnd   ?? expr.length;
    const next  = expr.slice(0, start) + str + expr.slice(end);
    setExpr(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + str.length, start + str.length);
    });
  }

  function pressNumpad(val: string) {
    if (val === "⌫") {
      const el = inputRef.current;
      const s = el?.selectionStart ?? expr.length;
      setExpr(p => p.slice(0, Math.max(0, s - 1)) + p.slice(s));
      requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(Math.max(0, s - 1), Math.max(0, s - 1)); });
    } else if (val === "C") {
      setExpr("");
      inputRef.current?.focus();
    } else if (val === "÷") append("/");
    else if (val === "×") append("*");
    else if (val === "−") append("-");
    else if (val !== "") append(val);
  }

  function handleApply() {
    if (!colName.trim() || !expr.trim()) return;
    onAddColumn(colName.trim(), expr.trim());
    setColName("");
    setExpr("");
  }

  const btnBase = "flex h-8 items-center justify-center rounded-[7px] border text-[12px] font-medium transition-all duration-150 active:scale-[0.93] border-[var(--border)] bg-[var(--raised)] text-[var(--text-2)] hover:border-[var(--border-hover)]";
  const opBtn = cn(
    "flex h-8 items-center justify-center rounded-[7px] border text-[12px] font-semibold transition-all duration-150 active:scale-[0.93]",
    isDark
      ? "border-violet-500/25 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20"
      : "border-violet-400/30 bg-violet-50 text-violet-600 hover:bg-violet-100",
  );
  const sciBtn = cn(
    "flex h-8 items-center justify-center rounded-[7px] border px-1 text-[11px] font-mono transition-all duration-150 active:scale-[0.93]",
    isDark
      ? "border-cyan-500/20 bg-cyan-500/8 text-cyan-300/80 hover:border-cyan-500/40 hover:bg-cyan-500/15"
      : "border-cyan-500/25 bg-cyan-50 text-cyan-700 hover:bg-cyan-100",
  );

  const modeBtn = (mode: "off" | "add" | "delete", enabled: boolean) =>
    cn(
      "flex-1 h-[36px] rounded-[8px] border text-xs font-semibold transition-all duration-150 active:scale-[0.97]",
      !enabled && "cursor-not-allowed opacity-40",
      state.editMode === mode
        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-2)]"
        : "border-[var(--border)] bg-[var(--raised)] text-[var(--text-2)] hover:border-[var(--border-hover)]",
    );

  return (
    <div className="flex flex-col gap-5">
      {/* Edit data points — click-to-edit on the chart */}
      <div>
        <div className={label}>Edit data points</div>
        {!canDelete ? (
          <div className="rounded-[9px] border px-3 py-2.5 text-[12px] leading-relaxed"
            style={{ borderColor: "var(--border)", background: "var(--raised)", color: "var(--text-3)" }}>
            {transformed
              ? "Point editing is paused while a filter, aggregation or sort is active — plotted points no longer map to single rows. Clear them in the Analysis tab to edit again."
              : "Switch to a line, scatter, bar, area, or pie chart to edit individual points."}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex gap-1.5">
              <GlassBtn
                onClick={() => onChange({ editMode: "off" })}
                className={modeBtn("off", true)}
                wrapperClassName="inline-flex items-center justify-center w-full"
                style={{ transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
              >
                Off
              </GlassBtn>
              <GlassBtn
                onClick={() => canAdd && onChange({ editMode: "add" })}
                title={!canAddType ? "Add isn't available for this chart type" : !xIsNumeric ? "Add needs a numeric X axis" : "Click the plot to add a point"}
                className={modeBtn("add", canAdd)}
                wrapperClassName="inline-flex items-center justify-center w-full"
                style={{ transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
              >
                Add
              </GlassBtn>
              <GlassBtn
                onClick={() => onChange({ editMode: "delete" })}
                className={modeBtn("delete", true)}
                wrapperClassName="inline-flex items-center justify-center w-full"
                style={{ transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
              >
                Delete
              </GlassBtn>
            </div>

            <GlassBtn
              onClick={() => {
                if (!state.editHistory.length) return;
                const prev = state.editHistory[state.editHistory.length - 1];
                onChange({ data: prev, editHistory: state.editHistory.slice(0, -1) });
              }}
              title={state.editHistory.length ? `Undo last edit (${state.editHistory.length} available)` : "No edits to undo"}
              className={cn(
                "flex h-8 w-full items-center justify-center gap-1.5 rounded-[7px] border text-xs font-medium transition-all duration-150 active:scale-[0.97]",
                state.editHistory.length
                  ? "border-[var(--border)] bg-[var(--raised)] text-[var(--text-2)] hover:border-[var(--border-hover)]"
                  : "cursor-not-allowed border-[var(--border)] text-[var(--text-3)] opacity-40",
              )}
              wrapperClassName="inline-flex items-center justify-center gap-1.5 w-full"
              style={{ transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
            >
              <Undo2 size={12} />
              Back{state.editHistory.length > 0 ? ` (${state.editHistory.length})` : ""}
            </GlassBtn>

            {state.editMode === "add" && (
              <div>
                <div className={cn("mb-1 text-[12px]", "text-[var(--text-3)]")}>Add to column</div>
                <select
                  className={cn(inputCls, "cursor-pointer appearance-none pr-8")}
                  value={state.yCols.includes(state.editTargetCol) ? state.editTargetCol : state.yCols[0] ?? ""}
                  onChange={(e) => onChange({ editTargetCol: e.target.value })}
                >
                  {state.yCols.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}

            <div className={cn("text-[11px] leading-relaxed", "text-[var(--text-3)]")}>
              {state.editMode === "delete"
                ? "Click any point on the chart to delete its row."
                : state.editMode === "add"
                ? "Click anywhere on the plot to add a point at that position."
                : !canAdd && canAddType
                ? "Delete is available. Add needs a numeric X axis."
                : "Pick Add or Delete, then click on the chart."}
            </div>
          </div>
        )}
      </div>

      {/* File info */}
      <div>
        <div className={label}>File info</div>
        <div className="flex flex-wrap gap-1.5">
          {[
            { v: state.data.length.toLocaleString(), l: "rows" },
            { v: state.cols.length, l: "cols" },
          ].map(({ v, l }) => (
            <div key={l} className={cn("flex items-center gap-1 rounded-md border px-2 py-1 text-xs", "border-[var(--border)] bg-[var(--raised)] text-[var(--text-2)]")}>
              <span className={"font-medium text-[var(--text)]"}>{v}</span> {l}
            </div>
          ))}
        </div>
      </div>

      {/* Columns — series colour + detected type, so it's obvious at a glance which
          columns can actually be plotted or aggregated. */}
      <div>
        <div className={label}>Columns</div>
        <div className="flex flex-col gap-1.5">
          {state.cols.map((c) => (
            <div key={c} className={row}>
              <span className="h-2 w-2 flex-none rounded-full" style={{ background: state.legend[c]?.color }} />
              <span className="min-w-0 flex-1 truncate text-[13px]" style={{ color: "var(--text-2)" }}>{c}</span>
              <span className={badge}>{columnKind(state.data, c)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Preview table */}
      <div>
        <div className={cn(label, "flex items-center gap-1")}>
          Preview
          <span className={cn("normal-case tracking-normal font-normal text-[13px]", "text-[var(--text-3)]")}>— first 6 rows</span>
        </div>
        <div className={cn("overflow-hidden rounded-lg border text-[11px]", "border-[var(--border)]")}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {state.cols.map((c) => (
                    <th key={c} className={cn("whitespace-nowrap px-2.5 py-1.5 text-left font-medium", "bg-[var(--raised)] text-[var(--text-2)] border-b border-[var(--border)]")}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {state.data.slice(0, 6).map((row, i) => (
                  <tr key={i}>
                    {state.cols.map((c) => (
                      <td key={c} className={cn("whitespace-nowrap px-2.5 py-1 border-b", "text-[var(--text-2)] border-[var(--border)]", i === Math.min(5, state.data.length - 1) ? "border-b-0" : "")}>
                        {String(row[c] ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className={cn("h-px", "bg-[var(--border)]")} />

      {/* Axis range inputs */}
      {(() => {
        const xVals = state.data.map((r) => r[state.xCol]);
        const isNumericX = xVals.length > 0 && typeof xVals[0] === "number";
        const nums = xVals as number[];
        const xPlaceholderMin = isNumericX ? String(nums.reduce((a, b) => a < b ? a : b)) : String(xVals[0] ?? "");
        const xPlaceholderMax = isNumericX ? String(nums.reduce((a, b) => a > b ? a : b)) : String(xVals[xVals.length - 1] ?? "");

        const hasXFilter = state.xRangeMin !== null || state.xRangeMax !== null;
        const hasYFilter = state.yRangeMin !== null || state.yRangeMax !== null;

        const rowCls = "grid grid-cols-2 gap-2";
        const subLabel = cn("mb-1 text-[11px] font-medium uppercase tracking-[0.06em]", "text-[var(--text-3)]");

        return (
          <div className="flex flex-col gap-4">
            {/* X axis range */}
            <div>
              <div className={cn(label, "flex items-center justify-between")}>
                <span>X axis range</span>
                {hasXFilter && (
                  <button
                    onClick={() => onChange({ xRangeMin: null, xRangeMax: null })}
                    className={cn("text-[11px] normal-case tracking-normal font-medium transition-colors", isDark ? "text-violet-400/70 hover:text-violet-300" : "text-violet-500/80 hover:text-violet-600")}
                  >
                    Reset
                  </button>
                )}
              </div>
              <div className={rowCls}>
                <div>
                  <div className={subLabel}>Start</div>
                  <input
                    className={inputCls}
                    type={isNumericX ? "number" : "text"}
                    placeholder={xPlaceholderMin}
                    value={state.xRangeMin ?? ""}
                    onChange={(e) => onChange({ xRangeMin: e.target.value === "" ? null : isNumericX ? Number(e.target.value) : e.target.value })}
                  />
                </div>
                <div>
                  <div className={subLabel}>End</div>
                  <input
                    className={inputCls}
                    type={isNumericX ? "number" : "text"}
                    placeholder={xPlaceholderMax}
                    value={state.xRangeMax ?? ""}
                    onChange={(e) => onChange({ xRangeMax: e.target.value === "" ? null : isNumericX ? Number(e.target.value) : e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Y axis range */}
            <div>
              <div className={cn(label, "flex items-center justify-between")}>
                <span>Y axis range</span>
                {hasYFilter && (
                  <button
                    onClick={() => onChange({ yRangeMin: null, yRangeMax: null })}
                    className={cn("text-[11px] normal-case tracking-normal font-medium transition-colors", isDark ? "text-violet-400/70 hover:text-violet-300" : "text-violet-500/80 hover:text-violet-600")}
                  >
                    Reset
                  </button>
                )}
              </div>
              <div className={rowCls}>
                <div>
                  <div className={subLabel}>Min</div>
                  <input
                    className={inputCls}
                    type="number"
                    placeholder="auto"
                    value={state.yRangeMin ?? ""}
                    onChange={(e) => onChange({ yRangeMin: e.target.value === "" ? null : Number(e.target.value) })}
                  />
                </div>
                <div>
                  <div className={subLabel}>Max</div>
                  <input
                    className={inputCls}
                    type="number"
                    placeholder="auto"
                    value={state.yRangeMax ?? ""}
                    onChange={(e) => onChange({ yRangeMax: e.target.value === "" ? null : Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <div className={cn("h-px", "bg-[var(--border)]")} />

      {/* Formula editor */}
      <div>
        <div className={label}>Add computed column</div>
        <div className="flex flex-col gap-2">

          {/* Column name */}
          <div>
            <div className={cn("mb-1 text-[12px]", "text-[var(--text-3)]")}>Column name</div>
            <input className={inputCls} placeholder="e.g. profit" value={colName}
              aria-label="New column name"
              onChange={(e) => setColName(e.target.value)} />
          </div>

          {/* Formula input */}
          <div>
            <div className={cn("mb-1 text-[12px]", "text-[var(--text-3)]")}>
              Formula <span className={"text-[var(--text-3)]"}>— use column names as variables</span>
            </div>
            <input
              ref={inputRef}
              className={cn(inputCls, "font-mono")}
              placeholder="e.g. revenue - cost"
              aria-label="Formula expression"
              value={expr}
              onChange={(e) => setExpr(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleApply()}
            />
            <div className={cn("mt-1 font-mono text-[11px]", "text-[var(--text-3)]")}>
              e.g. <span className={isDark ? "text-cyan-400/60" : "text-cyan-700/70"}>revenue - cost</span>
              {" "}&nbsp;·&nbsp;{" "}
              <span className={isDark ? "text-cyan-400/60" : "text-cyan-700/70"}>price * quantity * 1.2</span>
            </div>
          </div>

          {/* Column variable tags */}
          <div className="flex flex-wrap gap-1">
            {state.cols.map((col) => (
              <GlassBtn
                key={col}
                onClick={() => append(col)}
                className={cn("h-[22px] rounded px-2 font-mono text-[12px] transition-all duration-150 active:scale-[0.93]", "bg-[var(--raised)] text-[var(--text-2)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-2)]")}
                style={{ transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
              >
                {col}
              </GlassBtn>
            ))}
          </div>

          {/* Toggle calculator */}
          <GlassBtn
            onClick={() => setShowCalc(!showCalc)}
            className={cn(
              "flex h-8 w-full items-center justify-center gap-1.5 rounded-[7px] border text-xs font-medium transition-all duration-150",
              showCalc
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-2)]"
                : "border-[var(--border)] bg-[var(--raised)] text-[var(--text-2)] hover:border-[var(--border-hover)]",
            )}
            style={{ transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
          >
            {showCalc ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Scientific calculator
          </GlassBtn>

          {showCalc && (
            <div className={cn("flex flex-col gap-2 rounded-[10px] border p-3", "border-[var(--border)] bg-[var(--panel)]")}>

              {/* Scientific functions */}
              <div>
                <div className={cn("mb-1.5 text-[11px] font-semibold uppercase tracking-[0.07em]", "text-[var(--text-3)]")}>Functions</div>
                <div className="grid grid-cols-6 gap-1">
                  {SCI_FUNS.map(({ label: lbl, insert, title }) => (
                    <button key={lbl} title={title} onClick={() => append(insert)} className={sciBtn}>
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              <div className={cn("h-px", "bg-[var(--border)]")} />

              {/* Numpad */}
              <div>
                <div className={cn("mb-1.5 text-[11px] font-semibold uppercase tracking-[0.07em]", "text-[var(--text-3)]")}>Operators &amp; Numbers</div>
                <div className="flex flex-col gap-1">
                  {NUMPAD_ROWS.map((row, ri) => (
                    <div key={ri} className="grid grid-cols-5 gap-1">
                      {row.map((btn, bi) => {
                        if (!btn) return <div key={bi} />;
                        const isOp  = ["÷", "×", "−", "+", "(", ")"].includes(btn);
                        const isDel = btn === "⌫" || btn === "C";
                        return (
                          <button
                            key={btn}
                            onClick={() => pressNumpad(btn)}
                            className={isDel || isOp ? opBtn : btnBase}
                          >
                            {btn === "⌫" ? <Delete size={13} /> : btn}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Apply + Save row */}
          {(() => {
            const alreadySaved = saved.find((f) => f.name === colName.trim());
            return (
              <div className="flex gap-1.5">
                <GlassBtn
                  onClick={handleApply}
                  className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[7px] bg-violet-500 text-xs font-medium text-white transition-all duration-150 hover:bg-violet-400 active:scale-[0.97]"
                  wrapperClassName="inline-flex items-center justify-center gap-1.5 flex-1"
                  style={{ transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
                >
                  <Code2 size={12} />
                  Apply
                </GlassBtn>
                <GlassBtn
                  onClick={saveFormula}
                  title={saved.length >= MAX_SAVED && !alreadySaved ? `Max ${MAX_SAVED} formulas saved` : "Save formula"}
                  className={cn(
                    "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[7px] border transition-all duration-150 active:scale-[0.97]",
                    !colName.trim() || !expr.trim()
                      ? "border-[var(--border)] text-[var(--text-3)] cursor-not-allowed"
                      : alreadySaved
                      ? "border-violet-500 bg-violet-500/15 text-violet-400"
                      : "border-[var(--border)] bg-[var(--raised)] text-[var(--text-2)] hover:border-[var(--accent)] hover:text-[var(--accent-2)]",
                  )}
                  style={{ transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
                >
                  {alreadySaved ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
                </GlassBtn>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Saved formulas */}
      {saved.length > 0 && (
        <>
          <div className={cn("h-px", "bg-[var(--border)]")} />
          <div>
            <div className={cn(label, "flex items-center justify-between")}>
              <span>Saved formulas</span>
              <span className={cn("normal-case tracking-normal font-normal text-[12px]", "text-[var(--text-3)]")}>
                {saved.length}/{MAX_SAVED}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              {saved.map((f) => (
                <div
                  key={f.name}
                  className={cn(
                    "flex items-center gap-2 rounded-[8px] border px-3 py-2 transition-all duration-150",
                    "border-[var(--border)] bg-[var(--raised)] hover:border-[var(--border-hover)]",
                  )}
                >
                  <div className="flex flex-1 min-w-0 flex-col gap-0.5 cursor-pointer" onClick={() => loadFormula(f)}>
                    <span className={cn("text-[12px] font-semibold truncate", "text-[var(--text)]")}>
                      {f.name}
                    </span>
                    <span className={cn("font-mono text-[11px] truncate", "text-[var(--text-3)]")}>
                      {f.expr}
                    </span>
                  </div>
                  <GlassBtn
                    onClick={() => deleteFormula(f.name)}
                    aria-label={`Delete saved formula ${f.name}`}
                    className={cn(
                      "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[4px] transition-all duration-150 hover:scale-110 active:scale-95",
                      "text-[var(--text-3)] hover:text-red-400",
                    )}
                    wrapperClassName="inline-flex items-center justify-center"
                  >
                    <X size={11} />
                  </GlassBtn>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
