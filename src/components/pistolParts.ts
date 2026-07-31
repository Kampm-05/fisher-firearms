/**
 * Side-profile semi-auto pistol, grouped into the five assemblies you separate
 * during a field strip. Geometry matches the handgun wireframe on the Firearms
 * page, so the two read as the same gun.
 *
 * All groups share one coordinate space and nest correctly at rest. Parts
 * marked `internal` are hidden while assembled and fade in as they separate,
 * so the resting state is a clean outline rather than overlapping strokes.
 *
 * Exploded slots are laid out in two columns — frame and magazine left,
 * slide / barrel / spring right — with no two parts overlapping. Changing a
 * `to` vector means re-checking that, and that the part stays inside VIEW_BOX.
 */

export const VIEW_BOX = '0 -20 1030 460'

/**
 * Narrow screens get a single stacked column on a portrait canvas. The box is
 * cropped to the union of the assembled pistol (x 290-660) and the stacked
 * column (x 150-510) so neither state wastes horizontal space.
 */
export const VIEW_BOX_COMPACT = '140 20 530 610'

type Vec = { x: number; y: number }

export type Part = {
  id: string
  paths: { d: string; weight?: number }[]
  to: Vec
  toCompact: Vec
  /** Scroll fraction (0-1) at which this group starts moving. */
  start: number
  /** Nested inside another part at rest — fades in as it separates. */
  internal?: boolean
}

/** How much of the scroll each part takes to travel clear. */
export const TRAVEL = 0.55

export const PISTOL_PARTS: Part[] = [
  {
    // Drop the magazine first — the order you'd actually do it in.
    id: 'magazine',
    to: { x: -240, y: 130 },
    toCompact: { x: -154, y: 322 },
    start: 0,
    internal: true,
    paths: [
      { d: 'M320 178 h58 l-12 84 h-58 Z' },
      // Floorplate
      { d: 'M308 262 l-4 16 h62 l4 -16', weight: 2 },
      // Witness holes
      { d: 'M334 200 h14', weight: 1.3 },
      { d: 'M331 224 h14', weight: 1.3 },
      { d: 'M328 248 h14', weight: 1.3 },
      // Feed lips
      { d: 'M320 178 l12 10 l30 -10', weight: 1.6 },
    ],
  },
  {
    id: 'slide',
    to: { x: 300, y: -60 },
    toCompact: { x: -150, y: -38 },
    start: 0.1,
    paths: [
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
    ],
  },
  {
    id: 'frame',
    to: { x: -250, y: -20 },
    toCompact: { x: -140, y: 156 },
    start: 0.16,
    paths: [
      // Dust cover, grip front, grip base, backstrap — one continuous outline
      {
        d: 'M300 144 H612 a8 8 0 0 1 8 8 v10 a8 8 0 0 1 -8 8 H400 l-30 90 a12 12 0 0 1 -11 8 h-52 a10 10 0 0 1 -10 -13 Z',
      },
      // Grip texture, inside the outline
      { d: 'M370 196 l-46 6', weight: 1.3 },
      { d: 'M364 216 l-46 6', weight: 1.3 },
      { d: 'M358 236 l-46 6', weight: 1.3 },
      // Trigger guard, hung between the grip front and the dust cover
      { d: 'M400 170 C400 190 412 206 431 206 L445 206 C463 206 473 192 473 170' },
      { d: 'M424 180 C426 194 422 201 417 206', weight: 2.4 },
      // Takedown pin
      { d: 'M359 158 a9 9 0 1 1 -18 0 a9 9 0 0 1 18 0', weight: 1.6 },
    ],
  },
  {
    id: 'spring',
    to: { x: 350, y: 130 },
    toCompact: { x: -210, y: 82 },
    start: 0.26,
    internal: true,
    paths: [
      // Guide rod and coils, sized to sit inside the frame's dust cover
      { d: 'M360 157 H598', weight: 2.6 },
      { d: 'M598 149 h10 a4 4 0 0 1 4 4 v8 a4 4 0 0 1 -4 4 h-10 Z', weight: 1.8 },
      ...Array.from({ length: 12 }, (_, i) => ({
        d: `M${372 + i * 18} 148 l10 18`,
        weight: 1.8,
      })),
    ],
  },
  {
    id: 'barrel',
    to: { x: 330, y: 40 },
    toCompact: { x: -180, y: 50 },
    start: 0.34,
    internal: true,
    paths: [
      { d: 'M380 108 H648 a4 4 0 0 1 4 4 v8 a4 4 0 0 1 -4 4 H380' },
      // Chamber block, kept inside the slide
      { d: 'M380 100 h-42 a8 8 0 0 0 -8 8 v18 a8 8 0 0 0 8 8 h30 l12 -12 Z' },
      // Locking lugs
      { d: 'M346 100 v-8 h12 v8', weight: 1.4 },
      { d: 'M366 100 v-8 h12 v8', weight: 1.4 },
      // Feed ramp
      { d: 'M338 124 l18 10', weight: 1.5 },
    ],
  },
]
