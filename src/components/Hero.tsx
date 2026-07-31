import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import { ArrowRight, MapPin } from 'lucide-react'
import RifleDraw from './RifleDraw'
import { business } from '../data/site'
import { EASE } from '../lib/motion'

export default function Hero() {
  const ref = useRef<HTMLElement>(null)
  const reduceMotion = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })

  // Rifle drifts slower than the copy — depth without disorientation.
  const rifleY = useTransform(scrollYProgress, [0, 1], ['0%', '28%'])
  const copyY = useTransform(scrollYProgress, [0, 1], ['0%', '65%'])
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0])

  return (
    <section
      ref={ref}
      className="relative flex min-h-dvh flex-col overflow-hidden pt-18"
    >
      {/* Ambient brass light pooling behind the rifle */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-engrave"
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/4 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-brass-500/12 blur-[130px]"
        animate={
          reduceMotion ? undefined : { scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }
        }
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-5 py-10 sm:px-8 sm:py-12">
        <motion.div style={reduceMotion ? undefined : { y: copyY, opacity: fade }}>
          <motion.p
            className="text-eyebrow"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            Norwood · South Australia
          </motion.p>

          <motion.h1
            className="mt-5 max-w-4xl font-display text-5xl leading-[0.92] font-700 tracking-tight text-steel-100 uppercase sm:text-6xl lg:text-7xl"
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08, ease: EASE }}
          >
            Adelaide's largest
            <br />
            <span className="text-brass-400">gun shop</span>
          </motion.h1>

          <motion.p
            className="mt-7 max-w-xl text-lg leading-relaxed text-steel-300 sm:text-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: EASE }}
          >
            New and used firearms, ammunition, optics, reloading supplies and
            hunting gear — with the range and the advice you only get from a
            dedicated gun shop.
          </motion.p>

          <motion.div
            className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: EASE }}
          >
            <Link
              to="/firearms"
              className="group inline-flex items-center justify-center gap-2 rounded-sm bg-brass-400 px-7 py-4 font-display text-base font-600 tracking-[0.12em] text-void uppercase transition-colors duration-200 hover:bg-brass-300"
            >
              Browse the racks
              <ArrowRight
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-sm border border-steel-700 px-7 py-4 font-display text-base font-600 tracking-[0.12em] text-steel-200 uppercase transition-colors duration-200 hover:border-brass-500 hover:text-brass-300"
            >
              <MapPin className="h-4 w-4" aria-hidden="true" />
              {business.street}
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          className="pointer-events-none mt-10 w-full sm:mt-12"
          style={reduceMotion ? undefined : { y: rifleY }}
        >
          <RifleDraw className="w-full" />
        </motion.div>
      </div>

    </section>
  )
}
