/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#00C853',
          dark: '#009624',
          light: '#E8F5E9',
        },
        secondary: '#1A1A2E',
        accent: '#FF6B35',
        background: '#F5F5F5',
        surface: '#FFFFFF',
        'text-primary': '#1A1A2E',
        'text-secondary': '#6B7280',
        'text-muted': '#9CA3AF',
        'border-muted': '#E5E7EB',
        error: '#EF4444',
        warning: '#F59E0B',
        success: '#10B981',
      },
      fontFamily: {
        sans: ['"IBM Plex Sans Arabic"', '"Noto Sans Arabic"', 'sans-serif'],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(0,0,0,0.05)',
        md: '0 4px 6px rgba(0,0,0,0.07)',
        lg: '0 10px 15px rgba(0,0,0,0.1)',
      },
    },
  },
  plugins: [],
};
