import type { Config } from "tailwindcss"

export default {
  content: ["./index.html", "./src/**/*.{vue,ts}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--corvus-font)", "system-ui", "sans-serif"],
        mono: ["var(--corvus-font-mono)", "monospace"],
      },
      boxShadow: {
        panel: "0 10px 30px rgba(15, 23, 42, 0.14)",
      },
    },
  },
} satisfies Config
