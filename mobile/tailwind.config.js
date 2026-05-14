/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#1E3A8A",
        secondary: "#EF4444",
        background: "#F3F4F6",
        surface: "#FFFFFF",
        success: "#22C55E",
        warning: "#F97316",
        info: "#3B82F6",
        error: "#EF4444",
        "dark-grey": "#4B5563",
      },
      borderRadius: {
        card: 12,
        input: 8,
        button: 8,
      },
    },
  },
  plugins: [],
};
