import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Product, SaleType } from '../data/catalog'

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
  add: (product: Product, qty?: number) => void
  setQty: (slug: string, qty: number) => void
  remove: (slug: string) => void
  clear: () => void
  isOpen: boolean
  openCart: () => void
  closeCart: () => void
}

const STORAGE_KEY = 'ff.cart.v1'

const CartContext = createContext<CartState | null>(null)

function readStored(): CartLine[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // Guard against a stale schema from an earlier release.
    return parsed.filter(
      (l): l is CartLine =>
        !!l && typeof l === 'object' && typeof (l as CartLine).slug === 'string'
    )
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(readStored)
  const [isOpen, setOpen] = useState(false)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines))
    } catch {
      // Private browsing or a full quota — the cart just won't persist.
    }
  }, [lines])

  const add = useCallback((product: Product, qty = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.slug === product.slug)
      if (existing) {
        return prev.map((l) =>
          l.slug === product.slug ? { ...l, qty: l.qty + qty } : l
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
        : prev.map((l) => (l.slug === slug ? { ...l, qty } : l))
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
      add,
      setQty,
      remove,
      clear,
      isOpen,
      openCart: () => setOpen(true),
      closeCart: () => setOpen(false),
    }
  }, [lines, isOpen, add, setQty, remove, clear])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartState {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>')
  return ctx
}
