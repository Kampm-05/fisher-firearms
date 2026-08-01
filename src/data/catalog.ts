/**
 * Catalogue access. Product data is scraped from the live shop
 * (`scripts/scrape.mjs` -> `scripts/categorise.mjs`) into per-category JSON.
 *
 * Categories are loaded with dynamic `import()` so the ~800-product catalogue
 * never lands in the main bundle — only the department you're looking at.
 *
 * On top of that static data sits a live layer from the shop's API: stock
 * counts, price changes, hidden items and anything the shop added through the
 * admin panel. If the API is unset or unreachable the static data is used
 * as-is, so the site keeps working regardless.
 */
import { API_URL, fetchOverrides, type OverridesResponse } from '../lib/api'

export type SaleType =
  /** Shippable: can be bought and posted like ordinary retail. */
  | 'ship'
  /** Licensed goods: reserved online, collected in store or dealer-transferred. */
  | 'reserve'
  /** Special order — the shop confirms price and availability first. */
  | 'enquire'

export type Product = {
  slug: string
  name: string
  price: number | null
  brand: string | null
  code: string | null
  image: string | null
  description: string
  availability: string | null
  /** The shop's own deepest sub-category, e.g. "Rifle Scopes". */
  subLabel: string | null
  category: string
  categories: string[]
  saleType: SaleType
  /**
   * Units on hand, from the shop's admin panel. `null` (the default) means
   * the shop isn't counting this line — it's neither in stock nor sold out.
   */
  stock?: number | null
  /** True when the shop added this product themselves rather than the scrape. */
  custom?: boolean
}

export const isSoldOut = (p: Product) => p.stock === 0

export type CatalogIndexEntry = {
  category: string
  count: number
  ship: number
  reserve: number
}

/**
 * Vite resolves this glob at build time into one lazy chunk per category.
 * Keys look like './catalog/optics.json'.
 */
const loaders = import.meta.glob<{ default: Product[] }>('./catalog/*.json')

const cache = new Map<string, Promise<Product[]>>()

function loaderFor(category: string) {
  return loaders[`./catalog/${category}.json`]
}

/** True when the scrape produced data for this category. */
export function hasCatalog(category: string): boolean {
  return Boolean(loaderFor(category))
}

/**
 * The shop's live changes, fetched once per page load. Kept as a single shared
 * promise so twenty product cards don't each hit the API.
 */
let overridesPromise: Promise<OverridesResponse> | null = null

function liveChanges() {
  overridesPromise ??= fetchOverrides()
  return overridesPromise
}

/** Discards the cache so the next read re-fetches — used after admin edits. */
export function refreshCatalog() {
  overridesPromise = null
  cache.clear()
}

/** Layers the shop's stock/price/hidden changes over the built-in catalogue. */
function applyOverrides(
  products: Product[],
  category: string,
  live: OverridesResponse
): Product[] {
  const merged = products
    .filter((p) => !live.overrides[p.slug]?.hidden)
    .map((p) => {
      const o = live.overrides[p.slug]
      if (!o) return p
      return {
        ...p,
        price: o.price ?? p.price,
        stock: o.stock ?? null,
      }
    })

  // Products the shop created themselves live only in the API.
  for (const raw of live.products as Product[]) {
    if (raw.category !== category) continue
    if (live.overrides[raw.slug]?.hidden) continue
    merged.push({
      ...raw,
      custom: true,
      price: live.overrides[raw.slug]?.price ?? raw.price,
      stock: live.overrides[raw.slug]?.stock ?? null,
    })
  }

  return merged.sort((a, b) => a.name.localeCompare(b.name))
}

/** Products for one category slug. Resolves to [] when there's no data yet. */
export function loadCategory(category: string): Promise<Product[]> {
  const cached = cache.get(category)
  if (cached) return cached

  const loader = loaderFor(category)
  const base: Promise<Product[]> = loader
    ? loader().then((m) => m.default ?? [])
    : Promise.resolve([])

  const promise = Promise.all([base, liveChanges()]).then(([products, live]) =>
    applyOverrides(products, category, live)
  )

  cache.set(category, promise)
  return promise
}

/** Find a single product by slug, searching categories until it turns up. */
export async function findProduct(slug: string): Promise<Product | null> {
  const categories = Object.keys(loaders)
    .map((k) => k.replace('./catalog/', '').replace('.json', ''))
    .filter((c) => c !== 'index' && c !== 'uncategorised')

  for (const category of categories) {
    const products = await loadCategory(category)
    const hit = products.find((p) => p.slug === slug)
    if (hit) return hit
  }
  return null
}

/**
 * Product images live in public/ and are stored as root-absolute paths
 * ("/products/foo.jpg"). Under a GitHub Pages project site the app is served
 * from /<repo>/, so those need the base prefix — Vite only rewrites asset URLs
 * it can see in source and HTML, not strings inside JSON data.
 */
export function productImage(image: string | null): string | null {
  if (!image) return null
  if (/^(https?:)?\/\//.test(image) || image.startsWith('data:')) return image
  // Photos the shop uploaded are served by the API, not from the site build.
  if (image.startsWith('/api/')) return API_URL + image
  return import.meta.env.BASE_URL.replace(/\/$/, '') + image
}

const AUD = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  minimumFractionDigits: 2,
})

export function formatPrice(price: number | null): string {
  return price == null ? 'POA' : AUD.format(price)
}

export const SALE_LABEL: Record<SaleType, string> = {
  ship: 'Ships to you',
  reserve: 'In store · licence required',
  enquire: 'Order in',
}
