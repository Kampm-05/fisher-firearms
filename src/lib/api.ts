/**
 * Client for the shop's API (the Cloudflare Worker in `worker/`).
 *
 * The site is designed to work without it: if VITE_API_URL is unset, or the
 * Worker is unreachable, every call here fails soft and the site falls back to
 * the catalogue baked into the build. Stock levels go back to "not tracked"
 * and checkout returns to the order-request flow — nothing breaks.
 */

export const API_URL: string = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export const hasApi = () => API_URL.length > 0

/** Shape of the admin's changes layered over the built-in catalogue. */
export type Override = {
  stock?: number | null
  price?: number | null
  hidden?: boolean
}

export type OverridesResponse = {
  overrides: Record<string, Override>
  /** Products the shop added through the admin panel. */
  products: unknown[]
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  timeoutMs = 8000
): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(API_URL + path, {
      ...init,
      signal: controller.signal,
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      throw new Error((data as { error?: string })?.error ?? `Request failed (${res.status})`)
    }
    return data as T
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Live stock/price changes. Deliberately short-timeout and fail-soft: a slow
 * API must never stop the catalogue rendering.
 */
export async function fetchOverrides(): Promise<OverridesResponse> {
  const empty: OverridesResponse = { overrides: {}, products: [] }
  if (!hasApi()) return empty
  try {
    return await request<OverridesResponse>('/api/overrides', {}, 2500)
  } catch {
    return empty
  }
}

export type CheckoutLine = { slug: string; qty: number }

/** Starts a Stripe Checkout session; returns the hosted payment page URL. */
export function createCheckout(payload: {
  lines: CheckoutLine[]
  reserveLines?: unknown[]
  customer?: Record<string, unknown>
}) {
  return request<{ url: string; id: string }>('/api/checkout', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export type OrderStatus = {
  paid: boolean
  amount: number
  customer: { name: string | null }
  shipLines: { slug: string; name: string; price: number; qty: number }[]
  reserveLines: { slug: string; name: string; price: number | null; qty: number }[]
}

export const fetchOrder = (sessionId: string) =>
  request<OrderStatus>(`/api/order/${encodeURIComponent(sessionId)}`)

/* ------------------------------------------------------------------ admin */

const TOKEN_KEY = 'ff.admin.token'

export const getAdminToken = () => localStorage.getItem(TOKEN_KEY)
export const setAdminToken = (t: string) => localStorage.setItem(TOKEN_KEY, t)
export const clearAdminToken = () => localStorage.removeItem(TOKEN_KEY)

function adminRequest<T>(path: string, init: RequestInit = {}) {
  const token = getAdminToken()
  return request<T>(path, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token ?? ''}` },
  })
}

export type AdminProduct = {
  slug: string
  name: string
  category: string
  saleType: 'ship' | 'reserve' | 'enquire'
  basePrice: number | null
  custom: boolean
  stock?: number | null
  price?: number | null
  hidden?: boolean
}

export async function adminLogin(password: string) {
  const { token } = await request<{ token: string }>('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  })
  setAdminToken(token)
  return token
}

export const adminProducts = () =>
  adminRequest<{ products: AdminProduct[] }>('/api/admin/products')

export const adminUpdate = (slug: string, patch: Record<string, unknown>) =>
  adminRequest<{ ok: true }>(`/api/admin/product/${encodeURIComponent(slug)}`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  })

export const adminCreate = (product: Record<string, unknown>) =>
  adminRequest<{ ok: true; product: { slug: string } }>('/api/admin/product', {
    method: 'POST',
    body: JSON.stringify(product),
  })

export const adminDelete = (slug: string) =>
  adminRequest<{ ok: true }>(`/api/admin/product/${encodeURIComponent(slug)}`, {
    method: 'DELETE',
  })

export type AdminOrder = {
  id: string
  created: string
  paid: boolean
  amount: number
  customer: Record<string, string>
  shipLines: { name: string; qty: number; price: number }[]
  reserveLines: { name: string; qty: number }[]
}

export const adminOrders = () => adminRequest<{ orders: AdminOrder[] }>('/api/admin/orders')
