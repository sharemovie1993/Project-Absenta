/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary, #2563EB)',
          foreground: 'var(--color-primary-foreground, #FFFFFF)'
        },
        secondary: {
          DEFAULT: 'var(--color-secondary, #64748B)',
          foreground: 'var(--color-secondary-foreground, #FFFFFF)'
        },
        accent: {
          DEFAULT: 'var(--color-accent, #F59E0B)',
          foreground: 'var(--color-accent-foreground, #111827)'
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      borderRadius: {
        'sm': '2px',
        DEFAULT: '4px',
        'md': '6px',
        'lg': '8px',
        'xl': '10px',
        '2xl': '12px',
        '3xl': '14px',
        'full': '9999px',
      }
    }
  },
}
