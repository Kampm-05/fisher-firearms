import { useEffect, useRef, useState } from 'react'
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  useSpring,
  type MotionValue,
} from 'framer-motion'
import {
  PISTOL_PARTS,
  TRAVEL,
  VIEW_BOX,
  VIEW_BOX_COMPACT,
  type Part,
} from './pistolParts'

/** Tracks a media query without hard-coding a breakpoint at every call site. */
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(query)
    const update = () => setMatches(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [query])

  return matches
}

/**
 * Maps overall scroll progress onto one part's own 0-1 travel, so groups
 * separate in field-strip order rather than all at once.
 */
function usePartProgress(progress: MotionValue<number>, start: number) {
  return useTransform(progress, [start, Math.min(start + TRAVEL, 1)], [0, 1], {
    clamp: true,
  })
}

function PistolPart({
  part,
  progress,
  still,
  compact,
}: {
  part: Part
  progress: MotionValue<number>
  still: boolean
  compact: boolean
}) {
  const target = compact ? part.toCompact : part.to
  const t = usePartProgress(progress, part.start)
  const x = useTransform(t, [0, 1], [0, target.x])
  const y = useTransform(t, [0, 1], [0, target.y])
  // Internals stay hidden until they clear the shell they sit inside, so the
  // resting diagram is a clean outline instead of overlapping strokes.
  const opacity = useTransform(t, [0, 0.3], [0, 1], { clamp: true })

  /*
   * Nothing moves when still, so the internals never clear the shell they sit
   * inside — leaving them visible would draw the magazine, barrel and recoil
   * spring straight through the frame, which is the exact tangle the opacity
   * ramp exists to avoid. Hold them at zero and show the outline alone.
   */
  const style = still
    ? part.internal
      ? { opacity: 0 }
      : undefined
    : part.internal
      ? { x, y, opacity }
      : { x, y }

  return (
    <motion.g style={style}>
      {part.paths.map((p, i) => (
        <path
          key={`${part.id}-${i}`}
          d={p.d}
          stroke="url(#pistol-stroke)"
          strokeWidth={p.weight ?? 2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ))}
    </motion.g>
  )
}

export default function PistolExploded() {
  const ref = useRef<HTMLElement>(null)
  const reduceMotion = useReducedMotion()
  const compact = useMediaQuery('(max-width: 767px)')

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  })

  // Light smoothing so scrubbing reads as mechanical rather than jittery.
  // Kept stiff — a soft spring lags visibly behind fast scrolling.
  const progress = useSpring(scrollYProgress, {
    stiffness: 420,
    damping: 46,
    mass: 0.4,
    restDelta: 0.0005,
  })

  const still = !!reduceMotion
  const headingOpacity = useTransform(progress, [0, 0.12], [1, 0.4])

  /*
   * The section's height is the animation's runway, and the animation is pure
   * decoration: at 320vh a 375px phone asks for over two thousand pixels of
   * thumb work before the customer reaches a single product, so small screens
   * get a shorter runway. With reduced motion on there is nothing to scrub at
   * all, so it collapses to one screen.
   */
  const runway = still ? 'h-dvh' : 'h-[200vh] sm:h-[320vh]'

  return (
    <section
      ref={ref}
      aria-labelledby="fieldstrip-heading"
      className={`relative border-y border-steel-800 bg-steel-950 ${runway}`}
    >
      {/* min-h-0 lets the diagram shrink to whatever height is left, so it
          still fits when browser chrome eats into the viewport. */}
      <div className="sticky top-0 flex h-dvh min-h-0 flex-col overflow-hidden pt-18 pb-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-engrave"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brass-500/10 blur-[120px]"
        />

        {/* min-h-0 on BOTH this and the svg: without it a flex child's
            min-height defaults to its content size, so the diagram keeps its
            intrinsic height and spills past the bottom of a short viewport. */}
        <div className="relative mx-auto flex w-full max-w-7xl min-h-0 flex-1 flex-col justify-center gap-5 px-5 sm:px-8">
          <motion.div
            className="max-w-2xl shrink-0"
            style={still ? undefined : { opacity: headingOpacity }}
          >
            <p className="text-eyebrow">Know your firearm</p>
            <h2
              id="fieldstrip-heading"
              className="mt-2 font-display text-3xl font-700 tracking-tight uppercase sm:text-4xl lg:text-5xl"
            >
              Field strip, part by part
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-steel-400 sm:text-base">
              Scroll to take it down — scroll back to put it together. Every
              firearm we sell comes with a walkthrough of exactly this, in store.
            </p>
          </motion.div>

          <svg
            viewBox={compact ? VIEW_BOX_COMPACT : VIEW_BOX}
            preserveAspectRatio="xMidYMid meet"
            fill="none"
            className="min-h-0 w-full flex-1"
            role="img"
            aria-label="Exploded diagram of a semi-automatic pistol separating into slide, barrel, recoil spring, frame and magazine"
          >
            <defs>
              {/* userSpaceOnUse: several strokes are axis-aligned, and an
                  objectBoundingBox gradient collapses on a zero-area box. */}
              <linearGradient
                id="pistol-stroke"
                gradientUnits="userSpaceOnUse"
                x1="120"
                y1="0"
                x2="900"
                y2="0"
              >
                <stop offset="0%" stopColor="var(--color-steel-500)" />
                <stop offset="42%" stopColor="var(--color-brass-400)" />
                <stop offset="78%" stopColor="var(--color-brass-300)" />
                <stop offset="100%" stopColor="var(--color-steel-400)" />
              </linearGradient>
            </defs>

            {PISTOL_PARTS.map((part) => (
              <PistolPart
                key={part.id}
                part={part}
                progress={progress}
                still={still}
                compact={compact}
              />
            ))}
          </svg>
        </div>
      </div>
    </section>
  )
}
