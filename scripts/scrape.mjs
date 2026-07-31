/**
 * Scrapes the live Fisher Firearms OpenCart store into local JSON + images.
 *
 * Run manually — never part of the app build:
 *   node scripts/scrape.mjs --limit 20     # dry-ish run over a few categories
 *   node scripts/scrape.mjs                # full catalogue
 *   node scripts/scrape.mjs --images-only  # re-download missing images
 *
 * Resumable: progress is checkpointed to scripts/.cache/scrape-state.json, so
 * re-running skips products already fetched. Delete that file to start over.
 *
 * The site's breadcrumbs are useless (always "Home > Product"), so category
 * membership is derived by crawling the /category/... listings instead.
 */
import { mkdir, readFile, writeFile, access } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ORIGIN, absolute, fetchText, fetchBuffer } from './lib/http.mjs'
import {
  extractCategoryPaths,
  extractListingItems,
  extractPagination,
  parseProduct,
  stripTags,
} from './lib/parse.mjs'

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../..')
const CACHE = path.join(ROOT, 'scripts/.cache')
const STATE_FILE = path.join(CACHE, 'scrape-state.json')
const IMAGE_DIR = path.join(ROOT, 'public/products')

const args = process.argv.slice(2)
const LIMIT = Number(args.find((a) => a.startsWith('--limit'))?.split('=')[1] ?? (args.includes('--limit') ? args[args.indexOf('--limit') + 1] : 0)) || 0
const IMAGES_ONLY = args.includes('--images-only')

const exists = (p) => access(p).then(() => true, () => false)

async function loadState() {
  try {
    return JSON.parse(await readFile(STATE_FILE, 'utf8'))
  } catch {
    return { categories: {}, products: {}, pages: {}, done: { discover: false } }
  }
}

async function saveState(state) {
  await mkdir(CACHE, { recursive: true })
  await writeFile(STATE_FILE, JSON.stringify(state), 'utf8')
}

/** Walk the nav to collect every category path (the nav is on every page). */
async function discoverCategories() {
  const home = await fetchText(ORIGIN + '/')
  if (!home) throw new Error('could not fetch homepage')
  const paths = extractCategoryPaths(home)
  console.log(`discovered ${paths.length} category paths from the nav`)
  return paths
}

/** Fetch every page of a category listing; returns listing items. */
async function crawlCategory(catPath) {
  const bySlug = new Map()
  let page = 1
  let pages = 1
  do {
    const url = `${ORIGIN}${catPath}?limit=100${page > 1 ? `&page=${page}` : ''}`
    const html = await fetchText(url)
    if (!html) break
    for (const item of extractListingItems(html)) {
      if (!bySlug.has(item.slug)) bySlug.set(item.slug, item)
    }
    if (page === 1) pages = extractPagination(html).pages || 1
    page++
  } while (page <= pages)
  return [...bySlug.values()]
}

async function downloadImage(product) {
  // Product pages render a 400x400; fall back to the listing's 120x120 thumb.
  const raw = product.imageSrc ?? product.thumb
  if (!raw) return null
  const src = absolute(raw)
  const ext = (src.match(/\.(jpe?g|png|gif|webp)/i)?.[1] ?? 'jpg').toLowerCase()
  const file = `${product.slug}.${ext === 'jpeg' ? 'jpg' : ext}`
  const dest = path.join(IMAGE_DIR, file)
  if (await exists(dest)) return `/products/${file}`
  const buf = await fetchBuffer(src)
  if (!buf || buf.length < 500) return null
  await mkdir(IMAGE_DIR, { recursive: true })
  await writeFile(dest, buf)
  return `/products/${file}`
}

/**
 * Grab the shop's own informational copy. The old site has no About page —
 * only a contact page and OpenCart's stock gift-voucher form — so About copy
 * is authored fresh from the facts on the homepage.
 */
async function scrapeInfoPages() {
  const targets = {
    home: '/',
    contact: '/contact',
    voucher: '/account/voucher',
    sitemap: '/sitemap',
  }
  const out = {}
  for (const [key, p] of Object.entries(targets)) {
    const html = await fetchText(ORIGIN + p)
    if (!html) {
      console.log(`  info: ${key} -> not found`)
      continue
    }
    // Take everything inside the main content column, minus nav and footer.
    const start = html.indexOf('id="content"')
    const end = html.indexOf('id="footer"')
    const slice = start >= 0 ? html.slice(start, end > start ? end : undefined) : html
    const text = stripTags(slice)
    const emails = [...new Set(html.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi) ?? [])]
      .filter((e) => !/\.(png|jpe?g|gif|css|js)$/i.test(e))
    out[key] = { path: p, text: text.slice(0, 8000), emails }
    console.log(`  info: ${key} -> ${text.length} chars, emails: ${emails.join(', ') || 'none'}`)
  }
  return out
}

async function main() {
  const state = await loadState()

  if (!IMAGES_ONLY) {
    // 1. Categories -> product slug membership
    let catPaths = Object.keys(state.categories)
    if (!state.done.discover) {
      catPaths = await discoverCategories()
      state.done.discover = true
      await saveState(state)
    }
    if (LIMIT) catPaths = catPaths.slice(0, LIMIT)

    let i = 0
    for (const catPath of catPaths) {
      i++
      if (state.categories[catPath]) continue
      const items = await crawlCategory(catPath)
      state.categories[catPath] = items
      console.log(`[${i}/${catPaths.length}] ${catPath} -> ${items.length} products`)
      if (i % 5 === 0) await saveState(state)
    }
    await saveState(state)

    // 2. Product detail for every slug seen in any category. The listing's
    //    cartState is the shop's own sale classification — keep it.
    const listing = new Map()
    for (const items of Object.values(state.categories)) {
      for (const item of items) if (!listing.has(item.slug)) listing.set(item.slug, item)
    }
    const allSlugs = [...listing.keys()]
    console.log(`\n${allSlugs.length} unique products to fetch`)
    let n = 0
    for (const slug of allSlugs) {
      n++
      if (state.products[slug]) continue
      const item = listing.get(slug)
      const html = await fetchText(`${ORIGIN}/${slug}`)
      const product = html ? parseProduct(html, `/${slug}`) : null
      state.products[slug] = product
        ? { ...product, cartState: item.cartState, thumb: item.thumb }
        : { ...item, description: '', missing: true }
      if (n % 25 === 0) {
        console.log(`  [${n}/${allSlugs.length}] ${(product?.name ?? item.name)?.slice(0, 50)}`)
        await saveState(state)
      }
    }
    await saveState(state)

    // 3. Info pages
    console.log('\nfetching info pages')
    state.info = await scrapeInfoPages()
    await saveState(state)
  }

  // 4. Images
  const products = Object.values(state.products).filter((p) => !p.missing)
  console.log(`\ndownloading images for ${products.length} products`)
  let got = 0
  let k = 0
  for (const p of products) {
    k++
    if (p.image) { got++; continue }
    const rel = await downloadImage(p)
    if (rel) { p.image = rel; got++ }
    if (k % 50 === 0) {
      console.log(`  [${k}/${products.length}] ${got} images`)
      await saveState(state)
    }
  }
  await saveState(state)

  const withPrice = products.filter((p) => p.price != null).length
  console.log(`\ndone: ${products.length} products, ${withPrice} priced, ${got} images`)
  console.log(`state: ${path.relative(ROOT, STATE_FILE)}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
