/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        nord: {
          darkest: '#2E3440',
          darker: '#3B4252',
          dark: '#434C5E',
          neutral: '#D8DEE9',
          light: '#E5E9F0',
          lightest: '#ECEFF4',
          teal: '#008080',
          red: '#BF616A',
          green: '#A3BE8C',
          blue: '#81A1C1',
        }
      }
    },
  },
  plugins: [],
}
