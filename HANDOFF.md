# Technical handover

Everything needed to take this site over. For day-to-day shop use see
[OWNER-GUIDE.md](OWNER-GUIDE.md).

## What it is

| Piece | What it does | Where it lives |
| --- | --- | --- |
| Website | Static build (Vite + React + TypeScript) | GitHub Pages, `kampm-05.github.io/fisher-firearms` |
| API | Payments, live stock, admin, orders | Cloudflare Worker, `fisher-firearms-api.fisher-firearms.workers.dev` |
| Data | Stock, orders, messages, uploaded photos | Cloudflare Workers KV, namespace `SHOP_KV` |
| Payments | Hosted card checkout | Stripe — **test mode** |

The catalogue itself (619 products) is baked into the build. The Worker stores
only what changes: stock counts, price overrides, hidden flags, shop-created
products, orders and messages.

**The site works without the API.** If the Worker is down, the catalogue still
renders from the build, and checkout falls back to a phone-in order. Only live
stock and card payment stop.

## Deploying

Pushing to `main` builds and publishes the website. The workflow blocks on lint,
typecheck and `worker/test-unit.mjs`, so a broken build cannot reach customers.

The API deploys separately:

```bash
cd worker && npx wrangler deploy
```

## Secrets

Never in the repo. Set them with:

```bash
cd worker && npx wrangler secret put STRIPE_SECRET_KEY
```

| Name | What it is |
| --- | --- |
| `STRIPE_SECRET_KEY` | `sk_test_…`, or `sk_live_…` when going live |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` from the Stripe webhook endpoint |
| `ADMIN_PASSWORD` | The shop manager password |

Optional plain variable in `wrangler.toml`: `SHIPPING_FLAT_AUD` — flat postage
in dollars, e.g. `"12.50"`. Unset means free postage. The delivery address is
always collected.

## Tests

```bash
node worker/test-unit.mjs
```

No secrets, no network. Covers the sale-type law, the catalogue tripwire,
pricing, input validation and webhook signatures. **This runs in CI and blocks
deploys.**

```bash
cd worker && npx wrangler dev --port 8788 --local
node worker/test-payment.mjs
```

End-to-end against Stripe test mode: real card charge, decline, server-side
pricing, webhook signature and replay, stock drawdown, the legal gate, reserve
recording and admin auth. Run against production with `API=…` — the webhook
checks skip themselves there, because they sign with the local secret.

## Accounts to transfer

1. **GitHub** — transfer the repo to the business's account, or add them as
   owner. Pages redeploys automatically.
2. **Cloudflare** (`rmkmax05@gmail.com`, account `94bd9851429ae978f7e689af2de974ec`)
   — invite the business as a member, or move the Worker and the `SHOP_KV`
   namespace to their account. **Export a backup from the admin panel first**;
   KV data does not move between accounts by itself.
3. **Stripe** — see below.

## Going live with payments

**This is the one thing that needs a real conversation, and it should happen
early.**

Stripe is in test mode. Real cards need Stripe to approve the business, and
their prohibited-business rules cover firearms and ammunition. They may decline
a firearms retailer even though this site only ever charges for accessories —
cleaning gear, parts, optics, targets. Ask them before promising the shop
online payment.

If Stripe declines, the damage is contained: the reserve-and-collect flow —
which is the entire regulated side of the business — does not involve Stripe at
all and keeps working. Only card payment for the 71 shippable accessories would
be unavailable, and those could fall back to phone orders.

To go live: swap in `sk_live_…`, create a live-mode webhook pointing at
`/api/stripe-webhook`, and set the new `whsec_…`. Nothing else changes.

## Custom domain

For `fisherfirearms.com.au`:

1. In the repo, Settings → Pages → Custom domain.
2. Add the DNS records GitHub shows you at the registrar.
3. Set `VITE_BASE` to `/` in `.github/workflows/deploy.yml` — the `/fisher-firearms/`
   prefix is only needed for the project-site URL.
4. Add the domain to `ALLOWED_ORIGINS` and `SITE_URL` in `worker/wrangler.toml`,
   then redeploy the Worker.

## Free-tier limits

Everything runs free. The binding constraint is Workers KV.

| Quota | Free allowance | What we use |
| --- | --- | --- |
| KV reads | 100,000/day | ~1 per visitor, and only on a cache miss |
| KV writes | 1,000/day | 1 per admin save, 1 per order |
| KV **list** operations | 1,000/day | **0** in normal running |
| Worker requests | 100,000/day | 1–2 per visitor |
| Pages bandwidth | ~100 GB/month | ~22 MB of product images, CDN-cached |

The list quota is called out because it was the real ceiling before this pass:
the live-stock endpoint used to spend two list operations on every page load,
which put the shop about 500 visitors from a day with no stock levels **and no
working checkout**. It now reads a single pre-merged key behind a 30-second
edge cache, so the common request touches KV not at all. Measured effect:
1.98s → 0.10s per call.

Realistically this comfortably handles a few thousand visitors a day. The first
thing to watch if the shop grows is KV **writes** — heavy stock-taking plus
orders. If that becomes tight, Cloudflare D1 gives 100,000 writes/day on the
same free plan and would also fix the stock race below.

## Monitoring

Set up two free things:

- **Cloudflare → Workers → fisher-firearms-api → Settings → Alerts**: email on
  error-rate spikes.
- Any free uptime pinger against `https://fisher-firearms-api.fisher-firearms.workers.dev/api/health`
  every 5 minutes. It returns `{"ok":true,"products":619}` and costs no quota.

Live Worker logs: `cd worker && npx wrangler tail`.

## Known limitations

Stated plainly so they don't surprise anyone later.

- **Stock is not reserved during checkout.** Two customers can both buy the last
  unit if they pay within about a second of each other. KV has no transactions.
  For this catalogue — accessories, mostly low-turnover — the right answer was
  to accept it rather than add infrastructure. Fix is a refund.
- **No email is sent by the site.** No order confirmations from the shop, no
  gift certificates by email. Stripe sends its own card receipt. Contact and
  gift-certificate enquiries land in the admin panel's Messages tab.
- **Prices are GST-inclusive as supplied.** No tax calculation, no Stripe Tax.
- **The catalogue is a snapshot** scraped from the old site. Re-running
  `scripts/scrape.mjs` then `scripts/categorise.mjs` then `worker/build-index.mjs`
  refreshes it. **`worker/test-unit.mjs` must pass afterwards** — it contains a
  tripwire that fails if any postable product's own description says it needs a
  licence. That check exists because 35 regulated items, including a Category D
  trigger assembly and a complete Category B rifle, were previously listed as
  postable and card-payable. Do not skip it.
- **One shared admin password**, no per-user accounts. Signing out revokes that
  device; changing the password does not revoke other devices.
- **An old commit contains two secrets** that were committed by mistake and
  removed within a minute. Both were rotated immediately and are dead — the
  webhook endpoint was revoked at Stripe and the admin password changed. The
  commit is orphaned off `main` but stays reachable by its SHA until GitHub
  garbage-collects. To remove it for good, delete and recreate the repository.
  Nothing valid is exposed either way.
