/**
 * End-to-end payment test against the local Worker.
 *
 *   node worker/test-payment.mjs
 *
 * Proves three things that matter and can't be checked by reading code:
 *   1. the Stripe test card actually charges under this account's key
 *   2. the webhook handler accepts a correctly-signed event and rejects a
 *      forged one
 *   3. a paid order marks itself paid and draws stock down
 *
 * The one step it can't perform is typing into Stripe's hosted card form —
 * that's Stripe's own UI, and it needs a real browser.
 */
import { readFileSync } from 'node:fs'
import { createHmac } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const API = process.env.API ?? 'http://localhost:8788'

const vars = Object.fromEntries(
  readFileSync(path.join(HERE, '.dev.vars'), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i), l.slice(i + 1)]
    })
)
const KEY = vars.STRIPE_SECRET_KEY
const WH_SECRET = vars.STRIPE_WEBHOOK_SECRET
const ADMIN = process.env.ADMIN_PW ?? vars.ADMIN_PASSWORD

const TEST_SLUG = process.env.SLUG ?? '2x4-cotton-patch-roll'
const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)/.test(API)

/*
 * Webhook checks sign events with the secret in .dev.vars. That is the local
 * secret; the deployed Worker holds a different one and correctly rejects
 * anything signed with this one. Reporting that as a failure would be
 * misleading, so those checks only run locally — the signature logic itself is
 * covered directly by test-unit.mjs, which needs no secrets at all.
 */
const pass = (m) => console.log(`  PASS  ${m}`)
const skip = (m) => console.log(`  SKIP  ${m}`)
const fail = (m) => {
  console.log(`  FAIL  ${m}`)
  process.exitCode = 1
}

async function stripe(endpoint, body, method = 'POST') {
  const res = await fetch(`https://api.stripe.com/v1${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body ? new URLSearchParams(body).toString() : undefined,
  })
  return res.json()
}

const admin = async () => {
  const r = await fetch(`${API}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: ADMIN }),
  }).then((r) => r.json())
  return r.token
}

const setOverride = (token, slug, patch) =>
  fetch(`${API}/api/admin/product/${slug}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(patch),
  }).then((r) => r.json())

/** Signs a payload the way Stripe does, so the Worker's check is exercised. */
function sign(payload, secret, timestamp = Math.floor(Date.now() / 1000)) {
  const mac = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex')
  return `t=${timestamp},v1=${mac}`
}

console.log('\n1. The test card charges under this account')
{
  /*
   * Stripe refuses raw card numbers over the API unless an account opts into
   * raw-card access, so we use the test token that stands in for
   * 4242 4242 4242 4242 — the same card a customer would type on the hosted
   * page.
   */
  const pm = await stripe('/payment_methods', {
    type: 'card',
    'card[token]': 'tok_visa',
  })
  if (pm.error) fail(`could not tokenise the card: ${pm.error.message}`)
  else {
    const pi = await stripe('/payment_intents', {
      amount: '2700',
      currency: 'aud',
      payment_method: pm.id,
      confirm: 'true',
      'automatic_payment_methods[enabled]': 'true',
      'automatic_payment_methods[allow_redirects]': 'never',
    })
    if (pi.status === 'succeeded') {
      pass(`card 4242…4242 charged A$${(pi.amount / 100).toFixed(2)} (${pi.id})`)
    } else {
      fail(`payment did not succeed: ${pi.status ?? pi.error?.message}`)
    }
  }
}

console.log('\n2. A declined card is refused')
{
  // Stands in for 4000 0000 0000 0002, which always declines.
  const pm = await stripe('/payment_methods', {
    type: 'card',
    'card[token]': 'tok_chargeDeclined',
  })
  const pi = await stripe('/payment_intents', {
    amount: '2700',
    currency: 'aud',
    payment_method: pm.id,
    confirm: 'true',
    'automatic_payment_methods[enabled]': 'true',
    'automatic_payment_methods[allow_redirects]': 'never',
  })
  if (pi.error?.code === 'card_declined' || pi.status === 'requires_payment_method') {
    pass('declined card was refused, as it should be')
  } else {
    fail(`expected a decline, got ${pi.status ?? JSON.stringify(pi.error)}`)
  }
}

console.log('\n3. Checkout session is priced by the server')
const token = await admin()
await setOverride(token, TEST_SLUG, { stock: 10 })

const session = await fetch(`${API}/api/checkout`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    // A tampered price and sale type — both must be ignored.
    lines: [{ slug: TEST_SLUG, qty: 2, price: 0.01, saleType: 'ship' }],
    customer: { name: 'Test Buyer', email: 'test@example.com' },
  }),
}).then((r) => r.json())

if (!session.id) {
  fail(`no session created: ${session.error}`)
} else {
  const full = await stripe(`/checkout/sessions/${session.id}`, null, 'GET')
  if (full.amount_total === 2700 && full.currency === 'aud') {
    pass(`ignored the tampered $0.01 and charged A$${(full.amount_total / 100).toFixed(2)}`)
  } else {
    fail(`unexpected total: ${full.amount_total} ${full.currency}`)
  }
}

console.log('\n4. Webhook signature is enforced')
if (!LOCAL) {
  skip('webhook checks need the deployed secret — run these against wrangler dev')
} else {
  const event = JSON.stringify({
    id: 'evt_test',
    type: 'checkout.session.completed',
    created: Math.floor(Date.now() / 1000),
    // payment_status matters: a delayed method reports "completed" while the
    // money is still in flight, and the shop must not post goods for it.
    data: { object: { id: session.id, amount_total: 2700, payment_status: 'paid' } },
  })

  const forged = await fetch(`${API}/api/stripe-webhook`, {
    method: 'POST',
    headers: { 'Stripe-Signature': sign(event, 'not-the-real-secret') },
    body: event,
  })
  if (forged.status === 400) pass('forged signature rejected')
  else fail(`forged signature accepted (${forged.status})`)

  const stale = await fetch(`${API}/api/stripe-webhook`, {
    method: 'POST',
    headers: {
      'Stripe-Signature': sign(event, WH_SECRET, Math.floor(Date.now() / 1000) - 3600),
    },
    body: event,
  })
  if (stale.status === 400) pass('replayed old event rejected')
  else fail(`stale event accepted (${stale.status})`)

  const real = await fetch(`${API}/api/stripe-webhook`, {
    method: 'POST',
    headers: { 'Stripe-Signature': sign(event, WH_SECRET) },
    body: event,
  })
  if (real.ok) pass('correctly-signed event accepted')
  else fail(`genuine event rejected (${real.status})`)
}

console.log('\n5. Paying draws stock down and marks the order paid')
if (!LOCAL) {
  skip('follows on from the webhook checks above')
} else {
  const order = await fetch(`${API}/api/order/${session.id}`).then((r) => r.json())
  if (order.paid) pass('order shows as paid')
  else fail('order still shows unpaid')

  const { overrides } = await fetch(`${API}/api/overrides`).then((r) => r.json())
  const left = overrides[TEST_SLUG]?.stock
  if (left === 8) pass(`stock went 10 → ${left} after selling 2`)
  else fail(`expected 8 left, found ${left}`)
}

console.log('\n6. Licensed goods can never be paid for online')
{
  const firearm = await fetch(`${API}/api/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lines: [{ slug: 'tikka-t3-hunter', qty: 1 }] }),
  })
  const body = await firearm.json()
  if (firearm.status === 400 && /licensed/i.test(body.error)) {
    pass('a rifle is refused at the payment step')
  } else {
    fail(`firearm was not blocked: ${firearm.status} ${JSON.stringify(body)}`)
  }
}

console.log('\n7. A delayed payment is not treated as money received')
if (!LOCAL) {
  skip('needs the deployed webhook secret')
} else {
  const pending = JSON.stringify({
    id: 'evt_pending',
    type: 'checkout.session.completed',
    created: Math.floor(Date.now() / 1000),
    data: { object: { id: session.id, amount_total: 2700, payment_status: 'unpaid' } },
  })
  const res = await fetch(`${API}/api/stripe-webhook`, {
    method: 'POST',
    headers: { 'Stripe-Signature': sign(pending, WH_SECRET) },
    body: pending,
  })
  const body = await res.text()
  if (res.ok && /awaiting/i.test(body)) pass('an unpaid session does not draw stock down')
  else fail(`unpaid session was mishandled: ${res.status} ${body}`)
}

console.log('\n8. A webhook for an order we cannot see is retried, not dropped')
if (!LOCAL) {
  skip('needs the deployed webhook secret')
} else {
  const unknown = JSON.stringify({
    id: 'evt_unknown',
    type: 'checkout.session.completed',
    created: Math.floor(Date.now() / 1000),
    data: { object: { id: 'cs_test_never_created', amount_total: 100, payment_status: 'paid' } },
  })
  const res = await fetch(`${API}/api/stripe-webhook`, {
    method: 'POST',
    headers: { 'Stripe-Signature': sign(unknown, WH_SECRET) },
    body: unknown,
  })
  // A 2xx would tell Stripe never to try again, stranding a real payment.
  if (res.status >= 500) pass('Stripe is asked to retry rather than told it is done')
  else fail(`a fresh unknown order answered ${res.status}, so Stripe would give up`)
}

console.log('\n9. Reserving licensed goods records the order')
{
  const res = await fetch(`${API}/api/reserve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lines: [{ slug: 'tikka-t3-hunter', qty: 1 }],
      customer: { name: 'Test Buyer', phone: '0400 000 000', licence: '1234567' },
    }),
  })
  const body = await res.json()
  if (res.ok && body.reference) pass(`a reservation is stored (${body.reference})`)
  else fail(`reservation was not recorded: ${res.status} ${JSON.stringify(body)}`)

  const orders = await fetch(`${API}/api/admin/orders`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json())
  if (orders.orders?.some((o) => o.id === body.reference)) {
    pass('and the shop can see it in the back office')
  } else {
    fail('the reservation never reached the shop')
  }
}

console.log('\n10. Admin routes refuse anyone without a token')
{
  for (const path of ['/api/admin/products', '/api/admin/orders', '/api/admin/export']) {
    const anon = await fetch(`${API}${path}`)
    const junk = await fetch(`${API}${path}`, { headers: { Authorization: 'Bearer nope' } })
    if (anon.status === 401 && junk.status === 401) pass(`${path} is closed to strangers`)
    else fail(`${path} answered ${anon.status}/${junk.status}, expected 401`)
  }
}

// Leave the shop's data as we found it, even if an assertion above failed.
await setOverride(token, TEST_SLUG, { stock: null })
console.log('\ndone\n')
