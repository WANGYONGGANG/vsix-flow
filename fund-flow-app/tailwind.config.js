/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
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
