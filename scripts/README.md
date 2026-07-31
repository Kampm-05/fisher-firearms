# Catalogue scripts

These are **maintenance scripts**, not part of the app build. They pull the
live shop's catalogue into this project so the new site has real stock,
prices and images to display.

## Refreshing the catalogue

```bash
node scripts/scrape.mjs       # crawl categories + products, download images
node scripts/categorise.mjs   # sort into our taxonomy, assign saleType
```

Both are safe to re-run. `scrape.mjs` checkpoints to `scripts/.cache/` and
skips anything already fetched, so an interrupted run resumes where it left
off. Delete that folder to force a clean re-scrape.

Useful flags:

```bash
node scripts/scrape.mjs --limit 10   # only the first 10 categories (quick check)
node scripts/scrape.mjs --images-only # retry missing image downloads
```

Requests are rate-limited to ~2/sec. A full run takes roughly 20–30 minutes.

## How categorisation works

The shop's breadcrumbs are useless (every product says `Home > Product`), so
category membership comes from crawling the `/category/...` listing pages
instead. Those listings also expose the shop's *own* sale classification via
the cart button — `Add to Cart`, `INSTORE ONLY`, or `Order Now`.

`categorise.mjs` maps their categories onto ours and assigns each product a
`saleType`:

| saleType  | Meaning                                                    |
| --------- | ---------------------------------------------------------- |
| `ship`    | Ordinary retail — can be paid for online and posted        |
| `reserve` | Licensed goods — reserved online, handed over in store     |
| `enquire` | Special order — the shop confirms price and stock first    |

**The legal class always wins.** The live site offers "Add to Cart" on some
second-hand rifles, but a firearm cannot lawfully be shipped to a customer in
SA — it needs a licence, a permit to acquire and a dealer handover. So
firearms, ammunition, powder, primers and magazines are forced to `reserve`
regardless of what the old site's button says. Only genuinely shippable goods
ever become `ship`, which is also what keeps the Stripe path compliant.

## Output

- `src/data/catalog/<category>.json` — one file per category, lazy-loaded
- `src/data/catalog/index.json` — per-category counts
- `src/data/catalog/uncategorised.json` — anything that didn't map, for review
- `public/products/<slug>.jpg` — product images
