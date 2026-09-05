/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0a0a0f",
        surface: {
          DEFAULT: "#111118",
          raised: "#1a1a24",
        },
        edge: {
          DEFAULT: "#2a2a3a",
          subtle: "#1e1e2e",
        },
        content: {
          primary: "#f0f0f5",
          secondary: "#8b8ba0",
          muted: "#555568",
        },
        brand: {
          DEFAULT: "#6366f1",
          light: "#818cf8",
          dim: "#3730a3",
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
        processingRing: {
          "0%, 100%": { boxShadow: "0 0 0 2px #6366f1" },
          "50%": { boxShadow: "0 0 0 4px #6366f1" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-slide-up": "fadeSlideUp 200ms ease-out",
        "slide-in-right": "slideInRight 150ms ease-out",
        processing: "processingRing 1.5s ease-in-out infinite",
        shimmer: "shimmer 1.6s infinite",
      },
    },
  },
  plugins: [],
};
