import { useState } from 'react'
import { Check, Download } from 'lucide-react'
import { adminExport, AuthError } from '../lib/api'

/**
 * Saves everything the shop owns to a file on their device.
 *
 * Stock counts, orders and messages live only on the website's system. There
 * is no other copy, so this button is the shop's insurance — and it has to be
 * one press, because a backup that takes any thought will never be taken.
 */
export default function Backup({ onSignedOut }: { onSignedOut: () => void }) {
  const [state, setState] = useState<'idle' | 'working' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function download() {
    setError(null)
    setState('working')
    try {
      const data = await adminExport()
      const today = new Date().toISOString().slice(0, 10)
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      )

      const link = document.createElement('a')
      link.href = url
      link.download = `fisher-firearms-backup-${today}.json`
      link.click()
      URL.revokeObjectURL(url)

      setState('done')
      // Back to the normal label, so it's obviously pressable again next month.
      setTimeout(() => setState('idle'), 4000)
    } catch (err) {
      if (err instanceof AuthError) {
        onSignedOut()
        return
      }
      setState('idle')
      setError(
        err instanceof Error ? err.message : "Couldn't make a backup just now — please try again."
      )
    }
  }

  return (
    <div className="rounded-sm border border-steel-800 bg-steel-900/40 p-5">
      <button
        type="button"
        onClick={() => void download()}
        disabled={state === 'working'}
        className="btn-primary w-full justify-center py-4 sm:w-auto"
      >
        {state === 'done' ? (
          <>
            <Check className="h-4 w-4" aria-hidden="true" />
            Backup saved
          </>
        ) : (
          <>
            <Download className="h-4 w-4" aria-hidden="true" />
            {state === 'working' ? 'Getting it ready…' : 'Download a backup'}
          </>
        )}
      </button>

      <p className="mt-3 text-sm leading-relaxed text-steel-300">
        Saves your stock counts, orders and messages as one file. Keep it in the
        shop's Dropbox or email it to yourself — doing this on the first of the
        month means you can never lose more than a month's work.
      </p>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  )
}
