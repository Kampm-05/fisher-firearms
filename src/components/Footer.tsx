import { Link } from 'react-router-dom'
import { MapPin, Phone, Clock } from 'lucide-react'
import { FacebookIcon } from './icons'
import { business, hours, notices } from '../data/site'
import logo from '../assets/ffa-logo.png'

export default function Footer() {
  return (
    <footer className="border-t border-steel-800 bg-steel-950">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 md:grid-cols-3">
        <div>
          <h2>
            <img
              src={logo}
              alt={business.name}
              width={153}
              height={119}
              className="h-16 w-auto"
            />
          </h2>
          <p className="mt-5 max-w-xs text-steel-400">{business.tagline}</p>

          <a
            href={business.facebook}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-6 inline-flex items-center gap-2 text-steel-300 transition-colors hover:text-brass-300"
          >
            <FacebookIcon className="h-5 w-5" />
            <span>Follow us on Facebook</span>
          </a>
        </div>

        <div>
          <h3 className="text-eyebrow">Find Us</h3>
          <address className="mt-4 space-y-3 text-steel-300 not-italic">
            <a
              href={business.mapUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-start gap-3 transition-colors hover:text-brass-300"
            >
              <MapPin
                className="mt-0.5 h-5 w-5 shrink-0 text-brass-500"
                aria-hidden="true"
              />
              <span>
                {business.street}
                <br />
                {business.suburb} {business.state}
              </span>
            </a>
            <a
              href={business.phoneHref}
              className="flex items-center gap-3 transition-colors hover:text-brass-300"
            >
              <Phone className="h-5 w-5 shrink-0 text-brass-500" aria-hidden="true" />
              <span className="font-mono">{business.phone}</span>
            </a>
          </address>
        </div>

        <div>
          <h3 className="text-eyebrow">
            <Clock className="mr-2 inline h-3.5 w-3.5" aria-hidden="true" />
            Trading Hours
          </h3>
          <dl className="mt-4 space-y-2 text-sm">
            {hours.map((row) => (
              <div key={row.days} className="flex justify-between gap-4">
                <dt className="text-steel-400">{row.days}</dt>
                <dd
                  className={`shrink-0 font-mono ${
                    row.open ? 'text-steel-200' : 'text-steel-500'
                  }`}
                >
                  {row.open ? `${row.open} – ${row.close}` : 'Closed'}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="border-t border-steel-800/70">
        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
          <p className="max-w-4xl text-xs leading-relaxed text-steel-500">
            {notices.licence}
          </p>
          <div className="mt-6 flex flex-col gap-3 text-xs text-steel-500 sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {new Date().getFullYear()} Fisher Firearms. {notices.pricing}
            </p>
            <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Footer">
              <Link to="/firearms" className="transition-colors hover:text-brass-300">
                Firearms
              </Link>
              <Link to="/gear" className="transition-colors hover:text-brass-300">
                Ammo &amp; Gear
              </Link>
              <Link to="/gift-certificates" className="transition-colors hover:text-brass-300">
                Gift Certificates
              </Link>
              <Link to="/about" className="transition-colors hover:text-brass-300">
                About
              </Link>
              <Link to="/contact" className="transition-colors hover:text-brass-300">
                Visit Us
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  )
}
