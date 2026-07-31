import { motion } from 'framer-motion'
import { EASE } from '../lib/motion'

type Props = {
  eyebrow: string
  title: string
  lead: string
}

export default function PageHeader({ eyebrow, title, lead }: Props) {
  return (
    <header className="relative overflow-hidden border-b border-steel-800 pt-18">
      <div aria-hidden="true" className="absolute inset-0 bg-engrave" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/3 h-96 w-96 rounded-full bg-brass-500/10 blur-[120px]"
      />

      <div className="relative mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <motion.p
          className="text-eyebrow"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE }}
        >
          {eyebrow}
        </motion.p>
        <motion.h1
          className="mt-4 max-w-3xl font-display text-5xl leading-[0.95] font-700 tracking-tight uppercase sm:text-7xl"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.06, ease: EASE }}
        >
          {title}
        </motion.h1>
        <motion.p
          className="mt-6 max-w-2xl text-lg leading-relaxed text-steel-400"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.14, ease: EASE }}
        >
          {lead}
        </motion.p>
      </div>
    </header>
  )
}
