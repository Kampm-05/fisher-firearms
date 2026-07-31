import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Clock, MapPin, Phone } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import GunWireframe from '../components/GunWireframes'
import { fadeUp, inView, stagger } from '../lib/motion'
import { business, firearmCategories, gearCategories, hours, notices } from '../data/site'

/**
 * The old site had no About page — only the line "We are the largest gun shop
 * in Adelaide" on its homepage. Everything here is built from facts the shop
 * actually publishes: its location, hours, departments and the brands it lists.
 */
const PILLARS = [
  {
    title: 'The full range under one roof',
    body: `Centrefire, rimfire, shotgun, air rifle and handgun — new and second-hand — alongside ammunition, optics, reloading gear, safes and everything in between. ${firearmCategories.length} firearm classes and ${gearCategories.length} gear departments, all on the floor at Norwood.`,
  },
  {
    title: 'Advice from people who shoot',
    body: 'Choosing a first rimfire is a different conversation to speccing a long-range build. Come in and talk it through — we would rather you left with the right rifle than the expensive one.',
  },
  {
    title: 'Licensed and by the book',
    body: 'We are a licensed South Australian firearms dealer. Every transfer is handled under the Firearms Act 2015 (SA) — licence sighted, permit to acquire where required, paperwork done properly.',
  },
  {
    title: 'Service after the sale',
    body: 'Scopes fitted and bore-sighted, transfers handled for interstate purchases, and parts and magazines for rifles far older than most of our stock.',
  },
]

export default function About() {
  return (
    <>
      <PageHeader
        eyebrow="About Fisher Firearms"
        title="Adelaide's largest gun shop"
        lead="On Magill Road at Norwood — a full-range firearms dealer serving South Australian shooters, hunters and target clubs."
      />

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <motion.div variants={stagger} {...inView} className="grid gap-14 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <motion.h2
              variants={fadeUp}
              className="font-display text-3xl font-700 tracking-tight uppercase sm:text-4xl"
            >
              What we're about
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-5 text-lg leading-relaxed text-steel-300">
              Fisher Firearms has built its reputation on stocking depth — the
              rifle you came for, the ammunition to feed it, the glass to sit on
              top, and someone behind the counter who can tell you why one
              choice suits you better than another.
            </motion.p>
            <motion.p variants={fadeUp} className="mt-4 leading-relaxed text-steel-400">
              Stock turns over constantly, particularly on the second-hand rack.
              What's listed online is a guide — call ahead or drop in if you're
              chasing something specific, and we'll tell you exactly what's on
              the shelf.
            </motion.p>

            <motion.dl variants={fadeUp} className="mt-10 grid gap-8 sm:grid-cols-2">
              {PILLARS.map((p) => (
                <div key={p.title}>
                  <dt className="font-display text-lg font-600 tracking-wide text-brass-300 uppercase">
                    {p.title}
                  </dt>
                  <dd className="mt-2 text-sm leading-relaxed text-steel-400">{p.body}</dd>
                </div>
              ))}
            </motion.dl>
          </div>

          <motion.div variants={fadeUp}>
            <div className="overflow-hidden rounded-sm border border-steel-800 bg-steel-900/40 p-6">
              <GunWireframe slug="centrefire" className="w-full" />
            </div>

            <div className="mt-6 rounded-sm border border-steel-800 bg-steel-900/50 p-6">
              <h3 className="text-eyebrow">Find us</h3>

              <div className="mt-4 flex gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brass-500" aria-hidden="true" />
                <address className="leading-relaxed text-steel-200 not-italic">
                  {business.street}
                  <br />
                  {business.suburb} {business.state}
                </address>
              </div>

              <div className="mt-4 flex gap-3">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-brass-500" aria-hidden="true" />
                <a
                  href={business.phoneHref}
                  className="font-mono text-steel-200 transition-colors hover:text-brass-300"
                >
                  {business.phone}
                </a>
              </div>

              <div className="mt-4 flex gap-3">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brass-500" aria-hidden="true" />
                <dl className="flex-1 space-y-1 text-sm">
                  {hours.map((r) => (
                    <div key={r.days} className="flex justify-between gap-3">
                      <dt className="text-steel-400">{r.days}</dt>
                      <dd className="shrink-0 font-mono text-xs text-steel-300">
                        {r.open ? `${r.open} – ${r.close}` : 'Closed'}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              <Link to="/contact" className="btn-ghost mt-6 w-full justify-center">
                Directions & contact
              </Link>
            </div>
          </motion.div>
        </motion.div>

        <motion.p
          variants={fadeUp}
          {...inView}
          className="mt-16 max-w-4xl border-t border-steel-800 pt-8 text-sm leading-relaxed text-steel-500"
        >
          {notices.licence}
        </motion.p>
      </section>
    </>
  )
}
