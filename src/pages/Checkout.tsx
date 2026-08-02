import { useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertCircle, CreditCard, Lock, ShoppingBag, Trash2 } from 'lucide-react'
import { useCart } from '../cart/CartContext'
import { forgetReserve, rememberReserve } from '../cart/reserveReference'
import { submitOrder, type OrderDetails } from '../cart/submitOrder'
import { CartError, createCheckout, createReserve, hasApi, type LineError } from '../lib/api'
import { formatPrice } from '../data/catalog'
import PageHeader from '../components/PageHeader'
import { fadeUp, inView } from '../lib/motion'
import { business, notices } from '../data/site'

export default function Checkout() {
  const navigate = useNavigate()
  const {
    lines, shipLines, reserveLines, shipTotal, reserveTotal, needsLicence,
    clear, remove, notice,
  } = useCart()

  const [details, setDetails] = useState<OrderDetails>({
    name: '', email: '', phone: '', licence: '', notes: '', fulfilment: 'pickup',
  })
  const [ack, setAck] = useState(false)
  const [busy, setBusy] = useState(false)
  const [lineErrors, setLineErrors] = useState<LineError[]>([])
  const [error, setError] = useState<string | null>(
    // Stripe sends the customer back here with ?cancelled=1 if they back out.
    new URLSearchParams(window.location.search).has('cancelled')
      ? 'Payment was cancelled — your cart is still here.'
      : null
  )

  /*
   * The reservation already lodged for this basket. Kept so that a card
   * payment failing halfway through a mixed order doesn't lodge a second
   * reservation for the same goods every time the customer tries again.
   */
  const lodged = useRef<{ key: string; reference: string } | null>(null)
  const reserveKey = reserveLines.map((l) => `${l.slug}:${l.qty}`).join(',')

  const set = <K extends keyof OrderDetails>(key: K, value: OrderDetails[K]) =>
    setDetails((d) => ({ ...d, [key]: value }))

  if (lines.length === 0) {
    return (
      <>
        <PageHeader eyebrow="Checkout" title="Your cart is empty" lead="" />
        <div className="mx-auto max-w-7xl px-5 pb-24 sm:px-8">
          <Link to="/firearms" className="btn-primary">
            Browse the racks
          </Link>
        </div>
      </>
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLineErrors([])
    setBusy(true)

    /*
     * With the shop's API live every order is recorded there, whatever is in
     * the basket. Licensed goods are lodged first and always: leaving them
     * until after the Stripe redirect means they are never lodged at all,
     * because the customer has left the page by then.
     *
     * The server re-prices every line and refuses anything licensed on the
     * payment call, so a tampered cart can't get through either route.
     */
    if (hasApi()) {
      try {
        // Whatever the last order left behind is not this one's.
        forgetReserve()

        if (reserveLines.length > 0 && lodged.current?.key !== reserveKey) {
          const { reference } = await createReserve({
            lines: reserveLines.map((l) => ({ slug: l.slug, qty: l.qty })),
            customer: { ...details },
          })
          lodged.current = { key: reserveKey, reference }
        }
        const reference = lodged.current?.reference ?? null

        if (shipLines.length > 0) {
          const { url } = await createCheckout({
            lines: shipLines.map((l) => ({ slug: l.slug, qty: l.qty })),
            customer: { ...details },
          })
          // Router state doesn't survive the trip out to Stripe and back.
          if (reference) rememberReserve(reference)
          // Leave the cart intact: if they abandon payment it's still there.
          window.location.href = url
          return
        }

        // Nothing to charge for, so there is no payment page to visit. The
        // lines travel with it: the cart is about to be emptied, and the
        // customer should still see what the shop is holding.
        const reserved = reserveLines.map(({ slug, name, price, qty }) => ({
          slug, name, price, qty,
        }))
        clear()
        navigate('/order-confirmed', {
          state: { name: details.name, via: 'reserve', hadReserve: true, reference, reserved },
        })
        return
      } catch (err) {
        setBusy(false)
        // A refused basket names every line at fault, so each gets its own row.
        if (err instanceof CartError) {
          setLineErrors(err.errors)
          return
        }
        setError(err instanceof Error ? err.message : 'Could not place the order.')
        return
      }
    }

    const result = await submitOrder(lines, details)
    setBusy(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    // The mailto path needs the user's mail client to actually open.
    if (result.via === 'mailto') window.location.href = result.href

    const hadReserve = reserveLines.length > 0
    clear()
    navigate('/order-confirmed', {
      state: {
        name: details.name,
        via: result.via,
        hadReserve,
        summary: result.via === 'phone' ? result.summary : undefined,
      },
    })
  }

  return (
    <>
      <PageHeader
        eyebrow="Checkout"
        title="Complete your order"
        lead="Shipped goods are paid for online. Licensed items are reserved here and settled in store once your paperwork is sighted."
      />

      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
        {notice && (
          <p className="mb-10 flex items-start gap-2.5 rounded-sm border border-amber-900/60 bg-amber-950/30 p-4 text-sm leading-relaxed text-amber-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {notice}
          </p>
        )}

        <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr]">
          <motion.form
            variants={fadeUp}
            {...inView}
            onSubmit={handleSubmit}
            className="space-y-8"
          >
            <fieldset className="space-y-4">
              <legend className="text-eyebrow mb-3">Your details</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm text-steel-300">Full name</span>
                  <input
                    required
                    value={details.name}
                    onChange={(e) => set('name', e.target.value)}
                    className="field"
                    autoComplete="name"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm text-steel-300">Phone</span>
                  <input
                    required
                    type="tel"
                    value={details.phone}
                    onChange={(e) => set('phone', e.target.value)}
                    className="field"
                    autoComplete="tel"
                  />
                </label>
              </div>
              <label className="block">
                <span className="mb-1.5 block text-sm text-steel-300">Email</span>
                <input
                  required
                  type="email"
                  value={details.email}
                  onChange={(e) => set('email', e.target.value)}
                  className="field"
                  autoComplete="email"
                />
              </label>
            </fieldset>

            {reserveLines.length > 0 && (
              <fieldset className="space-y-4 rounded-sm border border-steel-800 bg-steel-900/40 p-5">
                <legend className="text-eyebrow flex items-center gap-2 px-2">
                  <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                  Licensed items
                </legend>

                <label className="block">
                  <span className="mb-1.5 block text-sm text-steel-300">
                    SA firearms licence number
                  </span>
                  <input
                    required={needsLicence}
                    value={details.licence}
                    onChange={(e) => set('licence', e.target.value)}
                    className="field"
                    placeholder="e.g. 1234567"
                  />
                  <span className="mt-1.5 block text-xs text-steel-500">
                    Checked against your licence when you collect. Nothing is
                    charged for these items today.
                  </span>
                </label>

                <div>
                  <span className="mb-2 block text-sm text-steel-300">Handover</span>
                  <div className="flex flex-wrap gap-3">
                    {([
                      ['pickup', `Collect at ${business.street}`],
                      ['dealer', 'Transfer to my nearest dealer'],
                    ] as const).map(([value, label]) => (
                      <label
                        key={value}
                        className={`flex cursor-pointer items-center gap-2 rounded-sm border px-4 py-2.5 text-sm transition-colors ${
                          details.fulfilment === value
                            ? 'border-brass-500 bg-brass-500/10 text-brass-200'
                            : 'border-steel-700 text-steel-300 hover:border-steel-600'
                        }`}
                      >
                        <input
                          type="radio"
                          name="fulfilment"
                          value={value}
                          checked={details.fulfilment === value}
                          onChange={() => set('fulfilment', value)}
                          className="sr-only"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                <label className="flex cursor-pointer items-start gap-3 text-sm text-steel-300">
                  <input
                    type="checkbox"
                    required
                    checked={ack}
                    onChange={(e) => setAck(e.target.checked)}
                    className="mt-1 h-4 w-4 accent-brass-400"
                  />
                  <span>
                    I hold a current South Australian firearms licence and
                    understand these items cannot be posted to me.
                  </span>
                </label>
              </fieldset>
            )}

            <label className="block">
              <span className="mb-1.5 block text-sm text-steel-300">
                Notes for the shop <span className="text-steel-600">(optional)</span>
              </span>
              <textarea
                rows={4}
                value={details.notes}
                onChange={(e) => set('notes', e.target.value)}
                className="field resize-y"
                placeholder="Calibre preference, questions, anything else…"
              />
            </label>

            {shipLines.length > 0 && (
              <div className="rounded-sm border border-steel-800 bg-steel-900/40 p-5">
                <h2 className="text-eyebrow flex items-center gap-2">
                  <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
                  Payment for shipped items
                </h2>
                {hasApi() ? (
                  <p className="mt-3 text-sm text-steel-400">
                    You'll be taken to our secure card checkout to pay for the
                    items being posted to you. Anything reserved is settled in
                    store.
                  </p>
                ) : (
                  <p className="mt-3 flex items-start gap-2 text-sm text-amber-300/90">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>
                      <strong>Demo mode.</strong> No card gateway is connected
                      yet, so no payment is taken. The order is emailed to the
                      shop and they'll arrange payment.
                    </span>
                  </p>
                )}
              </div>
            )}

            {lineErrors.length > 0 && (
              <div className="rounded-sm border border-red-900/60 bg-red-950/40 p-5">
                <h2 className="text-eyebrow flex items-center gap-2 text-red-300">
                  <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  {lineErrors.length === 1
                    ? 'One item needs sorting out'
                    : `${lineErrors.length} items need sorting out`}
                </h2>
                <ul className="mt-4 space-y-4">
                  {lineErrors.map((e) => (
                    <li
                      key={e.slug}
                      className="flex flex-wrap items-start justify-between gap-3 border-t border-red-900/40 pt-4 first:border-0 first:pt-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-steel-200">
                          {lines.find((l) => l.slug === e.slug)?.name ?? e.slug}
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-red-300">
                          {e.message}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          remove(e.slug)
                          setLineErrors((prev) => prev.filter((x) => x.slug !== e.slug))
                        }}
                        className="btn-ghost shrink-0 px-4 py-2 text-sm"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs leading-relaxed text-steel-400">
                  Take these out to carry on with the rest of your order, or call
                  the shop on{' '}
                  <a
                    href={business.phoneHref}
                    className="text-brass-400 transition-colors hover:text-brass-300"
                  >
                    {business.phone}
                  </a>{' '}
                  and we'll sort it out with you.
                </p>
              </div>
            )}

            {error && (
              <p className="rounded-sm border border-red-900/60 bg-red-950/40 p-4 text-sm text-red-300">
                {error}
              </p>
            )}

            <button type="submit" disabled={busy} className="btn-primary w-full justify-center">
              {busy
                ? 'Just a moment…'
                : hasApi() && shipLines.length > 0
                  ? 'Continue to payment'
                  : 'Place order'}
            </button>

            <p className="text-xs leading-relaxed text-steel-600">{notices.licence}</p>
          </motion.form>

          <motion.aside variants={fadeUp} {...inView}>
            <div className="sticky top-24 rounded-sm border border-steel-800 bg-steel-900/50 p-6">
              <h2 className="font-display text-2xl font-700 tracking-wide uppercase">
                Order summary
              </h2>

              {shipLines.length > 0 && (
                <section className="mt-6">
                  <h3 className="text-eyebrow flex items-center gap-2">
                    <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
                    Ships to you
                  </h3>
                  <ul className="mt-3 space-y-2 text-sm">
                    {shipLines.map((l) => (
                      <li key={l.slug} className="flex justify-between gap-3">
                        <span className="min-w-0 flex-1 truncate text-steel-300">
                          {l.qty}× {l.name}
                        </span>
                        <span className="font-mono text-steel-200">
                          {formatPrice((l.price ?? 0) * l.qty)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {reserveLines.length > 0 && (
                <section className="mt-6">
                  <h3 className="text-eyebrow flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                    Collect in store
                  </h3>
                  <ul className="mt-3 space-y-2 text-sm">
                    {reserveLines.map((l) => (
                      <li key={l.slug} className="flex justify-between gap-3">
                        <span className="min-w-0 flex-1 truncate text-steel-300">
                          {l.qty}× {l.name}
                        </span>
                        <span className="font-mono text-steel-200">
                          {formatPrice((l.price ?? 0) * l.qty)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <dl className="mt-6 space-y-2 border-t border-steel-800 pt-5 text-sm">
                {shipLines.length > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-steel-400">Payable online</dt>
                    <dd className="font-mono text-steel-100">{formatPrice(shipTotal)}</dd>
                  </div>
                )}
                {reserveLines.length > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-steel-400">Payable in store</dt>
                    <dd className="font-mono text-steel-100">{formatPrice(reserveTotal)}</dd>
                  </div>
                )}
              </dl>

              <p className="mt-5 text-xs leading-relaxed text-steel-600">
                {notices.pricing}
              </p>
            </div>
          </motion.aside>
        </div>
      </div>
    </>
  )
}
