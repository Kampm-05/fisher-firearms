import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { CartProvider } from './cart/CartContext'
import './index.css'
import App from './App.tsx'

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
