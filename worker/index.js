/**
 * Fisher Firearms API.
 *
 * The shop's website is a static build on GitHub Pages; this Worker is
 * everything that needs a server: Stripe payments, live stock levels, and the
 * admin panel's backend.
 *
 * Data model (Workers KV, namespace SHOP_KV):
 *   override:<slug>    {stock, price, hidden}  changes layered over the
 *                                              catalogue baked into the site
 *   newproduct:<slug>  full product created by the shop in the admin panel
 *   image:<slug>       data URL for an admin-uploaded photo
 *   order:<sessionId>  order record, before and after payment
 *   admintoken:<token> admin session
 *
 * The catalogue in catalog-index.json is the server's own copy of every
 * product's real price and sale type. Nothing the browser sends about price or
 * saleType is trusted — see validateCart().
 */
import CATALOG from './catalog-index.json'
import {
  createCheckoutSession,
  retrieveSession,
  verifyWebhook,
} from './stripe.js'

const ADMIN_TOKEN_TTL = 60 * 60 * 24 * 30 // 30 days

/* ---------------------------------------------------------------- helpers */

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') ?? ''
  const allowed = (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const ok = allowed.includes(origin) || /^http:\/\/localhost:\d+$/.test(origin)
  return {
    'Access-Control-Allow-Origin': ok ? origin : allowed[0] ?? '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

function json(data, request, env, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...corsHeaders(request, env),
    },
  })
}

const fail = (msg, request, env, status = 400) =>
  json({ error: msg }, request, env, status)

/** Money in cents — avoids float drift on totals. */
const toCents = (dollars) => Math.round(Number(dollars) * 100)

async function listKV(kv, prefix) {
  const out = []
  let cursor
  do {
    const page = await kv.list({ prefix, cursor })
    out.push(...page.keys)
    cursor = page.list_complete ? undefined : page.cursor
  } while (cursor)
  return out
}

/** Reads every override and admin-created product in one pass. */
async function readOverrides(env) {
  const [overrideKeys, productKeys] = await Promise.all([
    listKV(env.SHOP_KV, 'override:'),
    listKV(env.SHOP_KV, 'newproduct:'),
  ])

  const overrides = {}
  await Promise.all(
    overrideKeys.map(async ({ name }) => {
      const value = await env.SHOP_KV.get(name, 'json')
      if (value) overrides[name.slice('override:'.length)] = value
    })
  )

  const products = []
  await Promise.all(
    productKeys.map(async ({ name }) => {
      const value = await env.SHOP_KV.get(name, 'json')
      if (value) products.push(value)
    })
  )

  return { overrides, products }
}

/* ------------------------------------------------------------ admin auth */

async function requireAdmin(request, env) {
  const auth = request.headers.get('Authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return false
  return (await env.SHOP_KV.get(`admintoken:${token}`)) !== null
}

/* --------------------------------------------------------------- catalog */

/** Resolves a slug against the baked catalogue, then any admin-created item. */
async function lookupProduct(slug, env) {
  if (CATALOG[slug]) return CATALOG[slug]
  const custom = await env.SHOP_KV.get(`newproduct:${slug}`, 'json')
  if (!custom) return null
  return {
    name: custom.name,
    price: custom.price,
    saleType: custom.saleType,
    category: custom.category,
  }
}

/**
 * The legal gate. Re-prices every line from the server's own catalogue and
 * refuses anything that cannot lawfully be posted to a customer — a firearm or
 * ammunition can be reserved online, never shipped, so it must never reach a
 * card payment. Also blocks buying stock that isn't there.
 */
async function validateCart(lines, env) {
  if (!Array.isArray(lines) || lines.length === 0) {
    return { error: 'Your cart is empty.' }
  }

  const { overrides } = await readOverrides(env)
  const items = []

  for (const line of lines) {
    const slug = String(line?.slug ?? '')
    const qty = Math.max(1, Math.min(99, Math.floor(Number(line?.qty) || 1)))

    const product = await lookupProduct(slug, env)
    if (!product) return { error: `We no longer stock "${slug}".` }

    const override = overrides[slug] ?? {}
    if (override.hidden) return { error: `"${product.name}" is no longer listed.` }

    if (product.saleType !== 'ship') {
      return {
        error: `"${product.name}" is a licensed item — it can be reserved for collection but cannot be paid for online.`,
      }
    }

    const price = override.price ?? product.price
    if (price == null || price <= 0) {
      return { error: `"${product.name}" has no online price — please call the shop.` }
    }

    const stock = override.stock
    if (stock != null && stock < qty) {
      return {
        error:
          stock === 0
            ? `"${product.name}" has just sold out.`
            : `Only ${stock} of "${product.name}" left.`,
      }
    }

    items.push({ slug, name: product.name, price, qty })
  }

  return { items }
}

/* -------------------------------------------------------------- handlers */

async function handleCheckout(request, env) {
  const body = await request.json().catch(() => null)
  if (!body) return fail('Could not read the order.', request, env)

  const { items, error } = await validateCart(body.lines, env)
  if (error) return fail(error, request, env)

  const site = env.SITE_URL.replace(/\/$/, '')
  const customer = body.customer ?? {}

  const session = await createCheckoutSession(env.STRIPE_SECRET_KEY, {
    mode: 'payment',
    // Stripe appends the real id in place of the placeholder.
    success_url: `${site}/order-confirmed?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${site}/checkout?cancelled=1`,
    customer_email: customer.email || undefined,
    line_items: items.map((i) => ({
      quantity: i.qty,
      price_data: {
        currency: 'aud',
        unit_amount: toCents(i.price),
        product_data: { name: i.name },
      },
    })),
    metadata: {
      slugs: items.map((i) => `${i.slug}:${i.qty}`).join(','),
    },
  })

  // Reserve lines never touch Stripe, but the shop still needs to know to put
  // them aside — so they ride along on the order record.
  await env.SHOP_KV.put(
    `order:${session.id}`,
    JSON.stringify({
      id: session.id,
      created: new Date().toISOString(),
      paid: false,
      customer,
      shipLines: items,
      reserveLines: Array.isArray(body.reserveLines) ? body.reserveLines : [],
      amount: items.reduce((t, i) => t + i.price * i.qty, 0),
    }),
    { expirationTtl: 60 * 60 * 24 * 120 }
  )

  return json({ url: session.url, id: session.id }, request, env)
}

async function handleWebhook(request, env) {
  const raw = await request.text()
  const ok = await verifyWebhook(
    raw,
    request.headers.get('Stripe-Signature'),
    env.STRIPE_WEBHOOK_SECRET
  )
  // 400 tells Stripe to retry; a bad signature means it isn't really Stripe.
  if (!ok) return new Response('bad signature', { status: 400 })

  const event = JSON.parse(raw)
  if (event.type !== 'checkout.session.completed') {
    return new Response('ignored', { status: 200 })
  }

  const session = event.data.object
  const key = `order:${session.id}`
  const order = await env.SHOP_KV.get(key, 'json')
  if (!order) return new Response('unknown order', { status: 200 })
  if (order.paid) return new Response('already handled', { status: 200 })

  order.paid = true
  order.paidAt = new Date().toISOString()
  order.stripeAmount = session.amount_total
  await env.SHOP_KV.put(key, JSON.stringify(order), {
    expirationTtl: 60 * 60 * 24 * 365,
  })

  // Draw down stock for anything the shop is counting.
  for (const line of order.shipLines) {
    const oKey = `override:${line.slug}`
    const current = (await env.SHOP_KV.get(oKey, 'json')) ?? {}
    if (current.stock == null) continue
    current.stock = Math.max(0, current.stock - line.qty)
    await env.SHOP_KV.put(oKey, JSON.stringify(current))
  }

  return new Response('ok', { status: 200 })
}

async function handleOrder(sessionId, request, env) {
  const order = await env.SHOP_KV.get(`order:${sessionId}`, 'json')
  if (!order) return fail('Order not found.', request, env, 404)

  // The webhook is usually first, but if the customer beats it back to the
  // site, ask Stripe directly rather than showing a false "unpaid".
  if (!order.paid) {
    try {
      const session = await retrieveSession(env.STRIPE_SECRET_KEY, sessionId)
      if (session.payment_status === 'paid') order.paid = true
    } catch {
      // Leave it unpaid; the webhook will settle it.
    }
  }

  return json(
    {
      paid: order.paid,
      amount: order.amount,
      customer: { name: order.customer?.name ?? null },
      shipLines: order.shipLines,
      reserveLines: order.reserveLines,
    },
    request,
    env
  )
}

/* ---------------------------------------------------------------- admin */

async function handleAdminLogin(request, env) {
  const { password } = (await request.json().catch(() => ({}))) ?? {}
  if (!password || password !== env.ADMIN_PASSWORD) {
    return fail('That password is not right.', request, env, 401)
  }
  const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '')
  await env.SHOP_KV.put(`admintoken:${token}`, '1', {
    expirationTtl: ADMIN_TOKEN_TTL,
  })
  return json({ token }, request, env)
}

/** Every product the shop can manage: catalogue + admin-created, with overrides. */
async function handleAdminProducts(request, env) {
  const { overrides, products } = await readOverrides(env)

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
  const patch = (await request.json().catch(() => null)) ?? {}
  const key = `override:${slug}`
  const current = (await env.SHOP_KV.get(key, 'json')) ?? {}

  if ('stock' in patch) {
    current.stock =
      patch.stock === null ? null : Math.max(0, Math.floor(Number(patch.stock) || 0))
  }
  if ('price' in patch) {
    const n = Number(patch.price)
    current.price = patch.price === null || !Number.isFinite(n) ? null : n
    if (current.price === null) delete current.price
  }
  if ('hidden' in patch) current.hidden = Boolean(patch.hidden)

  // If a custom product's own fields changed, update the product record too.
  const custom = await env.SHOP_KV.get(`newproduct:${slug}`, 'json')
  if (custom) {
    for (const field of ['name', 'description', 'price', 'category', 'saleType']) {
      if (field in patch && patch[field] != null) custom[field] = patch[field]
    }
    if (patch.image) {
      await env.SHOP_KV.put(`image:${slug}`, patch.image)
      custom.image = `/api/image/${slug}`
    }
    await env.SHOP_KV.put(`newproduct:${slug}`, JSON.stringify(custom))
  }

  await env.SHOP_KV.put(key, JSON.stringify(current))
  return json({ ok: true, override: current }, request, env)
}

async function handleAdminCreate(request, env) {
  const body = (await request.json().catch(() => null)) ?? {}
  const name = String(body.name ?? '').trim()
  if (!name) return fail('The item needs a name.', request, env)

  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'item'
  let slug = base
  let n = 2
  while (CATALOG[slug] || (await env.SHOP_KV.get(`newproduct:${slug}`))) {
    slug = `${base}-${n++}`
  }

  const saleType = ['ship', 'reserve', 'enquire'].includes(body.saleType)
    ? body.saleType
    : 'reserve'

  const product = {
    slug,
    name,
    price: body.price == null ? null : Number(body.price),
    brand: body.brand ?? null,
    code: null,
    image: body.image ? `/api/image/${slug}` : null,
    description: String(body.description ?? ''),
    availability: null,
    subLabel: null,
    category: body.category ?? 'parts',
    categories: [body.category ?? 'parts'],
    saleType,
    custom: true,
  }

  if (body.image) await env.SHOP_KV.put(`image:${slug}`, body.image)
  await env.SHOP_KV.put(`newproduct:${slug}`, JSON.stringify(product))
  if (body.stock != null) {
    await env.SHOP_KV.put(
      `override:${slug}`,
      JSON.stringify({ stock: Math.max(0, Math.floor(Number(body.stock) || 0)) })
    )
  }

  return json({ ok: true, product }, request, env)
}

async function handleAdminDelete(slug, request, env) {
  // Scraped products are part of the site's data — hide them instead, so the
  // shop can never permanently lose a listing by mistake.
  if (CATALOG[slug]) {
    const key = `override:${slug}`
    const current = (await env.SHOP_KV.get(key, 'json')) ?? {}
    current.hidden = true
    await env.SHOP_KV.put(key, JSON.stringify(current))
    return json({ ok: true, hidden: true }, request, env)
  }

  await Promise.all([
    env.SHOP_KV.delete(`newproduct:${slug}`),
    env.SHOP_KV.delete(`image:${slug}`),
    env.SHOP_KV.delete(`override:${slug}`),
  ])
  return json({ ok: true, deleted: true }, request, env)
}

async function handleAdminOrders(request, env) {
  const keys = await listKV(env.SHOP_KV, 'order:')
  const orders = []
  await Promise.all(
    keys.map(async ({ name }) => {
      const o = await env.SHOP_KV.get(name, 'json')
      if (o) orders.push(o)
    })
  )
  orders.sort((a, b) => (a.created < b.created ? 1 : -1))
  return json({ orders: orders.slice(0, 100) }, request, env)
}

/* --------------------------------------------------------------- router */

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const { pathname } = url

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) })
    }

    try {
      // Stripe posts here directly — no CORS, signature-verified instead.
      if (pathname === '/api/stripe-webhook' && request.method === 'POST') {
        return await handleWebhook(request, env)
      }

      if (pathname === '/api/health') {
        return json({ ok: true, products: Object.keys(CATALOG).length }, request, env)
      }

      if (pathname === '/api/overrides' && request.method === 'GET') {
        const { overrides, products } = await readOverrides(env)
        return json({ overrides, products }, request, env)
      }

      if (pathname.startsWith('/api/image/') && request.method === 'GET') {
        const slug = decodeURIComponent(pathname.slice('/api/image/'.length))
        const dataUrl = await env.SHOP_KV.get(`image:${slug}`)
        if (!dataUrl) return new Response('not found', { status: 404 })
        const [meta, b64] = dataUrl.split(',')
        const type = meta.match(/data:([^;]+)/)?.[1] ?? 'image/jpeg'
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
        return new Response(bytes, {
          headers: {
            'Content-Type': type,
            'Cache-Control': 'public, max-age=60',
            ...corsHeaders(request, env),
          },
        })
      }

      if (pathname === '/api/checkout' && request.method === 'POST') {
        return await handleCheckout(request, env)
      }

      if (pathname.startsWith('/api/order/') && request.method === 'GET') {
        return await handleOrder(pathname.slice('/api/order/'.length), request, env)
      }

      if (pathname === '/api/admin/login' && request.method === 'POST') {
        return await handleAdminLogin(request, env)
      }

      if (pathname.startsWith('/api/admin/')) {
        if (!(await requireAdmin(request, env))) {
          return fail('Please sign in again.', request, env, 401)
        }

        if (pathname === '/api/admin/products' && request.method === 'GET') {
          return await handleAdminProducts(request, env)
        }
        if (pathname === '/api/admin/orders' && request.method === 'GET') {
          return await handleAdminOrders(request, env)
        }
        if (pathname === '/api/admin/product' && request.method === 'POST') {
          return await handleAdminCreate(request, env)
        }
        if (pathname.startsWith('/api/admin/product/')) {
          const slug = decodeURIComponent(pathname.slice('/api/admin/product/'.length))
          if (request.method === 'PUT') return await handleAdminUpdate(slug, request, env)
          if (request.method === 'DELETE') return await handleAdminDelete(slug, request, env)
        }
      }

      return fail('Not found', request, env, 404)
    } catch (err) {
      return fail(err?.message ?? 'Something went wrong.', request, env, 500)
    }
  },
}
