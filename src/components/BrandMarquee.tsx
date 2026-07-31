import { motion, useReducedMotion } from 'framer-motion'
import { brands } from '../data/site'

/**
 * Continuous brand ticker. The list is rendered twice and translated by
 * exactly -50%, so the seam is invisible and the loop never resets visibly.
 */
export default function BrandMarquee() {
  const reduceMotion = useReducedMotion()
  const doubled = [...brands, ...brands]

  return (
    <section
      aria-label="Brands we stock"
      className="relative overflow-hidden border-y border-steel-800 bg-steel-950 py-8"
    >
      {/* Fade the edges so names don't hard-clip at the viewport bounds */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-steel-950 to-transparent sm:w-40"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-steel-950 to-transparent sm:w-40"
        aria-hidden="true"
      />

      <motion.ul
        className="flex w-max items-center gap-12 sm:gap-16"
        animate={reduceMotion ? undefined : { x: ['0%', '-50%'] }}
        transition={{ duration: 45, ease: 'linear', repeat: Infinity }}
      >
        {doubled.map((brand, i) => (
          <li
            key={`${brand}-${i}`}
            aria-hidden={i >= brands.length}
            className="font-display text-xl font-600 tracking-[0.18em] whitespace-nowrap text-steel-500 uppercase transition-colors duration-300 hover:text-brass-300 sm:text-2xl"
          >
            {brand}
          </li>
        ))}
      </motion.ul>
    </section>
  )
}
