import { tailwindTokens } from './src/design/tokens.js';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors:                    tailwindTokens.colors,
      borderRadius:              tailwindTokens.borderRadius,
      boxShadow:                 tailwindTokens.boxShadow,
      fontFamily:                tailwindTokens.fontFamily,
      fontSize:                  tailwindTokens.fontSize,
      transitionTimingFunction:  tailwindTokens.transitionTimingFunction,
      transitionDuration:        tailwindTokens.transitionDuration,
    },
  },
  plugins: [],
};
