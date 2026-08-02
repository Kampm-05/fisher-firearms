import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowUpRight, Clock, MapPin, Phone } from 'lucide-react'
import Hero from '../components/Hero'
import BrandMarquee from '../components/BrandMarquee'
import PistolExploded from '../components/PistolExploded'
import GunWireframe from '../components/GunWireframes'
import SectionHeading from '../components/SectionHeading'
import Counter from '../components/Counter'
import { fadeUp, inView, stagger } from '../lib/motion'
import { brands, business, firearmCategories, gearCategories, hours } from '../data/site'

const STATS = [
  { value: brands.length, suffix: '+', label: 'Brands stocked' },
  { value: firearmCategories.length, suffix: '', label: 'Firearm categories' },
  { value: gearCategories.length, suffix: '', label: 'Gear departments' },
  { value: 6, suffix: ' days', label: 'Open every week' },
]

export default function Home() {
  return (
    <>
      <Hero />
      <BrandMarquee />
      <PistolExploded />

      {/* Stats */}
      <section className="border-b border-steel-800 bg-steel-950/40">
        <motion.dl
          variants={stagger}
          {...inView}
          className="mx-auto grid max-w-7xl grid-cols-2 gap-y-10 px-5 py-16 sm:px-8 lg:grid-cols-4"
        >
          {STATS.map((stat) => (
            <motion.div key={stat.label} variants={fadeUp}>
              <dt className="sr-only">{stat.label}</dt>
              <dd>
                <span className="font-display text-5xl font-700 text-brass-400 sm:text-6xl">
                  <Counter to={stat.value} suffix={stat.suffix} />
                </span>
                <span className="mt-2 block text-sm tracking-wide text-steel-400 uppercase">
                  {stat.label}
                </span>
              </dd>
            </motion.div>
          ))}
        </motion.dl>
      </section>

      {/* Firearm categories */}
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
        <SectionHeading
          eyebrow="What's on the rack"
          title="Firearms"
          lead="Centrefire, rimfire, shotgun, air and handgun — new stock alongside a second-hand rack that turns over constantly."
        />

        <motion.ul
          variants={stagger}
          {...inView}
          className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3"
        >
          {firearmCategories.map((cat) => (
            <motion.li key={cat.slug} variants={fadeUp}>
              <Link
                to={`/firearms/${cat.slug}`}
                className="group relative flex h-full flex-col overflow-hidden rounded-sm border border-steel-800 bg-steel-900/60 p-7 transition-all duration-300 hover:-translate-y-1 hover:border-brass-500/60 hover:bg-steel-900"
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-brass-500/0 blur-3xl transition-colors duration-500 group-hover:bg-brass-500/20"
                />
                <GunWireframe slug={cat.slug} className="mb-5 w-full" />
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-display text-2xl font-600 tracking-wide text-steel-100 uppercase">
                    {cat.name}
                  </h3>
                  <ArrowUpRight
                    className="h-5 w-5 shrink-0 text-steel-600 transition-colors duration-300 group-hover:text-brass-400"
                    aria-hidden="true"
                  />
                </div>
                <p className="mt-4 flex-1 leading-relaxed text-steel-400">
                  {cat.blurb}
                </p>
                <p className="mt-6 font-mono text-xs leading-relaxed text-steel-500">
                  {cat.brands.slice(0, 5).join(' · ')}
                  {cat.brands.length > 5 && ` +${cat.brands.length - 5} more`}
                </p>
              </Link>
            </motion.li>
          ))}
        </motion.ul>
      </section>

      {/* Gear strip */}
      <section className="border-y border-steel-800 bg-steel-950">
        <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
          <SectionHeading
            eyebrow="Beyond the firearm"
            title="Ammo, optics & gear"
            lead="Everything that goes with it — glass, reloading, storage, care and the field kit for the walk in."
          />

          <motion.ul
            variants={stagger}
            {...inView}
            className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {gearCategories.map((cat) => (
              <motion.li key={cat.slug} variants={fadeUp}>
                <Link
                  to={`/gear#${cat.slug}`}
                  className="group flex items-center justify-between gap-4 rounded-sm border border-steel-800 bg-steel-900/40 px-6 py-5 transition-colors duration-300 hover:border-brass-500/60 hover:bg-steel-900"
                >
                  <span>
                    <span className="block font-display text-lg font-600 tracking-wide text-steel-100 uppercase">
                      {cat.name}
                    </span>
                    <span className="mt-1 block font-mono text-xs text-steel-500">
                      {cat.items.length} lines
                    </span>
                  </span>
                  <ArrowUpRight
                    className="h-5 w-5 shrink-0 text-steel-600 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brass-400"
                    aria-hidden="true"
                  />
                </Link>
              </motion.li>
            ))}
          </motion.ul>
        </div>
      </section>

      {/* Visit strip */}
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
        <div className="grid gap-14 lg:grid-cols-2">
          <SectionHeading
            eyebrow="Come in and have a look"
            title="Visit the shop"
            lead="Stock moves quickly. Reserve online to have it put aside, or drop in — we'll put it in your hands and talk you through it."
          />

          <motion.div variants={fadeUp} {...inView} className="space-y-8">
            <div className="flex items-start gap-4">
              <MapPin
                className="mt-1 h-5 w-5 shrink-0 text-brass-500"
                aria-hidden="true"
              />
              <div>
                <p className="text-eyebrow">Address</p>
                <p className="mt-1 text-xl text-steel-100">
                  {business.street}, {business.suburb} {business.state}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Phone
                className="mt-1 h-5 w-5 shrink-0 text-brass-500"
                aria-hidden="true"
              />
              <div>
                <p className="text-eyebrow">Phone</p>
                <a
                  href={business.phoneHref}
                  className="mt-1 block font-mono text-xl text-steel-100 transition-colors hover:text-brass-300"
                >
                  {business.phone}
                </a>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Clock
                className="mt-1 h-5 w-5 shrink-0 text-brass-500"
                aria-hidden="true"
              />
              <div className="w-full">
                <p className="text-eyebrow">Trading hours</p>
                <dl className="mt-3 space-y-2">
                  {hours.map((row) => (
                    <div
                      key={row.days}
                      className="flex justify-between gap-4 border-b border-steel-800/60 pb-2"
                    >
                      <dt className="text-steel-400">{row.days}</dt>
                      <dd
                        className={`shrink-0 font-mono ${
                          row.open ? 'text-steel-200' : 'text-steel-500'
                        }`}
                      >
                        {row.open ? `${row.open} – ${row.close}` : 'Closed'}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>

            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-sm bg-brass-400 px-7 py-4 font-display text-base font-600 tracking-[0.12em] text-void uppercase transition-colors duration-200 hover:bg-brass-300"
            >
              Directions &amp; contact
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </motion.div>
        </div>
      </section>
    </>
  )
}
