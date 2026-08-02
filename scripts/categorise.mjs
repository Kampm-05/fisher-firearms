/**
 * Turns the raw scrape into the catalogue the app consumes.
 *
 *   node scripts/categorise.mjs
 *
 * Maps the shop's own /category/... paths onto our taxonomy (the six firearm
 * classes in `firearmCategories` and the nine departments in `gearCategories`),
 * then assigns each product a `saleType`.
 *
 * saleType is deliberately NOT just the shop's button. Their site offers
 * "Add to Cart" on some second-hand rifles, but a firearm cannot lawfully be
 * shipped to a customer in SA — it needs a licence, a PTA and a dealer
 * handover. So the legal class wins and only genuinely shippable accessories
 * ever become `ship`.
 */
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../..')
const STATE_FILE = path.join(ROOT, 'scripts/.cache/scrape-state.json')
const OUT_DIR = path.join(ROOT, 'src/data/catalog')

/**
 * Shop category path -> our slug. Longest prefix wins, so specific children
 * can override their parent. `null` means "drop it" (duplicate roll-ups).
 */
const MAP = [
  // Second-hand — one class, regardless of what kind of gun it is
  ['/category/used-guns', 'used'],

  // New firearms
  ['/category/firearms/rifles', 'centrefire'],
  ['/category/firearms/rimfire', 'rimfire'],
  ['/category/firearms/shotgun', 'shotguns'],
  ['/category/firearms/air-rifle', 'air-rifles'],
  ['/category/firearms/handguns', 'handguns'],
  ['/category/firearms', 'centrefire'],

  // Gear departments
  ['/category/ammunition', 'ammunition'],
  ['/category/optics', 'optics'],
  ['/category/reloading', 'reloading'],
  ['/category/safes', 'storage'],
  ['/category/storage', 'storage'],
  ['/category/hunting', 'hunting'],
  ['/category/gun-care', 'gun-care'],
  ['/category/targets', 'targets'],
  ['/category/lighting', 'lighting'],
  ['/category/parts', 'parts'],
  ['/category/accessories', 'parts'],
  ['/category/sups', 'parts'],
  ['/category/fisher-firearms-selection', null],
]

const FIREARM_SLUGS = new Set(['centrefire', 'rimfire', 'shotguns', 'air-rifles', 'handguns', 'used'])

/** Departments whose stock can never be posted to a customer. */
const NEVER_SHIP = new Set(['ammunition'])

/** Name patterns that mean "regulated propellant/primer" wherever they appear. */
const REGULATED = /\b(powder|primers?|propellant|smokeless|adi\s*(ar|as|bm)?\d|gunpowder)\b/i

/** Name patterns that mean "this is a live firearm", used as a safety net. */
const IS_FIREARM = /\b(rifle|shotgun|carbine|pistol|revolver|receiver|lever action|bolt action|pump action)\b/i

/**
 * The shop's own words for a regulated item, wherever they appear.
 *
 * These phrases are lifted straight from the product descriptions — "Cat C
 * sold only to dealer or proof at our premises of a Cat C licence" — and are
 * the most reliable signal there is, because they are the shop stating that
 * the law applies to this line. A name alone never says it: the department is
 * "parts", the name is "Winchester 190", and only the description reveals a
 * Category D trigger assembly.
 */
const LICENCE_TEXT =
  /\bcat(?:egory)?\.?\s*[abcdh]\b|\bdealer (?:only|sale)|\bto dealer\b|our premises|permit to acquire|serial number/i

/**
 * Firearm components that are regulated in their own right. Applied only
 * inside the parts department, because a bore cleaner that mentions "barrel"
 * is a bottle of solvent, not a barrel.
 */
const REGULATED_PART =
  /\b(barrel|receiver|bolt (?:assembly|complete)|trigger (?:group|assembly|mechanism)|magazine|frame|slide arm)\b/i

/**
 * Longest matching prefix wins. Plain `startsWith` (rather than requiring a
 * trailing slash) so the shop's flat one-off paths like
 * `/category/ammunition-centrefire-7mm-prc` land with their parent department.
 */
function resolveCategory(catPath) {
  const path = catPath.toLowerCase()
  let best = null
  for (const [prefix, slug] of MAP) {
    if (path.startsWith(prefix.toLowerCase())) {
      if (!best || prefix.length > best.prefix.length) best = { prefix, slug }
    }
  }
  return best ? best.slug : undefined
}

/** Prefer the deepest shop category as a human-readable sub-label. */
function subLabel(catPath) {
  const tail = catPath.split('/').filter(Boolean).slice(2)
  if (!tail.length) return null
  return tail[tail.length - 1]
    .replace(/-amp-/g, ' & ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function decideSaleType(product, category) {
  // Firearms and ammunition: licensed, in-store / dealer transfer only.
  if (FIREARM_SLUGS.has(category)) return 'reserve'
  if (NEVER_SHIP.has(category)) return 'reserve'
  if (REGULATED.test(product.name)) return 'reserve'

  /*
   * The description is where the shop records the legal class, so it has to be
   * read. Getting this wrong in the lenient direction means posting a Category
   * D component to an unlicensed buyer, so anything ambiguous stays reserve —
   * the cost of being wrong the other way is only that a customer rings up.
   */
  const text = `${product.name} ${product.description ?? ''}`
  if (LICENCE_TEXT.test(text)) return 'reserve'
  if (category === 'parts' && REGULATED_PART.test(text)) return 'reserve'
  if (IS_FIREARM.test(product.name) && !/\b(case|bag|sling|scope|mount|rest|cover|cleaning|kit)\b/i.test(product.name)) {
    return 'reserve'
  }
  // Everything else follows the shop's own button.
  return product.cartState === 'cart' ? 'ship' : 'enquire'
}

async function main() {
  const state = JSON.parse(await readFile(STATE_FILE, 'utf8'))

  // slug -> set of our category slugs, plus the best sub-label we saw
  const membership = new Map()
  const unmapped = new Set()

  for (const [catPath, items] of Object.entries(state.categories)) {
    const category = resolveCategory(catPath)
    if (category === undefined) {
      if (items.length) unmapped.add(catPath)
      continue
    }
    if (category === null) continue
    const label = subLabel(catPath)
    for (const item of items) {
      if (!membership.has(item.slug)) membership.set(item.slug, { cats: new Set(), label: null })
      const entry = membership.get(item.slug)
      entry.cats.add(category)
      if (label && !entry.label) entry.label = label
    }
  }

  const byCategory = new Map()
  const uncategorised = []
  let counted = 0

  // A few category landing pages get scraped as if they were products; they
  // come back carrying the homepage's tagline as their <h1>.
  const NOT_A_PRODUCT = /largest gun shop in adelaide/i

  for (const [slug, product] of Object.entries(state.products)) {
    if (!product || product.missing || !product.name) continue
    if (NOT_A_PRODUCT.test(product.name)) continue
    const entry = membership.get(slug)
    if (!entry || !entry.cats.size) {
      uncategorised.push({ slug, name: product.name })
      continue
    }
    // A product listed under both a firearm class and a department belongs to
    // the firearm class — that's the stricter, legally-relevant home.
    const cats = [...entry.cats]
    const primary = cats.find((c) => FIREARM_SLUGS.has(c)) ?? cats[0]

    const record = {
      slug,
      name: product.name,
      price: product.price ?? null,
      brand: product.brand ?? null,
      code: product.code ?? null,
      image: product.image ?? null,
      description: (product.description ?? '').slice(0, 1200),
      availability: product.availability ?? null,
      subLabel: entry.label,
      category: primary,
      categories: cats,
      saleType: decideSaleType(product, primary),
    }

    if (!byCategory.has(primary)) byCategory.set(primary, [])
    byCategory.get(primary).push(record)
    counted++
  }

  /*
   * Gift certificates are the shop's own product, not something scraped, but
   * they have to be generated here rather than hand-written into the catalogue
   * folder — the line below wipes that folder on every run, and a file the
   * scrape doesn't know about would disappear the first time anyone refreshed
   * the stock.
   *
   * They are ordinary retail: no licence, no permit, nothing regulated, so
   * they are the one thing on the site that can simply be bought and posted.
   */
  byCategory.set(
    'gift-certificates',
    [50, 100, 250, 500].map((amount) => ({
      slug: `gift-certificate-${amount}`,
      name: `Fisher Firearms Gift Certificate — $${amount}`,
      price: amount,
      brand: 'Fisher Firearms',
      code: `GC${amount}`,
      image: null,
      description:
        `A $${amount} gift certificate, redeemable in store against anything we stock — ` +
        'firearms, ammunition, optics, reloading gear or clothing. ' +
        'Licensed items still require the buyer to hold a current SA firearms licence ' +
        'at the time they collect. No expiry is applied by the website; ' +
        'ask the shop if you need one dated.',
      availability: 'In stock',
      subLabel: 'Gift Certificates',
      category: 'gift-certificates',
      categories: ['gift-certificates'],
      saleType: 'ship',
    }))
  )

  await rm(OUT_DIR, { recursive: true, force: true })
  await mkdir(OUT_DIR, { recursive: true })

  const index = []
  for (const [category, products] of [...byCategory].sort()) {
    products.sort((a, b) => a.name.localeCompare(b.name))
    await writeFile(
      path.join(OUT_DIR, `${category}.json`),
      JSON.stringify(products, null, 0),
      'utf8'
    )
    const ship = products.filter((p) => p.saleType === 'ship').length
    const reserve = products.filter((p) => p.saleType === 'reserve').length
    index.push({ category, count: products.length, ship, reserve })
    console.log(
      `${category.padEnd(14)} ${String(products.length).padStart(4)} products  ` +
        `(${ship} ship / ${reserve} reserve / ${products.length - ship - reserve} enquire)`
    )
  }

  await writeFile(path.join(OUT_DIR, 'index.json'), JSON.stringify(index, null, 2), 'utf8')

  if (uncategorised.length) {
    await writeFile(
      path.join(OUT_DIR, 'uncategorised.json'),
      JSON.stringify(uncategorised, null, 2),
      'utf8'
    )
  }

  console.log(`\ntotal categorised: ${counted}`)
  console.log(`uncategorised:     ${uncategorised.length}`)
  if (unmapped.size) {
    console.log(`\nshop categories with products but no mapping (${unmapped.size}):`)
    ;[...unmapped].slice(0, 25).forEach((p) => console.log('  ' + p))
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
