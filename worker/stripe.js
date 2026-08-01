/**
 * Minimal Stripe REST client.
 *
 * The official SDK targets Node and pulls in a lot that Workers can't run, and
 * we only need three calls — so we speak Stripe's form-encoded API directly.
 */

const API = 'https://api.stripe.com/v1'

/**
 * Stripe expects PHP-style bracket notation for nested data, e.g.
 * `line_items[0][price_data][currency]=aud`.
 */
export function formEncode(obj, prefix = '', out = new URLSearchParams()) {
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue
    const field = prefix ? `${prefix}[${key}]` : key
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (item !== null && typeof item === 'object') {
          formEncode(item, `${field}[${i}]`, out)
        } else {
          out.append(`${field}[${i}]`, String(item))
        }
      })
    } else if (typeof value === 'object') {
      formEncode(value, field, out)
    } else {
      out.append(field, String(value))
    }
  }
  return out
}

async function call(secretKey, method, endpoint, body) {
  const res = await fetch(`${API}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body ? formEncode(body).toString() : undefined,
  })
  const json = await res.json()
  if (!res.ok) {
    throw new Error(json?.error?.message ?? `Stripe ${res.status}`)
  }
  return json
}

export function createCheckoutSession(secretKey, params) {
  return call(secretKey, 'POST', '/checkout/sessions', params)
}

export function retrieveSession(secretKey, id) {
  return call(secretKey, 'GET', `/checkout/sessions/${id}`)
}

export function createWebhookEndpoint(secretKey, url, events) {
  return call(secretKey, 'POST', '/webhook_endpoints', {
    url,
    enabled_events: events,
    api_version: '2024-06-20',
  })
}

/** Constant-time compare so signature checks don't leak timing information. */
function safeEqual(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/**
 * Verifies Stripe's `Stripe-Signature` header against the raw request body.
 * Without this, anyone could POST a fake "payment succeeded" event and mark
 * orders paid.
 */
export async function verifyWebhook(rawBody, header, secret, toleranceSeconds = 300) {
  if (!header) return false

  const parts = Object.fromEntries(
    header.split(',').map((kv) => kv.split('=').map((s) => s.trim()))
  )
  const timestamp = parts.t
  const signature = parts.v1
  if (!timestamp || !signature) return false

  // Reject replays of an old, legitimately-signed event.
  const age = Math.abs(Date.now() / 1000 - Number(timestamp))
  if (!Number.isFinite(age) || age > toleranceSeconds) return false

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const mac = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${timestamp}.${rawBody}`)
  )
  const expected = [...new Uint8Array(mac)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  return safeEqual(expected, signature)
}
