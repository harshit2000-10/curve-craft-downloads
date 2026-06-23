import Papa from "papaparse";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface UploadResult {
  columns: string[];
  data: Record<string, unknown>[];
  shape: [number, number];
}

export interface FormulaResult {
  columns: string[];
  data: Record<string, unknown>[];
}

// ── CSV / Excel parser (runs in browser, zero server) ─────────────────────────

/** Parse a CSV, TSV, or Excel file entirely on the user's machine. */
export async function uploadCSV(file: File): Promise<UploadResult> {
  const name = file.name.toLowerCase();

  // Excel — load SheetJS lazily (heavy ~1 MB, only when needed)
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    const columns = Object.keys(data[0] ?? {});
    return { columns, data, shape: [data.length, columns.length] };
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
