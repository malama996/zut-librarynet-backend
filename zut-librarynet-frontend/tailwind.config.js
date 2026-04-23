/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f4f9',
          100: '#dbe4f0',
          200: '#b7cae1',
          300: '#93b0d2',
          400: '#6f96c3',
          500: '#4b7cb4',
          600: '#3d6599',
          700: '#2f4e7e',
          800: '#213763',
          900: '#1e3a5f',
        },
        secondary: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        success: {
          light: '#d1fae5',
          main: '#10b981',
          dark: '#047857',
        },
        error: {
          light: '#fee2e2',
          main: '#ef4444',
          dark: '#dc2626',
        },
        warning: {
          light: '#fef3c7',
          main: '#f59e0b',
          dark: '#d97706',
        },
        info: {
          light: '#dbeafe',
          main: '#3b82f6',
          dark: '#1d4ed8',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', '"Roboto"', 'sans-serif'],
        mono: ['"Fira Code"', '"Monaco"', '"Courier New"', 'monospace'],
      },
      borderRadius: {
        base: '0.375rem',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        dropdown: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        modal: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        sticky: '0 1px 3px 0 rgba(0, 0, 0, 0.08)',
      },
      spacing: {
        base: '8px',
      },
    },
  },
  plugins: [],
}
