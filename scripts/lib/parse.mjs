/**
 * Parsers for the shop's OpenCart markup. Deliberately regex-based rather than
 * a DOM library: the pages are old, inconsistently closed HTML that trips up
 * strict parsers, and we only need a handful of well-marked fields.
 */

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  raquo: '»', laquo: '«', rsquo: '’', lsquo: '‘',
  ldquo: '“', rdquo: '”', ndash: '–', mdash: '—',
  hellip: '…', deg: '°', trade: '™', reg: '®', copy: '©',
}

export function decode(s = '') {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m)
}

export function stripTags(html = '') {
  return decode(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|tr|h\d)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/[ \t ]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim()
}

/** All `/category/...` paths linked from a page (the nav is on every page). */
export function extractCategoryPaths(html) {
  const out = new Set()
  const re = /href="https:\/\/www\.fisherfirearms\.com\.au\/(category\/[^"?#]+)"/g
  let m
  while ((m = re.exec(html))) out.add('/' + m[1])
  return [...out]
}

/**
 * Parse the items out of a category listing.
 *
 * Listing links are category-prefixed
 * (`/category/optics/rifle-scopes/nightforce-...`); the canonical product page
 * is the last segment on its own.
 *
 * The listing's cart cell carries the shop's OWN sale classification, which is
 * far more reliable than guessing from the product name:
 *   "Add to Cart"   -> sells online
 *   "INSTORE ONLY"  -> must be bought in store
 *   "Order Now"     -> special order, contact the shop
 */
export function extractListingItems(html) {
  const start = html.search(/class="product-(?:list|grid)"/)
  if (start < 0) return []
  const region = html.slice(start)

  const items = []
  // Listing hrefs keep the query string (?limit=100) — allow for it.
  const re = /<div class="image">\s*<a href="https:\/\/www\.fisherfirearms\.com\.au\/([^"?#]+)(?:[?#][^"]*)?"[^>]*>\s*<img src="([^"]+)"/g
  let m
  while ((m = re.exec(region))) {
    const href = m[1]
    if (href.startsWith('index.php')) continue
    const slug = href.split('/').filter(Boolean).pop()
    if (!slug) continue

    // Everything up to the next item is this item's block.
    const rest = region.slice(m.index)
    const nextIdx = rest.slice(1).search(/<div class="image">\s*<a href=/)
    const block = nextIdx > 0 ? rest.slice(0, nextIdx + 1) : rest

    const name = decode(block.match(/<div class="name">[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/)?.[1] ?? '').trim()
    const priceRaw = block.match(/<div class="price">([\s\S]{0,300}?)<\/div>/)?.[1] ?? ''
    const price = parsePrice(priceRaw)

    let cartState = 'unknown'
    if (/value="Add to Cart"/i.test(block)) cartState = 'cart'
    else if (/INSTORE ONLY/i.test(block)) cartState = 'instore'
    else if (/Order Now/i.test(block)) cartState = 'order'

    items.push({ slug, name, price, thumb: m[2], cartState })
  }
  return items
}

/** "Showing 1 to 14 of 14 (1 Pages)" -> {total, pages}. */
export function extractPagination(html) {
  const m = html.match(/Showing\s+\d+\s+to\s+\d+\s+of\s+(\d+)\s+\((\d+)\s+Pages?\)/i)
  if (!m) return { total: null, pages: 1 }
  return { total: Number(m[1]), pages: Number(m[2]) }
}

/** Money string -> number, or null when the shop shows no price. */
function parsePrice(raw) {
  if (!raw) return null
  const m = decode(raw).match(/\$\s*([\d,]+(?:\.\d{2})?)/)
  if (!m) return null
  const n = Number(m[1].replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

export function parseProduct(html, path) {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)
  const name = h1 ? stripTags(h1[1]) : null
  if (!name) return null

  // Price block sits inside the product-info column. Take the first $ figure;
  // "Ex Tax" and special-offer variants follow it.
  const priceBlock = html.match(/<div class="price">([\s\S]{0,400}?)<\/div>/)
  const price = parsePrice(priceBlock?.[1])

  const oldPrice = priceBlock?.[1]?.match(/product-old-price[^>]*>([\s\S]*?)</)
  const image = html.match(/<img[^>]+id="image"[^>]*>/)
  const imageSrc = image?.[0].match(/src="([^"]+)"/)?.[1] ?? null

  // The info column ends at the description/review tab strip (class "htabs").
  const info = html.match(/<div class="product-info">([\s\S]*?)<div (?:class="htabs"|id="tabs")/)
  const infoHtml = info?.[1] ?? ''
  const infoText = stripTags(infoHtml)

  // Brand and product code sit in a <div class="description"> under the h1,
  // with their labels HTML-commented out. Brand is a /manufacturer/ link.
  const meta = infoHtml.match(/<div class="description">([\s\S]*?)<\/div>/)?.[1] ?? ''
  const brand = decode(meta.match(/\/manufacturer\/[^"]*"[^>]*>([^<]+)</)?.[1] ?? '').trim()
  const code = decode(
    meta.replace(/<a[\s\S]*?<\/a>/g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ')
  ).trim()
  const availability = infoText
    .match(/Availability:\s*([^\n]+)/)?.[1]
    ?.replace(/\s+-\s*OR\s*-.*$/i, '')
    .trim()

  const descBlock = html.match(/id="tab-description"[^>]*>([\s\S]*?)(?=<div id="tab-review"|<\/div>\s*<\/div>\s*<\/div>)/)
  let description = descBlock ? stripTags(descBlock[1]) : ''
  description = description.replace(/^class="tab-content">\s*/, '').trim()

  return {
    slug: path.replace(/^\//, ''),
    url: path,
    name,
    price,
    oldPrice: parsePrice(oldPrice?.[1]),
    brand: brand || null,
    code: code || null,
    availability: availability || null,
    description,
    imageSrc,
  }
}
