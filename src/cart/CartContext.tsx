import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { loadCategory, type Product, type SaleType } from '../data/catalog'

export type CartLine = {
  slug: string
  name: string
  price: number | null
  image: string | null
  saleType: SaleType
  category: string
  qty: number
}

type CartState = {
  lines: CartLine[]
  count: number
  /** Lines that can actually be posted — the only ones a card payment covers. */
  shipLines: CartLine[]
  /** Licensed goods: collected in store or dealer-transferred. */
  reserveLines: CartLine[]
  shipTotal: number
  reserveTotal: number
  /** True when the order needs a licence number at checkout. */
  needsLicence: boolean
  /** Set when the cart was changed to match the shop's current listings. */
  notice: string | null
  dismissNotice: () => void
  add: (product: Product, qty?: number) => void
  setQty: (slug: string, qty: number) => void
  remove: (slug: string) => void
  clear: () => void
  isOpen: boolean
  openCart: () => void
  closeCart: () => void
}

const STORAGE_KEY = 'ff.cart.v1'

/** The most of any one product the shop's API will accept in a single order. */
export const MAX_QTY = 99

const clampQty = (qty: number) => Math.min(Math.floor(qty), MAX_QTY)

const CartContext = createContext<CartState | null>(null)

function readStored(): CartLine[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    /*
     * Guard against a stale schema from an earlier release. The quantity is
     * checked as strictly as the slug: a stored "3" makes the badge count
     * concatenate rather than add, and a null renders as NaN.
     */
    return parsed
      .filter(
        (l): l is CartLine =>
          !!l &&
          typeof l === 'object' &&
          typeof (l as CartLine).slug === 'string' &&
          typeof (l as CartLine).qty === 'number' &&
          (l as CartLine).qty > 0
      )
      .map((l) => ({ ...l, qty: clampQty(l.qty) }))
  } catch {
    return []
  }
}

/** Reads as "1 item is" / "2 items are". */
const plural = (n: number, one: string, many: string) =>
  n === 1 ? `1 ${one}` : `${n} ${many}`

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(readStored)
  const [isOpen, setOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines))
    } catch {
      // Private browsing or a full quota — the cart just won't persist.
    }
  }, [lines])

  /*
   * Line prices are snapshotted when the item is added and then kept
   * indefinitely, so a cart left for a week quotes last week's price while the
   * server charges today's. Re-read each restored line from its own department
   * — one chunk per department in the cart, never the whole catalogue — and
   * bring it up to date before the customer sees a total.
   *
   * Deliberately runs once, against what came out of storage.
   */
  useEffect(() => {
    const stored = readStored()
    const categories = [...new Set(stored.map((l) => l.category))]
    if (categories.length === 0) return

    let live = true
    void Promise.all(
      categories.map(async (c) => [c, await loadCategory(c)] as const)
    ).then((entries) => {
      if (!live) return
      const byCategory = new Map(entries)

      // null means "gone"; an absent slug means we couldn't tell, so it stays.
      const current = new Map<string, Product | null>()
      for (const line of stored) {
        const products = byCategory.get(line.category)
        // An empty department means the chunk didn't load. Never empty
        // someone's cart on the strength of a failed request.
        if (!products?.length) continue
        current.set(line.slug, products.find((p) => p.slug === line.slug) ?? null)
      }

      const gone = stored.filter((l) => current.get(l.slug) === null)
      const repriced = stored.filter((l) => {
        const p = current.get(l.slug)
        return p != null && p.price !== l.price
      })
      if (gone.length === 0 && repriced.length === 0) return

      setLines((prev) =>
        prev
          .filter((l) => current.get(l.slug) !== null)
          .map((l) => {
            const p = current.get(l.slug)
            return p
              ? { ...l, name: p.name, price: p.price, image: p.image, saleType: p.saleType }
              : l
          })
      )

      const changes = [
        gone.length
          ? `${plural(gone.length, 'item is', 'items are')} no longer listed and ${gone.length === 1 ? 'has' : 'have'} been removed`
          : null,
        repriced.length
          ? `${plural(repriced.length, 'price has', 'prices have')} changed since you added ${repriced.length === 1 ? 'it' : 'them'}`
          : null,
      ].filter((part) => part !== null)

      setNotice(`Your cart was updated — ${changes.join(', and ')}.`)
    })
      .catch(() => {
        // Reconciling is a courtesy. Failing at it leaves the cart as it was.
      })

    return () => {
      live = false
    }
  }, [])

  const dismissNotice = useCallback(() => setNotice(null), [])

  const add = useCallback((product: Product, qty = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.slug === product.slug)
      if (existing) {
        return prev.map((l) =>
          l.slug === product.slug ? { ...l, qty: clampQty(l.qty + qty) } : l
        )
      }
      return [
        ...prev,
        {
          slug: product.slug,
          name: product.name,
          price: product.price,
          image: product.image,
          saleType: product.saleType,
          category: product.category,
          qty,
        },
      ]
    })
    setOpen(true)
  }, [])

  const setQty = useCallback((slug: string, qty: number) => {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.slug !== slug)
        : prev.map((l) => (l.slug === slug ? { ...l, qty: clampQty(qty) } : l))
    )
  }, [])

  const remove = useCallback((slug: string) => {
    setLines((prev) => prev.filter((l) => l.slug !== slug))
  }, [])

  const clear = useCallback(() => setLines([]), [])

  const value = useMemo<CartState>(() => {
    const shipLines = lines.filter((l) => l.saleType === 'ship')
    const reserveLines = lines.filter((l) => l.saleType !== 'ship')
    const sum = (ls: CartLine[]) =>
      ls.reduce((t, l) => t + (l.price ?? 0) * l.qty, 0)

    return {
      lines,
      count: lines.reduce((t, l) => t + l.qty, 0),
      shipLines,
      reserveLines,
      shipTotal: sum(shipLines),
      reserveTotal: sum(reserveLines),
      needsLicence: reserveLines.some((l) => l.saleType === 'reserve'),
      notice,
      dismissNotice,
      add,
      setQty,
      remove,
      clear,
      isOpen,
      openCart: () => setOpen(true),
      closeCart: () => setOpen(false),
    }
  }, [lines, isOpen, notice, dismissNotice, add, setQty, remove, clear])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartState {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>')
  return ctx
}
