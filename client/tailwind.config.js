/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        /* Primary brand — violet (matches the reference UI) */
        brand: {
          50:  '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          950: '#2e1065',
        },
        /* Sidebar canvas — near-black with purple undertone */
        sidebar: {
          bg:       '#0d0c1a',
          surface:  '#13112a',
          border:   '#1e1b38',
          label:    '#a78bfa',   /* violet-400 */
          text:     '#9ca3af',   /* gray-400  */
          'text-active': '#ffffff',
        },
        /* Accent — fuchsia / pink */
        accent: {
          50:  '#fdf4ff',
          100: '#fae8ff',
          200: '#f5d0fe',
          300: '#f0abfc',
          400: '#e879f9',
          500: '#d946ef',
          600: '#c026d3',
          700: '#a21caf',
          800: '#86198f',
          900: '#701a75',
        },
      },
      boxShadow: {
        'soft':        '0 1px 2px 0 rgba(15, 23, 42, 0.04), 0 1px 3px 0 rgba(15, 23, 42, 0.06)',
        'soft-md':     '0 2px 4px -1px rgba(15, 23, 42, 0.05), 0 4px 12px -2px rgba(15, 23, 42, 0.07)',
        'soft-lg':     '0 4px 6px -2px rgba(15, 23, 42, 0.04), 0 12px 24px -4px rgba(15, 23, 42, 0.09)',
        'soft-xl':     '0 10px 15px -3px rgba(15, 23, 42, 0.06), 0 20px 40px -8px rgba(15, 23, 42, 0.12)',
        'glow-brand':  '0 0 0 1px rgba(139, 92, 246, 0.18), 0 8px 24px -8px rgba(139, 92, 246, 0.50)',
        'glow-sm':     '0 0 16px -4px rgba(139, 92, 246, 0.40)',
        'glow-pill':   '0 4px 20px -4px rgba(109, 40, 217, 0.60)',
        'inner-soft':  'inset 0 1px 2px 0 rgba(15, 23, 42, 0.06)',
      },
      backgroundImage: {
        'gradient-brand':   'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #d946ef 100%)',
        'gradient-pill':    'linear-gradient(135deg, #6d28d9 0%, #7c3aed 60%, #8b5cf6 100%)',
        'gradient-mesh':    'radial-gradient(at 0% 0%, rgba(139, 92, 246, 0.08) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(217, 70, 239, 0.06) 0px, transparent 50%)',
        'gradient-sidebar': 'linear-gradient(180deg, #0d0c1a 0%, #100e22 100%)',
      },
      animation: {
        'fade-in':       'fadeIn 0.3s ease-out',
        'fade-in-up':    'fadeInUp 0.4s ease-out',
        'slide-in':      'slideIn 0.25s ease-out',
        'slide-in-right':'slideInRight 0.3s ease-out',
        'scale-in':      'scaleIn 0.2s ease-out',
        'shimmer':       'shimmer 2s linear infinite',
        'pulse-slow':    'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-glow':    'pulseGlow 2.5s ease-in-out infinite',
        'float':         'float 4s ease-in-out infinite',
        'gradient':      'gradient 6s ease infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInUp: {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%':   { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInRight: {
          '0%':   { opacity: '0', transform: 'translateX(12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%':   { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(139, 92, 246, 0.4)' },
          '50%':      { boxShadow: '0 0 0 10px rgba(139, 92, 246, 0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-6px)' },
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%':      { backgroundPosition: '100% 50%' },
        },
      },
    },
  },
  plugins: [],
}
