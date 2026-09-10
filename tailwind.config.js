/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#050607',
          800: '#0B0F10',
          700: '#11171A',
          600: '#1A2125',
          500: '#222B30',
        },
        neon: {
          DEFAULT: '#7CFF00',
          bright: '#00FF88',
          dim: '#4d9c00',
        },
        flame: {
          DEFAULT: '#FF8A00',
          dim: '#b35a00',
        },
        bone: '#F5F5F5',
      },
      fontFamily: {
        display: ['"Orbitron"', 'system-ui', 'sans-serif'],
        body: ['"Rajdhani"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        neon: '0 0 12px rgba(124,255,0,0.45), 0 0 40px rgba(124,255,0,0.15)',
        'neon-sm': '0 0 8px rgba(124,255,0,0.4)',
        flame: '0 0 12px rgba(255,138,0,0.45), 0 0 40px rgba(255,138,0,0.15)',
        hud: 'inset 0 0 0 1px rgba(124,255,0,0.15), 0 8px 30px rgba(0,0,0,0.6)',
      },
      keyframes: {
        'gradient-pan': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        'border-trace': {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '200% 0%' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-glow': {
          '0%,100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'spin-slow': {
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'gradient-pan': 'gradient-pan 8s ease infinite',
        'border-trace': 'border-trace 3s linear infinite',
        float: 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2.5s ease-in-out infinite',
        scan: 'scan 3s linear infinite',
        shimmer: 'shimmer 1.5s infinite',
        'spin-slow': 'spin-slow 12s linear infinite',
      },
    },
  },
  plugins: [],
};
