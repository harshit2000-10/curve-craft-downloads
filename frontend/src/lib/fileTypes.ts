export const SUPPORTED_EXTENSIONS = [".csv", ".tsv", ".xlsx", ".xls"];

const EXCEL_EXTENSIONS = [".xlsx", ".xls"];

export function isExcelFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return EXCEL_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

const SUPPORTED_MIME_TYPES = [
  "text/csv",
  "text/tab-separated-values",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];

export const FILE_ACCEPT = [...SUPPORTED_EXTENSIONS, ...SUPPORTED_MIME_TYPES].join(",");
