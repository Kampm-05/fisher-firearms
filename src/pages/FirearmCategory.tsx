import { motion } from 'framer-motion'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Phone } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import GunWireframe from '../components/GunWireframes'
import ProductGrid from '../components/ProductGrid'
import { fadeUp, inView, stagger } from '../lib/motion'
import { business, firearmCategories, notices } from '../data/site'

export default function FirearmCategory() {
  const { slug } = useParams<{ slug: string }>()
  const index = firearmCategories.findIndex((c) => c.slug === slug)

  if (index === -1) return <Navigate to="/firearms" replace />

  const category = firearmCategories[index]
  const prev =
    firearmCategories[(index - 1 + firearmCategories.length) % firearmCategories.length]
  const next = firearmCategories[(index + 1) % firearmCategories.length]
  const isUsed = category.slug === 'used'

  return (
    <>
      <PageHeader
        eyebrow={`Firearms · ${String(index + 1).padStart(2, '0')} of ${String(
          firearmCategories.length,
        ).padStart(2, '0')}`}
        title={category.name}
        lead={category.blurb}
      />

      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Link
          to="/firearms"
          className="mt-8 inline-flex items-center gap-2 font-display text-sm tracking-[0.12em] text-steel-400 uppercase transition-colors hover:text-brass-300"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All firearms
        </Link>

        <motion.div
          variants={fadeUp}
          {...inView}
          className="mt-8 rounded-sm border border-steel-800 bg-steel-900/40 p-6 sm:p-10"
        >
          <GunWireframe slug={category.slug} className="mx-auto w-full max-w-3xl" />
        </motion.div>

        <motion.section variants={stagger} {...inView} className="py-16 sm:py-24">
          <motion.h2 variants={fadeUp} className="text-eyebrow">
            {isUsed ? 'Categories on the rack' : 'Brands stocked'}
          </motion.h2>

          <motion.ul
            variants={stagger}
            className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
          >
            {category.brands.map((brand) => (
              <motion.li
                key={brand}
                variants={fadeUp}
                className="group flex items-center gap-3 rounded-sm border border-steel-800 bg-steel-900/50 px-5 py-5 transition-colors duration-300 hover:border-brass-500/60 hover:bg-steel-900"
              >
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 shrink-0 rotate-45 bg-steel-600 transition-colors duration-300 group-hover:bg-brass-400"
                />
                <span className="font-display text-base font-500 tracking-wide text-steel-200 uppercase">
                  {brand}
                </span>
              </motion.li>
            ))}
          </motion.ul>

          <motion.p variants={fadeUp} className="mt-6 text-sm text-steel-500">
            {notices.pricing}
          </motion.p>
        </motion.section>

        <section className="border-t border-steel-800 py-16 sm:py-20">
          <h2 className="font-display text-3xl font-700 tracking-tight uppercase sm:text-4xl">
            In stock now
          </h2>
          <p className="mt-3 mb-8 max-w-2xl text-steel-400">
            Live from the shop floor. Stock moves quickly — call ahead if you're
            travelling for something specific.
          </p>
          <ProductGrid category={category.slug} />
        </section>

        {/* Prev / next class */}
        <nav
          aria-label="Other firearm classes"
          className="grid gap-3 border-t border-steel-800 py-10 sm:grid-cols-2"
        >
          <Link
            to={`/firearms/${prev.slug}`}
            className="group flex items-center gap-4 rounded-sm border border-steel-800 px-6 py-5 transition-colors duration-300 hover:border-brass-500/60"
          >
            <ArrowLeft
              className="h-5 w-5 shrink-0 text-steel-500 transition-colors group-hover:text-brass-400"
              aria-hidden="true"
            />
            <span>
              <span className="block font-mono text-xs tracking-widest text-steel-500 uppercase">
                Previous
              </span>
              <span className="mt-1 block font-display text-lg tracking-wide text-steel-100 uppercase">
                {prev.name}
              </span>
            </span>
          </Link>

          <Link
            to={`/firearms/${next.slug}`}
            className="group flex items-center justify-end gap-4 rounded-sm border border-steel-800 px-6 py-5 text-right transition-colors duration-300 hover:border-brass-500/60"
          >
            <span>
              <span className="block font-mono text-xs tracking-widest text-steel-500 uppercase">
                Next
              </span>
              <span className="mt-1 block font-display text-lg tracking-wide text-steel-100 uppercase">
                {next.name}
              </span>
            </span>
            <ArrowRight
              className="h-5 w-5 shrink-0 text-steel-500 transition-colors group-hover:text-brass-400"
              aria-hidden="true"
            />
          </Link>
        </nav>

        <motion.div
          variants={fadeUp}
          {...inView}
          className="mb-20 rounded-sm border border-brass-600/40 bg-brass-500/5 p-8 sm:mb-28 sm:p-12"
        >
          <p className="text-eyebrow">Before you buy</p>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-steel-300">
            {notices.licence}
          </p>
          <a
            href={business.phoneHref}
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-sm bg-brass-400 px-7 py-4 font-display text-base font-600 tracking-[0.12em] text-void uppercase transition-colors duration-200 hover:bg-brass-300"
          >
            <Phone className="h-4 w-4" aria-hidden="true" />
            Call {business.phone}
          </a>
        </motion.div>
      </div>
    </>
  )
}
