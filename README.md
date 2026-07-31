# Fisher Firearms — website rebuild

A modern rebuild of [fisherfirearms.com.au](https://www.fisherfirearms.com.au/) for
Fisher Firearms, Norwood SA. All business content (contact details, trading hours,
brands, stock categories, legal notices) is carried across from the existing site.

**Live preview:** published to GitHub Pages on every push to `main` — see the
repository's Actions tab or the Pages link in the sidebar.

> Unaffiliated redesign concept. Product data, imagery, pricing and contact
> details are reproduced from the shop's existing public website.

## Stack

| | |
|---|---|
| Build | Vite 8 + React 19 + TypeScript |
| Styling | Tailwind CSS 4 (CSS-first `@theme` tokens in `src/index.css`) |
| Animation | Framer Motion 12 |
| Icons | lucide-react |
| Routing | react-router-dom 7 |

## Running it

```bash
npm install
```

```bash
npm run dev
```

Dev server runs on **http://localhost:5180**. `npm run build` produces `dist/`,
`npm run preview` serves the build.

## Design system

Dark, cinematic, and built for the trade rather than generic retail:

- **Style** — Modern Dark. Gunmetal surface ramp, brass accent, never
  pure black.
- **Type** — Barlow Condensed (display) + Barlow (body) + JetBrains Mono (data).
- **Motion** — one easing curve (`cubic-bezier(0.16, 1, 0.3, 1)`) and one stagger
  interval (45ms) shared across the whole site, defined in `src/lib/motion.ts`.

## Structure

```
src/
  data/site.ts        Business content — single source of truth
  data/catalog.ts     Catalogue loaders (per-category lazy chunks)
  data/catalog/       Scraped product JSON, one file per category
  cart/               Cart context, slide-over drawer, order submission
  lib/motion.ts       Shared animation variants and easing
  components/
    RifleDraw.tsx     Path-drawn bolt-action rifle (hero animation)
    GunWireframes.tsx Line-art silhouette per firearm class
    PistolExploded.tsx Scroll-scrubbed pistol field strip
    ProductCard/Grid  Catalogue listing with search, brand filter, sort
  pages/
    Home / Firearms / FirearmCategory / Gear / GearCategory
    ProductDetail / Checkout / OrderConfirmed
    About / GiftCertificates / Contact
```

**Editing content:** business details live in `src/data/site.ts` — phone,
address, hours, brand lists, legal notices. Product data is generated (below).

## The catalogue

619 products across six firearm classes and nine gear departments, scraped from
the live shop with prices and images. Each category is a lazily-loaded chunk, so
the catalogue never lands in the main bundle.

Refresh it with:

```bash
node scripts/scrape.mjs
node scripts/categorise.mjs
```

Both are resumable and rate-limited. See [`scripts/README.md`](scripts/README.md).

## The sale-type split

Every product carries a `saleType` that decides how it can be bought:

| saleType  | Meaning                                                 |
| --------- | ------------------------------------------------------- |
| `ship`    | Ordinary retail — payable online and posted             |
| `reserve` | Licensed goods — reserved online, handed over in store  |
| `enquire` | Special order — the shop confirms price and stock first |

Firearms, ammunition, powder, primers and magazines are **always** `reserve`.
They cannot lawfully be posted to a customer in South Australia — a licence, a
permit to acquire and a dealer handover are required — so the legal class
overrides whatever the original site's cart button said.

## Configuration

Copy [`.env.example`](.env.example) to `.env.local`. Everything is optional; the
site runs without it, but forms and payments stay in fallback mode:

- `VITE_FORMSPREE_ORDER_ID` / `VITE_FORMSPREE_CONTACT_ID` — form delivery
- `VITE_CONTACT_EMAIL` — the shop publishes no email address anywhere, so this
  is deliberately blank; fallbacks point at the phone number instead
- `VITE_STRIPE_PK` — while empty, checkout runs in clearly-labelled demo mode
  and takes no payment. Note Stripe prohibits firearms and ammunition, so even
  once live it only ever covers the shippable items

## Deployment

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds and
publishes to GitHub Pages on push to `main`. It sets `VITE_BASE` to the
repository name so assets resolve under the project-site subpath, and copies
`index.html` to `404.html` so client-side routes survive a direct visit.

## Notes

- Accessibility: visible focus rings, 44px minimum touch targets, sequential
  heading order, skip link, and `MotionConfig reducedMotion="user"` so transform
  animation is dropped for users with the OS setting enabled.
- The map is a styled locator that deep-links to Google/OpenStreetMap rather than
  an embedded map — avoids needing an API key. Swap in an embed if you get one.
