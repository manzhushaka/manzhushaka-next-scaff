import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DejaVu Sans', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
        serif: ['DejaVu Serif', 'Songti SC', 'serif'],
        mono: ['JetBrains Mono', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [animate],
};

export default config;
