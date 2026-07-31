import { motion } from 'framer-motion'
import { Clock, MapPin, Navigation, Phone } from 'lucide-react'
import { FacebookIcon } from '../components/icons'
import PageHeader from '../components/PageHeader'
import ContactForm from '../components/ContactForm'
import { fadeUp, inView, stagger } from '../lib/motion'
import { business, hours, notices } from '../data/site'

/** 0 = Sunday … 6 = Saturday, mapped onto the rows in `hours`. */
const HOURS_BY_DAY = [4, 0, 0, 0, 1, 2, 3]

function useOpenNow() {
  const now = new Date()
  const row = hours[HOURS_BY_DAY[now.getDay()]]
  if (!row.open || !row.close) return { open: false, row }

  const toMinutes = (t: string) => {
    const [, h, m, meridiem] = t.match(/(\d+):(\d+)(am|pm)/) ?? []
    let hour = Number(h) % 12
    if (meridiem === 'pm') hour += 12
    return hour * 60 + Number(m)
  }

  const mins = now.getHours() * 60 + now.getMinutes()
  return {
    open: mins >= toMinutes(row.open) && mins < toMinutes(row.close),
    row,
  }
}

export default function Contact() {
  const { open, row: todayRow } = useOpenNow()

  return (
    <>
      <PageHeader
        eyebrow="Norwood, South Australia"
        title="Visit us"
        lead="We're on Magill Road, a few minutes east of the city. Drop in during trading hours or give us a call — we're happy to check stock over the phone."
      />

      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-14 lg:grid-cols-[1fr_1.1fr]">
          {/* Details */}
          <motion.div variants={stagger} {...inView} className="space-y-10">
            {/* Open / closed right now */}
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-3 rounded-sm border border-steel-800 bg-steel-900/60 px-5 py-3"
            >
              <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                {open && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brass-400 opacity-70" />
                )}
                <span
                  className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                    open ? 'bg-brass-400' : 'bg-steel-600'
                  }`}
                />
              </span>
              <span className="font-display text-sm font-600 tracking-[0.12em] uppercase">
                {open ? (
                  <span className="text-brass-300">
                    Open now · until {todayRow.close}
                  </span>
                ) : (
                  <span className="text-steel-400">Closed right now</span>
                )}
              </span>
            </motion.div>

            <motion.div variants={fadeUp} className="flex items-start gap-4">
              <MapPin className="mt-1 h-5 w-5 shrink-0 text-brass-500" aria-hidden="true" />
              <div>
                <h2 className="text-eyebrow">Address</h2>
                <address className="mt-2 text-2xl leading-snug text-steel-100 not-italic">
                  {business.street}
                  <br />
                  {business.suburb} {business.state}
                </address>
                <a
                  href={business.directionsUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-4 inline-flex items-center gap-2 text-brass-400 transition-colors hover:text-brass-300"
                >
                  <Navigation className="h-4 w-4" aria-hidden="true" />
                  Get directions
                </a>
              </div>
            </motion.div>

            <motion.div variants={fadeUp} className="flex items-start gap-4">
              <Phone className="mt-1 h-5 w-5 shrink-0 text-brass-500" aria-hidden="true" />
              <div>
                <h2 className="text-eyebrow">Phone</h2>
                <a
                  href={business.phoneHref}
                  className="mt-2 block font-mono text-2xl text-steel-100 transition-colors hover:text-brass-300"
                >
                  {business.phone}
                </a>
              </div>
            </motion.div>

            <motion.div variants={fadeUp} className="flex items-start gap-4">
              <FacebookIcon className="mt-1 h-5 w-5 shrink-0 text-brass-500" />
              <div>
                <h2 className="text-eyebrow">Social</h2>
                <a
                  href={business.facebook}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-2 block text-xl text-steel-100 transition-colors hover:text-brass-300"
                >
                  Fisher Firearms on Facebook
                </a>
              </div>
            </motion.div>
          </motion.div>

          {/* Hours */}
          <motion.div variants={fadeUp} {...inView}>
            <div className="rounded-sm border border-steel-800 bg-steel-900/50 p-8 sm:p-10">
              <h2 className="flex items-center gap-3 font-display text-3xl font-700 tracking-wide uppercase">
                <Clock className="h-6 w-6 text-brass-500" aria-hidden="true" />
                Trading hours
              </h2>

              <dl className="mt-8 space-y-1">
                {hours.map((r) => {
                  const isToday = r.days === todayRow.days
                  return (
                    <div
                      key={r.days}
                      className={`flex items-center justify-between gap-4 rounded-sm px-4 py-4 ${
                        isToday
                          ? 'bg-brass-500/10 ring-1 ring-brass-600/40'
                          : 'border-b border-steel-800/60'
                      }`}
                    >
                      <dt
                        className={
                          isToday ? 'font-600 text-brass-200' : 'text-steel-300'
                        }
                      >
                        {r.days}
                        {isToday && (
                          <span className="ml-2 font-mono text-[0.65rem] tracking-widest text-brass-400 uppercase">
                            Today
                          </span>
                        )}
                        {r.late && !isToday && (
                          <span className="ml-2 font-mono text-[0.65rem] tracking-widest text-brass-500 uppercase">
                            Late night
                          </span>
                        )}
                      </dt>
                      <dd
                        className={`shrink-0 font-mono ${
                          r.open
                            ? isToday
                              ? 'text-brass-200'
                              : 'text-steel-200'
                            : 'text-steel-500'
                        }`}
                      >
                        {r.open ? `${r.open} – ${r.close}` : 'Closed'}
                      </dd>
                    </div>
                  )
                })}
              </dl>
            </div>

            {/* Map */}
            <a
              href={business.mapUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="group mt-5 block overflow-hidden rounded-sm border border-steel-800 transition-colors duration-300 hover:border-brass-500/60"
            >
              <div className="relative aspect-[16/9] bg-steel-900">
                <div aria-hidden="true" className="absolute inset-0 bg-engrave" />
                {/* Stylised locator rather than a keyed map embed */}
                <div className="absolute inset-0 grid place-items-center">
                  <div className="text-center">
                    <span className="relative mx-auto grid h-16 w-16 place-items-center">
                      <span className="absolute inset-0 animate-ping rounded-full border border-brass-500/40" />
                      <span className="absolute inset-2 rounded-full border border-brass-500/30" />
                      <MapPin className="h-8 w-8 text-brass-400" aria-hidden="true" />
                    </span>
                    <p className="mt-4 font-display text-xl font-600 tracking-wide text-steel-100 uppercase">
                      {business.street}
                    </p>
                    <p className="mt-1 font-mono text-xs tracking-widest text-steel-400 uppercase">
                      {business.suburb} {business.state}
                    </p>
                    <p className="mt-5 inline-flex items-center gap-2 text-sm text-brass-400 transition-colors group-hover:text-brass-300">
                      <Navigation className="h-4 w-4" aria-hidden="true" />
                      Open in maps
                    </p>
                  </div>
                </div>
              </div>
            </a>
          </motion.div>
        </div>

        <div className="mt-20 border-t border-steel-800 pt-16">
          <div className="max-w-2xl">
            <ContactForm />
          </div>
        </div>

        <motion.p
          variants={fadeUp}
          {...inView}
          className="mt-16 max-w-4xl border-t border-steel-800 pt-8 text-sm leading-relaxed text-steel-500"
        >
          {notices.licence}
        </motion.p>
      </div>
    </>
  )
}
