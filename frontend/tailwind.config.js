/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        sahara: {
          50: '#fdf8f0',
          100: '#faefd9',
          200: '#f4d9a8',
          300: '#ecc06e',
          400: '#e4a43c',
          500: '#d4891f',
          600: '#b86d16',
          700: '#955215',
          800: '#7a4218',
          900: '#653718'
        }
      }
    }
  },
  plugins: []
};
