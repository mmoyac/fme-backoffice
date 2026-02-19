import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primario, rgb(94, 200, 242))',
          dark: 'var(--color-primario-dark, rgb(69, 162, 154))',
        },
        secondary: {
          DEFAULT: 'var(--color-secundario, rgb(69, 162, 154))',
        },
        accent: {
          DEFAULT: 'var(--color-acento, rgb(218, 165, 32))',
        },
      },
    },
  },
  plugins: [],
}
export default config
