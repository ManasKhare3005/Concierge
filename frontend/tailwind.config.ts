import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#f8fafc",
        ink: "#020617",
        primary: "#0f4f4c",
        accent: "#059669",
        warning: "#d97706",
        danger: "#e11d48"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"]
      },
      borderRadius: {
        shell: "28px"
      },
      boxShadow: {
        glass: "0 8px 30px rgb(0 0 0 / 0.06)"
      }
    }
  },
  plugins: []
};

export default config;
