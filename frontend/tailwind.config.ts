import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      colors: {
        accent: "#7c6cf8",
        // shadcn-compatible tokens — backed by CSS variables so opacity modifiers work
        primary: "rgb(var(--primary) / <alpha-value>)",
        secondary: "rgb(var(--secondary) / <alpha-value>)",
        background: "rgb(var(--background) / <alpha-value>)",
        ring: "rgb(var(--ring) / <alpha-value>)",
        border: "rgb(var(--border-color) / <alpha-value>)",
        input: "rgb(var(--border-color) / <alpha-value>)",
        popover: "rgb(var(--popover) / <alpha-value>)",
        "popover-foreground": "rgb(var(--popover-foreground) / <alpha-value>)",
        "muted-foreground": "rgb(var(--muted-foreground) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
      },
      animation: {
        "glow-slow":    "glow 2.5s ease-in-out infinite",
        "bounce-drop":  "bounceDrop 0.8s ease",
      },
      keyframes: {
        glow: {
          "0%, 100%": { boxShadow: "0 0 8px rgba(124,108,248,0.6)"  },
          "50%":       { boxShadow: "0 0 20px rgba(124,108,248,0.9)" },
        },
        bounceDrop: {
          "0%":   { transform: "translateY(0)"     },
          "50%":  { transform: "translateY(-10px)" },
          "100%": { transform: "translateY(0)"     },
        },
      },
    },
  },
  plugins: [],
};

export default config;
