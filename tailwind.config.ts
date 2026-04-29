import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        flame: {
          50:  "#fff4f1",
          100: "#ffe2da",
          400: "#ff7a5c",
          500: "#ff5a3c",
          600: "#e9442a",
          700: "#bd3220",
        },
        ink: {
          900: "#0e0a14",
          800: "#15101e",
          700: "#1f1830",
        },
      },
      fontFamily: {
        sans: ["system-ui", "ui-sans-serif", "sans-serif"],
        serif: ["ui-serif", "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 30px 60px -20px rgba(0,0,0,0.6)",
      },
    },
  },
  plugins: [],
};
export default config;
