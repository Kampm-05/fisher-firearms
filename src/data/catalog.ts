/**
 * Catalogue access. Product data is scraped from the live shop
 * (`scripts/scrape.mjs` -> `scripts/categorise.mjs`) into per-category JSON.
 *
 * Categories are loaded with dynamic `import()` so the ~800-product catalogue
 * never lands in the main bundle — only the department you're looking at.
 */

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
}

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

/** Products for one category slug. Resolves to [] when there's no data yet. */
export function loadCategory(category: string): Promise<Product[]> {
  const cached = cache.get(category)
  if (cached) return cached

  const loader = loaderFor(category)
  const promise: Promise<Product[]> = loader
    ? loader().then((m) => m.default ?? [])
    : Promise.resolve([])

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
  if (/^(https?:)?\/\//.test(image)) return image
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
