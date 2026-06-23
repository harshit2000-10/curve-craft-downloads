import { useState, useRef } from "react";
import { Code2, ChevronDown, ChevronUp, Delete, Bookmark, BookmarkCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassBtn } from "@/components/ui/liquid-glass";
import type { AppState, AppTheme } from "@/types";

const STORAGE_KEY = "cc_formulas";
const MAX_SAVED = 5;

interface SavedFormula { name: string; expr: string; }

function loadSaved(): SavedFormula[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); }
  catch { return []; }
}
function persistSaved(list: SavedFormula[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
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

  const label  = cn("mb-1.5 text-[13px] font-semibold uppercase tracking-[0.08em]", isDark ? "text-white/55" : "text-black/60");
  const inputCls = cn(
    "w-full rounded-[7px] border px-2.5 text-xs outline-none transition-colors duration-150 h-8",
    isDark
      ? "border-white/8 bg-white/5 text-white/80 placeholder:text-white/40 focus:border-violet-500/60 focus:bg-white/8"
      : "border-black/10 bg-black/4 text-black/80 placeholder:text-black/40 focus:border-violet-400/60",
  );

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

  const btnBase = cn(
    "flex h-8 items-center justify-center rounded-[7px] border text-[12px] font-medium transition-all duration-150 active:scale-[0.93]",
    isDark
      ? "border-white/8 bg-white/4 text-white/60 hover:border-white/14 hover:bg-white/7"
      : "border-black/8 bg-black/3 text-black/60 hover:border-black/12 hover:bg-black/5",
  );
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

  return (
    <div className="flex flex-col gap-5">
      {/* File info */}
      <div>
        <div className={label}>File info</div>
        <div className="flex flex-wrap gap-1.5">
          {[
            { v: state.data.length.toLocaleString(), l: "rows" },
            { v: state.cols.length, l: "cols" },
          ].map(({ v, l }) => (
            <div key={l} className={cn("flex items-center gap-1 rounded-md border px-2 py-1 text-xs", isDark ? "border-white/8 bg-white/4 text-white/35" : "border-black/8 bg-black/3 text-black/40")}>
              <span className={isDark ? "font-medium text-white/70" : "font-medium text-black/70"}>{v}</span> {l}
            </div>
          ))}
        </div>
      </div>

      {/* Preview table */}
      <div>
        <div className={cn(label, "flex items-center gap-1")}>
          Preview
          <span className={cn("normal-case tracking-normal font-normal text-[13px]", isDark ? "text-white/20" : "text-black/30")}>— first 6 rows</span>
        </div>
        <div className={cn("overflow-hidden rounded-lg border text-[11px]", isDark ? "border-white/8" : "border-black/8")}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {state.cols.map((c) => (
                    <th key={c} className={cn("whitespace-nowrap px-2.5 py-1.5 text-left font-medium", isDark ? "bg-white/5 text-white/55 border-b border-white/8" : "bg-black/4 text-black/50 border-b border-black/8")}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {state.data.slice(0, 6).map((row, i) => (
                  <tr key={i}>
                    {state.cols.map((c) => (
                      <td key={c} className={cn("whitespace-nowrap px-2.5 py-1 border-b", isDark ? "text-white/45 border-white/4" : "text-black/50 border-black/5", i === Math.min(5, state.data.length - 1) ? "border-b-0" : "")}>
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

      <div className={cn("h-px", isDark ? "bg-white/6" : "bg-black/8")} />

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
        const subLabel = cn("mb-1 text-[11px] font-medium uppercase tracking-[0.06em]", isDark ? "text-white/20" : "text-black/30");

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

      <div className={cn("h-px", isDark ? "bg-white/6" : "bg-black/8")} />

      {/* Formula editor */}
      <div>
        <div className={label}>Add computed column</div>
        <div className="flex flex-col gap-2">

          {/* Column name */}
          <div>
            <div className={cn("mb-1 text-[12px]", isDark ? "text-white/30" : "text-black/40")}>Column name</div>
            <input className={inputCls} placeholder="e.g. profit" value={colName}
              aria-label="New column name"
              onChange={(e) => setColName(e.target.value)} />
          </div>

          {/* Formula input */}
          <div>
            <div className={cn("mb-1 text-[12px]", isDark ? "text-white/30" : "text-black/40")}>
              Formula <span className={isDark ? "text-white/18" : "text-black/28"}>— use column names as variables</span>
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
            <div className={cn("mt-1 font-mono text-[11px]", isDark ? "text-white/20" : "text-black/30")}>
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
                className={cn("h-[22px] rounded px-2 font-mono text-[12px] transition-all duration-150 active:scale-[0.93]", isDark ? "bg-white/6 text-white/40 hover:bg-violet-500/15 hover:text-violet-400" : "bg-black/5 text-black/40 hover:bg-violet-100 hover:text-violet-600")}
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
                ? isDark ? "border-violet-500/50 bg-violet-500/15 text-violet-300" : "border-violet-400/50 bg-violet-50 text-violet-600"
                : isDark ? "border-white/8 bg-white/4 text-white/50 hover:border-white/14" : "border-black/8 bg-black/3 text-black/50 hover:border-black/14",
            )}
            style={{ transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
          >
            {showCalc ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Scientific calculator
          </GlassBtn>

          {showCalc && (
            <div className={cn("flex flex-col gap-2 rounded-[10px] border p-3", isDark ? "border-white/8 bg-white/2" : "border-black/8 bg-black/2")}>

              {/* Scientific functions */}
              <div>
                <div className={cn("mb-1.5 text-[11px] font-semibold uppercase tracking-[0.07em]", isDark ? "text-white/20" : "text-black/30")}>Functions</div>
                <div className="grid grid-cols-6 gap-1">
                  {SCI_FUNS.map(({ label: lbl, insert, title }) => (
                    <button key={lbl} title={title} onClick={() => append(insert)} className={sciBtn}>
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              <div className={cn("h-px", isDark ? "bg-white/6" : "bg-black/8")} />

              {/* Numpad */}
              <div>
                <div className={cn("mb-1.5 text-[11px] font-semibold uppercase tracking-[0.07em]", isDark ? "text-white/20" : "text-black/30")}>Operators &amp; Numbers</div>
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
                  wrapperClassName="inline-flex items-center gap-1.5 flex-1"
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
                      ? isDark ? "border-white/6 text-white/20 cursor-not-allowed" : "border-black/6 text-black/20 cursor-not-allowed"
                      : alreadySaved
                      ? "border-violet-500 bg-violet-500/15 text-violet-400"
                      : isDark ? "border-white/8 bg-white/5 text-white/50 hover:border-violet-500/50 hover:text-violet-400" : "border-black/10 bg-black/4 text-black/50 hover:border-violet-400/50 hover:text-violet-600",
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
          <div className={cn("h-px", isDark ? "bg-white/6" : "bg-black/8")} />
          <div>
            <div className={cn(label, "flex items-center justify-between")}>
              <span>Saved formulas</span>
              <span className={cn("normal-case tracking-normal font-normal text-[12px]", isDark ? "text-white/20" : "text-black/30")}>
                {saved.length}/{MAX_SAVED}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              {saved.map((f) => (
                <div
                  key={f.name}
                  className={cn(
                    "flex items-center gap-2 rounded-[8px] border px-3 py-2 transition-all duration-150",
                    isDark ? "border-white/8 bg-white/3 hover:border-white/12" : "border-black/8 bg-black/2 hover:border-black/12",
                  )}
                >
                  <div className="flex flex-1 min-w-0 flex-col gap-0.5 cursor-pointer" onClick={() => loadFormula(f)}>
                    <span className={cn("text-[12px] font-semibold truncate", isDark ? "text-white/75" : "text-black/75")}>
                      {f.name}
                    </span>
                    <span className={cn("font-mono text-[11px] truncate", isDark ? "text-white/30" : "text-black/35")}>
                      {f.expr}
                    </span>
                  </div>
                  <GlassBtn
                    onClick={() => deleteFormula(f.name)}
                    aria-label={`Delete saved formula ${f.name}`}
                    className={cn(
                      "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[4px] transition-all duration-150 hover:scale-110 active:scale-95",
                      isDark ? "text-white/20 hover:text-red-400" : "text-black/25 hover:text-red-500",
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
