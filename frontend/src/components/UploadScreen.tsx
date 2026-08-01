import { useState } from "react";
import { cn } from "@/lib/utils";
import { GridPattern } from "@/components/ui/grid-pattern";
import FileUpload from "@/components/ui/file-upload";
import { GlassBtn } from "@/components/ui/liquid-glass";
import RotatingText from "@/components/ui/RotatingText";
import type { AppTheme } from "@/types";

interface Props {
  theme: AppTheme;
  onFile: (file: File) => void;
  onSample: () => void;
  onToggleTheme: () => void;
  onOpenProject: () => void;
}

export default function UploadScreen({ theme, onFile, onSample, onToggleTheme, onOpenProject }: Props) {
  const isDark = theme === "dark";
  const [agreed, setAgreed] = useState(() => {
    // Reading can throw under storage-restricted browsers (Brave shields set to
    // block storage, Safari private mode, strict cookie policies) — fall back to
    // "not yet agreed" rather than let it crash the initial render.
    try { return localStorage.getItem("cc_tnc") === "1"; }
    catch { return false; }
  });

  function agree() {
    // Persistence is a convenience, not a requirement — if storage is blocked,
    // the session must still work. Without the try/catch, a thrown setItem here
    // stops execution before setAgreed(true), silently locking the upload zone
    // (pointer-events-none) with no visible error.
    try { localStorage.setItem("cc_tnc", "1"); } catch { /* best-effort only */ }
    setAgreed(true);
  }
  const [showTnc, setShowTnc] = useState(false);

  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col items-center overflow-y-auto overflow-x-hidden",
        isDark ? "bg-[var(--bg)]" : "bg-[var(--bg)]",
      )}
    >
      {/* Background */}
      <GridPattern
        squares={[
          [4, 4], [5, 1], [8, 2], [5, 3], [5, 5],
          [10, 10], [12, 15], [15, 10], [10, 15],
          [2, 8], [18, 6], [7, 12], [14, 3],
        ]}
        className={cn(
          "[mask-image:radial-gradient(600px_circle_at_50%_200px,white,transparent)]",
          "inset-x-0 inset-y-0 h-full",
          isDark ? "fill-violet-400/10 stroke-violet-400/10" : "fill-violet-400/20 stroke-violet-400/20",
        )}
      />
      <div className={cn(
        "pointer-events-none absolute inset-0",
        isDark
          ? "bg-[radial-gradient(ellipse_60%_30%_at_50%_0%,rgba(124,108,248,0.12),transparent)]"
          : "bg-[radial-gradient(ellipse_60%_30%_at_50%_0%,rgba(124,108,248,0.07),transparent)]",
      )} />

      {/* Theme toggle */}
      <GlassBtn
        onClick={onToggleTheme}
        className={cn(
          "absolute right-5 top-5 z-10 flex h-8 w-8 items-center justify-center rounded-full border transition-all duration-150 active:scale-[0.94]",
          isDark
            ? "border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white/90"
            : "border-black/10 bg-black/5 text-black/50 hover:border-black/20 hover:text-black/70",
        )}
        wrapperClassName="inline-flex items-center justify-center"
        title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDark ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        )}
      </GlassBtn>

      {/* Content */}
      <div className="relative z-10 flex w-full flex-col items-center px-4 pb-12 pt-16">
        {/* Hero */}
        <div className="mb-2 text-center">
          <h1 className="flex items-center justify-center gap-2.5 text-5xl font-semibold tracking-[-0.04em] leading-none">
            <span className={cn(
              isDark
                ? "bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent"
                : "bg-gradient-to-b from-neutral-900 to-neutral-500 bg-clip-text text-transparent",
            )}>
              Curve
            </span>
            <RotatingText
              texts={["Craft", "Graph", "Achieve"]}
              mainClassName={cn(
                "px-3 py-0.5 rounded-lg overflow-hidden inline-flex items-center justify-center",
                isDark ? "bg-violet-500/20 text-violet-300" : "bg-violet-100 text-violet-600",
              )}
              staggerFrom="last"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "-120%" }}
              staggerDuration={0.025}
              splitLevelClassName="overflow-hidden pb-0.5"
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              rotationInterval={2200}
            />
          </h1>
          <p className={cn("mt-3 text-sm", isDark ? "text-white/30" : "text-black/40")}>
            Turn any CSV into a publication-quality chart
          </p>
        </div>

        {/* Upload zone — blurred + unclickable until agreed */}
        <div className={cn("relative w-full transition-all duration-300", !agreed && "pointer-events-none select-none")}>
          <FileUpload onFileAccepted={onFile} />
          {/* Overlay when not agreed */}
          {!agreed && (
            <div
              className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl backdrop-blur-[3px]"
              style={{ background: "color-mix(in srgb, var(--bg) 60%, transparent)" }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                className={isDark ? "text-white/25" : "text-black/25"}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <span className={cn("text-xs font-medium", isDark ? "text-white/30" : "text-black/35")}>
                Agree to Terms below to unlock
              </span>
            </div>
          )}
        </div>

        {/* Sample data + open saved project */}
        <div className="mt-2 flex items-center gap-2">
          <GlassBtn
            onClick={agreed ? onSample : undefined}
            className={cn(
              "rounded-lg border px-4 py-2 text-xs font-medium transition-all duration-150",
              agreed
                ? isDark
                  ? "border-white/10 text-white/40 hover:border-white/20 hover:text-white/60 active:scale-[0.97]"
                  : "border-black/10 text-black/40 hover:border-black/20 hover:text-black/60 active:scale-[0.97]"
                : "pointer-events-none opacity-30 " + (isDark ? "border-white/6 text-white/25" : "border-black/6 text-black/25"),
            )}
            style={{ transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
            wrapperClassName="inline-flex items-center gap-1.5"
          >
            Load sample dataset →
          </GlassBtn>

          <GlassBtn
            onClick={agreed ? onOpenProject : undefined}
            title="Open a previously saved .curvecraft.json project"
            className={cn(
              "rounded-lg border px-4 py-2 text-xs font-medium transition-all duration-150",
              agreed
                ? isDark
                  ? "border-white/10 text-white/40 hover:border-white/20 hover:text-white/60 active:scale-[0.97]"
                  : "border-black/10 text-black/40 hover:border-black/20 hover:text-black/60 active:scale-[0.97]"
                : "pointer-events-none opacity-30 " + (isDark ? "border-white/6 text-white/25" : "border-black/6 text-black/25"),
            )}
            style={{ transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
            wrapperClassName="inline-flex items-center gap-1.5"
          >
            Open project
          </GlassBtn>
        </div>

        {/* ── Terms checkbox ─────────────────────────────────────────────── */}
        <div className={cn(
          "mt-6 flex w-full max-w-md flex-col gap-3 rounded-[14px] border p-4",
          isDark ? "border-white/8 bg-white/3" : "border-black/8 bg-black/2",
        )}>
          <label className="flex cursor-pointer items-start gap-3">
            {/* Custom checkbox */}
            <div className="relative mt-0.5 flex-shrink-0">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => {
                  if (e.target.checked) { agree(); return; }
                  try { localStorage.removeItem("cc_tnc"); } catch { /* best-effort only */ }
                  setAgreed(false);
                }}
                className="sr-only"
              />
              <div className={cn(
                "flex h-5 w-5 items-center justify-center rounded-[5px] border-2 transition-all duration-150",
                agreed
                  ? "border-violet-500 bg-violet-500"
                  : isDark
                  ? "border-white/20 bg-white/4 hover:border-white/35"
                  : "border-black/25 bg-black/3 hover:border-black/40",
              )}>
                {agreed && (
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            </div>

            {/* Label text */}
            <span className={cn("text-[13px] leading-5", isDark ? "text-white/55" : "text-black/60")}>
              I have read and agree to the{" "}
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); setShowTnc(true); }}
                className="font-medium text-violet-500 underline underline-offset-2 hover:text-violet-400 transition-colors"
              >
                Terms and Conditions
              </button>
              {" "}of Curve Craft. I confirm that any data I upload complies with applicable laws.
            </span>
          </label>

          {/* Agreed confirmation */}
          {agreed && (
            <div className={cn(
              "flex items-center gap-2 rounded-[8px] px-3 py-2 text-[12px] font-medium",
              isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-700",
            )}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              You're all set — upload your CSV to get started.
            </div>
          )}
        </div>
      </div>

      {/* ── T&C Modal ──────────────────────────────────────────────────────── */}
      {showTnc && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 backdrop-blur-sm"
            style={{ background: isDark ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.4)" }}
            onClick={() => setShowTnc(false)}
          />
          {/* Panel */}
          <div className={cn(
            "fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2",
            "flex max-h-[80vh] flex-col rounded-[18px] border shadow-2xl",
            isDark ? "border-white/10 bg-[#18181f]" : "border-black/10 bg-white shadow-black/15",
          )}>
            {/* Header */}
            <div className={cn(
              "flex flex-shrink-0 items-center justify-between border-b px-5 py-4",
              isDark ? "border-white/8" : "border-black/8",
            )}>
              <div>
                <div className={cn("text-[15px] font-semibold", isDark ? "text-white" : "text-black")}>
                  Terms and Conditions
                </div>
                <div className={cn("text-[12px] mt-0.5", isDark ? "text-white/35" : "text-black/40")}>
                  Curve Craft · Effective 22 June 2026
                </div>
              </div>
              <GlassBtn
                onClick={() => setShowTnc(false)}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full transition-all hover:scale-105 active:scale-95",
                  isDark ? "bg-white/8 text-white/50 hover:bg-white/14" : "bg-black/6 text-black/50 hover:bg-black/10",
                )}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </GlassBtn>
            </div>

            {/* Scrollable body */}
            <div className={cn(
              "flex-1 overflow-y-auto px-5 py-4 text-[13px] leading-6 space-y-4",
              isDark ? "text-white/60" : "text-black/65",
            )}>
              {[
                {
                  title: "1. About Curve Craft",
                  body: 'Curve Craft is a free, open-source web tool to upload CSV/TSV/XLSX files, create charts, and export images. Developed by Harshit Sharma, Mumbai, India.',
                },
                {
                  title: "2. Acceptance",
                  body: 'By uploading a file or using any feature, you agree to these Terms. If you disagree, stop using the application immediately.',
                },
                {
                  title: "3. Data Processing",
                  body: 'Your uploaded files are processed entirely within your browser. No uploaded data is transmitted to any server. The application loads a charting library (Plotly) from a third-party CDN (cdn.plot.ly) — this request contains no user data, only standard browser metadata (IP address, browser version). All uploaded data is discarded when the browser session ends.',
                },
                {
                  title: "4. Your Responsibilities",
                  body: 'You must not upload files containing illegal data, malicious code, or personal data of third parties without their consent. You are solely responsible for the data you upload.',
                },
                {
                  title: "5. Privacy (DPDP Act 2023)",
                  body: 'No cookies, tracking, or analytics are used. Uploaded data is never stored or transmitted. The charting library is loaded from cdn.plot.ly (Plotly, Inc.) — their privacy policy applies to that CDN request alone. No personal data collected by Curve Craft is shared with any third party. You have the right to erasure, correction, and grievance redressal.',
                },
                {
                  title: "6. Disclaimer",
                  body: 'The application is provided "as is" without warranty. Charts and formula outputs are for informational purposes only and do not constitute financial, legal, or professional advice.',
                },
                {
                  title: "7. Limitation of Liability",
                  body: 'Harshit Sharma is not liable for any loss of data, profits, or damages arising from use of this application. Aggregate liability is INR 0.',
                },
                {
                  title: "8. Grievance Officer (IT Rules 2021)",
                  body: 'Name: Harshit Sharma · Email: sharma.55442232@gmail.com · Response: 48 hours · Resolution: 15 days',
                },
                {
                  title: "9. Governing Law",
                  body: 'These Terms are governed by the laws of India. Disputes are subject to the exclusive jurisdiction of courts in Mumbai, Maharashtra.',
                },
                {
                  title: "10. Open Source",
                  body: 'Curve Craft is released under the MIT Licence. You may inspect, fork, and redistribute the source code in accordance with that licence.',
                },
              ].map(({ title, body }) => (
                <div key={title}>
                  <div className={cn("font-semibold mb-1", isDark ? "text-white/85" : "text-black/80")}>
                    {title}
                  </div>
                  <div>{body}</div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className={cn(
              "flex flex-shrink-0 items-center gap-3 border-t px-5 py-3",
              isDark ? "border-white/8" : "border-black/8",
            )}>
              <GlassBtn
                onClick={() => { agree(); setShowTnc(false); }}
                className="flex-1 rounded-[9px] bg-violet-500 py-2 text-[13px] font-semibold text-white hover:bg-violet-400 active:scale-[0.97] transition-all"
              >
                I Agree
              </GlassBtn>
              <GlassBtn
                onClick={() => setShowTnc(false)}
                className={cn(
                  "rounded-[9px] border px-4 py-2 text-[13px] font-medium transition-all active:scale-[0.97]",
                  isDark ? "border-white/10 text-white/50 hover:border-white/20" : "border-black/10 text-black/50 hover:border-black/20",
                )}
              >
                Close
              </GlassBtn>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
