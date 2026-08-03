import { useState, useEffect } from "react";

const QUERY = "(max-width: 767px)";

/** True below 768px — the mobile-native shell's own breakpoint, distinct
 * from the existing `lg` (1024px) drawer-vs-docked split which still
 * governs the tablet-width experience. */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(QUERY).matches : false,
  );

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const onChange = () => setIsMobile(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
