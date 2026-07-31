import { motion, useReducedMotion } from 'framer-motion'
import { CENTREFIRE } from './GunWireframes'

/**
 * The hero rifle: the same scoped bolt-action drawn on the Firearms page,
 * machined onto the screen stroke by stroke in assembly order.
 *
 * The viewBox crops to the artwork's own bounds (x 88-846, y 76-246) rather
 * than the wireframe's full 900x300 canvas, so the hero gets a wide, shallow
 * band with no dead space above or below.
 */
const VIEW_BOX = '80 66 780 190'

type Props = {
  className?: string
  /** Seconds each stroke takes to draw. */
  speed?: number
}

export default function RifleDraw({ className, speed = 1.4 }: Props) {
  const reduceMotion = useReducedMotion()

  return (
    <svg
      viewBox={VIEW_BOX}
      fill="none"
      className={className}
      role="img"
      aria-label="Illustration of a scoped bolt-action rifle"
    >
      <defs>
        {/* userSpaceOnUse: several strokes are axis-aligned, and an
            objectBoundingBox gradient collapses on a zero-area box. */}
        <linearGradient
          id="rifle-stroke"
          gradientUnits="userSpaceOnUse"
          x1="88"
          y1="0"
          x2="846"
          y2="0"
        >
          <stop offset="0%" stopColor="var(--color-steel-500)" />
          <stop offset="38%" stopColor="var(--color-brass-400)" />
          <stop offset="72%" stopColor="var(--color-brass-300)" />
          <stop offset="100%" stopColor="var(--color-steel-400)" />
        </linearGradient>
      </defs>

      {CENTREFIRE.map((part, i) => (
        <motion.path
          key={part.d}
          d={part.d}
          stroke="url(#rifle-stroke)"
          strokeWidth={part.weight ?? 2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            pathLength: {
              duration: speed,
              delay: i * 0.09,
              ease: [0.16, 1, 0.3, 1],
            },
            opacity: { duration: 0.2, delay: i * 0.09 },
          }}
        />
      ))}
    </svg>
  )
}
