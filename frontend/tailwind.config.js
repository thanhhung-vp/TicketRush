/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: { 50: '#eff6ff', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8' },
        primary: '#E6007E',
        secondary: '#00AEEF',
        navy: '#0A1221',
        // Dark mode surface colors
        dark: {
          bg:      '#0a1221',
          surface: '#111827',
          card:    '#1a2332',
          border:  '#1f2937',
        },
      },
    },
  },
  plugins: [],
};
