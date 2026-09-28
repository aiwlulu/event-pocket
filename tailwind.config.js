/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#172033',
        muted: '#718096',
        line: '#e7ebf2',
        canvas: '#f5f7fb',
        brand: '#3478f6',
      },
      boxShadow: {
        card: '0 8px 24px rgba(24, 42, 74, 0.06)',
      },
    },
  },
  plugins: [],
}
