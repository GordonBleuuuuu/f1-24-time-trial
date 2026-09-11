import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: { f1: "#E10600", ink: "#0b0b10", panel: "#15151e" },
      fontFamily: { timing: ["var(--font-geist-mono)", "monospace"] },
    },
  },
  plugins: [],
};

export default config;
