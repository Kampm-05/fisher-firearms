import { useEffect, useState } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Phone, ShoppingBag } from 'lucide-react'
import { business } from '../data/site'
import { EASE } from '../lib/motion'
import { useCart } from '../cart/CartContext'
import logo from '../assets/ffa-logo.png'

const NAV = [
  { to: '/firearms', label: 'Firearms' },
  { to: '/gear', label: 'Ammo & Gear' },
  { to: '/gift-certificates', label: 'Gift Cards' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Visit Us' },
]

function CartButton({ className = '' }: { className?: string }) {
  const { count, openCart } = useCart()
  return (
    <button
      type="button"
      onClick={openCart}
      aria-label={count ? `Open cart, ${count} items` : 'Open cart'}
      className={`relative grid h-11 w-11 place-items-center rounded-sm border border-steel-700 text-steel-200 transition-colors hover:border-brass-500 hover:text-brass-300 ${className}`}
    >
      <ShoppingBag className="h-5 w-5" aria-hidden="true" />
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-brass-400 px-1 font-mono text-[0.65rem] font-600 text-void">
          {count}
        </span>
      )}
    </button>
  )
}

function Wordmark() {
  return (
    <Link to="/" className="flex items-center" aria-label={`${business.name} — home`}>
      <img
        src={logo}
        alt={business.name}
        width={153}
        height={119}
        className="h-11 w-auto sm:h-12"
      />
    </Link>
  )
}

export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close the mobile drawer whenever the route changes.
  useEffect(() => setOpen(false), [location.pathname])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled || open
          ? 'border-b border-steel-800 bg-void/85 backdrop-blur-xl'
          : 'border-b border-transparent'
      }`}
    >
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-6 px-5 sm:px-8">
        <Wordmark />

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className="relative rounded px-4 py-2 font-display text-sm font-500 tracking-[0.12em] uppercase transition-colors"
            >
              {({ isActive }) => (
                <>
                  <span
                    className={
                      isActive
                        ? 'text-brass-300'
                        : 'text-steel-300 hover:text-steel-100'
                    }
                  >
                    {item.label}
                  </span>
                  {isActive && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute inset-x-3 -bottom-px h-0.5 bg-brass-400"
                      transition={{ duration: 0.35, ease: EASE }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={business.phoneHref}
            className="hidden items-center gap-2 rounded-sm border border-brass-500/50 bg-brass-500/10 px-4 py-2.5 font-display text-sm font-600 tracking-[0.1em] text-brass-300 uppercase transition-colors duration-200 hover:bg-brass-500/20 lg:flex"
          >
            <Phone className="h-4 w-4" aria-hidden="true" />
            {business.phone}
          </a>

          <CartButton />

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="grid h-11 w-11 place-items-center rounded-sm border border-steel-700 text-steel-200 transition-colors hover:border-brass-500 hover:text-brass-300 lg:hidden"
          >
            {open ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            aria-label="Mobile"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden border-t border-steel-800 lg:hidden"
          >
            <ul className="flex flex-col px-5 py-2">
              {NAV.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      `block border-b border-steel-800/70 py-4 font-display text-lg tracking-[0.1em] uppercase ${
                        isActive ? 'text-brass-300' : 'text-steel-200'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
              <li>
                <a
                  href={business.phoneHref}
                  className="flex items-center gap-2 py-4 font-display text-lg tracking-[0.1em] text-brass-300 uppercase"
                >
                  <Phone className="h-5 w-5" aria-hidden="true" />
                  {business.phone}
                </a>
              </li>
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}
