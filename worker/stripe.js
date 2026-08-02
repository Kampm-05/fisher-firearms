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
  // An unset secret must reject everything. Left to itself, TextEncoder turns
  // `undefined` into a zero-length key, and every event would be checked
  // against a key an attacker could reproduce.
  if (!header || !secret) return false

  /*
   * Stripe sends `t=<timestamp>,v1=<sig>`, and during a secret rotation it
   * sends one `v1` per active secret. Splitting on the first `=` only keeps
   * base64 padding intact, and collecting every `v1` means a rotation doesn't
   * start rejecting genuine events.
   */
  const pairs = header.split(',').map((part) => {
    const at = part.indexOf('=')
    return at === -1 ? ['', ''] : [part.slice(0, at).trim(), part.slice(at + 1).trim()]
  })

  const timestamp = pairs.find(([key]) => key === 't')?.[1]
  const signatures = pairs.filter(([key]) => key === 'v1').map(([, value]) => value)
  if (!timestamp || signatures.length === 0) return false

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

  return signatures.some((signature) => safeEqual(expected, signature))
}
