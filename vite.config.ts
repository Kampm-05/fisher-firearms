import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  /*
   * GitHub Pages serves project sites from /<repo>/, so the build needs a base
   * path. The deploy workflow sets VITE_BASE; local dev and a custom domain
   * both stay at the root.
   */
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), tailwindcss()],
  server: { port: 5180 },
})
