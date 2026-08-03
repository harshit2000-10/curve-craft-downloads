import React from "react";

// ── Glass Button (button element — drop-in replacement for <button>) ───────────

interface GlassBtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  wrapperClassName?: string;
}

export const GlassBtn = React.forwardRef<HTMLButtonElement, GlassBtnProps>(
  (
    {
      children,
      className = "",
      style = {},
      wrapperClassName = "inline-flex items-center gap-1.5",
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      className={`group relative overflow-hidden ${className}`}
      style={{ transitionTimingFunction: "cubic-bezier(0.175, 0.885, 0.32, 2.2)", ...style }}
      {...props}
    >
      {/* Neon top glow */}
      <span className="pointer-events-none absolute inset-x-0 inset-y-0 mx-auto h-px w-3/4 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-0 transition-all duration-500 ease-in-out group-hover:opacity-100" />
      {/* Content */}
      <span className={`relative ${wrapperClassName}`}>{children}</span>
      {/* Neon bottom glow */}
      <span className="pointer-events-none absolute -bottom-px inset-x-0 mx-auto h-px w-3/4 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-0 transition-all duration-500 ease-in-out group-hover:opacity-30" />
    </button>
  ),
);
GlassBtn.displayName = "GlassBtn";

// ── SVG Filter (render once in the app, e.g. inside App.tsx) ──────────────────

export const GlassFilter: React.FC = () => (
  <svg style={{ display: "none" }} aria-hidden="true">
    <defs>
      <filter
        id="glass-distortion"
        x="0%"
        y="0%"
        width="100%"
        height="100%"
        filterUnits="objectBoundingBox"
      >
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.001 0.005"
          numOctaves="1"
          seed="17"
          result="turbulence"
        />
        <feComponentTransfer in="turbulence" result="mapped">
          <feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5" />
          <feFuncG type="gamma" amplitude="0" exponent="1" offset="0" />
          <feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5" />
        </feComponentTransfer>
        <feGaussianBlur in="turbulence" stdDeviation="3" result="softMap" />
        <feSpecularLighting
          in="softMap"
          surfaceScale="5"
          specularConstant="1"
          specularExponent="100"
          lightingColor="white"
          result="specLight"
        >
          <fePointLight x="-200" y="-200" z="300" />
        </feSpecularLighting>
        <feComposite
          in="specLight"
          operator="arithmetic"
          k1="0"
          k2="1"
          k3="1"
          k4="0"
          result="litImage"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="softMap"
          scale="200"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </defs>
  </svg>
);
