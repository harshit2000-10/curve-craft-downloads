import { useState, useEffect } from "react";
import type { AppTheme } from "@/types";

export function useTheme() {
  const [theme, setTheme] = useState<AppTheme>(() => {
    // getItem can throw under storage-restricted browsers (Brave shields,
    // Safari private mode) — fall back to the OS preference rather than crash.
    let saved: string | null = null;
    try { saved = localStorage.getItem("cc-theme"); } catch { /* fall through */ }
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add(theme);
    root.setAttribute("data-theme", theme);
    // Persistence is best-effort — theme still applies to the DOM above even
    // if storage is blocked, it just won't be remembered next visit.
    try { localStorage.setItem("cc-theme", theme); } catch { /* ignore */ }
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return { theme, toggle };
}
