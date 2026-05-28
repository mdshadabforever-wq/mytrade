import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        terminal: {
          bg: "#050508",
          surface: "#0d1117",
          border: "#21262d",
          amber: "#f0a500",
          gold: "#f0a500",
          green: "#00e5a0",
          red: "#ff3a3a",
          neutral: "#8892a4",
        },
      },
      fontFamily: {
        mono: ["var(--font-ibm-plex-mono)", "monospace"],
        sans: ["var(--font-ibm-plex-sans)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
