import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import ProductCard from './ProductCard'
import { loadCategory, type Product } from '../data/catalog'
import { inView, stagger } from '../lib/motion'

const PAGE = 48

type Sort = 'name' | 'price-asc' | 'price-desc'

/** Nulls (POA) sort last regardless of direction. */
function comparePrice(a: Product, b: Product, dir: 1 | -1) {
  if (a.price == null && b.price == null) return 0
  if (a.price == null) return 1
  if (b.price == null) return -1
  return (a.price - b.price) * dir
}

export default function ProductGrid({ category }: { category: string }) {
  const [products, setProducts] = useState<Product[] | null>(null)
  const [query, setQuery] = useState('')
  const [brand, setBrand] = useState('')
  const [sort, setSort] = useState<Sort>('name')
  const [shown, setShown] = useState(PAGE)

  useEffect(() => {
    let live = true
    setProducts(null)
    setShown(PAGE)
    loadCategory(category).then((p) => {
      if (live) setProducts(p)
    })
    return () => {
      live = false
    }
  }, [category])

  const brands = useMemo(() => {
    if (!products) return []
    return [...new Set(products.map((p) => p.brand).filter(Boolean) as string[])].sort()
  }, [products])

  const filtered = useMemo(() => {
    if (!products) return []
    const q = query.trim().toLowerCase()
    const out = products.filter(
      (p) =>
        (!q || p.name.toLowerCase().includes(q)) &&
        (!brand || p.brand === brand)
    )
    return out.sort((a, b) => {
      if (sort === 'price-asc') return comparePrice(a, b, 1)
      if (sort === 'price-desc') return comparePrice(a, b, -1)
      return a.name.localeCompare(b.name)
    })
  }, [products, query, brand, sort])

  // Reset paging whenever the result set changes underneath us.
  useEffect(() => setShown(PAGE), [query, brand, sort])

  if (products === null) {
    return (
      <p className="py-16 font-mono text-sm tracking-widest text-steel-500 uppercase">
        Loading stock…
      </p>
    )
  }

  if (products.length === 0) {
    return (
      <p className="rounded-sm border border-steel-800 bg-steel-900/40 p-6 text-sm text-steel-400">
        Nothing listed online in this department right now — call the shop and
        we'll tell you what's on the shelf.
      </p>
    )
  }

  const visible = filtered.slice(0, shown)

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 border-b border-steel-800 pb-5">
        <label className="relative min-w-0 flex-1 sm:max-w-xs">
          <span className="sr-only">Search this department</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-steel-600"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="field pl-9"
          />
        </label>

        {brands.length > 1 && (
          <label>
            <span className="sr-only">Filter by brand</span>
            <select
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="field"
            >
              <option value="">All brands</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>
        )}

        <label>
          <span className="sr-only">Sort</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="field"
          >
            <option value="name">Name (A–Z)</option>
            <option value="price-asc">Price (low → high)</option>
            <option value="price-desc">Price (high → low)</option>
          </select>
        </label>

        <p className="ml-auto font-mono text-xs tracking-widest text-steel-500 uppercase">
          {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
        </p>
      </div>

      {filtered.length === 0 ? (
        <p className="py-14 text-sm text-steel-400">
          Nothing matches that search.
        </p>
      ) : (
        <>
          <motion.div
            key={`${category}-${query}-${brand}-${sort}`}
            variants={stagger}
            {...inView}
            className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
          >
            {visible.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </motion.div>

          {shown < filtered.length && (
            <div className="mt-10 text-center">
              <button
                type="button"
                onClick={() => setShown((n) => n + PAGE)}
                className="btn-ghost"
              >
                Show more ({filtered.length - shown} left)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
