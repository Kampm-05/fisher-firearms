import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Lock, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react'
import { MAX_QTY, useCart, type CartLine } from './CartContext'
import { formatPrice, productImage } from '../data/catalog'
import { EASE } from '../lib/motion'
import { notices } from '../data/site'

function Line({ line }: { line: CartLine }) {
  const { setQty, remove } = useCart()

  return (
    <li className="flex gap-3 py-4">
      <Link
        to={`/product/${line.slug}`}
        className="h-16 w-16 shrink-0 overflow-hidden rounded-sm border border-steel-800 bg-steel-950"
      >
        {line.image && (
          <img src={productImage(line.image)!} alt="" className="h-full w-full object-contain p-1" />
        )}
      </Link>

      <div className="min-w-0 flex-1">
        <Link
          to={`/product/${line.slug}`}
          className="line-clamp-2 text-sm leading-snug text-steel-100 hover:text-brass-300"
        >
          {line.name}
        </Link>
        <p className="mt-1 font-mono text-sm text-brass-300">
          {formatPrice(line.price)}
        </p>

        <div className="mt-2 flex items-center gap-2">
          <div className="flex items-center rounded-sm border border-steel-700">
            <button
              type="button"
              onClick={() => setQty(line.slug, line.qty - 1)}
              aria-label={`Decrease quantity of ${line.name}`}
              className="grid h-7 w-7 place-items-center text-steel-400 hover:text-brass-300"
            >
              <Minus className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <span className="w-7 text-center font-mono text-xs text-steel-200">
              {line.qty}
            </span>
            <button
              type="button"
              onClick={() => setQty(line.slug, line.qty + 1)}
              disabled={line.qty >= MAX_QTY}
              aria-label={`Increase quantity of ${line.name}`}
              className="grid h-7 w-7 place-items-center text-steel-400 hover:text-brass-300 disabled:cursor-not-allowed disabled:text-steel-700 disabled:hover:text-steel-700"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => remove(line.slug)}
            aria-label={`Remove ${line.name}`}
            className="grid h-7 w-7 place-items-center text-steel-500 hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </li>
  )
}

export default function CartDrawer() {
  const {
    isOpen, closeCart, lines, shipLines, reserveLines,
    shipTotal, reserveTotal, count, notice, dismissNotice,
  } = useCart()

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-90 bg-void/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={closeCart}
          />

          <motion.aside
            role="dialog"
            aria-label="Shopping cart"
            className="fixed inset-y-0 right-0 z-100 flex w-full max-w-md flex-col border-l border-steel-800 bg-steel-950 shadow-2xl"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            <header className="flex items-center justify-between border-b border-steel-800 px-5 py-4">
              <h2 className="flex items-center gap-2.5 font-display text-xl font-700 tracking-wide uppercase">
                <ShoppingBag className="h-5 w-5 text-brass-500" aria-hidden="true" />
                Your order
                {count > 0 && (
                  <span className="font-mono text-sm font-400 text-steel-400">
                    ({count})
                  </span>
                )}
              </h2>
              <button
                type="button"
                onClick={closeCart}
                aria-label="Close cart"
                className="grid h-9 w-9 place-items-center rounded-sm text-steel-400 hover:bg-steel-900 hover:text-steel-100"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </header>

            {notice && (
              <div className="flex items-start gap-3 border-b border-amber-900/50 bg-amber-950/30 px-5 py-3">
                <p className="flex-1 text-xs leading-relaxed text-amber-200">{notice}</p>
                <button
                  type="button"
                  onClick={dismissNotice}
                  aria-label="Dismiss this notice"
                  className="-mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-sm text-amber-300/70 hover:text-amber-100"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            )}

            {lines.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
                <ShoppingBag className="h-10 w-10 text-steel-700" aria-hidden="true" />
                <p className="text-steel-400">Your cart is empty.</p>
                <Link
                  to="/firearms"
                  onClick={closeCart}
                  className="text-brass-400 hover:text-brass-300"
                >
                  Browse the racks →
                </Link>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-5">
                  {shipLines.length > 0 && (
                    <section className="border-b border-steel-800/60 pb-2">
                      <h3 className="text-eyebrow flex items-center gap-2 pt-5">
                        <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
                        Ships to you
                      </h3>
                      <ul className="divide-y divide-steel-800/60">
                        {shipLines.map((l) => (
                          <Line key={l.slug} line={l} />
                        ))}
                      </ul>
                    </section>
                  )}

                  {reserveLines.length > 0 && (
                    <section className="pb-2">
                      <h3 className="text-eyebrow flex items-center gap-2 pt-5">
                        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                        Collect in store
                      </h3>
                      <p className="mt-2 text-xs leading-relaxed text-steel-500">
                        Licensed items are reserved online and handed over in
                        store — they can't be posted.
                      </p>
                      <ul className="divide-y divide-steel-800/60">
                        {reserveLines.map((l) => (
                          <Line key={l.slug} line={l} />
                        ))}
                      </ul>
                    </section>
                  )}
                </div>

                <footer className="border-t border-steel-800 px-5 py-5">
                  <dl className="space-y-1.5 text-sm">
                    {shipLines.length > 0 && (
                      <div className="flex justify-between">
                        <dt className="text-steel-400">Shipped items</dt>
                        <dd className="font-mono text-steel-100">
                          {formatPrice(shipTotal)}
                        </dd>
                      </div>
                    )}
                    {reserveLines.length > 0 && (
                      <div className="flex justify-between">
                        <dt className="text-steel-400">Reserved in store</dt>
                        <dd className="font-mono text-steel-100">
                          {formatPrice(reserveTotal)}
                        </dd>
                      </div>
                    )}
                  </dl>

                  <Link
                    to="/checkout"
                    onClick={closeCart}
                    className="btn-primary mt-4 w-full justify-center"
                  >
                    Checkout
                  </Link>
                  <p className="mt-3 text-[0.7rem] leading-relaxed text-steel-600">
                    {notices.licence}
                  </p>
                </footer>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
