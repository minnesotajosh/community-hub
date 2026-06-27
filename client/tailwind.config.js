/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff', 100: '#d9eaff', 500: '#2f7be0', 600: '#1f63bd', 700: '#194f96',
        },
      },
    },
  },
  plugins: [],
};
