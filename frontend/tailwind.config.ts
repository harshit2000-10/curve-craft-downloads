import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

const config: Config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'IBM Plex Sans'", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "monospace"],
      },
      borderRadius: {
        "4xl": "2rem",
      },
      colors: {
        // shadcn-compatible tokens
        accent:               "#7c5cff",
        primary:              "rgb(var(--primary) / <alpha-value>)",
        secondary:            "rgb(var(--secondary) / <alpha-value>)",
        background:           "rgb(var(--background) / <alpha-value>)",
        ring:                 "rgb(var(--ring) / <alpha-value>)",
        border:               "rgb(var(--border-color) / <alpha-value>)",
        input:                "rgb(var(--border-color) / <alpha-value>)",
        popover:              "rgb(var(--popover) / <alpha-value>)",
        "popover-foreground": "rgb(var(--popover-foreground) / <alpha-value>)",
        "muted-foreground":   "rgb(var(--muted-foreground) / <alpha-value>)",
        foreground:           "rgb(var(--foreground) / <alpha-value>)",
      },
      animation: {
        "glow-slow":   "glow 2.5s ease-in-out infinite",
        "bounce-drop": "bounceDrop 0.8s ease",
      },
      keyframes: {
        glow: {
          "0%, 100%": { boxShadow: "0 0 8px rgba(124,92,255,0.6)"  },
          "50%":      { boxShadow: "0 0 20px rgba(124,92,255,0.9)" },
        },
        bounceDrop: {
          "0%":   { transform: "translateY(0)"     },
          "50%":  { transform: "translateY(-10px)" },
          "100%": { transform: "translateY(0)"     },
        },
      },
    },
  },
  plugins: [
    // `hover-device:` — only applies on real pointers, so hover styles and rail
    // tooltips never stick after a tap on touch screens. Written as a named variant
    // because Tailwind can't parse the colon inside an inline `[@media(hover:hover)]:`
    // arbitrary variant — those silently compile to nothing.
    plugin(({ addVariant }) => {
      addVariant("hover-device", "@media (hover: hover) and (pointer: fine) { &:hover }");
      addVariant("group-hover-device", "@media (hover: hover) and (pointer: fine) { :merge(.group):hover & }");
    }),
  ],
};

export default config;
