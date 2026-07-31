import { useEffect, useRef, useState } from 'react'
import { useInView, useReducedMotion } from 'framer-motion'
import { EASE } from '../lib/motion'

type Props = {
  to: number
  suffix?: string
  duration?: number
}

/**
 * Counts up once when scrolled into view. Renders the final value immediately
 * under reduced-motion so the number is never withheld from the reader.
 */
export default function Counter({ to, suffix = '', duration = 1400 }: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })
  const reduceMotion = useReducedMotion()
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!isInView) return
    if (reduceMotion) {
      setValue(to)
      return
    }

    let frame = 0
    const start = performance.now()
    const [x1, y1, x2, y2] = EASE

    // Cubic-bezier sampled by Newton-free bisection — accurate enough at 60fps.
    const bezier = (t: number) => {
      let lo = 0
      let hi = 1
      for (let i = 0; i < 12; i++) {
        const mid = (lo + hi) / 2
        const u = 1 - mid
        const x = 3 * u * u * mid * x1 + 3 * u * mid * mid * x2 + mid ** 3
        if (x < t) lo = mid
        else hi = mid
      }
      const m = (lo + hi) / 2
      const u = 1 - m
      return 3 * u * u * m * y1 + 3 * u * m * m * y2 + m ** 3
    }

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      setValue(Math.round(bezier(t) * to))
      if (t < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [isInView, reduceMotion, to, duration])

  return (
    <span ref={ref} className="tabular-nums">
      {value}
      {suffix}
    </span>
  )
}
