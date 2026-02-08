import tailwindcssAnimate from "tailwindcss-animate"

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Brutalist palette */
        "brutal-body": "var(--bg-body)",
        "brutal-container": "var(--bg-container)",
        "brutal-section": "var(--bg-section)",
        "brutal-text": "var(--text-primary)",
        "brutal-button": "var(--button-bg)",
        "brutal-active": "var(--active)",
        "brutal-border": "var(--border)",
      },
      spacing: {
        xs: "var(--spacing-xs)",
        sm: "var(--spacing-sm)",
        md: "var(--spacing-md)",
        lg: "var(--spacing-lg)",
        xl: "var(--spacing-xl)",
        "2xl": "var(--spacing-2xl)",
        "3xl": "var(--spacing-3xl)",
        "4xl": "var(--spacing-4xl)",
        "5xl": "var(--spacing-5xl)",
      },
      borderRadius: {
        none: "0",
        DEFAULT: "0",
      },
      boxShadow: {
        "brutal-container": "var(--shadow-container)",
        "brutal-section": "var(--shadow-section)",
        "brutal-button": "var(--shadow-button-hover)",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "'Segoe UI'",
          "Roboto",
          "Oxygen",
          "Ubuntu",
          "Cantarell",
          "sans-serif",
        ],
      },
      fontSize: {
        xs: ["var(--text-xs)", { lineHeight: "1.5" }],
        sm: ["var(--text-sm)", { lineHeight: "1.5" }],
        base: ["var(--text-base)", { lineHeight: "1.5" }],
        lg: ["var(--text-lg)", { lineHeight: "1.4" }],
        xl: ["var(--text-xl)", { lineHeight: "1.4" }],
        "2xl": ["var(--text-2xl)", { lineHeight: "1.3" }],
        "3xl": ["var(--text-3xl)", { lineHeight: "1.2" }],
        "4xl": ["var(--text-4xl)", { lineHeight: "1.2" }],
        "5xl": ["var(--text-5xl)", { lineHeight: "1.1" }],
        "6xl": ["var(--text-6xl)", { lineHeight: "1.1" }],
        "7xl": ["var(--text-7xl)", { lineHeight: "1.05" }],
        "8xl": ["4.5rem", { lineHeight: "1.05" }],
      },
      maxWidth: {
        container: "1440px",
      },
    },
  },
  plugins: [tailwindcssAnimate],
}
