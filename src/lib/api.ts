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

/**
 * What a customer is told when the request never reached the shop. The browser's
 * own wording for this ("Failed to fetch", "signal is aborted without reason")
 * was appearing at the payment step, where it reads like the shop is broken.
 */
const UNREACHABLE =
  "We couldn't reach the shop's system — please check your connection and try again."

/** The admin session has ended. The shell returns to the sign-in screen. */
export class AuthError extends Error {
  constructor(message = 'Your session has ended — please sign in again.') {
    super(message)
    this.name = 'AuthError'
  }
}

export type LineError = { slug: string; message: string }

/**
 * A basket the server refused. `errors` names every offending line, not just
 * the first, so the customer can be shown exactly what to remove.
 */
export class CartError extends Error {
  errors: LineError[]

  constructor(message: string, errors: LineError[]) {
    super(message)
    this.name = 'CartError'
    this.errors = errors
  }
}

function lineErrors(data: unknown): LineError[] {
  const raw = (data as { errors?: unknown })?.errors
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (e): e is LineError =>
      !!e && typeof e === 'object' &&
      typeof (e as LineError).slug === 'string' &&
      typeof (e as LineError).message === 'string'
  )
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  timeoutMs = 8000
): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  let res: Response
  try {
    res = await fetch(API_URL + path, {
      ...init,
      signal: controller.signal,
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    })
  } catch (err) {
    // A dead connection lands here as TypeError, our own timeout as AbortError.
    if (err instanceof TypeError || (err instanceof Error && err.name === 'AbortError')) {
      throw new Error(UNREACHABLE)
    }
    throw err
  } finally {
    clearTimeout(timer)
  }

  const data = await res.json().catch(() => null)

  // Any admin call can come back 401 once the token expires or is revoked.
  if (res.status === 401 && path.startsWith('/api/admin/')) {
    clearAdminToken()
    throw new AuthError()
  }

  if (!res.ok) {
    // The server writes its errors for customers, so they are shown verbatim.
    const message = (data as { error?: string })?.error ?? UNREACHABLE
    const errors = lineErrors(data)
    throw errors.length ? new CartError(message, errors) : new Error(message)
  }

  return data as T
}

/**
 * Live stock/price changes. Deliberately short-timeout and fail-soft: a slow
 * API must never stop the catalogue rendering.
 */
export async function fetchOverrides(): Promise<OverridesResponse> {
  const empty: OverridesResponse = { overrides: {}, products: [] }
  if (!hasApi()) return empty
  try {
    const live = await request<OverridesResponse>('/api/overrides', {}, 2500)
    // A captive-portal login page answers 200 with something that isn't ours.
    return {
      overrides: live?.overrides ?? {},
      products: Array.isArray(live?.products) ? live.products : [],
    }
  } catch {
    return empty
  }
}

export type CheckoutLine = { slug: string; qty: number }

export type CustomerDetails = Record<string, unknown>

/** Starts a Stripe Checkout session; returns the hosted payment page URL. */
export function createCheckout(payload: {
  lines: CheckoutLine[]
  reserveLines?: unknown[]
  customer?: CustomerDetails
}) {
  return request<{ url: string; id: string; amountCents: number }>('/api/checkout', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * Records licensed goods for the shop to hold. Nothing is charged — the
 * reference it returns is what the customer quotes when they collect.
 */
export function createReserve(payload: {
  lines: CheckoutLine[]
  customer?: CustomerDetails
}) {
  return request<{ reference: string }>('/api/reserve', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export type MessagePayload = {
  name: string
  email: string
  phone?: string
  notes: string
  subject: string
}

/** Contact and gift-certificate enquiries. */
export const sendMessage = (payload: MessagePayload) =>
  request<{ reference: string }>('/api/message', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export type OrderStatus = {
  paid: boolean
  /** Reserve orders are recorded, never charged. */
  kind: 'payment' | 'reserve'
  reference: string
  amount: number
  customer: { name: string | null }
  shipLines: { slug: string; name: string; price: number; qty: number }[]
  reserveLines: { slug: string; name: string; price: number | null; qty: number }[]
}

export const fetchOrder = (sessionId: string) =>
  request<OrderStatus>(`/api/order/${encodeURIComponent(sessionId)}`)

/* ------------------------------------------------------------------ admin */

const TOKEN_KEY = 'ff.admin.token'

/*
 * Every read and write is guarded: with site data blocked, touching
 * localStorage throws, and this is read from a `useState` initialiser — an
 * unguarded throw there takes the whole admin panel down to a white screen.
 */
export function getAdminToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setAdminToken(t: string) {
  try {
    localStorage.setItem(TOKEN_KEY, t)
  } catch {
    // The session still works — it just won't survive a reload.
  }
}

export function clearAdminToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Nothing was stored in the first place.
  }
}

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

export type AdminMessage = {
  id: string
  created: string
  subject: string
  customer: Record<string, string>
}

export const adminMessages = () =>
  adminRequest<{ messages: AdminMessage[] }>('/api/admin/messages')

export type AdminExport = {
  exportedAt: string
  overrides: Record<string, Override>
  products: unknown[]
  orders: AdminOrder[]
  messages: AdminMessage[]
}

/** Everything the shop owns, as one object they can save somewhere safe. */
export const adminExport = () => adminRequest<AdminExport>('/api/admin/export')

/** Ends the session on the server too. The local token goes either way. */
export async function adminLogout() {
  try {
    await adminRequest<{ ok: true }>('/api/admin/logout', { method: 'POST' })
  } catch {
    // Signing out has to work even when the network doesn't.
  } finally {
    clearAdminToken()
  }
}
