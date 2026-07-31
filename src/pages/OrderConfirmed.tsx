import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, Clock, MapPin, Phone } from 'lucide-react'
import { fadeUp, inView, stagger } from '../lib/motion'
import { business, hours, notices } from '../data/site'

type ConfirmState = {
  name?: string
  via?: 'formspree' | 'mailto' | 'phone'
  hadReserve?: boolean
  summary?: string
}

export default function OrderConfirmed() {
  const { state } = useLocation() as { state: ConfirmState | null }
  const name = state?.name?.split(' ')[0]

  return (
    <div className="mx-auto max-w-3xl px-5 py-24 sm:px-8 sm:py-32">
      <motion.div variants={stagger} {...inView}>
        <motion.div
          variants={fadeUp}
          className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-brass-600/50 bg-brass-500/10"
        >
          <Check className="h-8 w-8 text-brass-400" aria-hidden="true" />
        </motion.div>

        <motion.h1
          variants={fadeUp}
          className="mt-8 text-center font-display text-4xl font-700 tracking-tight uppercase"
        >
          Order received
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="mt-4 text-center leading-relaxed text-steel-300"
        >
          {state?.via === 'phone' ? (
            <>
              {name ? `Thanks ${name} — your` : 'Your'} order is saved below.
              Give the shop a call to confirm stock, final pricing and — where
              it applies — your licence and permit.
            </>
          ) : (
            <>
              {name ? `Thanks ${name} — your` : 'Your'} order is with the shop.
              We'll be in touch to confirm stock, final pricing and — where it
              applies — your licence and permit.
            </>
          )}
        </motion.p>

        {state?.via === 'phone' && state.summary && (
          <motion.div
            variants={fadeUp}
            className="mt-8 rounded-sm border border-steel-800 bg-steel-900/50 p-6"
          >
            <h2 className="text-eyebrow">Your order</h2>
            <pre className="mt-3 overflow-x-auto font-mono text-xs leading-relaxed whitespace-pre-wrap text-steel-300">
              {state.summary}
            </pre>
          </motion.div>
        )}

        {state?.via === 'mailto' && (
          <motion.p
            variants={fadeUp}
            className="mt-5 rounded-sm border border-steel-800 bg-steel-900/50 p-4 text-center text-sm text-steel-400"
          >
            Your email app should have opened with the order ready to send. If
            it didn't, call the shop on{' '}
            <a href={business.phoneHref} className="text-brass-400 hover:text-brass-300">
              {business.phone}
            </a>
            .
          </motion.p>
        )}

        {state?.hadReserve && (
          <motion.div
            variants={fadeUp}
            className="mt-10 rounded-sm border border-steel-800 bg-steel-900/50 p-6"
          >
            <h2 className="text-eyebrow">Collecting your licensed items</h2>
            <p className="mt-3 text-sm leading-relaxed text-steel-300">
              Bring your current SA firearms licence and, where one is required,
              your permit to acquire. Nothing is charged until handover.
            </p>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div className="flex gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brass-500" aria-hidden="true" />
                <address className="text-sm leading-relaxed text-steel-300 not-italic">
                  {business.street}
                  <br />
                  {business.suburb} {business.state}
                </address>
              </div>
              <div className="flex gap-3">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brass-500" aria-hidden="true" />
                <dl className="space-y-0.5 text-sm text-steel-300">
                  {hours.map((r) => (
                    <div key={r.days} className="flex gap-2">
                      <dt className="text-steel-500">{r.days}</dt>
                      <dd className="ml-auto font-mono text-xs">
                        {r.open ? `${r.open}–${r.close}` : 'Closed'}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </motion.div>
        )}

        <motion.div variants={fadeUp} className="mt-10 flex flex-wrap justify-center gap-3">
          <Link to="/firearms" className="btn-primary">
            Keep browsing
          </Link>
          <a href={business.phoneHref} className="btn-ghost">
            <Phone className="h-4 w-4" aria-hidden="true" />
            {business.phone}
          </a>
        </motion.div>

        <motion.p
          variants={fadeUp}
          className="mt-10 text-center text-xs leading-relaxed text-steel-600"
        >
          {notices.licence}
        </motion.p>
      </motion.div>
    </div>
  )
}
