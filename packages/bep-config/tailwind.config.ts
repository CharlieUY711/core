import type { Config } from "tailwindcss";

const config: Omit<Config, "content"> = {
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#eeedfe",
          100: "#cecbf6",
          200: "#afa9ec",
          400: "#7f77dd",
          600: "#534ab7",
          800: "#3c3489",
          900: "#26215c",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        DEFAULT: "8px",
        lg: "12px",
        xl: "16px",
      },
    },
  },
};

export default config;
