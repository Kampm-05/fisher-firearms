import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Eye, EyeOff, Minus, Plus, Search, Trash2 } from 'lucide-react'
import {
  adminDelete,
  adminProducts,
  adminUpdate,
  type AdminProduct,
} from '../lib/api'
import { firearmCategories, gearCategories } from '../data/site'
import { formatPrice } from '../data/catalog'

const CATEGORY_NAME: Record<string, string> = Object.fromEntries(
  [...firearmCategories, ...gearCategories].map((c) => [c.slug, c.name])
)

/** Effective selling price: the shop's override wins over the catalogue price. */
const priceOf = (p: AdminProduct) => p.price ?? p.basePrice

/**
 * Saves without a save button.
 *
 * Every control writes straight to the server, but taps are debounced so
 * holding "+" ten times sends one request, not ten. The row shows a tick for a
 * moment afterwards so there's no doubt it worked.
 */
function useAutoSave(slug: string, onSaved: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pending = useRef<Record<string, unknown>>({})
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    []
  )

  function save(patch: Record<string, unknown>) {
    pending.current = { ...pending.current, ...patch }
    if (timer.current) clearTimeout(timer.current)
    setState('saving')
    timer.current = setTimeout(async () => {
      const body = pending.current
      pending.current = {}
      try {
        await adminUpdate(slug, body)
        setState('saved')
        onSaved()
        setTimeout(() => setState('idle'), 1600)
      } catch {
        setState('error')
      }
    }, 600)
  }

  return { save, state }
}

function Row({
  product,
  onChanged,
}: {
  product: AdminProduct
  onChanged: () => void
}) {
  const [stock, setStock] = useState<number | null>(product.stock ?? null)
  const [hidden, setHidden] = useState(Boolean(product.hidden))
  const [price, setPrice] = useState(priceOf(product))
  const [editingPrice, setEditingPrice] = useState(false)
  const { save, state } = useAutoSave(product.slug, onChanged)

  /*
   * Tapping "+" five times quickly must add five, not one. Reading `stock`
   * from state here would give the same stale value to every tap in a batch,
   * so the running count lives in a ref.
   */
  const counter = useRef<number | null>(product.stock ?? null)

  function bump(by: number) {
    // Untracked lines start counting from zero on the first tap.
    const next = Math.max(0, (counter.current ?? 0) + by)
    counter.current = next
    setStock(next)
    save({ stock: next })
  }

  return (
    <li
      className={`rounded-sm border p-4 transition-colors ${
        hidden ? 'border-steel-800 bg-steel-900/20 opacity-60' : 'border-steel-800 bg-steel-900/50'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="leading-snug font-500 text-steel-100">{product.name}</p>
          <p className="mt-1 text-xs text-steel-500">
            {CATEGORY_NAME[product.category] ?? product.category}
            {product.custom && ' · added by you'}
          </p>
        </div>

        {state === 'saved' && (
          <span className="flex shrink-0 items-center gap-1 text-xs text-brass-300">
            <Check className="h-4 w-4" aria-hidden="true" />
            Saved
          </span>
        )}
        {state === 'error' && (
          <span className="shrink-0 text-xs text-red-400">Not saved</span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {/* Stock stepper */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => bump(-1)}
            aria-label={`One less ${product.name}`}
            className="grid h-12 w-12 place-items-center rounded-sm border border-steel-700 text-steel-200 transition-colors hover:border-brass-500 hover:text-brass-300"
          >
            <Minus className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="w-20 text-center">
            <p className="font-mono text-2xl text-steel-100">
              {stock ?? '—'}
            </p>
            <p className="font-mono text-[0.6rem] tracking-widest text-steel-500 uppercase">
              {stock === null ? 'not counted' : stock === 0 ? 'sold out' : 'in stock'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => bump(1)}
            aria-label={`One more ${product.name}`}
            className="grid h-12 w-12 place-items-center rounded-sm border border-steel-700 text-steel-200 transition-colors hover:border-brass-500 hover:text-brass-300"
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Price */}
        {editingPrice ? (
          <label className="flex items-center gap-2">
            <span className="text-sm text-steel-400">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              autoFocus
              value={price ?? ''}
              onChange={(e) => {
                const v = e.target.value === '' ? null : Number(e.target.value)
                setPrice(v)
                save({ price: v })
              }}
              onBlur={() => setEditingPrice(false)}
              className="field w-28 py-2 font-mono"
            />
          </label>
        ) : (
          <button
            type="button"
            onClick={() => setEditingPrice(true)}
            className="rounded-sm border border-steel-700 px-4 py-3 font-mono text-steel-200 transition-colors hover:border-brass-500 hover:text-brass-300"
          >
            {formatPrice(price)}
            <span className="ml-2 text-[0.65rem] tracking-widest text-steel-500 uppercase">
              tap to change
            </span>
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const next = !hidden
              setHidden(next)
              save({ hidden: next })
            }}
            className={`flex items-center gap-2 rounded-sm border px-4 py-3 text-sm transition-colors ${
              hidden
                ? 'border-amber-600/50 bg-amber-500/10 text-amber-300'
                : 'border-steel-700 text-steel-300 hover:border-steel-600'
            }`}
          >
            {hidden ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
            {hidden ? 'Hidden' : 'On website'}
          </button>

          {product.custom && (
            <button
              type="button"
              onClick={async () => {
                if (!confirm(`Remove "${product.name}" completely?`)) return
                await adminDelete(product.slug)
                onChanged()
              }}
              aria-label={`Delete ${product.name}`}
              className="grid h-12 w-12 place-items-center rounded-sm border border-steel-700 text-steel-500 transition-colors hover:border-red-800 hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </li>
  )
}

const PAGE = 25

export default function StockList() {
  const [products, setProducts] = useState<AdminProduct[] | null>(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [shown, setShown] = useState(PAGE)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    try {
      const { products } = await adminProducts()
      setProducts(products)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your stock.')
    }
  }

  useEffect(() => {
    load()
  }, [])

  const categories = useMemo(() => {
    if (!products) return []
    return [...new Set(products.map((p) => p.category))].sort((a, b) =>
      (CATEGORY_NAME[a] ?? a).localeCompare(CATEGORY_NAME[b] ?? b)
    )
  }, [products])

  const filtered = useMemo(() => {
    if (!products) return []
    const q = query.trim().toLowerCase()
    return products.filter(
      (p) => (!q || p.name.toLowerCase().includes(q)) && (!category || p.category === category)
    )
  }, [products, query, category])

  useEffect(() => setShown(PAGE), [query, category])

  if (error) {
    return (
      <p className="rounded-sm border border-red-900/60 bg-red-950/40 p-4 text-red-300">
        {error}
      </p>
    )
  }

  if (!products) {
    return (
      <p className="py-16 text-center font-mono text-sm tracking-widest text-steel-500 uppercase">
        Loading your stock…
      </p>
    )
  }

  return (
    <div>
      <p className="mb-4 leading-relaxed text-steel-400">
        Tap <strong className="text-steel-200">−</strong> or{' '}
        <strong className="text-steel-200">+</strong> to change how many you
        have. Everything saves by itself.
      </p>

      <label className="relative block">
        <span className="sr-only">Search your stock</span>
        <Search
          className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-steel-500"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for an item…"
          className="field py-4 pl-12 text-base"
        />
      </label>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
        <button
          type="button"
          onClick={() => setCategory('')}
          className={`shrink-0 rounded-sm border px-4 py-2.5 text-sm transition-colors ${
            category === ''
              ? 'border-brass-500 bg-brass-500/10 text-brass-200'
              : 'border-steel-800 text-steel-300'
          }`}
        >
          Everything
        </button>
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`shrink-0 rounded-sm border px-4 py-2.5 text-sm transition-colors ${
              category === c
                ? 'border-brass-500 bg-brass-500/10 text-brass-200'
                : 'border-steel-800 text-steel-300'
            }`}
          >
            {CATEGORY_NAME[c] ?? c}
          </button>
        ))}
      </div>

      <p className="mt-4 font-mono text-xs tracking-widest text-steel-500 uppercase">
        {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
      </p>

      <ul className="mt-3 space-y-3">
        {filtered.slice(0, shown).map((p) => (
          <Row key={p.slug} product={p} onChanged={load} />
        ))}
      </ul>

      {shown < filtered.length && (
        <button
          type="button"
          onClick={() => setShown((n) => n + PAGE)}
          className="btn-ghost mt-6 w-full justify-center py-4"
        >
          Show more ({filtered.length - shown} left)
        </button>
      )}
    </div>
  )
}
