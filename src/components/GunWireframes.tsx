import { motion, useReducedMotion } from 'framer-motion'
import { useId } from 'react'

/**
 * One line-art silhouette per firearm class, in the same stroked-path language
 * as the hero rifle. All share a 900x300 viewBox so classes read at consistent
 * scale beside each other.
 *
 * Construction rules, applied to every class so the set looks like one system:
 *  - bore line at y = 150; receiver spans y 134-178 on the sporters
 *  - each assembly is ONE continuous outline, never butted-together boxes
 *  - no two strokes share an edge or cross, with the single deliberate
 *    exception of a bolt handle passing over the receiver's lower edge
 *  - furniture below the bore line, sights and optics above it
 */

export type Stroke = { d: string; weight?: number }

/**
 * Shared sporter buttstock: comb, butt pad, toe, belly, pistol grip, then up
 * to the receiver's lower edge. Drawn as one line from receiver top to
 * receiver bottom, so it always meets the action cleanly.
 */
const SPORTER_STOCK =
  'M300 134 C240 134 165 139 72 146 L90 208 C124 205 148 201 165 196 C185 192 196 203 202 213 C210 226 224 210 236 196 C250 182 262 178 274 178 L300 178'

/** Trigger guard hanging under a sporter receiver, plus its trigger. */
const SPORTER_GUARD: Stroke[] = [
  { d: 'M302 178 C302 198 313 208 331 208 L345 208 C363 208 373 198 373 178', weight: 2 },
  { d: 'M322 186 C323 196 320 202 315 206', weight: 2.4 },
]

/**
 * Scoped bolt-action. Also drives the hero animation, so strokes are ordered
 * the way the rifle goes together: barrel, action, furniture, then the optic.
 */
export const CENTREFIRE: Stroke[] = [
  // Heavy barrel with a rounded muzzle crown
  { d: 'M430 142 H840 a8 8 0 0 1 0 16 H430' },
  { d: 'M700 142 l6 -14 h11 l6 14', weight: 1.6 },
  // Receiver and ejection port
  { d: 'M300 134 H430 V178 H300 Z' },
  { d: 'M334 142 h56 v16 h-56 Z', weight: 1.4 },
  // Furniture
  { d: SPORTER_STOCK },
  { d: 'M300 178 H520 c 16 0 24 -6 26 -16' },
  ...SPORTER_GUARD,
  // Hinged floorplate magazine, forward of the trigger group
  { d: 'M372 178 v26 h42 v-26' },
  // Bolt handle and knob
  { d: 'M414 166 l18 18', weight: 3.2 },
  { d: 'M449 190 a9 9 0 1 1 -18 0 a9 9 0 0 1 18 0', weight: 2 },
  /*
   * Optic as one continuous outline — eyepiece bell, tube, turret, objective
   * bell — so no two edges are painted on top of each other.
   */
  {
    d: 'M296 92 h34 v8 h22 v-18 h24 v18 h24 v-12 h34 a6 6 0 0 1 6 6 v26 a6 6 0 0 1 -6 6 h-34 v-12 h-70 v8 h-34 a6 6 0 0 1 -6 -6 v-18 a6 6 0 0 1 6 -6 Z',
  },
  // Rings clamping the tube down onto the receiver
  { d: 'M336 114 v20 h12 v-20', weight: 1.8 },
  { d: 'M384 114 v20 h12 v-20', weight: 1.8 },
]

/** Rimfire: slim barrel, tube magazine slung underneath, iron sights. */
const RIMFIRE: Stroke[] = [
  { d: 'M420 144 H832 a6 6 0 0 1 0 12 H420' },
  // Tube magazine, clear of the forend tip
  { d: 'M470 166 H818 a5 5 0 0 1 0 10 H470', weight: 1.8 },
  // Barrel band tying the tube to the barrel
  { d: 'M660 156 v10', weight: 1.6 },
  { d: 'M300 134 H420 V178 H300 Z' },
  { d: 'M334 142 h52 v16 h-52 Z', weight: 1.4 },
  // Iron sights
  { d: 'M330 134 v-13 h18 v13', weight: 1.8 },
  { d: 'M770 144 l5 -12 h9 l5 12', weight: 1.6 },
  { d: SPORTER_STOCK },
  // Shorter forend so it never reaches the magazine tube
  { d: 'M300 178 H428 c 12 0 18 -4 20 -10' },
  ...SPORTER_GUARD,
  { d: 'M404 166 l16 16', weight: 2.8 },
  { d: 'M437 188 a9 9 0 1 1 -18 0 a9 9 0 0 1 18 0', weight: 2 },
]

/** Over-under shotgun: stacked barrels, break action, top lever. */
const SHOTGUN: Stroke[] = [
  { d: 'M410 134 H830 a8 8 0 0 1 0 16 H410' },
  { d: 'M410 158 H830 a8 8 0 0 1 0 16 H410' },
  // Bead
  { d: 'M740 134 v-9', weight: 1.6 },
  // Break action, taller than a bolt receiver
  { d: 'M300 126 H410 V188 H300 Z' },
  // Top lever
  { d: 'M336 126 v-16 h34 a8 8 0 0 1 0 16', weight: 2 },
  // Forend, wrapped under the lower barrel
  { d: 'M418 174 v12 a6 6 0 0 0 6 6 h116 c 16 0 22 -8 24 -18' },
  { d: 'M456 192 v-18', weight: 1.4 },
  { d: 'M496 192 v-18', weight: 1.4 },
  // Stock, matched to the deeper action
  {
    d: 'M300 126 C240 126 165 132 72 140 L90 206 C124 203 148 199 165 194 C185 190 196 202 202 214 C210 228 224 212 236 198 C250 186 262 188 274 188 L300 188',
  },
  { d: 'M302 188 C302 210 313 220 331 220 L347 220 C365 220 375 210 375 188', weight: 2 },
  { d: 'M322 196 C323 206 320 212 315 216', weight: 2.4 },
]

/** Break-barrel air rifle: hinged barrel, compression tube, cocking linkage. */
const AIR_RIFLE: Stroke[] = [
  { d: 'M452 146 H812' },
  // Muzzle brake
  { d: 'M812 140 h22 a6 6 0 0 1 6 6 v14 a6 6 0 0 1 -6 6 h-22', weight: 2 },
  { d: 'M452 160 H812' },
  // Hinge block and pivot pin
  { d: 'M420 140 h32 v30 h-32' },
  { d: 'M445 155 a9 9 0 1 1 -18 0 a9 9 0 0 1 18 0', weight: 1.8 },
  // Compression tube
  {
    d: 'M262 136 H412 a8 8 0 0 1 8 8 v22 a8 8 0 0 1 -8 8 H262 a8 8 0 0 1 -8 -8 v-22 a8 8 0 0 1 8 -8 Z',
  },
  // Cocking linkage running back from the hinge, under the tube
  { d: 'M430 172 L344 198', weight: 1.8 },
  // Rear aperture sight
  { d: 'M282 136 v-14 h20 v14', weight: 1.8 },
  // Stock, tied to the tube rather than a receiver
  {
    d: 'M262 136 C210 136 145 142 72 148 L90 210 C124 207 148 203 165 198 C185 194 196 206 202 217 C210 230 224 214 236 200 C246 188 254 176 262 174',
  },
  { d: 'M260 174 C260 194 271 204 288 204 L302 204 C319 204 329 194 329 174', weight: 2 },
  { d: 'M280 182 C281 192 278 198 273 202', weight: 2.4 },
]

/** Semi-auto pistol, scaled to sit comfortably in the same canvas. */
const HANDGUN: Stroke[] = [
  // Slide
  {
    d: 'M312 90 H648 a12 12 0 0 1 12 12 v26 a12 12 0 0 1 -12 12 H312 a12 12 0 0 1 -12 -12 v-26 a12 12 0 0 1 12 -12 Z',
  },
  { d: 'M470 98 h80 v20 h-80 Z', weight: 1.5 },
  // Cocking serrations
  { d: 'M320 102 v24', weight: 1.5 },
  { d: 'M334 102 v24', weight: 1.5 },
  { d: 'M348 102 v24', weight: 1.5 },
  { d: 'M620 102 v24', weight: 1.5 },
  { d: 'M634 102 v24', weight: 1.5 },
  // Sights
  { d: 'M322 90 v-12 h24 v12', weight: 1.8 },
  { d: 'M626 90 v-11 h14 v11', weight: 1.8 },
  // Frame: dust cover, grip front, grip base, backstrap
  {
    d: 'M300 144 H612 a8 8 0 0 1 8 8 v10 a8 8 0 0 1 -8 8 H400 l-30 90 a12 12 0 0 1 -11 8 h-52 a10 10 0 0 1 -10 -13 Z',
  },
  // Grip texture, inside the frame outline
  { d: 'M370 196 l-46 6', weight: 1.3 },
  { d: 'M364 216 l-46 6', weight: 1.3 },
  { d: 'M358 236 l-46 6', weight: 1.3 },
  // Trigger guard, hung between the grip front and the dust cover
  { d: 'M400 170 C400 190 412 206 431 206 L445 206 C463 206 473 192 473 170' },
  { d: 'M424 180 C426 194 422 201 417 206', weight: 2.4 },
  // Takedown pin
  { d: 'M359 158 a9 9 0 1 1 -18 0 a9 9 0 0 1 18 0', weight: 1.6 },
]

/**
 * Used stock: the same bolt-action minus its optic, with a consignment tag
 * hanging off the trigger guard — reads as "second-hand" far more clearly
 * than a rack of receding silhouettes did.
 */
const USED: Stroke[] = [
  ...CENTREFIRE.slice(0, -3),
  // Tag string
  { d: 'M336 202 v40', weight: 1.5 },
  // Tag body
  {
    d: 'M300 242 h72 a8 8 0 0 1 8 8 v38 a8 8 0 0 1 -8 8 h-72 a8 8 0 0 1 -8 -8 v-38 a8 8 0 0 1 8 -8 Z',
  },
  // Punch hole and written lines
  { d: 'M341 256 a5 5 0 1 1 -10 0 a5 5 0 0 1 10 0', weight: 1.4 },
  { d: 'M308 274 h56', weight: 1.4 },
  { d: 'M308 284 h36', weight: 1.4 },
]

export const WIREFRAMES: Record<string, Stroke[]> = {
  centrefire: CENTREFIRE,
  rimfire: RIMFIRE,
  shotguns: SHOTGUN,
  'air-rifles': AIR_RIFLE,
  handguns: HANDGUN,
  used: USED,
}

type Props = {
  slug: string
  className?: string
  /** Draw the strokes on when scrolled into view instead of rendering static. */
  animate?: boolean
  /** Seconds per stroke. */
  speed?: number
}

export default function GunWireframe({
  slug,
  className,
  animate = true,
  speed = 1.1,
}: Props) {
  const strokes = WIREFRAMES[slug]
  const reduceMotion = useReducedMotion()
  // Gradient ids must be unique — several wireframes share a page.
  const gradientId = `wf-${useId().replace(/:/g, '')}`

  if (!strokes) return null

  const shouldDraw = animate && !reduceMotion

  return (
    <svg
      viewBox="0 0 900 300"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* userSpaceOnUse: axis-aligned strokes have a zero-area bounding box,
            which makes an objectBoundingBox gradient paint nothing. */}
        <linearGradient
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          x1="60"
          y1="0"
          x2="860"
          y2="0"
        >
          <stop offset="0%" stopColor="var(--color-steel-500)" />
          <stop offset="40%" stopColor="var(--color-brass-400)" />
          <stop offset="76%" stopColor="var(--color-brass-300)" />
          <stop offset="100%" stopColor="var(--color-steel-400)" />
        </linearGradient>
      </defs>

      {strokes.map((s, i) => (
        <motion.path
          key={`${slug}-${i}`}
          d={s.d}
          stroke={`url(#${gradientId})`}
          strokeWidth={s.weight ?? 2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={shouldDraw ? { pathLength: 0, opacity: 0 } : false}
          whileInView={shouldDraw ? { pathLength: 1, opacity: 1 } : undefined}
          viewport={{ once: true, margin: '-40px' }}
          transition={{
            pathLength: {
              duration: speed,
              delay: i * 0.035,
              ease: [0.16, 1, 0.3, 1],
            },
            opacity: { duration: 0.15, delay: i * 0.035 },
          }}
        />
      ))}
    </svg>
  )
}
