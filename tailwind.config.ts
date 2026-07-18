import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Giftty brand palette (from v1 design system — carried forward, it worked well)
        maroon: {
          DEFAULT: "#7A1F2B",
          light: "#9A3A47",
          dark: "#5A1620",
        },
        gold: {
          DEFAULT: "#D4AF37",
          light: "#E5C868",
        },
        cream: "#F5EDE4",
        mint: {
          DEFAULT: "#A8E6CF",
          light: "#D4F5E9",
          dark: "#6FCBA3",
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
