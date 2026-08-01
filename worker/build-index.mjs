/**
 * Bakes a slug -> {price, saleType, name} lookup into the Worker.
 *
 * The Worker must never trust prices or sale types sent by the browser: a
 * customer could otherwise post a $1 firearm to /api/checkout. This index is
 * the server's own copy of the truth, regenerated from the catalogue whenever
 * the shop's data changes.
 *
 *   node worker/build-index.mjs
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../..')
const SRC = path.join(ROOT, 'src/data/catalog')
const OUT = path.join(ROOT, 'worker/catalog-index.json')

const SKIP = new Set(['index.json', 'uncategorised.json'])

const index = {}
let count = 0

for (const file of await readdir(SRC)) {
  if (!file.endsWith('.json') || SKIP.has(file)) continue
  const products = JSON.parse(await readFile(path.join(SRC, file), 'utf8'))
  for (const p of products) {
    index[p.slug] = {
      name: p.name,
      price: p.price,
      saleType: p.saleType,
      category: p.category,
    }
    count++
  }
}

await writeFile(OUT, JSON.stringify(index), 'utf8')
console.log(`wrote ${path.relative(ROOT, OUT)} — ${count} products`)
