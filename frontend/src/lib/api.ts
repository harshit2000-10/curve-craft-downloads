import Papa from "papaparse";
import { isExcelFile } from "@/lib/fileTypes";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface UploadResult {
  columns: string[];
  data: Record<string, unknown>[];
  shape: [number, number];
  /** Set when an Excel file had more than one sheet — only the first was loaded. */
  extraSheets?: { loaded: string; skipped: string[] };
}

export interface FormulaResult {
  columns: string[];
  data: Record<string, unknown>[];
}

// ── CSV / Excel parser (runs in browser, zero server) ─────────────────────────

/** Parse a CSV, TSV, or Excel file entirely on the user's machine. */
export async function uploadCSV(file: File): Promise<UploadResult> {
  // Excel — load SheetJS lazily (heavy ~1 MB, only when needed)
  if (isExcelFile(file.name)) {
    const XLSX = await import("@e965/xlsx");
    const buffer = await file.arrayBuffer();
    // cellDates: true makes SheetJS hand back real JS Date objects for
    // date-formatted cells instead of raw Excel serial numbers (e.g. 45870) —
    // without it, a date column silently reads as a meaningless big number.
    const workbook = XLSX.read(buffer, { cellDates: true });
    const [firstName, ...restNames] = workbook.SheetNames;
    const sheet = workbook.Sheets[firstName];
    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    const columns = Object.keys(data[0] ?? {});
    return {
      columns, data, shape: [data.length, columns.length],
      // Only the first sheet is ever read — this is what makes that fact visible
      // instead of silently discarding the rest.
      ...(restNames.length ? { extraSheets: { loaded: firstName, skipped: restNames } } : {}),
    };
  }

  // CSV / TSV — PapaParse auto-detects delimiter
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data;
        const columns = results.meta.fields ?? [];
        resolve({ columns, data, shape: [data.length, columns.length] });
      },
      error: (err) => reject(new Error(err.message)),
    });
  });
}

// ── Formula engine (runs in browser via mathjs) ───────────────────────────────

/** Evaluate a formula over existing columns using mathjs — no server needed. */
export async function applyFormula(
  data: Record<string, unknown>[],
  formula: string,
  newColumn: string,
): Promise<FormulaResult> {
  // Translate Math.* JS notation → mathjs function names
  const { evaluate: mathEval } = await import("mathjs");

  const expr = formula
    .replace(/Math\.PI/g, "pi")
    .replace(/Math\.E(?!x)/g, "e")   // Math.E but not Math.exp
    .replace(/Math\.log10\(/g, "log10(")
    .replace(/Math\.log2\(/g, "log2(")
    .replace(/Math\./g, "");          // Math.sin( → sin(, Math.sqrt( → sqrt(

  const newData = data.map((row) => {
    try {
      const value = mathEval(expr, { ...row } as Record<string, number>);
      return { ...row, [newColumn]: typeof value === "number" ? value : null };
    } catch {
      return { ...row, [newColumn]: null };
    }
  });

  if (data.length > 0 && newData.every((row) => row[newColumn] === null)) {
    throw new Error(`"${formula}" produced no valid results — check column names and syntax`);
  }

  const columns = Object.keys(newData[0] ?? {});
  return { columns, data: newData };
}
