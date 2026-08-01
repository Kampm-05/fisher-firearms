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
const ADMIN = vars.ADMIN_PASSWORD

const TEST_SLUG = process.env.SLUG ?? '2x4-cotton-patch-roll'
const pass = (m) => console.log(`  PASS  ${m}`)
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
{
  const event = JSON.stringify({
    id: 'evt_test',
    type: 'checkout.session.completed',
    data: { object: { id: session.id, amount_total: 2700 } },
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
{
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

// Leave the shop's data as we found it.
await setOverride(token, TEST_SLUG, { stock: null })
console.log('\ndone\n')
