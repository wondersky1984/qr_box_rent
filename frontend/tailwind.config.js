/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        locker: {
          free: '#22c55e',
          held: '#fbbf24',
          occupied: '#ef4444',
          frozen: '#9ca3af',
          out: '#111827'
        }
      }
    },
  },
  plugins: [],
};
