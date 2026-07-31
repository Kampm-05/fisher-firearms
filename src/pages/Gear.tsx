import { motion } from 'framer-motion'
import {
  Binoculars,
  Crosshair,
  Flashlight,
  Lock,
  Mountain,
  Settings2,
  SprayCan,
  Target,
  Layers,
  Info,
  ArrowRight,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { fadeUp, inView, stagger } from '../lib/motion'
import { gearCategories, notices } from '../data/site'

const ICONS: Record<string, LucideIcon> = {
  ammo: Layers,
  scope: Binoculars,
  reload: Settings2,
  safe: Lock,
  hunt: Mountain,
  care: SprayCan,
  target: Target,
  light: Flashlight,
  parts: Crosshair,
}

export default function Gear() {
  return (
    <>
      <PageHeader
        eyebrow="Departments"
        title="Ammo & gear"
        lead="Ammunition, optics, reloading, storage, hunting kit and everything else that keeps a firearm working and a trip worth taking."
      />

      {/* Ammunition shipping caveat — carried over verbatim from the old site */}
      <div className="border-b border-steel-800 bg-brass-500/5">
        <div className="mx-auto flex max-w-7xl items-start gap-4 px-5 py-5 sm:px-8">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-brass-400" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-steel-300">
            {notices.ammunition}
          </p>
        </div>
      </div>

      <motion.ul
        variants={stagger}
        {...inView}
        className="mx-auto grid max-w-7xl gap-5 px-5 py-20 sm:grid-cols-2 sm:px-8 sm:py-28 lg:grid-cols-3"
      >
        {gearCategories.map((cat) => {
          const Icon = ICONS[cat.icon] ?? Crosshair
          return (
            <motion.li
              key={cat.slug}
              id={cat.slug}
              variants={fadeUp}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="group scroll-mt-28 rounded-sm border border-steel-800 bg-steel-900/50 transition-colors duration-300 hover:border-brass-500/60 hover:bg-steel-900"
            >
              <Link to={`/gear/${cat.slug}`} className="flex h-full flex-col p-7">
                <span className="grid h-12 w-12 place-items-center rounded-sm border border-steel-700 bg-steel-800/60 text-brass-400 transition-colors duration-300 group-hover:border-brass-500/60">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>

                <h2 className="mt-6 font-display text-2xl font-600 tracking-wide text-steel-100 uppercase">
                  {cat.name}
                </h2>
                <p className="mt-3 leading-relaxed text-steel-400">{cat.blurb}</p>

                <ul className="mt-6 flex flex-wrap gap-2">
                  {cat.items.map((item) => (
                    <li
                      key={item}
                      className="rounded-sm border border-steel-800 bg-steel-950/60 px-3 py-1.5 font-mono text-xs text-steel-400"
                    >
                      {item}
                    </li>
                  ))}
                </ul>

                <span className="text-eyebrow mt-auto flex items-center gap-2 pt-6 transition-colors group-hover:text-brass-300">
                  View stock
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </Link>
            </motion.li>
          )
        })}
      </motion.ul>
    </>
  )
}
