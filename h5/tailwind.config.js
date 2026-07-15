/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        fund: {
          bg: 'var(--fund-bg)',
          fg: 'var(--fund-fg)',
          grid: 'var(--fund-grid)',
          up: 'var(--fund-up)',
          down: 'var(--fund-down)',
          card: 'var(--fund-card)',
          border: 'var(--fund-border)',
        },
      },
    },
  },
  plugins: [],
}