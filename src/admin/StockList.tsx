import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  Eye,
  EyeOff,
  Minus,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import {
  adminDelete,
  adminProducts,
  adminUpdate,
  AuthError,
  type AdminProduct,
} from '../lib/api'
import { firearmCategories, gearCategories } from '../data/site'
import { formatPrice } from '../data/catalog'

const CATEGORY_NAME: Record<string, string> = Object.fromEntries(
  [...firearmCategories, ...gearCategories].map((c) => [c.slug, c.name])
)

/** Effective selling price: the shop's override wins over the catalogue price. */
const priceOf = (p: AdminProduct) => p.price ?? p.basePrice

/** Everything one row can change, and everything one save can carry. */
type RowValues = { stock: number | null; price: number | null; hidden: boolean }
type Patch = Partial<RowValues>

/** POA beats "$NaN": a half-typed or nonsense price must never reach the page. */
const money = (v: number | null) =>
  formatPrice(v != null && Number.isFinite(v) ? v : null)

/**
 * Saves without a save button.
 *
 * Every control writes straight to the server, but taps are debounced so
 * holding "+" ten times sends one request, not ten. The row shows a tick for a
 * moment afterwards so there's no doubt it worked.
 */
function useAutoSave(
  slug: string,
  onSaved: (patch: Patch) => void,
  onFailed: (patch: Patch, err: unknown) => void
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pending = useRef<Patch>({})
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // The callbacks are new objects on every render; parking them in a ref lets
  // the debounced send reach the current ones without restarting the timer.
  const handlers = useRef({ onSaved, onFailed })
  handlers.current = { onSaved, onFailed }

  const send = useCallback(async () => {
    const body = pending.current
    pending.current = {}
    if (Object.keys(body).length === 0) return
    setState('saving')
    try {
      await adminUpdate(slug, body)
      setState('saved')
      handlers.current.onSaved(body)
      setTimeout(() => setState('idle'), 1600)
    } catch (err) {
      setState('error')
      handlers.current.onFailed(body, err)
    }
  }, [slug])

  useEffect(
    () => () => {
      /*
       * Send the queued change rather than throwing it away. Tapping "+" and
       * immediately switching tabs is the normal way to use this screen, and
       * that unmount is exactly when the shop assumes the count is saved.
       */
      if (timer.current) {
        clearTimeout(timer.current)
        timer.current = null
        void send()
      }
    },
    [send]
  )

  function save(patch: Patch) {
    pending.current = { ...pending.current, ...patch }
    if (timer.current) clearTimeout(timer.current)
    setState('saving')
    timer.current = setTimeout(() => {
      timer.current = null
      void send()
    }, 600)
  }

  return { save, state }
}

function Row({
  product,
  onChanged,
  onSignedOut,
}: {
  product: AdminProduct
  onChanged: () => void
  onSignedOut: () => void
}) {
  const initial: RowValues = {
    stock: product.stock ?? null,
    price: priceOf(product),
    hidden: Boolean(product.hidden),
  }

  const [values, setValues] = useState<RowValues>(initial)
  const [failed, setFailed] = useState<Patch | null>(null)
  const [editingPrice, setEditingPrice] = useState(false)
  const [priceText, setPriceText] = useState('')
  const [removeError, setRemoveError] = useState<string | null>(null)
  const [removing, setRemoving] = useState(false)

  /*
   * Tapping "+" five times quickly must add five, not one. Reading `stock`
   * from state here would give the same stale value to every tap in a batch,
   * so the running count lives in a ref.
   */
  const counter = useRef<number | null>(initial.stock)

  /** The last values the server actually accepted — what the website shows. */
  const confirmed = useRef<RowValues>(initial)

  const { save, state } = useAutoSave(
    product.slug,
    (patch) => {
      confirmed.current = { ...confirmed.current, ...patch }
      setFailed(null)
      onChanged()
    },
    (patch, err) => {
      if (err instanceof AuthError) {
        onSignedOut()
        return
      }
      /*
       * A number left on screen that the website never received is worse than
       * no number at all — the shop reads 7 while customers are still being
       * offered 5. Put the row back to the truth and say so.
       */
      setValues(confirmed.current)
      counter.current = confirmed.current.stock
      setFailed(patch)
    }
  )

  function apply(patch: Patch) {
    setValues((v) => ({ ...v, ...patch }))
    save(patch)
  }

  function bump(by: number) {
    // Untracked lines start counting from zero on the first tap.
    const next = Math.max(0, (counter.current ?? 0) + by)
    counter.current = next
    apply({ stock: next })
  }

  function commitPrice() {
    setEditingPrice(false)
    const text = priceText.trim()
    const next = text === '' ? null : Number(text)
    // Anything that isn't money is a slip of the finger. Keep what the website
    // already has rather than publish a broken price.
    if (next !== null && (!Number.isFinite(next) || next < 0)) return
    if (next === values.price) return
    apply({ price: next })
  }

  async function remove() {
    if (
      !confirm(
        `Remove "${product.name}" from the website?\n\nThis is permanent — it cannot be undone, and the item would have to be added again from scratch.`
      )
    )
      return
    setRemoving(true)
    setRemoveError(null)
    try {
      await adminDelete(product.slug)
      onChanged()
    } catch (err) {
      if (err instanceof AuthError) {
        onSignedOut()
        return
      }
      setRemoveError(
        'That item could not be removed — it is still on the website. Please try again.'
      )
    } finally {
      setRemoving(false)
    }
  }

  return (
    <li
      className={`rounded-sm border p-4 transition-colors ${
        values.hidden
          ? 'border-steel-800 bg-steel-900/20 opacity-60'
          : 'border-steel-800 bg-steel-900/50'
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
              {values.stock ?? '—'}
            </p>
            <p className="font-mono text-[0.6rem] tracking-widest text-steel-500 uppercase">
              {values.stock === null
                ? 'not counted'
                : values.stock === 0
                  ? 'sold out'
                  : 'in stock'}
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

        {/* Price. Saved when the box is left, never mid-keystroke: typing
            "1250" a digit at a time used to publish $1, then $12, then $125. */}
        {editingPrice ? (
          <label className="flex items-center gap-2">
            <span className="text-sm text-steel-400">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              autoFocus
              value={priceText}
              onChange={(e) => setPriceText(e.target.value)}
              onBlur={commitPrice}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
              }}
              aria-label={`Price for ${product.name} in dollars`}
              className="field w-28 py-2 font-mono"
            />
          </label>
        ) : (
          <button
            type="button"
            onClick={() => {
              setPriceText(values.price == null ? '' : String(values.price))
              setEditingPrice(true)
            }}
            className="rounded-sm border border-steel-700 px-4 py-3 font-mono text-steel-200 transition-colors hover:border-brass-500 hover:text-brass-300"
          >
            {money(values.price)}
            <span className="ml-2 text-[0.65rem] tracking-widest text-steel-500 uppercase">
              tap to change
            </span>
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => apply({ hidden: !values.hidden })}
            className={`flex items-center gap-2 rounded-sm border px-4 py-3 text-sm transition-colors ${
              values.hidden
                ? 'border-amber-600/50 bg-amber-500/10 text-amber-300'
                : 'border-steel-700 text-steel-300 hover:border-steel-600'
            }`}
          >
            {values.hidden ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
            {values.hidden ? 'Hidden' : 'On website'}
          </button>

          {product.custom && (
            <button
              type="button"
              disabled={removing}
              onClick={remove}
              aria-label={`Delete ${product.name}`}
              className="grid h-12 w-12 place-items-center rounded-sm border border-steel-700 text-steel-500 transition-colors hover:border-red-800 hover:text-red-400 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {failed && (
        <div
          role="alert"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-sm border border-amber-900/60 bg-amber-950/30 p-3 text-sm text-amber-200"
        >
          <p className="leading-relaxed">
            That change didn't reach the website, so this line has gone back to
            what customers can see.
          </p>
          <button
            type="button"
            onClick={() => apply(failed)}
            className="flex shrink-0 items-center gap-2 rounded-sm border border-amber-700/60 px-3 py-2 transition-colors hover:border-amber-400 hover:text-amber-100"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Try again
          </button>
        </div>
      )}

      {removeError && (
        <p
          role="alert"
          className="mt-4 rounded-sm border border-amber-900/60 bg-amber-950/30 p-3 text-sm leading-relaxed text-amber-200"
        >
          {removeError}
        </p>
      )}
    </li>
  )
}

const PAGE = 25

export default function StockList({ onSignedOut }: { onSignedOut: () => void }) {
  const [products, setProducts] = useState<AdminProduct[] | null>(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [shown, setShown] = useState(PAGE)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const { products } = await adminProducts()
      setProducts(products)
      setError(null)
    } catch (err) {
      if (err instanceof AuthError) {
        onSignedOut()
        return
      }
      setError(err instanceof Error ? err.message : 'Could not load your stock.')
    }
  }, [onSignedOut])

  useEffect(() => {
    void load()
  }, [load])

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

  // Nothing on screen yet, so the error is all there is to show.
  if (!products && error) {
    return (
      <div className="rounded-sm border border-red-900/60 bg-red-950/40 p-4">
        <p className="text-red-300">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="btn-ghost mt-4 py-3"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Try again
        </button>
      </div>
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
      {/*
        The list reloads after every save, and a single dropped reload used to
        replace the whole screen with a red box that never went away. The stock
        already on screen is still perfectly usable, so say so quietly and let
        it be dismissed.
      */}
      {error && (
        <div
          role="alert"
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-sm border border-amber-900/60 bg-amber-950/30 p-3 text-sm text-amber-200"
        >
          <p className="leading-relaxed">
            Couldn't refresh the list just now. What you can see may be a few
            moments out of date.
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="flex items-center gap-2 rounded-sm border border-amber-700/60 px-3 py-2 transition-colors hover:border-amber-400 hover:text-amber-100"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Try again
            </button>
            <button
              type="button"
              onClick={() => setError(null)}
              aria-label="Hide this message"
              className="grid h-9 w-9 place-items-center rounded-sm border border-amber-700/60 transition-colors hover:border-amber-400 hover:text-amber-100"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

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
          <Row
            key={p.slug}
            product={p}
            onChanged={() => void load()}
            onSignedOut={onSignedOut}
          />
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
