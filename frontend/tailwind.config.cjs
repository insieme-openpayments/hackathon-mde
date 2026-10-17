/* eslint-disable @typescript-eslint/no-require-imports */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}', './index.html'],
  theme: {
    extend: {
      colors: {
        brand: {
          'DEFAULT': 'rgb(var(--brand) / <alpha-value>)',
          'hover': 'rgb(var(--brand-hover) / <alpha-value>)',
          'dark': 'rgb(var(--brand-dark) / <alpha-value>)',
          'darker': 'rgb(var(--brand-darker) / <alpha-value>)',
          'soft': 'rgb(var(--brand-soft) / <alpha-value>)',
          'soft-active': 'rgb(var(--brand-soft-active) / <alpha-value>)'
        },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          hover: 'rgb(var(--accent-hover) / <alpha-value>)',
          text: 'rgb(var(--accent-text) / <alpha-value>)'
        },
        allies: {
          DEFAULT: 'rgb(var(--allies) / <alpha-value>)',
          soft: 'rgb(var(--allies-soft) / <alpha-value>)'
        },
        blue: {
          'normal': 'rgb(var(--blue-normal) / <alpha-value>)',
          'hover': 'rgb(var(--blue-hover) / <alpha-value>)',
          'btn': 'rgb(var(--blue-btn) / <alpha-value>)',
          'darker': 'rgb(var(--blue-darker) / <alpha-value>)',
          'light-hover': 'rgb(var(--blue-light-hover) / <alpha-value>)',
          'light-active': 'rgb(var(--blue-light-active) / <alpha-value>)'
        },
        neutral: {
          'darker': 'rgb(var(--neutral-darker) / <alpha-value>)',
          'normal': 'rgb(var(--neutral-normal) / <alpha-value>)',
          'light-active': 'rgb(var(--neutral-light-active) / <alpha-value>)'
        },
        lime: {
          DEFAULT: 'rgb(var(--lime) / <alpha-value>)',
          hover: 'rgb(var(--lime-hover) / <alpha-value>)',
          text: 'rgb(var(--lime-text) / <alpha-value>)'
        },
        magenta: 'rgb(var(--magenta) / <alpha-value>)',
        success: {
          DEFAULT: 'rgb(var(--success) / <alpha-value>)',
          dark: 'rgb(var(--success-dark) / <alpha-value>)'
        },
        sheet: 'rgb(var(--sheet-bg) / <alpha-value>)',
        page: 'rgb(var(--page-bg) / <alpha-value>)',
        panel: 'rgb(var(--panel-bg) / <alpha-value>)',
        text01: 'rgb(var(--text-01) / <alpha-value>)'
      },
      fontFamily: {
        sans: [
          'Figtree',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'sans-serif'
        ],
        btn: ['Figtree', 'system-ui', 'sans-serif']
      },
      fontSize: {
        '3xs': ['11px', '1.2'],
        '2xs': ['12px', '1.25']
      },
      boxShadow: {
        soft: '0 2px 6px rgba(42, 10, 58, 0.08)',
        medium: '0 8px 20px rgba(42, 10, 58, 0.12)',
        card: '0 20px 50px rgba(42, 10, 58, 0.16)',
        sheet: '0 -6px 20px rgba(42, 10, 58, 0.12)'
      },
      borderRadius: {
        pill: '100px'
      },
      maxWidth: {
        app: '480px'
      },
      keyframes: {
        'screen-in': {
          from: { opacity: '0', transform: 'translateX(8px)' },
          to: { opacity: '1', transform: 'none' }
        },
        'sheet-up': {
          from: { transform: 'translateY(30px)' },
          to: { transform: 'none' }
        },
        'fc-pop': {
          from: { opacity: '0', transform: 'scale(.96)' },
          to: { opacity: '1', transform: 'none' }
        }
      },
      animation: {
        'screen-in': 'screen-in .22s ease-out',
        'sheet-up': 'sheet-up .25s ease-out',
        'fc-pop': 'fc-pop .18s ease-out'
      }
    }
  },
  plugins: [
    require('tailwindcss-animate'),
    require('@tailwindcss/forms')({ strategy: 'class' })
  ]
}
