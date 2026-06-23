"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { AppTheme } from "@/types";

interface CreditCardProps {
  theme: AppTheme;
}

const LinkedInIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
    <rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>
  </svg>
);

const MailIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/>
  </svg>
);

const GitHubIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
  </svg>
);

export function CreditCard({ theme }: CreditCardProps) {
  const isDark = theme === "dark";

  const socials = [
    {
      href: "https://www.linkedin.com/in/harshit-sharma232000/",
      icon: <LinkedInIcon />,
      label: "LinkedIn",
      delay: "0ms",
      hoverColor: isDark
        ? "hover:border-blue-400/40 hover:bg-blue-500/15 hover:text-blue-400"
        : "hover:border-blue-500/40 hover:bg-blue-50 hover:text-blue-600",
    },
    {
      href: "mailto:sharma.55442232@gmail.com",
      icon: <MailIcon />,
      label: "Email",
      delay: "60ms",
      hoverColor: isDark
        ? "hover:border-violet-400/40 hover:bg-violet-500/15 hover:text-violet-400"
        : "hover:border-violet-500/40 hover:bg-violet-50 hover:text-violet-600",
    },
    {
      href: "https://github.com/harshit2000-10",
      icon: <GitHubIcon />,
      label: "GitHub",
      delay: "120ms",
      hoverColor: isDark
        ? "hover:border-white/20 hover:bg-white/8 hover:text-white/80"
        : "hover:border-black/20 hover:bg-black/6 hover:text-black/75",
    },
  ];

  return (
    <div
      className={cn(
        "group relative mx-3 mb-3 flex-shrink-0 overflow-hidden rounded-[12px] border px-4 py-3 transition-colors duration-200",
        isDark
          ? "border-white/8 bg-white/3 hover:border-white/12 hover:bg-white/4"
          : "border-black/8 bg-black/2 hover:border-black/12 hover:bg-black/3",
      )}
    >
      {/* Violet accent glow — appears on hover */}
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-violet-500/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
        aria-hidden="true"
      />

      <div className="relative flex items-center gap-3">
        {/* Avatar */}
        <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-full ring-1 ring-violet-500/30">
          <img src="/avatar.png" alt="Harshit Sharma" className="h-full w-full object-cover" />
        </div>

        {/* Info */}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className={cn("truncate text-[12px] font-semibold leading-tight", isDark ? "text-white/80" : "text-black/75")}>
            Harshit Sharma
          </div>
          <div className={cn("truncate text-[11px] leading-tight", isDark ? "text-white/35" : "text-black/40")}>
            IIT Bombay
          </div>
        </div>

        {/* Social icons — absolutely positioned, slide in on hover so they don't affect layout */}
        <div className="absolute right-0 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {socials.map(({ href, icon, label, delay, hoverColor }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              title={label}
              aria-label={label}
              style={{ transitionDelay: delay }}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-[7px] border transition-all duration-200",
                "translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100",
                "active:scale-90",
                isDark
                  ? `border-white/8 bg-[#111117] text-white/35 ${hoverColor}`
                  : `border-black/8 bg-white text-black/35 ${hoverColor}`,
              )}
            >
              {icon}
            </a>
          ))}
        </div>
      </div>

      {/* Tagline + byline */}
      <div className="mt-2 flex flex-col gap-0.5">
        <div className={cn("text-[10px] font-medium italic tracking-wide", isDark ? "text-white/30" : "text-black/35")}>
          Powered by late-night commits.
        </div>
        <div className={cn("text-[10px] tracking-wide", isDark ? "text-white/22" : "text-black/28")}>
          created by <span className={cn("font-semibold", isDark ? "text-white/35" : "text-black/45")}>Harshit Sharma</span>
        </div>
      </div>
    </div>
  );
}
