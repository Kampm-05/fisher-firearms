import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Check, Mail, Send } from 'lucide-react'
import { fadeUp, inView } from '../lib/motion'
import { business, contactEmail } from '../data/site'

/** Formspree form id. Empty -> the form falls back to a mailto: draft. */
const FORM_ID = import.meta.env.VITE_FORMSPREE_CONTACT_ID ?? ''

const SUBJECTS = [
  'General enquiry',
  'Stock availability',
  'Firearm transfer',
  'Repairs & servicing',
  'Gift certificates',
]

export default function ContactForm() {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', subject: SUBJECTS[0], message: '',
  })
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }))

  function mailtoHref() {
    const body = [
      `Name:  ${form.name}`,
      `Email: ${form.email}`,
      form.phone ? `Phone: ${form.phone}` : null,
      '',
      form.message,
    ]
      .filter((l) => l !== null)
      .join('\n')
    return `mailto:${contactEmail}?subject=${encodeURIComponent(
      form.subject
    )}&body=${encodeURIComponent(body)}`
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!FORM_ID) {
      // No form backend configured yet. Use a mail draft when an address is
      // known; otherwise point the customer at the phone rather than pretend.
      if (contactEmail) {
        window.location.href = mailtoHref()
        setSent(true)
      } else {
        setError(
          'The message form is not connected yet — please call the shop and we will help you straight away.'
        )
      }
      return
    }

    setBusy(true)
    try {
      const res = await fetch(`https://formspree.io/f/${FORM_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error(`Formspree responded ${res.status}`)
      setSent(true)
    } catch (err) {
      setError(
        err instanceof Error
          ? `${err.message}. You can email us directly instead.`
          : 'Could not send. You can email us directly instead.'
      )
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <motion.div
        variants={fadeUp}
        {...inView}
        className="rounded-sm border border-brass-600/40 bg-brass-500/5 p-8"
      >
        <Check className="h-8 w-8 text-brass-400" aria-hidden="true" />
        <h3 className="mt-4 font-display text-2xl font-700 tracking-wide uppercase">
          Message sent
        </h3>
        <p className="mt-3 text-steel-300">
          {FORM_ID
            ? "Thanks — we'll get back to you shortly."
            : 'Your email app should have opened with the message ready to send.'}
        </p>
      </motion.div>
    )
  }

  return (
    <motion.form variants={fadeUp} {...inView} onSubmit={handleSubmit} className="space-y-4">
      <h2 className="flex items-center gap-3 font-display text-3xl font-700 tracking-wide uppercase">
        <Mail className="h-6 w-6 text-brass-500" aria-hidden="true" />
        Send us a message
      </h2>
      <p className="pb-2 text-steel-400">
        Chasing a particular rifle or calibre? Tell us what you're after and
        we'll check the shelf.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm text-steel-300">Name</span>
          <input
            required
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            className="field"
            autoComplete="name"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-steel-300">
            Phone <span className="text-steel-600">(optional)</span>
          </span>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            className="field"
            autoComplete="tel"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm text-steel-300">Email</span>
        <input
          required
          type="email"
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
          className="field"
          autoComplete="email"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm text-steel-300">Subject</span>
        <select
          value={form.subject}
          onChange={(e) => set('subject', e.target.value)}
          className="field"
        >
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm text-steel-300">Message</span>
        <textarea
          required
          rows={5}
          value={form.message}
          onChange={(e) => set('message', e.target.value)}
          className="field resize-y"
        />
      </label>

      {error && (
        <p className="rounded-sm border border-amber-900/60 bg-amber-950/30 p-4 text-sm text-amber-200">
          {error}{' '}
          <a href={business.phoneHref} className="underline hover:text-amber-100">
            {business.phone}
          </a>
          {contactEmail && (
            <>
              {' · '}
              <a href={mailtoHref()} className="underline hover:text-amber-100">
                {contactEmail}
              </a>
            </>
          )}
        </p>
      )}

      <button type="submit" disabled={busy} className="btn-primary w-full justify-center">
        <Send className="h-4 w-4" aria-hidden="true" />
        {busy ? 'Sending…' : 'Send message'}
      </button>
    </motion.form>
  )
}
