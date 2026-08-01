/**
 * Self-check for the analysis pipeline. Run with:
 *   npx esbuild src/lib/analysis.test.ts --bundle --format=esm --outfile=/tmp/t.mjs && node /tmp/t.mjs
 */
import { analyze, toNum, isNumericCol, columnKind } from "./analysis";
import type { AppState } from "@/types";
import assert from "node:assert";

const data = [
  { region: "North", revenue: 100, note: "a" },
  { region: "North", revenue: 300, note: "b" },
  { region: "South", revenue: 50, note: "c" },
  { region: "South", revenue: "1,150", note: "d" }, // thousands separator
  { region: "East", revenue: "N/A", note: "e" },    // unparseable
  { region: "East", revenue: "", note: "f" },       // blank
];

function st(): AppState {
  return {
    data, cols: ["region", "revenue", "note"], xCol: "region", yCols: ["revenue"],
    filters: [], aggFunc: "none", sortMode: "none",
  } as unknown as AppState;
}
function withPatch(patch: Partial<AppState>): AppState {
  return { ...st(), ...patch } as AppState;
}

// ── number coercion ───────────────────────────────────────────────
assert.strictEqual(toNum("1,200"), 1200, "strips thousands separator");
assert.strictEqual(toNum("$1500"), 1500, "strips currency");
assert.strictEqual(toNum("45%"), 45, "strips percent");
assert.strictEqual(toNum("N/A"), null, "rejects text");
assert.strictEqual(toNum(""), null, "rejects blank");
assert.strictEqual(toNum(null), null, "rejects null");
assert.strictEqual(toNum(true), null, "rejects boolean");
assert.strictEqual(toNum("(1,234.56)"), -1234.56, "accounting negative in parens");
assert.strictEqual(toNum("(50)"), -50, "simple accounting negative");
assert.strictEqual(toNum("7/15/2026"), null, "date-shaped string is not a number");

// ── column typing ─────────────────────────────────────────────────
assert.strictEqual(isNumericCol(data, "revenue"), true, "revenue reads numeric");
assert.strictEqual(isNumericCol(data, "region"), false, "region reads non-numeric");

// ── date detection — non-ISO shapes, incl. the exact format from the market
// research PDF timestamps (M/D/YYYY) that the old ISO-only regex missed ──
const dateCol = (val: string) => [{ d: val }, { d: val }, { d: val }];
assert.strictEqual(columnKind(dateCol("2026-07-15"), "d"), "date", "ISO date");
assert.strictEqual(columnKind(dateCol("7/15/2026 22:56:10"), "d"), "date", "M/D/YYYY with time (the PDF's own format)");
assert.strictEqual(columnKind(dateCol("15-07-2026"), "d"), "date", "D-M-YYYY");
assert.strictEqual(columnKind(dateCol("15-Jan-2026"), "d"), "date", "D-Mon-YYYY");
assert.strictEqual(columnKind(dateCol("15 Jan 2026"), "d"), "date", "D Mon YYYY");
assert.strictEqual(columnKind(dateCol("January 15, 2026"), "d"), "date", "Month D, YYYY");
assert.strictEqual(columnKind(dateCol("Jan 15 2026"), "d"), "date", "Mon D YYYY");
assert.strictEqual(columnKind([{ d: "3/4" }, { d: "1/2" }, { d: "5/6" }], "d"), "text", "bare fractions are not dates");
assert.strictEqual(columnKind([{ d: "Jan" }, { d: "Feb" }, { d: "Mar" }], "d"), "text", "month names alone are categories, not dates");
{
  const withRealDates = [{ d: new Date(2026, 0, 1) }, { d: new Date(2026, 0, 2) }];
  assert.strictEqual(columnKind(withRealDates, "d"), "date", "real Date objects (from cellDates: true) read as date");
}

// ── aggregation ───────────────────────────────────────────────────
const sum = analyze(withPatch({ aggFunc: "sum" }));
assert.strictEqual(sum.rows.length, 3, "3 regions after grouping");
const byRegion = Object.fromEntries(sum.rows.map((r) => [r.region, r.revenue]));
assert.strictEqual(byRegion.North, 400, "North sums 100+300");
assert.strictEqual(byRegion.South, 1200, "South sums 50 + parsed 1,150");
assert.strictEqual(byRegion.East, null, "East has no valid numbers -> null");

const mean = analyze(withPatch({ aggFunc: "mean" }));
assert.strictEqual(Object.fromEntries(mean.rows.map((r) => [r.region, r.revenue])).North, 200, "mean of 100,300");

const count = analyze(withPatch({ aggFunc: "count" }));
assert.strictEqual(Object.fromEntries(count.rows.map((r) => [r.region, r.revenue])).East, 2, "count counts rows, not valid values");

const median = analyze(withPatch({ aggFunc: "median", data: [
  { region: "A", revenue: 1 }, { region: "A", revenue: 5 }, { region: "A", revenue: 3 },
] as AppState["data"] }));
assert.strictEqual(median.rows[0].revenue, 3, "odd-length median");

const max = analyze(withPatch({ aggFunc: "max" }));
assert.strictEqual(Object.fromEntries(max.rows.map((r) => [r.region, r.revenue])).South, 1150, "max picks parsed 1,150");

// ── filtering ─────────────────────────────────────────────────────
const filtered = analyze(withPatch({ filters: [{ col: "region", op: "=", value: "North", enabled: true }] }));
assert.strictEqual(filtered.rows.length, 2, "filter keeps 2 North rows");
assert.strictEqual(filtered.filteredOut, 4, "filter reports 4 removed");

const numFilter = analyze(withPatch({ filters: [{ col: "revenue", op: ">", value: "99", enabled: true }] }));
assert.strictEqual(numFilter.rows.length, 3, "numeric > compares as numbers (100,300,1150)");

const disabled = analyze(withPatch({ filters: [{ col: "region", op: "=", value: "North", enabled: false }] }));
assert.strictEqual(disabled.rows.length, 6, "disabled filter is ignored");

const contains = analyze(withPatch({ filters: [{ col: "region", op: "contains", value: "out", enabled: true }] }));
assert.strictEqual(contains.rows.length, 2, "contains is case-insensitive substring (South)");

// ── sorting ───────────────────────────────────────────────────────
const sorted = analyze(withPatch({ aggFunc: "sum", sortMode: "y-desc" }));
assert.deepStrictEqual(sorted.rows.map((r) => r.region), ["South", "North", "East"], "y-desc orders by summed value, nulls last");

const xAsc = analyze(withPatch({ aggFunc: "sum", sortMode: "x-asc" }));
assert.deepStrictEqual(xAsc.rows.map((r) => r.region), ["East", "North", "South"], "x-asc orders alphabetically");

// ── data quality ──────────────────────────────────────────────────
const q = analyze(st());
assert.strictEqual(q.issues.length, 1, "one column has issues");
assert.strictEqual(q.issues[0].blank, 1, "one blank value");
assert.strictEqual(q.issues[0].nonNumeric, 1, "one non-numeric value");

// ── edit-safety flag ──────────────────────────────────────────────
assert.strictEqual(analyze(st()).transformed, false, "untouched pipeline is not a transform");
assert.strictEqual(analyze(withPatch({ aggFunc: "sum" })).transformed, true, "aggregation counts as transform");
assert.strictEqual(analyze(withPatch({ sortMode: "x-asc" })).transformed, true, "sort counts as transform");
assert.strictEqual(analyze(st()).rows, data, "no-op pipeline returns the original array (1:1 point→row mapping holds)");

console.log("analysis.ts — all checks passed");
