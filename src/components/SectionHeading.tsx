import { motion } from 'framer-motion'
import { fadeUp, inView } from '../lib/motion'

type Props = {
  eyebrow: string
  title: string
  lead?: string
  align?: 'left' | 'center'
}

export default function SectionHeading({
  eyebrow,
  title,
  lead,
  align = 'left',
}: Props) {
  return (
    <motion.div
      variants={fadeUp}
      {...inView}
      className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}
    >
      <p className="text-eyebrow">{eyebrow}</p>
      <h2 className="mt-3 font-display text-4xl font-700 tracking-tight uppercase sm:text-5xl">
        {title}
      </h2>
      {lead && <p className="mt-5 text-lg leading-relaxed text-steel-400">{lead}</p>}
    </motion.div>
  )
}
