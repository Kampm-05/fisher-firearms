import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, Gift, ShoppingBag } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { useCart } from '../cart/CartContext'
import { rememberGiftNote } from '../cart/giftNote'
import { formatPrice, loadCategory, type Product } from '../data/catalog'
import { fadeUp, inView, stagger } from '../lib/motion'
import { business, notices } from '../data/site'

/**
 * Gift certificates are the one thing in the shop that is ordinary retail —
 * no licence, no permit, nothing regulated — so they are bought and paid for
 * online like anything else.
 *
 * They are real catalogue products rather than something assembled here. An
 * earlier version built the product in the browser, so the server had never
 * heard of the slug and refused the whole basket at checkout.
 */
const STEPS = [
  'Pick an amount and say who it is for.',
  'Pay by card at the checkout, the same as any other order.',
  'We post the certificate out, or hold it at the shop — whichever suits.',
  'They redeem it in store against anything we stock.',
]

export default function GiftCertificates() {
  const navigate = useNavigate()
  const { add, openCart } = useCart()

  const [certificates, setCertificates] = useState<Product[] | null>(null)
  const [chosen, setChosen] = useState<string | null>(null)
  const [recipient, setRecipient] = useState('')
  const [message, setMessage] = useState('')
  const [added, setAdded] = useState(false)

  useEffect(() => {
    let live = true
    loadCategory('gift-certificates')
      .then((rows) => live && setCertificates(rows))
      .catch(() => live && setCertificates([]))
    return () => {
      live = false
    }
  }, [])

  // Cheapest first reads better than the catalogue's alphabetical order, where
  // $100 lands ahead of $50.
  const sorted = [...(certificates ?? [])].sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
  const selected = sorted.find((c) => c.slug === chosen) ?? null

  function addToOrder(andCheckout: boolean) {
    if (!selected) return

    // A cart line has nowhere to carry the recipient, so it waits for the
    // checkout notes — which is where the shop actually reads it.
    const note = [
      `Gift certificate for: ${recipient || 'not given'}`,
      message ? `Message: ${message}` : null,
    ]
      .filter((line) => line)
      .join('\n')
    rememberGiftNote(note)

    add(selected)
    setAdded(true)
    setTimeout(() => setAdded(false), 2500)

    if (andCheckout) navigate('/checkout')
    else openCart()
  }

  return (
    <>
      <PageHeader
        eyebrow="Gift Certificates"
        title="Let them choose"
        lead="Hard to buy for a shooter? A Fisher Firearms certificate covers anything on the floor — rifle, glass, ammunition or a new safe."
      />

      <section className="mx-auto max-w-7xl px-5 pb-24 sm:px-8">
        <motion.div
          variants={stagger}
          {...inView}
          className="grid gap-12 lg:grid-cols-[1.1fr_1fr]"
        >
          <motion.div variants={fadeUp}>
            <h2 className="text-eyebrow flex items-center gap-2">
              <Gift className="h-3.5 w-3.5" aria-hidden="true" />
              Choose an amount
            </h2>

            {certificates === null ? (
              <p className="mt-6 text-steel-300">Loading…</p>
            ) : sorted.length === 0 ? (
              <p className="mt-6 text-steel-300">
                Gift certificates are available in store — ring the shop on{' '}
                <a href={business.phoneHref} className="text-brass-400 hover:text-brass-300">
                  {business.phone}
                </a>
                .
              </p>
            ) : (
              <>
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {sorted.map((certificate) => {
                    const active = certificate.slug === chosen
                    return (
                      <button
                        key={certificate.slug}
                        type="button"
                        onClick={() => setChosen(certificate.slug)}
                        aria-pressed={active}
                        className={`rounded-sm border px-4 py-5 font-display text-2xl font-700 tracking-wide transition-colors ${
                          active
                            ? 'border-brass-500 bg-brass-500/10 text-brass-200'
                            : 'border-steel-700 text-steel-200 hover:border-steel-500'
                        }`}
                      >
                        {formatPrice(certificate.price)}
                      </button>
                    )
                  })}
                </div>

                <div className="mt-6 space-y-4">
                  <label className="block">
                    <span className="mb-1.5 block text-sm text-steel-300">
                      Who is it for? <span className="text-steel-500">(optional)</span>
                    </span>
                    <input
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      className="field"
                      placeholder="Their name"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm text-steel-300">
                      A short message <span className="text-steel-500">(optional)</span>
                    </span>
                    <textarea
                      rows={3}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="field resize-y"
                      placeholder="Happy birthday, Dad…"
                    />
                  </label>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={!selected}
                    onClick={() => addToOrder(true)}
                    className="btn-primary"
                  >
                    {selected
                      ? `Buy the ${formatPrice(selected.price)} certificate`
                      : 'Pick an amount first'}
                  </button>
                  <button
                    type="button"
                    disabled={!selected}
                    onClick={() => addToOrder(false)}
                    className="btn-ghost"
                  >
                    <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                    Add to cart
                  </button>
                </div>

                {added && (
                  <p role="status" className="mt-4 flex items-center gap-2 text-sm text-brass-300">
                    <Check className="h-4 w-4" aria-hidden="true" />
                    Added to your order.
                  </p>
                )}

                <p className="mt-6 text-sm leading-relaxed text-steel-300">
                  After another amount? Ring the shop on{' '}
                  <a href={business.phoneHref} className="text-brass-400 hover:text-brass-300">
                    {business.phone}
                  </a>{' '}
                  and we'll sort it out.
                </p>
              </>
            )}
          </motion.div>

          <motion.aside variants={fadeUp} className="space-y-8">
            <div className="rounded-sm border border-steel-800 bg-steel-900/50 p-6">
              <h2 className="text-eyebrow">How it works</h2>
              <ol className="mt-4 space-y-4">
                {STEPS.map((step, i) => (
                  <li key={step} className="flex gap-4">
                    <span className="font-mono text-sm text-brass-500">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-steel-200">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-sm border border-steel-800 bg-steel-900/40 p-6">
              <h2 className="text-eyebrow">Worth knowing</h2>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-steel-300">
                <li>
                  Redeemable in store at {business.street}, {business.suburb}, against
                  anything we stock.
                </li>
                <li>
                  A certificate is not a licence. Firearms and ammunition are still
                  handed over only to a current SA licence holder, with a permit to
                  acquire where one is required.
                </li>
                <li>
                  Ring the shop if you would rather we held it at the counter for
                  collection than posted it out.
                </li>
              </ul>
              <p className="mt-5 text-xs leading-relaxed text-steel-400">{notices.pricing}</p>
            </div>
          </motion.aside>
        </motion.div>
      </section>
    </>
  )
}
