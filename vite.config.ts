import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
/*
 * The shop's departments, listed here rather than imported from src/. The
 * config is compiled with Node's module resolution and importing app code
 * drags Vite's browser types in with it. These slugs are the site's own
 * routes and change about never; a department missing from the sitemap is
 * harmless anyway, since the department pages link to everything.
 */
const DEPARTMENTS = {
  firearms: ['centrefire', 'rimfire', 'shotguns', 'air-rifles', 'handguns', 'used'],
  gear: [
    'ammunition',
    'optics',
    'reloading',
    'storage',
    'hunting',
    'gun-care',
    'targets',
    'lighting',
    'parts',
  ],
}

/**
 * Writes sitemap.xml at build time.
 *
 * Generated rather than checked in, because the base path and the domain both
 * change when the shop moves to fisherfirearms.com.au, and a sitemap listing
 * the wrong URLs is worse than none. Product pages are deliberately left out —
 * they turn over constantly and the department pages link to all of them.
 */
function sitemap(): Plugin {
  return {
    name: 'shop-sitemap',
    apply: 'build',
    generateBundle(_options, bundle) {
      const origin = (process.env.VITE_SITE_URL ?? 'https://kampm-05.github.io').replace(/\/$/, '')
      const base = (process.env.VITE_BASE ?? '/').replace(/\/$/, '')

      const paths = [
        '/',
        '/firearms',
        ...DEPARTMENTS.firearms.map((slug) => `/firearms/${slug}`),
        '/gear',
        ...DEPARTMENTS.gear.map((slug) => `/gear/${slug}`),
        '/about',
        '/contact',
        '/gift-certificates',
      ]

      const urls = paths
        .map((p) => `  <url><loc>${origin}${base}${p === '/' ? '/' : p}</loc></url>`)
        .join('\n')

      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
      })
      void bundle
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  /*
   * GitHub Pages serves project sites from /<repo>/, so the build needs a base
   * path. The deploy workflow sets VITE_BASE; local dev and a custom domain
   * both stay at the root.
   */
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), tailwindcss(), sitemap()],
  server: { port: 5180 },
})
