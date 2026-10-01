import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#08090a",
        surface: { DEFAULT: "#0e0f11", raised: "#141518" },
        line: "rgba(255,255,255,0.08)",
        accent: { DEFAULT: "#7c83ff", soft: "#a5a9ff", glow: "rgba(124,131,255,0.35)" },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Inter", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      keyframes: {
        shimmer: { "0%": { backgroundPosition: "200% 0" }, "100%": { backgroundPosition: "-200% 0" } },
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } },
      },
      animation: { shimmer: "shimmer 3s linear infinite", float: "float 6s ease-in-out infinite" },
    },
  },
  plugins: [],
};

export default config;
