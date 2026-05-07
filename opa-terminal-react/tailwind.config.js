/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        primary: {
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)',
          active: 'var(--primary-active)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: 'var(--secondary)',
        accent: 'var(--accent)',
        surface: {
          100: 'var(--surface-100)',
          200: 'var(--surface-200)',
          300: 'var(--surface-300)',
        },
        text: {
          main: 'var(--text-main)',
          muted: 'var(--text-muted)',
          inverse: 'var(--text-inverse)',
        },
        border: {
          DEFAULT: 'var(--border)',
          hover: 'var(--border-hover)',
        },
        danger: 'var(--danger)',
        // Aliases for legacy support
        glow: 'var(--primary)',
        'cyber-blue': 'var(--accent)',
        // Pokemon Specific (Retro aesthetic)
        pokemon: {
          dark: '#404040',
          light: '#f8f8f8',
          green: '#88c870',
          'green-dark': '#60a850',
          gold: '#d0a850',
          red: '#d05068',
          teal: '#48d0b0',
          gray: '#d0d0d0',
          purple: '#706880',
        }
      },
      boxShadow: {
        main: 'var(--shadow-main)',
        pop: 'var(--shadow-pop)',
      }
    },
  },
  plugins: [],
}
