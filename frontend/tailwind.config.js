/** @type {import('tailwindcss').Config} */
const withVar = (name) => `rgb(var(${name}) / <alpha-value>)`;

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Named `canvas`, not `base`, so Tailwind's `text-base` font size is not shadowed.
        canvas: withVar("--bg"),
        surface: {
          DEFAULT: withVar("--surface"),
          raised: withVar("--surface-raised"),
        },
        edge: {
          DEFAULT: withVar("--edge"),
          subtle: withVar("--edge-subtle"),
        },
        content: {
          primary: withVar("--text-1"),
          secondary: withVar("--text-2"),
          muted: withVar("--text-3"),
        },
        brand: {
          DEFAULT: withVar("--brand"),
          light: withVar("--brand-light"),
          dim: withVar("--brand-dim"),
        },
        cloud: {
          aws: "#ff9900",
          azure: "#0078d4",
          gcp: "#4285f4",
          oci: "#c74634",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        caption: ["11px", { lineHeight: "1.4" }],
        small: ["12px", { lineHeight: "1.5" }],
        code: ["13px", { lineHeight: "1.5" }],
        body: ["14px", { lineHeight: "1.6" }],
      },
      keyframes: {
        fadeSlideUp: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          from: { opacity: "0", transform: "translateX(32px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        processingRing: {
          "0%, 100%": { boxShadow: "0 0 0 2px rgb(var(--brand))" },
          "50%": { boxShadow: "0 0 0 4px rgb(var(--brand))" },
        },
        shimmer: { "100%": { transform: "translateX(100%)" } },
        dash: { to: { strokeDashoffset: "-16" } },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.45" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "fade-slide-up": "fadeSlideUp 220ms cubic-bezier(0.16,1,0.3,1)",
        "slide-in-right": "slideInRight 150ms ease-out",
        "scale-in": "scaleIn 140ms cubic-bezier(0.16,1,0.3,1)",
        processing: "processingRing 1.5s ease-in-out infinite",
        shimmer: "shimmer 1.6s infinite",
        dash: "dash 0.7s linear infinite",
        float: "float 4s ease-in-out infinite",
        "pulse-glow": "pulseGlow 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
