import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#080808",
        primary:   { DEFAULT: "#7C3AED", hover: "#6D28D9" },
        secondary: "#A855F7",
        accent:    "#00E5FF",
        gold:      "#F5B942",
        success:   "#22C55E",
        danger:    "#EF4444",
      },
      boxShadow: {
        "glow-primary": "0 0 40px rgba(124,58,237,0.4)",
        "glow-accent":  "0 0 40px rgba(0,229,255,0.3)",
        "glow-gold":    "0 0 30px rgba(245,185,66,0.5)",
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "slide-up":   "slide-up 0.4s ease-out",
        "fade-in":    "fade-in 0.3s ease-out",
      },
      keyframes: {
        "pulse-glow": {
          "0%,100%": { boxShadow: "0 0 20px rgba(124,58,237,0.3)" },
          "50%":     { boxShadow: "0 0 60px rgba(124,58,237,0.7)" },
        },
        "slide-up": {
          "0%":   { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
