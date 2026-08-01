import { cn } from "@/lib/utils";
import { Plus, Trash2, AlertTriangle, Check } from "lucide-react";
import { GlassBtn } from "@/components/ui/liquid-glass";
import { analyze, isNumericCol, AGG_FUNCS, FILTER_OPS, SORT_MODES } from "@/lib/analysis";
import { buildTrendlines, isCartesian } from "@/lib/overlays";
import { TRENDLINES } from "@/lib/stats";
import { easeOut } from "@/components/panels/ui";
import type { AggFunc, Filter, FilterOp, SortMode } from "@/lib/analysis";
import type { AppState, AppTheme, ErrorBarConfig, RefLine, ChartAnnotation } from "@/types";

/** Ids only need to be unique within a session — these never leave the browser. */
function newId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

interface Props {
  state: AppState;
  theme: AppTheme;
  onChange: (patch: Partial<AppState>) => void;
}

export default function AnalysisPanel({ state, onChange }: Props) {
  const result = analyze(state);
  const filters = state.filters ?? [];

  const label = "mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-3)]";
  const inputCls =
    "w-full rounded-[9px] border px-3 text-xs outline-none transition-colors duration-150 h-[38px] " +
    "border-[var(--border)] bg-[var(--raised)] text-[var(--text)] placeholder:text-[var(--text-3)] focus:border-[var(--accent)]";
  const selectCls = cn(inputCls, "cursor-pointer appearance-none pr-7");

  function setFilter(i: number, patch: Partial<Filter>) {
    onChange({ filters: filters.map((f, j) => (j === i ? { ...f, ...patch } : f)) });
  }

  function addFilter() {
    const col = state.cols[0] ?? "";
    onChange({ filters: [...filters, { col, op: "=", value: "", enabled: true }] });
  }

  function removeFilter(i: number) {
    onChange({ filters: filters.filter((_, j) => j !== i) });
  }

  const hasIssues = result.issues.length > 0;
  const droppedTotal = result.issues.reduce((n, i) => n + i.blank + i.nonNumeric, 0);

  const cartesian = isCartesian(state);
  // Recomputed here so the panel can show the same equations/R² the chart draws,
  // and report which series the chosen model couldn't fit.
  const trend = buildTrendlines(state, result.rows);

  const pillStyle = (on: boolean) => ({
    borderColor: on ? "var(--accent)" : "var(--border)",
    background: on ? "var(--accent-soft)" : "var(--raised)",
    color: on ? "var(--accent-2)" : "var(--text-2)",
    transitionTimingFunction: easeOut,
  });

  function addRefLine() {
    const line: RefLine = {
      id: newId(), axis: "y", mode: "value", col: state.yCols[0] ?? "",
      value: 0, label: "", color: "#ef4444", dash: "dash", width: 2,
    };
    onChange({ refLines: [...(state.refLines ?? []), line] });
  }

  function addAnnotation() {
    const note: ChartAnnotation = {
      id: newId(), x: String(result.rows[0]?.[state.xCol] ?? ""), y: 0,
      text: "", showArrow: true, color: "#8b5cf6",
    };
    onChange({ annotations: [...(state.annotations ?? []), note] });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ── Summary ─────────────────────────────────────────────── */}
      <div>
        <div className={label}>Result</div>
        <div className="flex flex-wrap gap-1.5">
          {[
            { v: result.sourceRows.toLocaleString(), l: "source rows" },
            { v: result.rows.length.toLocaleString(), l: "plotted" },
          ].map(({ v, l }) => (
            <div
              key={l}
              className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs border-[var(--border)] bg-[var(--raised)] text-[var(--text-2)]"
            >
              <span className="font-medium text-[var(--text)]">{v}</span> {l}
            </div>
          ))}
          {result.filteredOut > 0 && (
            <div className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-2)]">
              <span className="font-medium">{result.filteredOut.toLocaleString()}</span> filtered out
            </div>
          )}
          {result.groupedFrom > 0 && (
            <div className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-2)]">
              <span className="font-medium">{result.groupedFrom.toLocaleString()}</span> grouped
            </div>
          )}
        </div>
      </div>

      {/* ── Data quality ────────────────────────────────────────── */}
      <div>
        <div className={label}>Data quality</div>
        {!hasIssues ? (
          <div
            className="flex items-center gap-2 rounded-[9px] border px-3 py-2.5 text-[12px]"
            style={{ borderColor: "var(--border)", background: "var(--raised)", color: "var(--text-3)" }}
          >
            <Check size={13} className="flex-shrink-0 text-emerald-500" />
            All values in the plotted columns are valid numbers.
          </div>
        ) : (
          <div
            className="flex flex-col gap-2 rounded-[9px] border px-3 py-2.5"
            style={{ borderColor: "rgb(245 158 11 / 0.4)", background: "rgb(245 158 11 / 0.08)" }}
          >
            <div className="flex items-center gap-2 text-[12px] font-medium" style={{ color: "var(--text-2)" }}>
              <AlertTriangle size={13} className="flex-shrink-0 text-amber-500" />
              {droppedTotal.toLocaleString()} value{droppedTotal === 1 ? "" : "s"} can&apos;t be plotted
            </div>
            {result.issues.map((iss) => (
              <div key={iss.col} className="text-[11px] leading-relaxed" style={{ color: "var(--text-3)" }}>
                <span className="font-medium text-[var(--text-2)]">{iss.col}</span>
                {iss.blank > 0 && <> · {iss.blank.toLocaleString()} blank</>}
                {iss.nonNumeric > 0 && <> · {iss.nonNumeric.toLocaleString()} non-numeric</>}
              </div>
            ))}
            <div className="text-[11px] leading-relaxed" style={{ color: "var(--text-3)" }}>
              These rows are skipped, leaving gaps in the chart.
            </div>
          </div>
        )}
      </div>

      <div className="h-px bg-[var(--border)]" />

      {/* ── Group & aggregate ───────────────────────────────────── */}
      <div>
        <div className={label}>Group &amp; aggregate</div>
        <div className="mb-2 text-[11px] leading-relaxed" style={{ color: "var(--text-3)" }}>
          Collapse rows that share the same <span className="font-medium text-[var(--text-2)]">{state.xCol || "X"}</span> value
          into one point.
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {AGG_FUNCS.map((a) => {
            const sel = (state.aggFunc ?? "none") === a.id;
            return (
              <GlassBtn
                key={a.id}
                onClick={() => onChange({ aggFunc: a.id as AggFunc, editMode: "off" })}
                className={cn(
                  "h-[34px] rounded-[8px] border text-[11px] font-semibold transition-all duration-150 active:scale-[0.95]",
                  sel
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-2)]"
                    : "border-[var(--border)] bg-[var(--raised)] text-[var(--text-2)] hover:border-[var(--border-hover)]",
                )}
                wrapperClassName="inline-flex items-center justify-center w-full"
                style={{ transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
              >
                {a.label}
              </GlassBtn>
            );
          })}
        </div>
        {state.aggFunc !== "none" && (
          <div className="mt-2 text-[11px] leading-relaxed" style={{ color: "var(--text-3)" }}>
            Y axis is labelled{" "}
            <span className="font-medium text-[var(--text-2)]">
              {AGG_FUNCS.find((a) => a.id === state.aggFunc)?.label} of {state.yCols.join(", ") || "—"}
            </span>{" "}
            so the chart says what it actually shows.
          </div>
        )}
      </div>

      <div className="h-px bg-[var(--border)]" />

      {/* ── Filters ─────────────────────────────────────────────── */}
      <div>
        <div className={cn(label, "flex items-center justify-between")}>
          <span>Filter rows</span>
          <GlassBtn
            onClick={addFilter}
            className="flex h-6 items-center gap-1 rounded-[6px] border px-2 text-[11px] font-medium normal-case tracking-normal transition-all duration-150 active:scale-[0.95] border-[var(--border)] bg-[var(--raised)] text-[var(--text-2)] hover:border-[var(--border-hover)]"
            wrapperClassName="inline-flex items-center gap-1"
            title="Add a filter"
          >
            <Plus size={11} />
            Add
          </GlassBtn>
        </div>

        {!filters.length ? (
          <div
            className="rounded-[9px] border px-3 py-2.5 text-[12px] leading-relaxed"
            style={{ borderColor: "var(--border)", background: "var(--raised)", color: "var(--text-3)" }}
          >
            No filters — the whole file is plotted. Add one to narrow it down, e.g. region = North.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filters.map((f, i) => (
              <div
                key={i}
                className="flex flex-col gap-1.5 rounded-[9px] border p-2"
                style={{ borderColor: "var(--border)", background: "var(--raised)" }}
              >
                <div className="flex gap-1.5">
                  <select
                    className={cn(selectCls, "flex-1")}
                    value={f.col}
                    aria-label="Filter column"
                    onChange={(e) => setFilter(i, { col: e.target.value })}
                  >
                    {state.cols.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <select
                    className={cn(selectCls, "w-[74px] flex-shrink-0")}
                    value={f.op}
                    aria-label="Filter operator"
                    onChange={(e) => setFilter(i, { op: e.target.value as FilterOp })}
                  >
                    {FILTER_OPS.map((op) => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-1.5">
                  <input
                    className={cn(inputCls, "flex-1")}
                    placeholder={isNumericCol(state.data, f.col) ? "e.g. 100" : "e.g. North"}
                    aria-label="Filter value"
                    value={f.value}
                    onChange={(e) => setFilter(i, { value: e.target.value })}
                  />
                  <GlassBtn
                    onClick={() => setFilter(i, { enabled: !f.enabled })}
                    title={f.enabled ? "Disable this filter" : "Enable this filter"}
                    className={cn(
                      "flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-[8px] border transition-all duration-150 active:scale-[0.95]",
                      f.enabled
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-2)]"
                        : "border-[var(--border)] text-[var(--text-3)]",
                    )}
                    wrapperClassName="inline-flex items-center justify-center"
                  >
                    <Check size={13} />
                  </GlassBtn>
                  <GlassBtn
                    onClick={() => removeFilter(i)}
                    title="Remove this filter"
                    aria-label="Remove filter"
                    className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-[8px] border transition-all duration-150 active:scale-[0.95] border-[var(--border)] text-[var(--text-3)] hover:border-red-500/50 hover:text-red-500"
                    wrapperClassName="inline-flex items-center justify-center"
                  >
                    <Trash2 size={13} />
                  </GlassBtn>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="h-px bg-[var(--border)]" />

      {/* ── Sort ────────────────────────────────────────────────── */}
      <div>
        <div className={label}>Sort</div>
        <select
          className={selectCls}
          value={state.sortMode ?? "none"}
          aria-label="Sort order"
          onChange={(e) => onChange({ sortMode: e.target.value as SortMode, editMode: "off" })}
        >
          {SORT_MODES.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
        <div className="mt-1.5 text-[11px] leading-relaxed" style={{ color: "var(--text-3)" }}>
          Y sorting uses <span className="font-medium text-[var(--text-2)]">{state.yCols[0] ?? "the first Y column"}</span>.
        </div>
      </div>

      {!cartesian ? (
        <div
          className="rounded-[9px] border px-3 py-2.5 text-[12px] leading-relaxed"
          style={{ borderColor: "var(--border)", background: "var(--raised)", color: "var(--text-3)" }}
        >
          Trendlines, error bars, reference lines and annotations apply to line, scatter, bar, area
          and bubble charts. Switch to one of those to use them.
        </div>
      ) : (
        <>
          <div className="h-px bg-[var(--border)]" />

          {/* ── Trendline ─────────────────────────────────────────── */}
          <div>
            <div className={label}>Trendline</div>
            <div className="grid grid-cols-4 gap-1.5">
              {TRENDLINES.map((t) => (
                <GlassBtn
                  key={t.id}
                  onClick={() => onChange({ trendline: t.id })}
                  aria-pressed={state.trendline === t.id}
                  title={t.label}
                  className={cn(
                    "h-[34px] rounded-[8px] border px-1 text-[10.5px] font-semibold",
                    "transition-colors duration-150 active:scale-[0.95]",
                    state.trendline !== t.id && "hover-device:border-[var(--accent)]",
                  )}
                  wrapperClassName="inline-flex items-center justify-center w-full"
                  style={pillStyle(state.trendline === t.id)}
                >
                  {t.label}
                </GlassBtn>
              ))}
            </div>

            {state.trendline !== "none" && (
              <div className="mt-2 flex flex-col gap-2">
                {state.trendline === "movingAverage" && (
                  <label className="flex items-center justify-between gap-2 text-[12px]" style={{ color: "var(--text-3)" }}>
                    Window
                    <input
                      type="number" min={2} max={99}
                      className={cn(inputCls, "w-[80px]")}
                      value={state.trendlineWindow}
                      onChange={(e) => onChange({ trendlineWindow: Math.max(2, Number(e.target.value) || 2) })}
                    />
                  </label>
                )}
                <label className="flex items-center justify-between gap-2 text-[12px]" style={{ color: "var(--text-3)" }}>
                  Show equation &amp; R² on chart
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[var(--accent)]"
                    checked={state.trendlineShowStats}
                    onChange={(e) => onChange({ trendlineShowStats: e.target.checked })}
                  />
                </label>
                {state.trendlineShowStats && (
                  <div className="grid grid-cols-4 gap-1.5">
                    {(
                      [
                        { id: "tl" as const, label: "↖" },
                        { id: "tr" as const, label: "↗" },
                        { id: "bl" as const, label: "↙" },
                        { id: "br" as const, label: "↘" },
                      ]
                    ).map(({ id, label }) => (
                      <GlassBtn
                        key={id}
                        onClick={() => onChange({ trendlineStatsCorner: id })}
                        aria-pressed={(state.trendlineStatsCorner ?? "bl") === id}
                        title={`Move stats box to ${id === "tl" ? "top left" : id === "tr" ? "top right" : id === "bl" ? "bottom left" : "bottom right"}`}
                        className="h-[30px] rounded-[7px] border text-[13px] transition-colors duration-150 active:scale-[0.95]"
                        wrapperClassName="inline-flex items-center justify-center w-full"
                        style={pillStyle((state.trendlineStatsCorner ?? "bl") === id)}
                      >
                        {label}
                      </GlassBtn>
                    ))}
                  </div>
                )}
                {trend.stats.map((s) => (
                  <div key={s} className="rounded-[8px] border px-2.5 py-1.5 font-mono text-[10.5px] leading-relaxed"
                    style={{ borderColor: "var(--border)", background: "var(--raised)", color: "var(--text-2)" }}>
                    {s}
                  </div>
                ))}
                {trend.failures.map((f) => (
                  <div key={f} className="flex items-start gap-1.5 text-[11px]" style={{ color: "var(--text-3)" }}>
                    <AlertTriangle size={11} className="mt-0.5 flex-shrink-0 text-amber-500" />
                    {f}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="h-px bg-[var(--border)]" />

          {/* ── Error bars ────────────────────────────────────────── */}
          <div>
            <div className={label}>Error bars</div>
            <div className="flex flex-col gap-2">
              {state.yCols.map((col) => {
                const cfg = state.errorBars?.[col] ?? { mode: "none" as const, col: "", value: 0 };
                const setCfg = (patch: Partial<ErrorBarConfig>) =>
                  onChange({ errorBars: { ...state.errorBars, [col]: { ...cfg, ...patch } } });
                return (
                  <div key={col} className="flex flex-col gap-1.5 rounded-[9px] border p-2"
                    style={{ borderColor: "var(--border)", background: "var(--raised)" }}>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 flex-none rounded-full" style={{ background: state.legend[col]?.color }} />
                      <span className="min-w-0 flex-1 truncate text-[12px]" style={{ color: "var(--text-2)" }}>{col}</span>
                    </div>
                    <select
                      className={selectCls}
                      aria-label={`Error bars for ${col}`}
                      value={cfg.mode}
                      onChange={(e) => setCfg({ mode: e.target.value as ErrorBarConfig["mode"] })}
                    >
                      <option value="none">None</option>
                      <option value="column">From column (±)</option>
                      <option value="percent">Percentage</option>
                      <option value="constant">Constant</option>
                      <option value="stddev">Std deviation</option>
                      <option value="stderr">Std error (SEM)</option>
                    </select>
                    {cfg.mode === "column" && (
                      <select
                        className={selectCls}
                        aria-label={`Error column for ${col}`}
                        value={cfg.col}
                        onChange={(e) => setCfg({ col: e.target.value })}
                      >
                        <option value="">Select column…</option>
                        {state.cols.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    )}
                    {(cfg.mode === "percent" || cfg.mode === "constant") && (
                      <input
                        type="number" min={0} step="any"
                        className={inputCls}
                        aria-label={`Error value for ${col}`}
                        placeholder={cfg.mode === "percent" ? "e.g. 5 (%)" : "e.g. 0.5"}
                        value={cfg.value || ""}
                        onChange={(e) => setCfg({ value: Number(e.target.value) || 0 })}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="h-px bg-[var(--border)]" />

          {/* ── Reference lines ───────────────────────────────────── */}
          <div>
            <div className={cn(label, "flex items-center justify-between")}>
              <span>Reference lines</span>
              <GlassBtn
                onClick={addRefLine}
                className="flex h-6 items-center gap-1 rounded-[6px] border px-2 text-[11px] font-medium normal-case tracking-normal transition-all duration-150 active:scale-[0.95] border-[var(--border)] bg-[var(--raised)] text-[var(--text-2)] hover-device:border-[var(--accent)]"
                wrapperClassName="inline-flex items-center gap-1"
                title="Add a reference line"
              >
                <Plus size={11} /> Add
              </GlassBtn>
            </div>
            {!(state.refLines ?? []).length ? (
              <div className="rounded-[9px] border px-3 py-2.5 text-[12px] leading-relaxed"
                style={{ borderColor: "var(--border)", background: "var(--raised)", color: "var(--text-3)" }}>
                No reference lines. Add one for a target, threshold, mean or median marker.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {state.refLines.map((ln, i) => {
                  const set = (patch: Partial<RefLine>) =>
                    onChange({ refLines: state.refLines.map((l, j) => (j === i ? { ...l, ...patch } : l)) });
                  return (
                    <div key={ln.id} className="flex flex-col gap-1.5 rounded-[9px] border p-2"
                      style={{ borderColor: "var(--border)", background: "var(--raised)" }}>
                      <div className="flex gap-1.5">
                        <select className={cn(selectCls, "w-[72px] flex-shrink-0")} aria-label="Reference line axis"
                          value={ln.axis} onChange={(e) => set({ axis: e.target.value as "x" | "y" })}>
                          <option value="y">Horiz</option>
                          <option value="x">Vert</option>
                        </select>
                        <select className={cn(selectCls, "flex-1")} aria-label="Reference line source"
                          value={ln.mode} onChange={(e) => set({ mode: e.target.value as RefLine["mode"] })}>
                          <option value="value">Fixed value</option>
                          <option value="mean">Mean of…</option>
                          <option value="median">Median of…</option>
                        </select>
                      </div>
                      <div className="flex gap-1.5">
                        {ln.mode === "value" ? (
                          <input type="number" step="any" className={cn(inputCls, "flex-1")} aria-label="Reference line value"
                            placeholder="Value" value={ln.value} onChange={(e) => set({ value: Number(e.target.value) || 0 })} />
                        ) : (
                          <select className={cn(selectCls, "flex-1")} aria-label="Reference line column"
                            value={ln.col} onChange={(e) => set({ col: e.target.value })}>
                            <option value="">Select column…</option>
                            {state.cols.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        )}
                        <input className={cn(inputCls, "flex-1")} aria-label="Reference line label"
                          placeholder="Label" value={ln.label} onChange={(e) => set({ label: e.target.value })} />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input type="color" aria-label="Reference line colour"
                          className="h-[30px] w-[38px] flex-shrink-0 cursor-pointer rounded-[6px] border bg-transparent p-0.5"
                          style={{ borderColor: "var(--border)" }}
                          value={ln.color} onChange={(e) => set({ color: e.target.value })} />
                        <select className={cn(selectCls, "flex-1")} aria-label="Reference line style"
                          value={ln.dash} onChange={(e) => set({ dash: e.target.value as RefLine["dash"] })}>
                          <option value="dash">Dashed</option>
                          <option value="solid">Solid</option>
                          <option value="dot">Dotted</option>
                          <option value="dashdot">Dash-dot</option>
                        </select>
                        <input type="number" min={1} max={8} className={cn(inputCls, "w-[58px] flex-shrink-0")}
                          aria-label="Reference line width" value={ln.width}
                          onChange={(e) => set({ width: Math.max(1, Number(e.target.value) || 1) })} />
                        <GlassBtn
                          onClick={() => onChange({ refLines: state.refLines.filter((_, j) => j !== i) })}
                          aria-label="Remove reference line"
                          className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-[7px] border transition-colors duration-150 active:scale-[0.95] border-[var(--border)] text-[var(--text-3)] hover-device:border-red-500/50"
                          wrapperClassName="inline-flex items-center justify-center"
                        >
                          <Trash2 size={12} />
                        </GlassBtn>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="h-px bg-[var(--border)]" />

          {/* ── Annotations ───────────────────────────────────────── */}
          <div>
            <div className={cn(label, "flex items-center justify-between")}>
              <span>Annotations</span>
              <GlassBtn
                onClick={addAnnotation}
                className="flex h-6 items-center gap-1 rounded-[6px] border px-2 text-[11px] font-medium normal-case tracking-normal transition-all duration-150 active:scale-[0.95] border-[var(--border)] bg-[var(--raised)] text-[var(--text-2)] hover-device:border-[var(--accent)]"
                wrapperClassName="inline-flex items-center gap-1"
                title="Add a callout"
              >
                <Plus size={11} /> Add
              </GlassBtn>
            </div>
            {!(state.annotations ?? []).length ? (
              <div className="rounded-[9px] border px-3 py-2.5 text-[12px] leading-relaxed"
                style={{ borderColor: "var(--border)", background: "var(--raised)", color: "var(--text-3)" }}>
                No callouts. Add one to point at a peak, an outlier or a milestone.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {state.annotations.map((a, i) => {
                  const set = (patch: Partial<ChartAnnotation>) =>
                    onChange({ annotations: state.annotations.map((n, j) => (j === i ? { ...n, ...patch } : n)) });
                  return (
                    <div key={a.id} className="flex flex-col gap-1.5 rounded-[9px] border p-2"
                      style={{ borderColor: "var(--border)", background: "var(--raised)" }}>
                      <input className={inputCls} aria-label="Annotation text" placeholder="Callout text"
                        value={a.text} onChange={(e) => set({ text: e.target.value })} />
                      <div className="flex gap-1.5">
                        <input className={cn(inputCls, "flex-1")} aria-label="Annotation x position"
                          placeholder="x (value or category)" value={a.x} onChange={(e) => set({ x: e.target.value })} />
                        <input type="number" step="any" className={cn(inputCls, "flex-1")} aria-label="Annotation y position"
                          placeholder="y" value={a.y} onChange={(e) => set({ y: Number(e.target.value) || 0 })} />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input type="color" aria-label="Annotation colour"
                          className="h-[30px] w-[38px] flex-shrink-0 cursor-pointer rounded-[6px] border bg-transparent p-0.5"
                          style={{ borderColor: "var(--border)" }}
                          value={a.color} onChange={(e) => set({ color: e.target.value })} />
                        <label className="flex flex-1 items-center gap-1.5 text-[11px]" style={{ color: "var(--text-3)" }}>
                          <input type="checkbox" className="h-3.5 w-3.5 accent-[var(--accent)]"
                            checked={a.showArrow} onChange={(e) => set({ showArrow: e.target.checked })} />
                          Arrow
                        </label>
                        <GlassBtn
                          onClick={() => onChange({ annotations: state.annotations.filter((_, j) => j !== i) })}
                          aria-label="Remove annotation"
                          className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-[7px] border transition-colors duration-150 active:scale-[0.95] border-[var(--border)] text-[var(--text-3)] hover-device:border-red-500/50"
                          wrapperClassName="inline-flex items-center justify-center"
                        >
                          <Trash2 size={12} />
                        </GlassBtn>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {result.transformed && (
        <div
          className="rounded-[9px] border px-3 py-2.5 text-[11px] leading-relaxed"
          style={{ borderColor: "var(--border)", background: "var(--raised)", color: "var(--text-3)" }}
        >
          Click-to-edit is paused while an analysis transform is active — plotted points no longer map
          one-to-one to source rows. Reset aggregation, filters and sort to edit points again.
        </div>
      )}
    </div>
  );
}
