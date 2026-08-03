import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import DataBuilder from "@/components/ui/DataBuilder";
import type { AppTheme } from "@/types";

interface Props {
  theme: AppTheme;
  onFile: (file: File) => void;
  onSample: () => void;
  onToggleTheme: () => void;
  onOpenProject: () => void;
  onCreateData: (data: Record<string, unknown>[]) => void;
}

/** Mobile-native upload screen — "2e Upload" in the design. Reuses the same
 * handlers UploadScreen.tsx does, so the terms-gate / DataBuilder / file
 * logic is identical, just laid out for a phone instead of a centered
 * desktop column. Theme-aware via the existing CSS var tokens rather than
 * the mockup's light-only version, so dark mode isn't lost on mobile. */
export default function MobileUploadScreen({ theme, onFile, onSample, onToggleTheme, onOpenProject, onCreateData }: Props) {
  const isDark = theme === "dark";
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [building, setBuilding] = useState(false);
  const [agreed, setAgreed] = useState(() => {
    try { return localStorage.getItem("cc_tnc") === "1"; }
    catch { return false; }
  });
  const [showTnc, setShowTnc] = useState(false);

  function agree() {
    try { localStorage.setItem("cc_tnc", "1"); } catch { /* best-effort only */ }
    setAgreed(true);
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    if (!agreed) return;
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  }

  return (
    <div
      className="flex h-full flex-col overflow-y-auto"
      style={{
        background: "var(--bg)",
        backgroundImage: isDark
          ? "linear-gradient(rgba(124,92,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(124,92,255,0.06) 1px, transparent 1px)"
          : "linear-gradient(rgba(124,92,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(124,92,255,0.05) 1px, transparent 1px)",
        backgroundSize: "44px 44px",
      }}
    >
      <button
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        onClick={onToggleTheme}
        className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border active:opacity-60"
        style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--text-2)" }}
      >
        {isDark ? (
          <svg width="15" height="15" viewBox="0 0 18 18"><path d="M9 2 A7 7 0 0 0 9 16 A5.5 7 0 0 1 9 2 Z" fill="currentColor" /></svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /></svg>
        )}
      </button>

      <div className="flex flex-col items-center gap-1.5 pb-2 pt-16">
        <div className="flex items-baseline gap-2">
          <span className="font-['Space_Grotesk'] text-[30px] font-bold tracking-tight" style={{ color: "var(--text)" }}>Curve</span>
          <span
            className="rounded-lg px-2.5 font-['Space_Grotesk'] text-[30px] font-bold tracking-tight"
            style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
          >
            Craft
          </span>
        </div>
        <div className="text-[13px]" style={{ color: "var(--text-3)" }}>Turn any CSV into a publication-quality chart</div>
      </div>

      <div className="flex flex-1 flex-col gap-3 px-4 pb-6 pt-3">
        {building ? (
          <DataBuilder
            isDark={isDark}
            onCreate={(data) => { onCreateData(data); setBuilding(false); }}
            onCancel={() => setBuilding(false)}
          />
        ) : (
          <div
            onDragOver={(e) => { e.preventDefault(); if (agreed) setDragging(true); }}
            onDragLeave={(e) => { if (e.currentTarget.contains(e.relatedTarget as Node)) return; setDragging(false); }}
            onDrop={onDrop}
            onClick={() => agreed && inputRef.current?.click()}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-3 rounded-[22px] border-2 border-dashed px-6 py-10 transition-colors",
              !agreed && "pointer-events-none opacity-50",
            )}
            style={{
              borderColor: dragging ? "var(--accent)" : "var(--border)",
              background: "var(--panel)",
              boxShadow: "var(--shadow)",
            }}
          >
            <input
              ref={inputRef}
              type="file"
              hidden
              accept=".csv,.tsv,.xlsx,.xls"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }}
            />
            <svg width="56" height="46" viewBox="0 0 72 60" fill="none">
              <path d="M20 44 C11 44 6 38 6 31 C6 24 11 19 17 18 C18 10 25 4 34 4 C42 4 49 9 51 16 C59 16 66 22 66 30 C66 38 60 44 52 44" stroke="var(--accent)" strokeWidth="5" strokeLinecap="round" fill="none" />
              <path d="M36 56 L36 28 M36 28 L26 38 M36 28 L46 38" stroke="var(--accent)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="font-['Space_Grotesk'] text-[20px] font-bold" style={{ color: "var(--text)" }}>Drop your file here</div>
            <div className="text-[15px]" style={{ color: "var(--text-2)" }}>
              Drag &amp; drop, or <span style={{ color: "var(--accent)", fontWeight: 600 }}>browse</span>
            </div>
            <div className="text-[12px]" style={{ color: "var(--text-3)" }}>Supports .csv, .tsv, .xlsx, .xls files</div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <button
            disabled={!agreed}
            onClick={onSample}
            className="flex h-[46px] items-center justify-center gap-1.5 rounded-xl border text-[14px] font-medium disabled:opacity-40 active:scale-[0.98]"
            style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--text-2)" }}
          >
            Load sample dataset
            <svg width="13" height="13" viewBox="0 0 15 15" fill="none"><path d="M2.5 7.5 H12 M12 7.5 L8.5 4 M12 7.5 L8.5 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <div className="flex gap-2">
            <button
              disabled={!agreed}
              onClick={onOpenProject}
              className="h-[46px] flex-1 rounded-xl border text-[14px] font-medium disabled:opacity-40 active:scale-[0.98]"
              style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--text-2)" }}
            >
              Open project
            </button>
            <button
              disabled={!agreed}
              onClick={() => setBuilding((b) => !b)}
              className="h-[46px] flex-1 rounded-xl border text-[14px] font-medium disabled:opacity-40 active:scale-[0.98]"
              style={{
                borderColor: building ? "var(--accent)" : "var(--border)",
                background: "var(--panel)",
                color: building ? "var(--accent-2)" : "var(--text-2)",
              }}
            >
              Create your own data
            </button>
          </div>
        </div>

        <div
          className="flex flex-col gap-3 rounded-2xl border p-3.5"
          style={{ borderColor: "var(--border)", background: "var(--panel)", boxShadow: "var(--shadow)" }}
        >
          <label className="flex cursor-pointer items-start gap-3">
            <div className="relative mt-0.5 flex-shrink-0">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => {
                  if (e.target.checked) { agree(); return; }
                  try { localStorage.removeItem("cc_tnc"); } catch { /* ignore */ }
                  setAgreed(false);
                }}
                className="sr-only"
              />
              <div
                className="flex h-[22px] w-[22px] items-center justify-center rounded-lg border-2"
                style={{
                  borderColor: agreed ? "var(--accent)" : "var(--border)",
                  background: agreed ? "var(--accent)" : "transparent",
                }}
              >
                {agreed && (
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M2.5 7.5 L5.5 10.5 L11.5 3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>
                )}
              </div>
            </div>
            <span className="text-[13px] leading-[1.55]" style={{ color: "var(--text-2)" }}>
              I have read and agree to the{" "}
              <button type="button" onClick={(e) => { e.preventDefault(); setShowTnc(true); }} className="font-medium underline underline-offset-2" style={{ color: "var(--accent)" }}>
                Terms and Conditions
              </button>{" "}
              of Curve Craft. I confirm that any data I upload complies with applicable laws.
            </span>
          </label>
          {agreed && (
            <div className="flex items-center gap-2.5 rounded-[10px] px-3 py-2.5" style={{ background: "rgba(34,197,94,0.12)" }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7.5 L5.5 11 L12 3.5" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span className="text-[13px] font-semibold" style={{ color: "#22c55e" }}>You&apos;re all set — upload your CSV to get started.</span>
            </div>
          )}
        </div>
      </div>

      {showTnc && (
        <>
          <div className="fixed inset-0 z-40 backdrop-blur-sm" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setShowTnc(false)} />
          <div
            className="fixed inset-x-4 top-1/2 z-50 max-h-[75vh] -translate-y-1/2 overflow-y-auto rounded-2xl border p-5"
            style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--text-2)" }}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[15px] font-semibold" style={{ color: "var(--text)" }}>Terms and Conditions</span>
              <button onClick={() => setShowTnc(false)} className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: "var(--raised)" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <p className="text-[13px] leading-6">
              Curve Craft processes files entirely in your browser — nothing is uploaded to a server.
              You&apos;re responsible for the data you provide. Released under the MIT licence.
            </p>
            <button
              onClick={() => { agree(); setShowTnc(false); }}
              className="mt-4 w-full rounded-xl py-2.5 text-[14px] font-semibold text-white"
              style={{ background: "var(--accent)" }}
            >
              I Agree
            </button>
          </div>
        </>
      )}
    </div>
  );
}
