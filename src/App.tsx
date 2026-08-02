import { lazy, Suspense, useEffect } from 'react'
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
import ErrorBoundary from './components/ErrorBoundary'
import NotFound from './components/NotFound'

// The shop's back office — its own chunk, never shipped to customers who
// don't visit /admin.
const AdminShell = lazy(() => import('./admin/AdminShell'))
import FirearmCategory from './pages/FirearmCategory'
import Gear from './pages/Gear'
import Contact from './pages/Contact'
import { EASE } from './lib/motion'

/** Reset scroll on navigation, but honour in-page anchors like /firearms#rimfire. */
function ScrollManager() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) {
      /*
       * querySelector throws SyntaxError on anything that isn't a valid
       * selector — '#1', '#2024', '#!/old-path' — and an inbound link from the
       * old site is enough to blank the entire page. A hash we can't read is
       * not worth a crash; scroll to the top instead.
       */
      try {
        const el = document.querySelector(hash)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
          return
        }
      } catch {
        // Not a selector we can use — fall through to the top of the page.
      }
    }
    window.scrollTo({ top: 0 })
  }, [pathname, hash])

  return null
}

export default function App() {
  const location = useLocation()

  /*
   * The admin panel is a different application wearing the same paint: its own
   * full-height chrome, no shop header, footer or cart. Rendering it outside
   * the customer layout keeps the two from interfering.
   */
  // Exact match or a child path only — a plain startsWith would also swallow
  // a customer page called /administrator or /admin-guide.
  const isAdmin =
    location.pathname === '/admin' || location.pathname.startsWith('/admin/')

  if (isAdmin) {
    return (
      <ErrorBoundary>
        <Suspense
          fallback={
            <div className="grid min-h-dvh place-items-center">
              <p className="font-mono text-sm tracking-widest text-steel-500 uppercase">
                Loading…
              </p>
            </div>
          }
        >
          <AdminShell />
        </Suspense>
      </ErrorBoundary>
    )
  }

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

      {/* tabIndex makes <main> a focus target, so "Skip to content" actually
          moves the keyboard here instead of leaving it in the header. */}
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.32, ease: EASE }}
          >
            {/* Keyed by route, so navigating away from a page that threw
                clears the fallback by itself. */}
            <ErrorBoundary>
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
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ErrorBoundary>
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer />
      <CartDrawer />
    </div>
  )
}
