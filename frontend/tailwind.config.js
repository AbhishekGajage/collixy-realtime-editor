/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#EDF1FE',
          dark: '#1a1a2e',
        },
      },
      fontFamily: {
        primary: "var(--font-primary)",
        brand: "var(--font-brand)",
      },
    },
  },
  plugins: [],
};
