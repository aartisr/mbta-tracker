/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      borderRadius: {
        '2.5xl': '1.25rem'
      },
      lineHeight: {
        '1.5': '1.5'
      },
      spacing: {
        '1.2': '0.3rem'
      }
    }
  },
  plugins: []
};
