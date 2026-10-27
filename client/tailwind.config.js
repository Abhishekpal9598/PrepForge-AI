/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          base: '#080B14',
          sidebar: '#0D1220',
          card: '#121A2B',
          elevated: '#182238',
        },
        brand: {
          primary: '#7657FF',
          'primary-hover': '#6544ea',
          secondary: '#3985FF',
          'secondary-hover': '#2470ea',
        },
        status: {
          success: '#22C98B',
          warning: '#F5B942',
          error: '#F16D78',
        },
        text: {
          primary: '#F5F7FF',
          secondary: '#929DB2',
        },
        border: {
          subtle: 'rgba(255, 255, 255, 0.08)',
          strong: 'rgba(255, 255, 255, 0.16)',
        },
      },
    },
  },
  plugins: [],
};
