import { useCallback, useEffect, useState } from 'react'
import { Mail, MessageSquare, Phone, RotateCcw } from 'lucide-react'
import { adminMessages, AuthError, type AdminMessage } from '../lib/api'

/** When someone got in touch, in words rather than a timestamp. */
function when(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * Enquiries from the contact page and gift-certificate requests.
 *
 * These used to go nowhere at all — the form had no address to send to, so a
 * customer got a thank-you and the shop never heard about it. Now they land
 * here, and the phone number and email are tappable so replying is one press.
 */
export default function Messages({ onSignedOut }: { onSignedOut: () => void }) {
  const [messages, setMessages] = useState<AdminMessage[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const { messages } = await adminMessages()
      setMessages(messages)
    } catch (err) {
      if (err instanceof AuthError) {
        onSignedOut()
        return
      }
      setError(err instanceof Error ? err.message : 'Could not load messages.')
    }
  }, [onSignedOut])

  useEffect(() => {
    void load()
  }, [load])

  if (error) {
    return (
      <div className="rounded-sm border border-red-900/60 bg-red-950/40 p-4">
        <p className="text-red-300">{error}</p>
        <button type="button" onClick={() => void load()} className="btn-ghost mt-4 py-3">
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Try again
        </button>
      </div>
    )
  }

  if (!messages) {
    return <p className="py-10 text-center text-steel-400">Loading messages…</p>
  }

  if (messages.length === 0) {
    return (
      <div className="py-16 text-center">
        <MessageSquare className="mx-auto h-8 w-8 text-steel-600" aria-hidden="true" />
        <p className="mt-4 text-steel-300">No messages yet.</p>
        <p className="mt-1 text-sm text-steel-400">
          Anything sent from the contact page will show up here.
        </p>
      </div>
    )
  }

  return (
    <ul className="space-y-4">
      {messages.map((message) => {
        const { name, email, phone, notes } = message.customer ?? {}
        return (
          <li
            key={message.id}
            className="rounded-sm border border-steel-800 bg-steel-900/50 p-5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="font-display text-lg font-700 tracking-wide uppercase">
                {name || 'Someone'}
              </p>
              <p className="font-mono text-xs text-steel-400">{when(message.created)}</p>
            </div>

            {message.subject && (
              <p className="mt-1 text-sm text-brass-300">{message.subject}</p>
            )}

            {notes && (
              <p className="mt-3 whitespace-pre-wrap text-steel-200">{notes}</p>
            )}

            <div className="mt-4 flex flex-wrap gap-3">
              {phone && (
                <a href={`tel:${phone.replace(/\s+/g, '')}`} className="btn-ghost py-3">
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  {phone}
                </a>
              )}
              {email && (
                <a
                  href={`mailto:${email}?subject=${encodeURIComponent(
                    message.subject || 'Your enquiry — Fisher Firearms'
                  )}`}
                  className="btn-ghost py-3"
                >
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  {email}
                </a>
              )}
            </div>

            <p className="mt-3 font-mono text-xs text-steel-400">Reference {message.id}</p>
          </li>
        )
      })}
    </ul>
  )
}
