import { useState, type FormEvent } from 'react'
import { Lock } from 'lucide-react'
import { adminLogin } from '../lib/api'
import logo from '../assets/ffa-logo.png'

/** One box, one button. Signs in and stays signed in on this device. */
export default function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await adminLogin(password)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That password is not right.')
      setPassword('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center px-5">
      <form onSubmit={submit} className="w-full max-w-sm text-center">
        <img src={logo} alt="Fisher Firearms" className="mx-auto h-16 w-auto" />

        <h1 className="mt-8 font-display text-3xl font-700 tracking-wide uppercase">
          Shop manager
        </h1>
        <p className="mt-3 text-steel-400">
          Enter your password to change stock and prices.
        </p>

        <label className="mt-8 block text-left">
          <span className="mb-2 block text-sm text-steel-300">Password</span>
          <input
            type="password"
            required
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field py-4 text-center text-xl tracking-widest"
            autoComplete="current-password"
          />
        </label>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-sm border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-300"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || !password}
          className="btn-primary mt-6 w-full justify-center py-4 text-base"
        >
          <Lock className="h-4 w-4" aria-hidden="true" />
          {busy ? 'Checking…' : 'Unlock'}
        </button>

        <p className="mt-6 text-xs leading-relaxed text-steel-600">
          Forgotten it? Whoever set up the website can change it for you.
        </p>
      </form>
    </div>
  )
}
