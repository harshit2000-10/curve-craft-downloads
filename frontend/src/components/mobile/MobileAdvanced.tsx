import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  title?: string;
  children: ReactNode;
}

/** Collapsible overflow section — houses the desktop-only controls not shown
 * in the mobile mockup screens (per plan: axis-level style fields, DPI
 * slider, secondary export routes, etc). Shared by Style and Export tabs. */
export default function MobileAdvanced({ title = "Advanced", children }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-1">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-[13px] font-medium transition-colors active:scale-[0.98]"
        style={{ borderColor: "var(--border)", background: "var(--raised)", color: "var(--text-2)" }}
      >
        {title}
        {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>
      {open && (
        <div className="mt-3 rounded-2xl border p-3.5" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
          {children}
        </div>
      )}
    </div>
  );
}
