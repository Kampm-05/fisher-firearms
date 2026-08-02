import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { CartProvider } from './cart/CartContext'
import './index.css'
import App from './App.tsx'

/*
 * Clickjacking guard.
 *
 * The usual defences — X-Frame-Options, or CSP frame-ancestors — are response
 * headers, and GitHub Pages serves a fixed set with no way to add one. A CSP
 * in a meta tag covers everything else but browsers deliberately ignore
 * frame-ancestors there, so this is the remaining option: if the shop ever
 * finds itself inside somebody else's frame, climb out of it.
 *
 * The target that matters is /admin, where an invisible frame over the real
 * page could get the owner to click things they can't see. Retire this once
 * the custom domain is behind Cloudflare and the header can be set properly.
 */
if (window.top !== window.self) {
  try {
    window.top!.location.replace(window.self.location.href)
  } catch {
    // Reading a cross-origin frame's location throws even though navigating
    // it does not. If even that is blocked, show nothing rather than be used.
    document.documentElement.style.display = 'none'
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* basename keeps routing correct when served from /<repo>/ on Pages */}
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      {/*
        reducedMotion="user" drops transform/layout animation for anyone with
        the OS setting on, but keeps opacity — so content still fades in rather
        than being stranded at its `hidden` variant. The CSS media query can't
        do this on its own: Framer animates via JS, not CSS transitions.
      */}
      <MotionConfig reducedMotion="user">
        <CartProvider>
          <App />
        </CartProvider>
      </MotionConfig>
    </BrowserRouter>
  </StrictMode>,
)
