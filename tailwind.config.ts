import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Giftty brand palette v2 — minimal, sage/forest-green + warm tan/amber
        // (moodboard: 6D9773 / 0C3B2E / BB8A52 / FFBA00)
        maroon: {
          DEFAULT: "#0C3B2E",
          light: "#1C5A45",
          dark: "#082922",
        },
        gold: {
          DEFAULT: "#FFBA00",
          light: "#FFD24D",
        },
        cream: "#F5F3EC",
        mint: {
          DEFAULT: "#6D9773",
          light: "#9BB99F",
          dark: "#4F7355",
        },
        tan: {
          DEFAULT: "#BB8A52",
          light: "#D3AD82",
          dark: "#96693A",
        },
      },
      fontFamily: {
        script: ["'Dancing Script'", "cursive"],
        heading: ["'Playfair Display'", "serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
