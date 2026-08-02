import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Check, Gift, Send } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { hasApi, sendMessage } from '../lib/api'
import { formatPrice } from '../data/catalog'
import { fadeUp, inView, stagger } from '../lib/motion'
import { business, notices } from '../data/site'

const DENOMINATIONS = [50, 100, 250, 500]

/**
 * What actually happens, rather than what a shopping cart would imply. There
 * is no gift-certificate product in the shop's catalogue and nothing anywhere
 * emails one out, so this page takes an enquiry and the shop does the rest.
 */
const STEPS = [
  'Choose an amount and tell us who it is for.',
  'Send the enquiry — nothing is charged online.',
  'The shop rings you back to confirm the details and arrange payment.',
  'The certificate is redeemed in store against anything we stock.',
]

export default function GiftCertificates() {
  const [amount, setAmount] = useState(DENOMINATIONS[1])
  const [form, setForm] = useState({
    name: '', email: '', phone: '', recipient: '', notes: '',
  })
  const [busy, setBusy] = useState(false)
  const [reference, setReference] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const set = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }))

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const sent = await sendMessage({
        name: form.name,
        email: form.email,
        phone: form.phone,
        subject: 'Gift certificate',
        notes: [
          `Amount: ${formatPrice(amount)}`,
          form.recipient ? `For: ${form.recipient}` : null,
          form.notes,
        ]
          .filter((l) => l)
          .join('\n'),
      })
      setReference(sent.reference)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the enquiry.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Gift Certificates"
        title="Let them choose"
        lead="Hard to buy for a shooter? A Fisher Firearms certificate covers anything on the floor — rifle, glass, ammunition or a new safe."
      />

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        {reference ? (
          <motion.div
            variants={fadeUp}
            {...inView}
            className="mx-auto max-w-2xl rounded-sm border border-brass-600/40 bg-brass-500/5 p-8 text-center"
          >
            <Check className="mx-auto h-8 w-8 text-brass-400" aria-hidden="true" />
            <h2 className="mt-4 font-display text-3xl font-700 tracking-wide uppercase">
              Enquiry received
            </h2>
            <p className="mt-3 leading-relaxed text-steel-300">
              Thanks — the shop has your {formatPrice(amount)} certificate
              enquiry and will be in touch to confirm the details and arrange
              payment. Nothing has been charged.
            </p>
            <p className="mt-6 text-eyebrow">Your reference</p>
            <p className="mt-2 font-mono text-2xl tracking-widest text-brass-200">
              {reference}
            </p>
            <p className="mt-6 text-sm text-steel-400">
              In a hurry? Call us on{' '}
              <a
                href={business.phoneHref}
                className="text-brass-400 transition-colors hover:text-brass-300"
              >
                {business.phone}
              </a>{' '}
              and quote that reference.
            </p>
          </motion.div>
        ) : (
          <>
            <motion.div
              variants={stagger}
              {...inView}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              {DENOMINATIONS.map((value) => (
                <motion.button
                  key={value}
                  type="button"
                  variants={fadeUp}
                  onClick={() => setAmount(value)}
                  aria-pressed={amount === value}
                  className={`flex flex-col items-start rounded-sm border p-6 text-left transition-colors duration-300 ${
                    amount === value
                      ? 'border-brass-500 bg-brass-500/10'
                      : 'border-steel-800 bg-steel-900/40 hover:border-brass-500/50'
                  }`}
                >
                  <Gift className="h-7 w-7 text-brass-500" aria-hidden="true" />
                  <span className="mt-5 font-display text-4xl font-700 tracking-tight text-steel-100">
                    {formatPrice(value)}
                  </span>
                  <span className="mt-2 text-sm text-steel-400">
                    Redeemable in store on anything we stock.
                  </span>
                  <span
                    className={`mt-4 flex items-center gap-1.5 text-sm ${
                      amount === value ? 'text-brass-300' : 'text-steel-600'
                    }`}
                  >
                    {amount === value && (
                      <Check className="h-4 w-4" aria-hidden="true" />
                    )}
                    {amount === value ? 'Chosen' : 'Choose this amount'}
                  </span>
                </motion.button>
              ))}
            </motion.div>

            <div className="mt-20 grid gap-12 lg:grid-cols-2">
              <motion.div variants={stagger} {...inView}>
                <motion.h2
                  variants={fadeUp}
                  className="font-display text-3xl font-700 tracking-tight uppercase"
                >
                  How it works
                </motion.h2>
                <motion.ol variants={fadeUp} className="mt-6 space-y-4">
                  {STEPS.map((step, i) => (
                    <li key={step} className="flex gap-4">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-brass-600/50 font-mono text-xs text-brass-400">
                        {i + 1}
                      </span>
                      <span className="text-steel-300">{step}</span>
                    </li>
                  ))}
                </motion.ol>

                <motion.div
                  variants={fadeUp}
                  className="mt-8 rounded-sm border border-steel-800 bg-steel-900/50 p-6"
                >
                  <h3 className="text-eyebrow">Worth knowing</h3>
                  <ul className="mt-4 space-y-3 text-sm leading-relaxed text-steel-400">
                    <li>
                      A certificate doesn't bypass licensing — firearms and
                      ammunition still require a current SA firearms licence, and
                      a permit to acquire where one applies.
                    </li>
                    <li>
                      After a different amount, or want to talk it through? Call
                      the shop on{' '}
                      <a
                        href={business.phoneHref}
                        className="text-brass-400 transition-colors hover:text-brass-300"
                      >
                        {business.phone}
                      </a>
                      .
                    </li>
                  </ul>
                </motion.div>
              </motion.div>

              {hasApi() ? (
                <motion.form
                  variants={fadeUp}
                  {...inView}
                  onSubmit={handleSubmit}
                  className="space-y-4 rounded-sm border border-steel-800 bg-steel-900/40 p-6"
                >
                  <h2 className="font-display text-3xl font-700 tracking-tight uppercase">
                    Arrange a certificate
                  </h2>
                  <p className="pb-2 text-steel-400">
                    You're enquiring about a{' '}
                    <strong className="text-brass-300">{formatPrice(amount)}</strong>{' '}
                    certificate. Nothing is charged here — the shop confirms
                    everything with you first.
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 block text-sm text-steel-300">
                        Your name
                      </span>
                      <input
                        required
                        value={form.name}
                        onChange={(e) => set('name', e.target.value)}
                        className="field"
                        autoComplete="name"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-sm text-steel-300">
                        Your phone
                      </span>
                      <input
                        required
                        type="tel"
                        value={form.phone}
                        onChange={(e) => set('phone', e.target.value)}
                        className="field"
                        autoComplete="tel"
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="mb-1.5 block text-sm text-steel-300">
                      Your email
                    </span>
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={(e) => set('email', e.target.value)}
                      className="field"
                      autoComplete="email"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm text-steel-300">
                      Who it's for <span className="text-steel-600">(optional)</span>
                    </span>
                    <input
                      value={form.recipient}
                      onChange={(e) => set('recipient', e.target.value)}
                      className="field"
                      placeholder="The name to put on the certificate"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm text-steel-300">
                      Anything else <span className="text-steel-600">(optional)</span>
                    </span>
                    <textarea
                      rows={4}
                      value={form.notes}
                      onChange={(e) => set('notes', e.target.value)}
                      className="field resize-y"
                      placeholder="A different amount, when you need it by, anything else…"
                    />
                  </label>

                  {error && (
                    <p className="rounded-sm border border-red-900/60 bg-red-950/40 p-4 text-sm leading-relaxed text-red-300">
                      {error} You can also call the shop on{' '}
                      <a href={business.phoneHref} className="underline hover:text-red-100">
                        {business.phone}
                      </a>
                      .
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={busy}
                    className="btn-primary w-full justify-center"
                  >
                    <Send className="h-4 w-4" aria-hidden="true" />
                    {busy ? 'Sending…' : 'Send enquiry'}
                  </button>
                </motion.form>
              ) : (
                <motion.div
                  variants={fadeUp}
                  {...inView}
                  className="rounded-sm border border-steel-800 bg-steel-900/40 p-6"
                >
                  <h2 className="font-display text-3xl font-700 tracking-tight uppercase">
                    Arrange a certificate
                  </h2>
                  <p className="mt-4 leading-relaxed text-steel-300">
                    Online enquiries aren't switched on yet. Give the shop a ring
                    on{' '}
                    <a
                      href={business.phoneHref}
                      className="text-brass-400 transition-colors hover:text-brass-300"
                    >
                      {business.phone}
                    </a>{' '}
                    and we'll sort a certificate out for you over the counter.
                  </p>
                </motion.div>
              )}
            </div>
          </>
        )}

        <p className="mt-16 text-xs leading-relaxed text-steel-600">
          {notices.licence}
        </p>
      </section>
    </>
  )
}
