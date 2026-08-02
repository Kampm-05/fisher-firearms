import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, Phone } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import GunWireframe from '../components/GunWireframes'
import BrandMarquee from '../components/BrandMarquee'
import { fadeUp, inView, stagger } from '../lib/motion'
import { business, firearmCategories, notices } from '../data/site'

export default function Firearms() {
  return (
    <>
      <PageHeader
        eyebrow="Stock list"
        title="Firearms"
        lead="Six classes across the racks. Pick one to see the brands we carry. Stock changes daily — you can reserve online for collection, but call ahead if you're travelling for something particular."
      />

      <motion.ul
        variants={stagger}
        {...inView}
        className="mx-auto grid max-w-7xl gap-5 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-2"
      >
        {firearmCategories.map((cat) => (
          <motion.li key={cat.slug} variants={fadeUp}>
            <Link
              to={`/firearms/${cat.slug}`}
              className="group relative flex h-full flex-col overflow-hidden rounded-sm border border-steel-800 bg-steel-900/50 p-7 transition-all duration-300 hover:-translate-y-1 hover:border-brass-500/60 hover:bg-steel-900 sm:p-9"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-20 -right-20 h-52 w-52 rounded-full bg-brass-500/0 blur-3xl transition-colors duration-500 group-hover:bg-brass-500/20"
              />

              <GunWireframe slug={cat.slug} className="w-full" />

              <div className="mt-6 flex items-start justify-between gap-5">
                <div>
                  <h2 className="font-display text-3xl font-700 tracking-wide text-steel-100 uppercase">
                    {cat.name}
                  </h2>
                  <p className="mt-3 max-w-md leading-relaxed text-steel-400">
                    {cat.blurb}
                  </p>
                </div>
                <span
                  aria-hidden="true"
                  className="mt-2 grid h-11 w-11 shrink-0 place-items-center rounded-sm border border-steel-700 text-steel-400 transition-colors duration-300 group-hover:border-brass-500 group-hover:text-brass-300"
                >
                  <ArrowRight className="h-5 w-5" />
                </span>
              </div>

              <p className="mt-6 font-mono text-xs tracking-widest text-brass-500 uppercase">
                {cat.brands.length}{' '}
                {cat.slug === 'used' ? 'categories' : 'brands'} · View stock
              </p>
            </Link>
          </motion.li>
        ))}
      </motion.ul>

      <BrandMarquee />

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <motion.div
          variants={fadeUp}
          {...inView}
          className="rounded-sm border border-brass-600/40 bg-brass-500/5 p-8 sm:p-12"
        >
          <p className="text-eyebrow">Before you buy</p>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-steel-300">
            {notices.licence}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href={business.phoneHref}
              className="inline-flex items-center justify-center gap-2 rounded-sm bg-brass-400 px-7 py-4 font-display text-base font-600 tracking-[0.12em] text-void uppercase transition-colors duration-200 hover:bg-brass-300"
            >
              <Phone className="h-4 w-4" aria-hidden="true" />
              Call {business.phone}
            </a>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center rounded-sm border border-steel-700 px-7 py-4 font-display text-base font-600 tracking-[0.12em] text-steel-200 uppercase transition-colors duration-200 hover:border-brass-500 hover:text-brass-300"
            >
              Opening hours
            </Link>
          </div>
        </motion.div>
      </section>
    </>
  )
}
