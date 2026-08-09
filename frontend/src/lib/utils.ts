import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Escapes text headed into a string that Plotly (or anything else) will
 * parse as pseudo-HTML — chart title/subtitle are free-typed user text
 * concatenated into a `<br><sup>` template, so an unescaped `<b>` or `<a>`
 * would render as a real tag instead of literal characters. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
