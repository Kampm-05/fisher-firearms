/**
 * Fisher Firearms API.
 *
 * The shop's website is a static build on GitHub Pages; this Worker is
 * everything that needs a server: Stripe payments, live stock levels, order
 * and enquiry records, and the admin panel's backend.
 *
 * Two rules shape most of the code here:
 *
 *   Nothing the browser says about money or legality is believed. Prices and
 *   sale types are looked up server-side, every time — see validateCart().
 *
 *   Firearms and ammunition are handed over in person against a sighted
 *   licence. They can be reserved online and never posted or charged for, and
 *   that is enforced here rather than in the admin panel's buttons.
 *
 * Storage lives in store.js, which keeps the live layer in a single KV key so
 * the read path never enumerates the namespace. Validation lives in
 * validate.js and is unit-tested without any secrets.
 */
import CATALOG from './catalog-index.json'
import { createCheckoutSession, retrieveSession, verifyWebhook } from './stripe.js'
import {
  cached,
  drawDownStock,
  invalidate,
  readSnapshot,
  removeProduct,
  setOverride,
  upsertProduct,
} from './store.js'
import {
  BadRequest,
  cleanCategory,
  cleanCustomer,
  cleanImage,
  cleanLines,
  cleanPrice,
  cleanStock,
  cleanText,
  readJson,
  resolveSaleType,
} from './validate.js'

const ADMIN_TOKEN_TTL = 60 * 60 * 24 * 7 // a week
const ORDER_TTL = 60 * 60 * 24 * 400
const MAX_QTY = 99

/* ---------------------------------------------------------------- helpers */

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') ?? ''
  const allowed = (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const ok = allowed.includes(origin) || /^http:\/\/localhost:\d+$/.test(origin)
  return {
    'Access-Control-Allow-Origin': ok ? origin : (allowed[0] ?? 'https://kampm-05.github.io'),
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Max-Age': '86400',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    Vary: 'Origin',
  }
}

function json(data, request, env, status = 200, cacheSeconds = 0) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': cacheSeconds ? `public, max-age=${cacheSeconds}` : 'no-store',
      ...corsHeaders(request, env),
    },
  })
}

const fail = (msg, request, env, status = 400) => json({ error: msg }, request, env, status)

/** Money in cents — avoids float drift on totals. */
const toCents = (dollars) => Math.round(Number(dollars) * 100)

const clientIp = (request) => request.headers.get('CF-Connecting-IP') ?? 'unknown'

/**
 * Cloudflare's rate-limit binding. It costs no KV quota, which matters: a
 * counter kept in KV would let anyone burn the shop's 1,000 daily writes and
 * lock the owner out of their own admin panel. Absent binding (local dev)
 * simply allows the request.
 */
async function withinLimit(binding, key) {
  if (!binding?.limit) return true
  const { success } = await binding.limit({ key })
  return success
}

/* ------------------------------------------------------------ admin auth */

async function requireAdmin(request, env) {
  const auth = request.headers.get('Authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  // Bounded before it becomes a KV key, which has a 512-byte limit and throws.
  if (!token || token.length > 200) return null
  return (await env.SHOP_KV.get(`admintoken:${token}`)) === null ? null : token
}

/** Constant-time compare, so a wrong password reveals nothing by how long it took. */
function safeEqual(a = '', b = '') {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/* --------------------------------------------------------------- catalog */

/** Resolves a slug against the baked catalogue, then any admin-created item. */
async function lookupProduct(slug, env, snapshot) {
  const baked = CATALOG[slug]
  // Own-property check: a slug like "constructor" must not resolve to Object's.
  if (Object.prototype.hasOwnProperty.call(CATALOG, slug) && baked) return baked

  const live = snapshot ?? (await readSnapshot(env))
  const custom = live.products.find((p) => p.slug === slug)
  if (!custom) return null
  return {
    name: custom.name,
    price: custom.price,
    saleType: custom.saleType,
    category: custom.category,
  }
}

/**
 * The legal and pricing gate.
 *
 * Quantities are summed per product before anything is checked, because the
 * same slug can appear on several lines — checking each line separately once
 * let ten lines of 99 pass a stock level of 100.
 *
 * Returns every problem it finds rather than the first, so the checkout page
 * can point at each offending line instead of failing the whole basket with
 * one message.
 */
async function validateCart(rawLines, env, { requireShippable = true } = {}) {
  const lines = cleanLines(rawLines)
  const snapshot = await readSnapshot(env)

  const wanted = new Map()
  for (const { slug, qty } of lines) {
    wanted.set(slug, (wanted.get(slug) ?? 0) + qty)
  }

  const items = []
  const errors = []

  for (const [slug, qty] of wanted) {
    const product = await lookupProduct(slug, env, snapshot)
    if (!product) {
      errors.push({ slug, message: 'That item is no longer in the shop.' })
      continue
    }

    const override = snapshot.overrides[slug] ?? {}
    if (override.hidden) {
      errors.push({ slug, message: `"${product.name}" is no longer listed.` })
      continue
    }

    if (requireShippable && product.saleType !== 'ship') {
      errors.push({
        slug,
        message: `"${product.name}" is a licensed item — it can be reserved for collection, but it can't be paid for online.`,
      })
      continue
    }

    if (qty > MAX_QTY) {
      errors.push({
        slug,
        message: `We can only take ${MAX_QTY} of "${product.name}" in one order — please call the shop.`,
      })
      continue
    }

    const price = override.price ?? product.price
    const cents = price == null ? 0 : toCents(price)
    if (requireShippable && cents <= 0) {
      errors.push({
        slug,
        message: `"${product.name}" has no online price — please call the shop.`,
      })
      continue
    }

    const stock = override.stock
    if (stock != null && stock < qty) {
      errors.push({
        slug,
        message:
          stock === 0
            ? `"${product.name}" has just sold out.`
            : `Only ${stock} of "${product.name}" left.`,
      })
      continue
    }

    items.push({ slug, name: product.name, price: cents / 100, qty })
  }

  return { items, errors }
}

/* -------------------------------------------------------------- checkout */

async function handleCheckout(request, env) {
  if (!(await withinLimit(env.CHECKOUT_LIMIT, clientIp(request)))) {
    return fail('Too many attempts just now — please wait a moment.', request, env, 429)
  }

  const body = await readJson(request)
  const customer = cleanCustomer(body.customer)

  const { items, errors } = await validateCart(body.lines, env)
  if (errors.length) {
    return json({ error: errors[0].message, errors }, request, env, 400)
  }

  // Reserve lines are re-read from the catalogue too — their names and prices
  // end up on the shop's pick list, so they can't be client-supplied text.
  const reserve = body.reserveLines?.length
    ? await validateCart(body.reserveLines, env, { requireShippable: false })
    : { items: [], errors: [] }

  const site = (env.SITE_URL ?? '').replace(/\/$/, '')
  const amountCents = items.reduce((total, i) => total + toCents(i.price) * i.qty, 0)

  const lineItems = items.map((i) => ({
    quantity: i.qty,
    price_data: {
      currency: 'aud',
      unit_amount: toCents(i.price),
      product_data: { name: i.name.slice(0, 250) },
    },
  }))

  /*
   * Postage. Without shipping_address_collection Stripe never asks where the
   * goods go, and nothing else in the checkout collects an address — so the
   * shop was taking payment to post things with nowhere to post them to.
   * The fee itself is the shop's decision: set SHIPPING_FLAT_AUD to charge
   * one, leave it unset and postage is free.
   */
  const flat = Number(env.SHIPPING_FLAT_AUD ?? 0)
  const shippingOption = {
    shipping_rate_data: {
      type: 'fixed_amount',
      display_name: flat > 0 ? 'Standard post' : 'Free post',
      fixed_amount: { amount: flat > 0 ? Math.round(flat * 100) : 0, currency: 'aud' },
    },
  }

  const session = await createCheckoutSession(env.STRIPE_SECRET_KEY, {
    mode: 'payment',
    // Card only: delayed methods report "completed" before the money arrives.
    payment_method_types: ['card'],
    success_url: `${site}/order-confirmed?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${site}/checkout?cancelled=1`,
    customer_email: /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(customer.email) ? customer.email : undefined,
    line_items: lineItems,
    shipping_address_collection: { allowed_countries: ['AU'] },
    shipping_options: [shippingOption],
    metadata: { order: 'shop' },
  })

  await env.SHOP_KV.put(
    `order:${session.id}`,
    JSON.stringify({
      id: session.id,
      created: new Date().toISOString(),
      kind: 'payment',
      paid: false,
      customer,
      shipLines: items,
      reserveLines: reserve.items,
      amountCents,
      decremented: [],
    }),
    { expirationTtl: ORDER_TTL }
  )

  return json({ url: session.url, id: session.id, amountCents }, request, env)
}

/**
 * Reserving licensed goods. Nothing is charged, but the order has to be
 * recorded somewhere the shop will actually see it — previously a
 * reserve-only basket was "confirmed" to the customer and sent nowhere.
 */
async function handleReserve(request, env) {
  if (!(await withinLimit(env.CHECKOUT_LIMIT, clientIp(request)))) {
    return fail('Too many attempts just now — please wait a moment.', request, env, 429)
  }

  const body = await readJson(request)
  const customer = cleanCustomer(body.customer)
  if (!customer.name || (!customer.phone && !customer.email)) {
    return fail('Please give us your name and a phone number or email.', request, env)
  }

  const { items, errors } = await validateCart(body.lines, env, { requireShippable: false })
  if (errors.length) return json({ error: errors[0].message, errors }, request, env, 400)

  const reference = `R${Date.now().toString(36).toUpperCase()}`
  await env.SHOP_KV.put(
    `order:${reference}`,
    JSON.stringify({
      id: reference,
      created: new Date().toISOString(),
      kind: 'reserve',
      paid: false,
      customer,
      shipLines: [],
      reserveLines: items,
      amountCents: 0,
    }),
    { expirationTtl: ORDER_TTL }
  )

  return json({ reference }, request, env)
}

/** Contact and gift-certificate enquiries, kept with the orders. */
async function handleMessage(request, env) {
  if (!(await withinLimit(env.CHECKOUT_LIMIT, clientIp(request)))) {
    return fail('Too many messages just now — please wait a moment.', request, env, 429)
  }

  const body = await readJson(request, { maxBytes: 64 * 1024 })
  const customer = cleanCustomer(body)
  if (!customer.name) return fail('Please tell us your name.', request, env)
  if (!customer.phone && !customer.email) {
    return fail('Please give us a phone number or an email address.', request, env)
  }

  const subject = cleanText(body.subject, { max: 120, field: 'subject' })
  const reference = `M${Date.now().toString(36).toUpperCase()}`
  await env.SHOP_KV.put(
    `message:${reference}`,
    JSON.stringify({ id: reference, created: new Date().toISOString(), subject, customer }),
    { expirationTtl: ORDER_TTL }
  )

  return json({ reference }, request, env)
}

/* --------------------------------------------------------------- webhook */

/**
 * Marks an order paid and draws stock down, in an order that survives a retry.
 *
 * Stock is decremented first and each slug is recorded as it goes, so a
 * delivery that fails halfway can be replayed without double-counting and
 * without leaving the rest of the basket un-decremented. `paid` is written
 * last, because it is also the "don't do this again" flag.
 */
async function settleOrder(key, order, session, env) {
  const outstanding = (order.shipLines ?? []).filter(
    (line) => !(order.decremented ?? []).includes(line.slug)
  )

  if (outstanding.length) {
    await drawDownStock(env, outstanding)
    order.decremented = [...(order.decremented ?? []), ...outstanding.map((l) => l.slug)]
  }

  order.paid = true
  order.paidAt = order.paidAt ?? new Date().toISOString()
  order.stripeAmountCents = session?.amount_total ?? order.amountCents
  if (session?.shipping_details ?? session?.collected_information?.shipping_details) {
    order.shipTo = session.shipping_details ?? session.collected_information.shipping_details
  }

  await env.SHOP_KV.put(key, JSON.stringify(order), { expirationTtl: ORDER_TTL })
}

async function handleWebhook(request, env) {
  const raw = await request.text()
  const ok = await verifyWebhook(
    raw,
    request.headers.get('Stripe-Signature'),
    env.STRIPE_WEBHOOK_SECRET
  )
  if (!ok) return new Response('bad signature', { status: 400 })

  const event = JSON.parse(raw)
  const handled = ['checkout.session.completed', 'checkout.session.async_payment_succeeded']
  if (!handled.includes(event.type)) return new Response('ignored', { status: 200 })

  const session = event.data.object

  // "Completed" is not "paid" for every payment method, so ask explicitly.
  if (session.payment_status !== 'paid') {
    return new Response('awaiting payment', { status: 200 })
  }

  const key = `order:${session.id}`
  const order = await env.SHOP_KV.get(key, 'json')

  if (!order) {
    /*
     * The order is written at the customer's edge and this webhook may land
     * somewhere that hasn't seen it yet. Answering 200 would tell Stripe the
     * event was handled and it would never try again, leaving a paid order
     * marked unpaid forever. A 500 asks it to retry, until the event is old
     * enough that the session really is unknown.
     */
    const ageSeconds = Date.now() / 1000 - (event.created ?? 0)
    return new Response('order not visible yet', { status: ageSeconds < 86400 ? 500 : 200 })
  }

  if (order.paid && (order.decremented ?? []).length >= (order.shipLines ?? []).length) {
    return new Response('already handled', { status: 200 })
  }

  await settleOrder(key, order, session, env)
  return new Response('ok', { status: 200 })
}

async function handleOrder(sessionId, request, env) {
  const key = `order:${sessionId}`
  const order = await env.SHOP_KV.get(key, 'json')
  if (!order) return fail('Order not found.', request, env, 404)

  // If the customer beats the webhook back to the site, ask Stripe directly —
  // and write the answer down, rather than showing "paid" on one screen and
  // "unpaid" on the shop's.
  if (!order.paid && order.kind === 'payment') {
    try {
      const session = await retrieveSession(env.STRIPE_SECRET_KEY, sessionId)
      if (session.payment_status === 'paid') await settleOrder(key, order, session, env)
    } catch (err) {
      console.error('order status lookup failed', err)
    }
  }

  return json(
    {
      paid: Boolean(order.paid),
      kind: order.kind ?? 'payment',
      reference: order.id,
      amount: (order.amountCents ?? 0) / 100,
      customer: { name: order.customer?.name ?? null },
      shipLines: order.shipLines ?? [],
      reserveLines: order.reserveLines ?? [],
    },
    request,
    env
  )
}

/* ---------------------------------------------------------------- admin */

async function handleAdminLogin(request, env) {
  if (!(await withinLimit(env.LOGIN_LIMIT, clientIp(request)))) {
    return fail('Too many tries. Please wait a minute and try again.', request, env, 429)
  }

  const { password } = (await readJson(request, { maxBytes: 4096 })) ?? {}
  if (!env.ADMIN_PASSWORD || !safeEqual(String(password ?? ''), env.ADMIN_PASSWORD)) {
    return fail('That password is not right.', request, env, 401)
  }

  const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '')
  await env.SHOP_KV.put(`admintoken:${token}`, '1', { expirationTtl: ADMIN_TOKEN_TTL })
  return json({ token }, request, env)
}

/** Every product the shop can manage: catalogue + admin-created, with overrides. */
async function handleAdminProducts(request, env) {
  const { overrides, products } = await readSnapshot(env)

  const rows = Object.entries(CATALOG).map(([slug, p]) => ({
    slug,
    name: p.name,
    category: p.category,
    saleType: p.saleType,
    basePrice: p.price,
    custom: false,
    ...(overrides[slug] ?? {}),
  }))

  for (const p of products) {
    rows.push({
      slug: p.slug,
      name: p.name,
      category: p.category,
      saleType: p.saleType,
      basePrice: p.price,
      custom: true,
      ...(overrides[p.slug] ?? {}),
    })
  }

  rows.sort((a, b) => a.name.localeCompare(b.name))
  return json({ products: rows }, request, env)
}

async function handleAdminUpdate(slug, request, env) {
  const patch = (await readJson(request)) ?? {}
  const override = {}

  if ('stock' in patch) override.stock = cleanStock(patch.stock)
  if ('price' in patch) override.price = cleanPrice(patch.price)
  if ('hidden' in patch) override.hidden = Boolean(patch.hidden) || undefined

  const snapshot = await readSnapshot(env)
  const custom = snapshot.products.find((p) => p.slug === slug)

  if (custom) {
    const next = { slug }
    if ('name' in patch) next.name = cleanText(patch.name, { max: 140, field: 'name', required: true })
    if ('description' in patch) {
      next.description = cleanText(patch.description, { max: 4000, field: 'description', multiline: true })
    }
    if ('price' in patch) next.price = cleanPrice(patch.price)
    if ('category' in patch) next.category = cleanCategory(patch.category)
    if ('image' in patch && patch.image) {
      await env.SHOP_KV.put(`image:${slug}`, cleanImage(patch.image))
      next.image = `/api/image/${slug}`
    }

    // The legal class is decided by the department, not by the request — so a
    // stale tab or a stolen token can't make a rifle postable.
    const category = next.category ?? custom.category
    next.saleType = resolveSaleType(category, patch.saleType ?? custom.saleType)
    next.categories = [category]

    await upsertProduct(env, next)
  }

  if (Object.keys(override).length) await setOverride(env, slug, override)

  await invalidate(request, '/api/overrides')
  return json({ ok: true, override }, request, env)
}

async function handleAdminCreate(request, env) {
  const body = (await readJson(request)) ?? {}
  const name = cleanText(body.name, { max: 140, field: 'name', required: true })
  const category = cleanCategory(body.category ?? 'parts')
  const price = cleanPrice(body.price)
  const image = cleanImage(body.image)

  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'item'

  const snapshot = await readSnapshot(env)
  const taken = new Set([...Object.keys(CATALOG), ...snapshot.products.map((p) => p.slug)])
  let slug = base
  let n = 2
  while (taken.has(slug)) slug = `${base}-${n++}`

  const product = {
    slug,
    name,
    price,
    brand: cleanText(body.brand, { max: 80, field: 'brand' }) || null,
    code: null,
    image: image ? `/api/image/${slug}` : null,
    description: cleanText(body.description, { max: 4000, field: 'description', multiline: true }),
    availability: null,
    subLabel: null,
    category,
    categories: [category],
    saleType: resolveSaleType(category, body.saleType),
    custom: true,
  }

  if (image) await env.SHOP_KV.put(`image:${slug}`, image)
  await upsertProduct(env, product)

  const stock = cleanStock(body.stock)
  if (stock != null) await setOverride(env, slug, { stock })

  await invalidate(request, '/api/overrides')
  return json({ ok: true, product }, request, env)
}

async function handleAdminDelete(slug, request, env) {
  // Scraped products are part of the site's data — hide them instead, so the
  // shop can never permanently lose a listing by mistake.
  if (Object.prototype.hasOwnProperty.call(CATALOG, slug)) {
    await setOverride(env, slug, { hidden: true })
    await invalidate(request, '/api/overrides')
    return json({ ok: true, hidden: true }, request, env)
  }

  await removeProduct(env, slug)
  await env.SHOP_KV.delete(`image:${slug}`)
  await invalidate(request, '/api/overrides')
  return json({ ok: true, deleted: true }, request, env)
}

async function listRecords(env, prefix, limit = 200) {
  const out = []
  let cursor
  do {
    const page = await env.SHOP_KV.list({ prefix, cursor })
    const values = await Promise.all(page.keys.map(({ name }) => env.SHOP_KV.get(name, 'json')))
    out.push(...values.filter(Boolean))
    cursor = page.list_complete ? undefined : page.cursor
  } while (cursor && out.length < limit)
  out.sort((a, b) => (a.created < b.created ? 1 : -1))
  return out.slice(0, limit)
}

const handleAdminOrders = async (request, env) =>
  json({ orders: await listRecords(env, 'order:') }, request, env)

const handleAdminMessages = async (request, env) =>
  json({ messages: await listRecords(env, 'message:') }, request, env)

/** Everything the shop owns, in one file they can save somewhere safe. */
async function handleAdminExport(request, env) {
  const [snapshot, orders, messages] = await Promise.all([
    readSnapshot(env),
    listRecords(env, 'order:', 1000),
    listRecords(env, 'message:', 1000),
  ])
  return json(
    { exportedAt: new Date().toISOString(), ...snapshot, orders, messages },
    request,
    env
  )
}

/* --------------------------------------------------------------- router */

async function route(request, env) {
  const url = new URL(request.url)
  const { pathname } = url

  // Stripe posts here directly — no CORS, signature-verified instead.
  if (pathname === '/api/stripe-webhook' && request.method === 'POST') {
    return handleWebhook(request, env)
  }

  if (pathname === '/api/health') {
    return json({ ok: true, products: Object.keys(CATALOG).length }, request, env)
  }

  if (pathname === '/api/overrides' && request.method === 'GET') {
    /*
     * Every visitor asks for this. Serving it from the edge for half a minute
     * keeps stock levels current enough for a shop while making the common
     * case cost no KV quota at all — the free plan allows only 1,000 list
     * operations a day, and this endpoint used to spend two of them per hit.
     */
    return cached(request, 30, async () => {
      const { overrides, products } = await readSnapshot(env)
      return json({ overrides, products }, request, env, 200, 30)
    })
  }

  if (pathname.startsWith('/api/image/') && request.method === 'GET') {
    const slug = safeSegment(pathname.slice('/api/image/'.length))
    if (!slug) return new Response('not found', { status: 404 })

    const dataUrl = await env.SHOP_KV.get(`image:${slug}`)
    if (!dataUrl) return new Response('not found', { status: 404 })

    const match = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(dataUrl)
    if (!match) return new Response('not found', { status: 404 })

    const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0))
    return new Response(bytes, {
      headers: {
        // From the allowlist above, never from the stored string, so a stored
        // value can't turn this endpoint into an HTML host.
        'Content-Type': match[1],
        'Cache-Control': 'public, max-age=86400',
        ...corsHeaders(request, env),
      },
    })
  }

  if (pathname === '/api/checkout' && request.method === 'POST') return handleCheckout(request, env)
  if (pathname === '/api/reserve' && request.method === 'POST') return handleReserve(request, env)
  if (pathname === '/api/message' && request.method === 'POST') return handleMessage(request, env)

  if (pathname.startsWith('/api/order/') && request.method === 'GET') {
    const id = safeSegment(pathname.slice('/api/order/'.length), 200)
    if (!id) return fail('Order not found.', request, env, 404)
    return handleOrder(id, request, env)
  }

  if (pathname === '/api/admin/login' && request.method === 'POST') {
    return handleAdminLogin(request, env)
  }

  if (pathname.startsWith('/api/admin/')) {
    const token = await requireAdmin(request, env)
    if (!token) return fail('Please sign in again.', request, env, 401)

    if (pathname === '/api/admin/logout' && request.method === 'POST') {
      await env.SHOP_KV.delete(`admintoken:${token}`)
      return json({ ok: true }, request, env)
    }
    if (pathname === '/api/admin/products' && request.method === 'GET') {
      return handleAdminProducts(request, env)
    }
    if (pathname === '/api/admin/orders' && request.method === 'GET') {
      return handleAdminOrders(request, env)
    }
    if (pathname === '/api/admin/messages' && request.method === 'GET') {
      return handleAdminMessages(request, env)
    }
    if (pathname === '/api/admin/export' && request.method === 'GET') {
      return handleAdminExport(request, env)
    }
    if (pathname === '/api/admin/product' && request.method === 'POST') {
      return handleAdminCreate(request, env)
    }
    if (pathname.startsWith('/api/admin/product/')) {
      const slug = safeSegment(pathname.slice('/api/admin/product/'.length))
      if (!slug) return fail('That item reference is not valid.', request, env, 404)
      if (request.method === 'PUT') return handleAdminUpdate(slug, request, env)
      if (request.method === 'DELETE') return handleAdminDelete(slug, request, env)
    }
  }

  return fail('Not found', request, env, 404)
}

/** Decodes one path segment, refusing anything that isn't a plain reference. */
function safeSegment(raw, max = 90) {
  let decoded
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    return null
  }
  return /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(decoded) && decoded.length <= max ? decoded : null
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) })
    }

    try {
      return await route(request, env)
    } catch (err) {
      // Anything a customer should read is a BadRequest raised deliberately.
      if (err instanceof BadRequest) return fail(err.message, request, env, 400)

      // Everything else is ours, not theirs: log it where `wrangler tail` can
      // see it and say nothing about the internals.
      console.error('unhandled', request.method, new URL(request.url).pathname, err)
      return fail('Something went wrong at our end. Please try again.', request, env, 500)
    }
  },
}
