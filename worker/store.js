/**
 * Storage.
 *
 * Everything the shop changes — stock counts, price changes, hidden items and
 * products they added themselves — lives in Workers KV. The important rule
 * here is that the *read* path never enumerates the namespace.
 *
 * Listing a KV namespace costs a "list operation", and the free plan allows
 * 1,000 a day. The catalogue asks for the live layer on every page load, so
 * enumerating on read put the whole shop about 500 visitors away from a day
 * with no stock levels and no working checkout. Instead the merged layer is
 * kept in a single key and rewritten whenever something changes: one read on
 * the hot path, no lists at all.
 *
 * The snapshot is the source of truth. `rebuild()` can reconstruct it from the
 * older per-item keys, and runs only if the key is missing.
 */

const SNAPSHOT_KEY = 'snapshot:live'

/** Shape of the snapshot: `{ overrides: {slug: {...}}, products: [...] }`. */
const EMPTY = { overrides: {}, products: [] }

/* --------------------------------------------------------------- reading */

/**
 * The live layer, in one KV read.
 *
 * A missing snapshot means this Worker has just been deployed over the older
 * per-key layout, so it is rebuilt once and then read cheaply forever after.
 */
export async function readSnapshot(env) {
  const snapshot = await env.SHOP_KV.get(SNAPSHOT_KEY, 'json')
  if (snapshot) return snapshot
  return rebuild(env)
}

/** Looks up one admin-created product without loading anything else. */
export async function findCustomProduct(env, slug) {
  const { products } = await readSnapshot(env)
  return products.find((p) => p.slug === slug) ?? null
}

/* --------------------------------------------------------------- writing */

/**
 * Applies a change and saves the snapshot.
 *
 * Read-modify-write of a single key means two edits landing in the same
 * instant could lose one. For a shop with one person at the keyboard that is
 * the right trade for staying inside the free plan — and the admin panel waits
 * for the typing to stop before saving, so a burst of taps is one write, not
 * twenty. KV also limits writes to the same key to one per second.
 */
async function mutate(env, change) {
  const snapshot = (await readSnapshot(env)) ?? EMPTY
  const next = change(snapshot) ?? snapshot
  await env.SHOP_KV.put(SNAPSHOT_KEY, JSON.stringify(next))
  return next
}

/** Merges a patch into one product's override. Undefined fields are left alone. */
export function setOverride(env, slug, patch) {
  return mutate(env, (snapshot) => {
    const current = snapshot.overrides[slug] ?? {}
    const merged = { ...current, ...patch }

    // Drop keys that carry no meaning, so the snapshot stays small.
    for (const [key, value] of Object.entries(merged)) {
      if (value === undefined || value === null) delete merged[key]
    }
    // `stock: null` is meaningful on the way in — it means "stop counting" —
    // but once removed the absent key says the same thing.
    if (Object.keys(merged).length === 0) delete snapshot.overrides[slug]
    else snapshot.overrides[slug] = merged

    return snapshot
  })
}

export function upsertProduct(env, product) {
  return mutate(env, (snapshot) => {
    const at = snapshot.products.findIndex((p) => p.slug === product.slug)
    if (at === -1) snapshot.products.push(product)
    else snapshot.products[at] = { ...snapshot.products[at], ...product }
    return snapshot
  })
}

export function removeProduct(env, slug) {
  return mutate(env, (snapshot) => {
    snapshot.products = snapshot.products.filter((p) => p.slug !== slug)
    delete snapshot.overrides[slug]
    return snapshot
  })
}

/**
 * Draws stock down for a paid order, in one write for the whole basket.
 * Lines whose product isn't being counted are skipped.
 */
export function drawDownStock(env, lines) {
  return mutate(env, (snapshot) => {
    for (const line of lines) {
      const override = snapshot.overrides[line.slug]
      if (!override || override.stock == null) continue
      override.stock = Math.max(0, override.stock - line.qty)
    }
    return snapshot
  })
}

/* -------------------------------------------------------------- recovery */

/**
 * Rebuilds the snapshot from the per-item keys written by the previous
 * version. This is the only code that lists the namespace, and it runs once —
 * on the first request after a deploy, or if the snapshot is ever cleared.
 */
export async function rebuild(env) {
  const snapshot = { overrides: {}, products: [] }

  for (const prefix of ['override:', 'newproduct:']) {
    let cursor
    do {
      const page = await env.SHOP_KV.list({ prefix, cursor })
      await Promise.all(
        page.keys.map(async ({ name }) => {
          const value = await env.SHOP_KV.get(name, 'json')
          if (!value) return
          if (prefix === 'override:') snapshot.overrides[name.slice(prefix.length)] = value
          else snapshot.products.push(value)
        })
      )
      cursor = page.list_complete ? undefined : page.cursor
    } while (cursor)
  }

  await env.SHOP_KV.put(SNAPSHOT_KEY, JSON.stringify(snapshot))
  return snapshot
}

/* ----------------------------------------------------------------- edge */

/**
 * Serves a response from Cloudflare's edge cache when one is already there,
 * and stores it otherwise.
 *
 * Stock levels are allowed to be a few seconds stale — the alternative is
 * every visitor waiting on a KV round trip and spending quota to learn the
 * same thing the last visitor just learned. Anything the shop changes shows up
 * within `seconds`, and the admin panel bypasses the cache entirely.
 */
export async function cached(request, seconds, build) {
  const cache = caches.default
  const key = new Request(new URL(request.url).toString(), { method: 'GET' })

  const hit = await cache.match(key)
  if (hit) return hit

  const response = await build()
  if (response.ok) {
    const toStore = response.clone()
    toStore.headers.set('Cache-Control', `public, max-age=${seconds}`)
    await cache.put(key, toStore)
  }
  return response
}

/** Clears a cached path so the shop's own changes appear straight away. */
export async function invalidate(request, path) {
  const url = new URL(request.url)
  url.pathname = path
  url.search = ''
  await caches.default.delete(new Request(url.toString(), { method: 'GET' }))
}
