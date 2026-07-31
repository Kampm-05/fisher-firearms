import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Header from './components/Header'
import Footer from './components/Footer'
import Home from './pages/Home'
import Firearms from './pages/Firearms'
import GearCategory from './pages/GearCategory'
import ProductDetail from './pages/ProductDetail'
import Checkout from './pages/Checkout'
import OrderConfirmed from './pages/OrderConfirmed'
import About from './pages/About'
import GiftCertificates from './pages/GiftCertificates'
import CartDrawer from './cart/CartDrawer'
import FirearmCategory from './pages/FirearmCategory'
import Gear from './pages/Gear'
import Contact from './pages/Contact'
import { EASE } from './lib/motion'

/** Reset scroll on navigation, but honour in-page anchors like /firearms#rimfire. */
function ScrollManager() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
    }
    window.scrollTo({ top: 0 })
  }, [pathname, hash])

  return null
}

export default function App() {
  const location = useLocation()

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-100 focus:rounded-sm focus:bg-brass-400 focus:px-5 focus:py-3 focus:font-display focus:tracking-wide focus:text-void focus:uppercase"
      >
        Skip to content
      </a>

      <Header />
      <ScrollManager />

      <main id="main" className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.32, ease: EASE }}
          >
            <Routes location={location}>
              <Route path="/" element={<Home />} />
              <Route path="/firearms" element={<Firearms />} />
              <Route path="/firearms/:slug" element={<FirearmCategory />} />
              <Route path="/gear" element={<Gear />} />
              <Route path="/gear/:slug" element={<GearCategory />} />
              <Route path="/product/:slug" element={<ProductDetail />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/order-confirmed" element={<OrderConfirmed />} />
              <Route path="/about" element={<About />} />
              <Route path="/gift-certificates" element={<GiftCertificates />} />
              <Route path="/contact" element={<Contact />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer />
      <CartDrawer />
    </div>
  )
}
