import { motion } from 'framer-motion'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Info } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import ProductGrid from '../components/ProductGrid'
import { fadeUp, inView, stagger } from '../lib/motion'
import { gearCategories, notices } from '../data/site'

export default function GearCategory() {
  const { slug } = useParams<{ slug: string }>()
  const index = gearCategories.findIndex((c) => c.slug === slug)

  if (index === -1) return <Navigate to="/gear" replace />

  const category = gearCategories[index]
  const prev = gearCategories[(index - 1 + gearCategories.length) % gearCategories.length]
  const next = gearCategories[(index + 1) % gearCategories.length]
  const isAmmo = category.slug === 'ammunition'

  return (
    <>
      <PageHeader
        eyebrow={`Ammo & Gear · ${String(index + 1).padStart(2, '0')} of ${String(
          gearCategories.length
        ).padStart(2, '0')}`}
        title={category.name}
        lead={category.blurb}
      />

      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Link
          to="/gear"
          className="mt-8 inline-flex items-center gap-2 font-display text-sm tracking-[0.12em] text-steel-400 uppercase transition-colors hover:text-brass-300"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All departments
        </Link>

        {isAmmo && (
          <motion.p
            variants={fadeUp}
            {...inView}
            className="mt-8 flex items-start gap-3 rounded-sm border border-brass-600/40 bg-brass-500/5 p-5 text-sm leading-relaxed text-steel-300"
          >
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-brass-400" aria-hidden="true" />
            {notices.ammunition}
          </motion.p>
        )}

        <motion.section variants={stagger} {...inView} className="py-14 sm:py-16">
          <motion.h2 variants={fadeUp} className="text-eyebrow">
            What this department covers
          </motion.h2>
          <motion.ul
            variants={stagger}
            className="mt-5 flex flex-wrap gap-2"
          >
            {category.items.map((item) => (
              <motion.li
                key={item}
                variants={fadeUp}
                className="rounded-sm border border-steel-800 bg-steel-900/40 px-4 py-2 text-sm text-steel-300"
              >
                {item}
              </motion.li>
            ))}
          </motion.ul>
        </motion.section>

        <section className="border-t border-steel-800 py-16 sm:py-20">
          <h2 className="font-display text-3xl font-700 tracking-tight uppercase sm:text-4xl">
            In stock now
          </h2>
          <p className="mt-3 mb-8 max-w-2xl text-steel-400">
            {notices.pricing}
          </p>
          <ProductGrid category={category.slug} />
        </section>

        <nav
          aria-label="Other departments"
          className="mb-20 grid gap-3 border-t border-steel-800 py-10 sm:mb-28 sm:grid-cols-2"
        >
          <Link
            to={`/gear/${prev.slug}`}
            className="group flex items-center gap-4 rounded-sm border border-steel-800 px-6 py-5 transition-colors duration-300 hover:border-brass-500/60"
          >
            <ArrowLeft
              className="h-5 w-5 shrink-0 text-steel-500 transition-colors group-hover:text-brass-400"
              aria-hidden="true"
            />
            <span className="min-w-0">
              <span className="text-eyebrow block">Previous</span>
              <span className="mt-1 block truncate font-display text-lg font-600 tracking-wide uppercase">
                {prev.name}
              </span>
            </span>
          </Link>

          <Link
            to={`/gear/${next.slug}`}
            className="group flex items-center gap-4 rounded-sm border border-steel-800 px-6 py-5 text-right transition-colors duration-300 hover:border-brass-500/60"
          >
            <span className="ml-auto min-w-0">
              <span className="text-eyebrow block">Next</span>
              <span className="mt-1 block truncate font-display text-lg font-600 tracking-wide uppercase">
                {next.name}
              </span>
            </span>
            <ArrowRight
              className="h-5 w-5 shrink-0 text-steel-500 transition-colors group-hover:text-brass-400"
              aria-hidden="true"
            />
          </Link>
        </nav>
      </div>
    </>
  )
}
