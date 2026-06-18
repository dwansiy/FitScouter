import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Relative assets work both at / and at GitHub Pages' /repository-name/ path.
  base: './',
  plugins: [react()],
})
