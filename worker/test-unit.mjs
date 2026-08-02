/**
 * Unit tests for the API's pure logic.
 *
 *   node worker/test-unit.mjs
 *
 * These need no secrets, no network and no Cloudflare, so they run in CI on
 * every push. The end-to-end suite (test-payment.mjs) covers the parts that
 * genuinely need Stripe.
 */
import {
  BadRequest,
  cleanCustomer,
  cleanImage,
  cleanLines,
  cleanPrice,
  cleanSlug,
  cleanStock,
  cleanText,
  resolveSaleType,
  readJson,
  LICENSED_CATEGORIES,
  CATEGORIES,
} from './validate.js'
import { verifyWebhook } from './stripe.js'
import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'

let failures = 0
let checks = 0

function ok(condition, label) {
  checks++
  if (condition) {
    console.log(`  PASS  ${label}`)
  } else {
    failures++
    console.log(`  FAIL  ${label}`)
  }
}

/** Asserts the call is refused, and that the refusal is a message we wrote. */
function refuses(fn, label) {
  checks++
  try {
    fn()
    failures++
    console.log(`  FAIL  ${label} — it was allowed`)
  } catch (err) {
    if (err instanceof BadRequest) {
      console.log(`  PASS  ${label}`)
    } else {
      failures++
      console.log(`  FAIL  ${label} — threw ${err.name}, not a readable BadRequest`)
    }
  }
}

console.log('\n1. Licensed goods can never be made shippable')
{
  for (const category of LICENSED_CATEGORIES) {
    ok(
      resolveSaleType(category, 'ship') === 'reserve',
      `${category} + "post it" is forced back to reserve`
    )
  }
  ok(resolveSaleType('parts', 'ship') === 'ship', 'ordinary parts may still be posted')
  ok(resolveSaleType('gun-care', 'ship') === 'ship', 'cleaning gear may still be posted')
  ok(
    resolveSaleType('parts', 'anything-else') === 'reserve',
    'an unrecognised sale type falls back to reserve, not ship'
  )

  // The catalogue on disk must agree with the rule the server enforces.
  const catalog = JSON.parse(readFileSync(new URL('./catalog-index.json', import.meta.url)))
  const illegal = Object.entries(catalog).filter(
    ([, p]) => p.saleType === 'ship' && LICENSED_CATEGORIES.has(p.category)
  )
  ok(illegal.length === 0, `no firearm or ammunition in the catalogue is shippable (checked ${Object.keys(catalog).length})`)

  const unknown = Object.entries(catalog).filter(([, p]) => !CATEGORIES.has(p.category))
  ok(unknown.length === 0, 'every catalogue product sits in a known department')
}

console.log('\n1b. No shippable product describes itself as licence-controlled')
{
  /*
   * The department alone can't catch this. "Parts" is a legitimately postable
   * department, but a Category D trigger assembly lives there too, and the only
   * place that is recorded is the shop's own description. This tripwire reads
   * every shippable product's own words and fails the build if any of them say
   * the item needs a licence — so a future re-scrape can't quietly reopen it.
   */
  const LICENCE_TEXT =
    /\bcat(?:egory)?\.?\s*[abcdh]\b|\bdealer (?:only|sale)|\bto dealer\b|our premises|permit to acquire|serial number/i
  const REGULATED_PART =
    /\b(barrel|receiver|bolt (?:assembly|complete)|trigger (?:group|assembly|mechanism)|magazine|frame|slide arm)\b/i

  const catalogDir = new URL('../src/data/catalog/', import.meta.url)
  const files = ['parts.json', 'gun-care.json', 'reloading.json', 'optics.json', 'targets.json', 'lighting.json', 'storage.json', 'hunting.json']

  const offenders = []
  for (const file of files) {
    let rows
    try {
      rows = JSON.parse(readFileSync(new URL(file, catalogDir)))
    } catch {
      continue
    }
    for (const p of rows) {
      if (p.saleType !== 'ship') continue
      const text = `${p.name} ${p.description ?? ''}`
      if (LICENCE_TEXT.test(text)) offenders.push(`${p.slug} (licence wording)`)
      else if (p.category === 'parts' && REGULATED_PART.test(text)) {
        offenders.push(`${p.slug} (regulated component)`)
      }
    }
  }

  if (offenders.length) {
    console.log(`        ${offenders.slice(0, 10).join('\n        ')}`)
  }
  ok(
    offenders.length === 0,
    'no product that can be posted and paid for online says it needs a licence'
  )
}

console.log('\n2. Prices cannot be nonsense')
{
  ok(cleanPrice('27.005') === 27.01, 'prices round to whole cents')
  ok(cleanPrice(null) === null, 'no price is allowed — plenty of stock is price-on-application')
  refuses(() => cleanPrice(-5), 'a negative price is refused')
  refuses(() => cleanPrice(0), 'a zero price is refused')
  refuses(() => cleanPrice('free'), 'a non-numeric price is refused')
  refuses(() => cleanPrice(1e9), 'an absurd price is refused')
  refuses(() => cleanPrice(NaN), 'NaN is refused')
  refuses(() => cleanPrice(Infinity), 'Infinity is refused')
  refuses(() => cleanPrice(null, { allowNull: false }), 'a missing price is refused where one is required')
}

console.log('\n3. Slugs cannot address keys they should not')
{
  ok(cleanSlug('tikka-t3-hunter') === 'tikka-t3-hunter', 'a normal slug passes')
  refuses(() => cleanSlug('../../etc'), 'a traversal-shaped slug is refused')
  refuses(() => cleanSlug('has spaces'), 'a slug with spaces is refused')
  refuses(() => cleanSlug('UPPER'), 'an upper-case slug is refused')
  refuses(() => cleanSlug(''), 'an empty slug is refused')
  refuses(() => cleanSlug('a'.repeat(200)), 'an over-long slug is refused before it reaches the store')
  refuses(() => cleanSlug('__proto__'), 'a prototype-shaped slug is refused')
  refuses(() => cleanSlug('-leading'), 'a slug starting with a dash is refused')
}

console.log('\n4. Stock counts stay whole and positive')
{
  ok(cleanStock(null) === null, 'null means the shop is not counting this line')
  ok(cleanStock('') === null, 'a cleared box means not counted')
  ok(cleanStock('7') === 7, 'a typed number is read as a number')
  ok(cleanStock(3.7) === 3, 'a fractional count is floored')
  ok(cleanStock(0) === 0, 'zero is a real value — it means sold out')
  refuses(() => cleanStock(-1), 'negative stock is refused')
  refuses(() => cleanStock('lots'), 'non-numeric stock is refused')
}

console.log('\n5. Text can never smuggle control characters or run unbounded')
{
  const NL = String.fromCharCode(10)
  const NUL = String.fromCharCode(0)
  const forged = `Bob${NL}Total: paid in full${NUL}`

  ok(
    !cleanText(forged, { field: 'name' }).includes(NL),
    'a newline in a name cannot forge a second line in the order'
  )
  ok(!cleanText(forged, { field: 'name' }).includes(NUL), 'null bytes are stripped')
  ok(
    cleanText(forged, { field: 'notes', multiline: true }).includes(NL),
    'the notes box still keeps real line breaks'
  )
  refuses(
    () => cleanText('x'.repeat(5000), { max: 200, field: 'name' }),
    'an over-long field is refused rather than silently truncated'
  )
  refuses(
    () => cleanText('', { required: true, field: 'name' }),
    'a required field cannot be left blank'
  )
  ok(cleanText(undefined) === '', 'a missing optional field is simply empty')
}

console.log('\n6. Carts are re-read from the server, never trusted')
{
  const lines = cleanLines([{ slug: 'a-b', qty: '3', price: 0.01, saleType: 'ship', name: 'Free Rifle' }])
  ok(lines.length === 1, 'one line in, one line out')
  ok(lines[0].qty === 3, 'quantity is coerced to a number')
  ok(
    !('price' in lines[0]) && !('saleType' in lines[0]) && !('name' in lines[0]),
    'a client-supplied price, sale type and name are discarded outright'
  )
  ok(cleanLines([{ slug: 'a-b', qty: 0 }])[0].qty === 1, 'a zero quantity becomes one')
  ok(cleanLines([{ slug: 'a-b', qty: 9999 }])[0].qty === 99, 'quantity is capped')
  refuses(() => cleanLines([]), 'an empty cart is refused')
  refuses(() => cleanLines('not-an-array'), 'a non-array cart is refused')
  refuses(
    () => cleanLines(Array.from({ length: 500 }, () => ({ slug: 'a-b', qty: 1 }))),
    'an absurd number of lines is refused'
  )
}

console.log('\n7. Uploaded photos must really be photos')
{
  ok(cleanImage(null) === null, 'no photo is fine')
  ok(
    cleanImage('data:image/jpeg;base64,AAAA').startsWith('data:image/jpeg'),
    'a real JPEG data URL is accepted'
  )
  refuses(
    () => cleanImage('data:text/html;base64,PHNjcmlwdD4='),
    'HTML disguised as a photo is refused'
  )
  refuses(
    () => cleanImage('data:image/svg+xml;base64,PHN2Zz4='),
    'SVG is refused — it can carry script'
  )
  refuses(() => cleanImage('https://example.com/x.jpg'), 'a remote URL is refused')
  refuses(
    () => cleanImage(`data:image/jpeg;base64,${'A'.repeat(4 * 1024 * 1024)}`),
    'an oversized photo is refused'
  )
}

console.log('\n8. Customer details are pinned to a fixed shape')
{
  const customer = cleanCustomer({
    name: 'Jo Bloggs',
    email: 'jo@example.com',
    phone: '0400 000 000',
    licence: '1234567',
    notes: 'ring first',
    fulfilment: 'dealer',
    // Anything else must not survive.
    isAdmin: true,
    balanceOwing: 0,
  })
  ok(
    Object.keys(customer).sort().join(',') === 'email,fulfilment,licence,name,notes,phone',
    'only the six fields the shop needs are kept'
  )
  ok(customer.fulfilment === 'dealer', 'a valid handover choice is kept')
  ok(cleanCustomer({ fulfilment: 'teleport' }).fulfilment === 'pickup', 'an unknown handover choice falls back to pickup')
  refuses(() => cleanCustomer({ name: 'x'.repeat(500) }), 'an over-long name is refused')
}

console.log('\n9. Oversized request bodies are refused before they are parsed')
{
  const big = new Request('https://x/', {
    method: 'POST',
    headers: { 'Content-Length': String(50 * 1024 * 1024) },
    body: '{}',
  })
  checks++
  await readJson(big).then(
    () => {
      failures++
      console.log('  FAIL  a 50MB declared body was accepted')
    },
    (err) => {
      if (err instanceof BadRequest) console.log('  PASS  a 50MB declared body is refused')
      else {
        failures++
        console.log(`  FAIL  wrong error type: ${err.name}`)
      }
    }
  )

  const malformed = new Request('https://x/', { method: 'POST', body: '{not json' })
  checks++
  await readJson(malformed).then(
    () => {
      failures++
      console.log('  FAIL  malformed JSON was accepted')
    },
    (err) => {
      if (err instanceof BadRequest) console.log('  PASS  malformed JSON is refused readably')
      else {
        failures++
        console.log(`  FAIL  wrong error type: ${err.name}`)
      }
    }
  )
}

console.log('\n10. Stripe webhook signatures')
{
  const secret = 'whsec_test_secret'
  const payload = JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed' })
  const sign = (body, key, t = Math.floor(Date.now() / 1000)) =>
    `t=${t},v1=${createHmac('sha256', key).update(`${t}.${body}`).digest('hex')}`

  ok(await verifyWebhook(payload, sign(payload, secret), secret), 'a genuine signature is accepted')
  ok(
    !(await verifyWebhook(payload, sign(payload, 'wrong-secret'), secret)),
    'a forged signature is rejected'
  )
  ok(
    !(await verifyWebhook(payload, sign(payload, secret, Math.floor(Date.now() / 1000) - 3600), secret)),
    'a replayed old event is rejected'
  )
  ok(
    !(await verifyWebhook(`${payload} tampered`, sign(payload, secret), secret)),
    'a tampered body is rejected'
  )
  ok(!(await verifyWebhook(payload, 'garbage', secret)), 'a malformed header is rejected without throwing')
  ok(!(await verifyWebhook(payload, '', secret)), 'an empty header is rejected')
  ok(!(await verifyWebhook(payload, null, secret)), 'a missing header is rejected')

  // Secret rotation: Stripe sends every valid signature in one header, and the
  // active one is not always last.
  const rotating = `${sign(payload, secret)},v1=${createHmac('sha256', 'old-secret')
    .update(`${Math.floor(Date.now() / 1000)}.${payload}`)
    .digest('hex')}`
  ok(
    await verifyWebhook(payload, rotating, secret),
    'during secret rotation, a valid signature is accepted even when it is not the last one'
  )

  // If the secret was never configured, everything must be refused rather than
  // verified against the string "undefined".
  ok(
    !(await verifyWebhook(payload, sign(payload, 'undefined'), undefined)),
    'an unset webhook secret rejects everything instead of trusting a guessable key'
  )
}

console.log(
  `\n${failures === 0 ? 'all good' : `${failures} FAILED`} — ${checks - failures}/${checks} checks passed\n`
)
process.exit(failures === 0 ? 0 : 1)
