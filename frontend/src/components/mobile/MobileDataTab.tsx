import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import AnalysisPanel from "@/components/panels/AnalysisPanel";
import { SCI_FUNS } from "@/components/panels/DataPanel";
import type { AppState, AppTheme } from "@/types";

type Segment = "formulas" | "analysis";

interface Props {
  state: AppState;
  theme: AppTheme;
  onChange: (patch: Partial<AppState>) => void;
  onAddColumn: (name: string, expr: string) => void;
}

const BASIC_OPS: { label: string; insert: string }[] = [
  { label: "+", insert: "+" },
  { label: "−", insert: "-" },
  { label: "×", insert: "*" },
  { label: "÷", insert: "/" },
  { label: "(", insert: "(" },
  { label: ")", insert: ")" },
];

/** Data tab — Formulas segment reuses DataPanel's column-chip / append()
 * pattern for building applyFormula calls, minus the collapsible calculator
 * (function chips sit inline always, per the mockup). Analysis segment
 * embeds AnalysisPanel as-is — filter/aggregate/sort plus the cartesian-only
 * trendline/error-bar/ref-line/annotation sections it already gates. */
export default function MobileDataTab({ state, theme, onChange, onAddColumn }: Props) {
  const [segment, setSegment] = useState<Segment>("formulas");
  const [colName, setColName] = useState("");
  const [expr, setExpr] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function append(str: string) {
    const el = inputRef.current;
    if (!el) { setExpr((p) => p + str); return; }
    const start = el.selectionStart ?? expr.length;
    const end = el.selectionEnd ?? expr.length;
    const next = expr.slice(0, start) + str + expr.slice(end);
    setExpr(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + str.length, start + str.length);
    });
  }

  function apply() {
    if (!colName.trim() || !expr.trim()) return;
    onAddColumn(colName.trim(), expr.trim());
    setColName("");
    setExpr("");
  }

  const chip = "flex h-8 flex-none items-center justify-center rounded-lg border px-2.5 font-mono text-[12px] font-medium transition-colors active:scale-[0.95]";
  const chipStyle = { borderColor: "var(--border)", background: "var(--raised)", color: "var(--text-2)" };
  const inputCls = "w-full rounded-xl border px-3.5 text-[14px] outline-none h-[46px]";
  const inputStyle = { borderColor: "var(--border)", background: "var(--raised)", color: "var(--text)" };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-shrink-0 gap-1.5 px-4 pb-2 pt-3">
        {(["formulas", "analysis"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSegment(s)}
            className={cn(
              "h-9 flex-1 rounded-xl border text-[13px] font-semibold capitalize transition-colors active:scale-[0.97]",
            )}
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

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {segment === "formulas" ? (
          <div className="flex flex-col gap-3 pt-1">
            <div>
              <div className="mb-1.5 text-[12px]" style={{ color: "var(--text-3)" }}>Column name</div>
              <input
                className={inputCls}
                style={inputStyle}
                placeholder="e.g. profit"
                aria-label="New column name"
                value={colName}
                onChange={(e) => setColName(e.target.value)}
              />
            </div>

            <div>
              <div className="mb-1.5 text-[12px]" style={{ color: "var(--text-3)" }}>
                Formula — use column names as variables
              </div>
              <input
                ref={inputRef}
                className={cn(inputCls, "font-mono")}
                style={inputStyle}
                placeholder="e.g. revenue - cost"
                aria-label="Formula expression"
                value={expr}
                onChange={(e) => setExpr(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && apply()}
              />
            </div>

            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--text-3)" }}>
                Columns
              </div>
              <div className="flex flex-wrap gap-1.5">
                {state.cols.map((col) => (
                  <button key={col} className={chip} style={chipStyle} onClick={() => append(col)}>
                    {col}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--text-3)" }}>
                Operators
              </div>
              <div className="flex flex-wrap gap-1.5">
                {BASIC_OPS.map((op) => (
                  <button key={op.label} className={cn(chip, "w-8 px-0")} style={chipStyle} onClick={() => append(op.insert)}>
                    {op.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--text-3)" }}>
                Functions
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SCI_FUNS.map((f) => (
                  <button key={f.label} title={f.title} className={chip} style={chipStyle} onClick={() => append(f.insert)}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              disabled={!colName.trim() || !expr.trim()}
              onClick={apply}
              className="mt-1 h-[46px] rounded-xl text-[14px] font-semibold text-white disabled:opacity-40"
              style={{ background: "var(--accent)" }}
            >
              Apply
            </button>
          </div>
        ) : (
          <div className="pt-1">
            <AnalysisPanel state={state} theme={theme} onChange={onChange} />
          </div>
        )}
      </div>
    </div>
  );
}
