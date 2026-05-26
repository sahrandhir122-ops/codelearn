/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#E8471A", dark: "#C93A12", light: "#FF6B3D" },
        bg: { DEFAULT: "#0A0A0F", card: "#111118", card2: "#16161F" },
        accent: { DEFAULT: "#F5B731", green: "#2ECC71", blue: "#3B82F6" },
      },
      fontFamily: {
        sans:    ["Inter", "sans-serif"],
        display: ["Plus Jakarta Sans", "sans-serif"],
      },
    },
  },
  plugins: [],
};
