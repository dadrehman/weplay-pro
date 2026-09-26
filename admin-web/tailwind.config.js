/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        darkBg: '#0b0c10',
        cardBg: '#151722',
        borderCol: '#232736',
        neonPurple: '#8B5CF6',
        neonPink: '#EC4899',
        neonCyan: '#06B6D4',
        goldAccent: '#F59E0B',
      },
    },
  },
  plugins: [],
};
