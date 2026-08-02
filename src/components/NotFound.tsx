import { Link } from 'react-router-dom'
import { Phone } from 'lucide-react'
import PageHeader from './PageHeader'
import { business } from '../data/site'

/**
 * Anything the router doesn't recognise lands here.
 *
 * Old links from the previous site, mistyped addresses and stale search
 * results all end up at this page, so it does the two useful things: point at
 * the two halves of the catalogue, and give the phone number to anyone who was
 * chasing something specific.
 */
export default function NotFound() {
  return (
    <>
      <PageHeader
        eyebrow="Page not found"
        title="We can't find that page"
        lead="The link may be old, or the address slightly off. Everything we sell is still here — start from one of these."
      />

      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="flex flex-wrap gap-3">
          <Link to="/firearms" className="btn-primary">
            Browse firearms
          </Link>
          <Link to="/gear" className="btn-ghost">
            Browse ammo &amp; gear
          </Link>
          <Link to="/" className="btn-ghost">
            Home
          </Link>
        </div>

        <p className="mt-10 max-w-xl leading-relaxed text-steel-300">
          After something in particular? Ring the shop and we'll check the shelf
          for you.
        </p>
        <a
          href={business.phoneHref}
          className="mt-4 inline-flex items-center gap-3 font-display text-2xl tracking-wide text-brass-300 uppercase transition-colors hover:text-brass-200"
        >
          <Phone className="h-6 w-6" aria-hidden="true" />
          {business.phone}
        </a>
      </div>
    </>
  )
}
