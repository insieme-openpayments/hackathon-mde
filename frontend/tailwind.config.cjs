/* eslint-disable @typescript-eslint/no-require-imports */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}', './index.html'],
  theme: {
    extend: {
      colors: {
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
          'Roboto',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'sans-serif'
        ],
        btn: ['Figtree', 'Roboto', 'sans-serif']
      },
      fontSize: {
        '3xs': ['8px', '1.1'],
        '2xs': ['10px', '1.1']
      },
      boxShadow: {
        soft: '0 3px 3px rgba(2, 37, 62, 0.08)',
        medium: '0 8px 10px rgba(2, 37, 62, 0.1)',
        card: '0 20px 50px rgba(21, 26, 36, 0.18)',
        sheet: '0 -3px 3px rgba(61, 75, 102, 0.05)'
      },
      borderRadius: {
        pill: '100px'
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
