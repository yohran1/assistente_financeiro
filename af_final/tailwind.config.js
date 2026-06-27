/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50:'#f0f4ff', 100:'#e0e9ff', 200:'#c0d2ff',
          300:'#93b4ff', 400:'#6090ff', 500:'#3d6fff',
          600:'#2050f0', 700:'#1840d0', 800:'#1535a8', 900:'#0f2680',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system','BlinkMacSystemFont','"SF Pro Display"','"SF Pro Text"',
          '"Segoe UI"','"Helvetica Neue"','Arial','sans-serif',
        ],
        mono: [
          '"SF Mono"','"Fira Code"','"Fira Mono"','"Roboto Mono"',
          'ui-monospace','SFMono-Regular','Menlo','Monaco','Consolas','monospace',
        ],
      },
      animation: {
        'fade-in':     'fadeIn 0.3s ease both',
        'slide-up':    'slideUp 0.3s cubic-bezier(0.16,1,0.3,1) both',
        'slide-right': 'slideInRight 0.25s cubic-bezier(0.16,1,0.3,1) both',
        'spin-slow':   'spin 0.9s linear infinite',
        'bounce-dot':  'bounceDot 1.2s ease-in-out infinite',
        'shimmer':     'shimmer 1.5s infinite',
        'pulse-slow':  'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
      },
      keyframes: {
        fadeIn:       { from:{ opacity:'0' }, to:{ opacity:'1' } },
        slideUp:      { from:{ opacity:'0', transform:'translateY(16px)' }, to:{ opacity:'1', transform:'translateY(0)' } },
        slideInRight: { from:{ opacity:'0', transform:'translateX(16px)' }, to:{ opacity:'1', transform:'translateX(0)' } },
        shimmer:      { '0%':{ backgroundPosition:'-200% 0' }, '100%':{ backgroundPosition:'200% 0' } },
        bounceDot: {
          '0%,80%,100%': { transform:'scale(0.8)', opacity:'0.5' },
          '40%':          { transform:'scale(1)',   opacity:'1'   },
        },
      },
      screens: {
        xs: '375px', // iPhone SE
      },
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-top':    'env(safe-area-inset-top)',
      },
      height: {
        dvh: '100dvh',
      },
      minHeight: {
        dvh: '100dvh',
      },
    },
  },
  plugins: [],
}
