import { useState, type ChangeEvent } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  Loader2,
  Lock,
  ShoppingBag,
} from 'lucide-react'
import { adminCreate, AuthError } from '../lib/api'
import { firearmCategories, gearCategories } from '../data/site'
import { formatPrice } from '../data/catalog'

/**
 * Adding a product, one question at a time.
 *
 * A single long form is where non-technical users stall — so each step asks
 * for exactly one thing, in plain words, and you can't get lost because the
 * only ways out are "Back" and "Next".
 */

type Draft = {
  photo: string | null
  name: string
  price: string
  category: string
  saleType: 'ship' | 'reserve'
  stock: string
  description: string
}

const EMPTY: Draft = {
  photo: null,
  name: '',
  price: '',
  category: '',
  saleType: 'reserve',
  stock: '1',
  description: '',
}

const ALL_CATEGORIES = [
  ...firearmCategories.map((c) => ({ slug: c.slug, name: c.name, licensed: true })),
  ...gearCategories.map((c) => ({ slug: c.slug, name: c.name, licensed: false })),
]

/*
 * Phone cameras happily produce 50MB HEIC-sized files. Shrinking one blocks
 * the browser for as long as it takes, so anything this far past a normal
 * photo is turned away by name rather than left to freeze the screen.
 */
const MAX_PHOTO_BYTES = 20 * 1024 * 1024

/** Shrinks a phone photo to something sensible before it goes in the database. */
function shrinkImage(file: File, max = 800): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read that photo.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('That file is not a photo.'))
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Could not process that photo.'))
        ctx.fillStyle = '#0d1013'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

function Step({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h2 className="font-display text-2xl font-700 tracking-wide uppercase sm:text-3xl">
        {title}
      </h2>
      {hint && <p className="mt-2 leading-relaxed text-steel-400">{hint}</p>}
      <div className="mt-6">{children}</div>
    </div>
  )
}

export default function AddItem({
  onDone,
  onSignedOut,
}: {
  onDone: () => void
  onSignedOut: () => void
}) {
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [busy, setBusy] = useState(false)
  const [shrinking, setShrinking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  async function onPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)

    if (file.size > MAX_PHOTO_BYTES) {
      setError(
        'That photo is too large to use. Take it again on a lower quality setting, or pick a different one.'
      )
      // Clear the box so choosing the same file again still fires onChange.
      e.target.value = ''
      return
    }

    /*
     * A 12MP photo takes one to three seconds, and the browser is frozen for
     * most of it. Without saying so the box still reads "Tap to choose a
     * photo", so the natural response is to tap it again.
     */
    setShrinking(true)
    try {
      set('photo', await shrinkImage(file))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not use that photo.')
    } finally {
      setShrinking(false)
      e.target.value = ''
    }
  }

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      await adminCreate({
        name: draft.name.trim(),
        price: draft.price === '' ? null : Number(draft.price),
        category: draft.category,
        saleType: draft.saleType,
        description: draft.description.trim(),
        image: draft.photo,
        stock: draft.stock === '' ? null : Number(draft.stock),
      })
      setDone(true)
    } catch (err) {
      if (err instanceof AuthError) {
        onSignedOut()
        return
      }
      setError(err instanceof Error ? err.message : 'Could not add the item.')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="py-12 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-brass-600/50 bg-brass-500/10">
          <Check className="h-8 w-8 text-brass-400" aria-hidden="true" />
        </div>
        <h2 className="mt-6 font-display text-2xl font-700 tracking-wide uppercase">
          It's on the website
        </h2>
        <p className="mt-3 text-steel-400">
          "{draft.name}" is now showing in {' '}
          {ALL_CATEGORIES.find((c) => c.slug === draft.category)?.name}.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={onDone} className="btn-primary">
            Back to my stock
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(EMPTY)
              setStep(0)
              setDone(false)
            }}
            className="btn-ghost"
          >
            Add another
          </button>
        </div>
      </div>
    )
  }

  const steps = [
    {
      valid: true,
      node: (
        <Step
          title="Take a photo"
          hint="A clear photo of the item. You can skip this and add one later."
        >
          <label className={`block ${shrinking ? 'cursor-progress' : 'cursor-pointer'}`}>
            <input
              type="file"
              accept="image/*"
              disabled={shrinking}
              onChange={onPhoto}
              className="sr-only"
            />
            <div className="grid aspect-video place-items-center rounded-sm border-2 border-dashed border-steel-700 bg-steel-900/40 transition-colors hover:border-brass-500/60">
              {shrinking ? (
                <span
                  role="status"
                  className="flex flex-col items-center gap-3 text-brass-300"
                >
                  <Loader2 className="h-10 w-10 animate-spin" aria-hidden="true" />
                  Getting your photo ready…
                </span>
              ) : draft.photo ? (
                <img
                  src={draft.photo}
                  alt=""
                  className="h-full w-full rounded-sm object-contain p-3"
                />
              ) : (
                <span className="flex flex-col items-center gap-3 text-steel-400">
                  <Camera className="h-10 w-10" aria-hidden="true" />
                  Tap to choose a photo
                </span>
              )}
            </div>
          </label>
          {shrinking && (
            <p className="mt-3 text-sm text-steel-400">
              Big photos take a few seconds. You don't need to tap again.
            </p>
          )}
          {draft.photo && !shrinking && (
            <button
              type="button"
              onClick={() => set('photo', null)}
              className="mt-3 text-sm text-steel-400 underline hover:text-steel-200"
            >
              Remove photo
            </button>
          )}
        </Step>
      ),
    },
    {
      valid: draft.name.trim().length > 1,
      node: (
        <Step title="What is it called?" hint="This is the name customers will see.">
          <input
            autoFocus
            value={draft.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. Tikka T3X Lite .308"
            className="field py-4 text-lg"
          />
        </Step>
      ),
    },
    {
      valid: draft.price === '' || Number(draft.price) >= 0,
      node: (
        <Step
          title="How much is it?"
          hint="Leave this empty if the price changes or you'd rather people call."
        >
          <div className="flex items-center gap-3">
            <span className="font-display text-3xl text-steel-400">$</span>
            <input
              autoFocus
              type="number"
              step="0.01"
              min="0"
              value={draft.price}
              onChange={(e) => set('price', e.target.value)}
              placeholder="0.00"
              className="field py-4 font-mono text-2xl"
            />
          </div>
        </Step>
      ),
    },
    {
      valid: draft.category !== '',
      node: (
        <Step title="Where does it belong?" hint="Pick the section of the website it should appear in.">
          <div className="grid gap-2 sm:grid-cols-2">
            {ALL_CATEGORIES.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => {
                  set('category', c.slug)
                  // Firearm sections are licensed by law — preselect the safe option.
                  if (c.licensed || c.slug === 'ammunition') set('saleType', 'reserve')
                }}
                className={`rounded-sm border px-4 py-4 text-left transition-colors ${
                  draft.category === c.slug
                    ? 'border-brass-500 bg-brass-500/10 text-brass-200'
                    : 'border-steel-800 text-steel-300 hover:border-steel-600'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </Step>
      ),
    },
    {
      valid: true,
      node: (
        <Step
          title="Can it be posted?"
          hint="Firearms and ammunition can never be posted — they must be collected in store with a licence."
        >
          <div className="space-y-3">
            {(
              [
                {
                  value: 'ship' as const,
                  icon: ShoppingBag,
                  title: 'Yes — post it to the customer',
                  body: 'They pay online by card and we send it out. For gear, optics, cleaning kit and parts.',
                },
                {
                  value: 'reserve' as const,
                  icon: Lock,
                  title: 'No — collect in store only',
                  body: 'They reserve it online and pay when they collect, once we have seen their licence. Required for firearms and ammunition.',
                },
              ]
            ).map(({ value, icon: Icon, title, body }) => {
              const locked =
                value === 'ship' &&
                (firearmCategories.some((c) => c.slug === draft.category) ||
                  draft.category === 'ammunition')
              return (
                <button
                  key={value}
                  type="button"
                  disabled={locked}
                  onClick={() => set('saleType', value)}
                  className={`flex w-full gap-4 rounded-sm border p-4 text-left transition-colors ${
                    draft.saleType === value
                      ? 'border-brass-500 bg-brass-500/10'
                      : 'border-steel-800 hover:border-steel-600'
                  } ${locked ? 'cursor-not-allowed opacity-40' : ''}`}
                >
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-brass-400" aria-hidden="true" />
                  <span>
                    <span className="block font-500 text-steel-100">{title}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-steel-400">
                      {locked ? 'Not allowed for this section — the law requires a licence.' : body}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>

          <label className="mt-6 block">
            <span className="mb-2 block text-sm text-steel-300">
              How many do you have? <span className="text-steel-600">(optional)</span>
            </span>
            <input
              type="number"
              min="0"
              value={draft.stock}
              onChange={(e) => set('stock', e.target.value)}
              className="field w-32 py-3 font-mono text-lg"
            />
          </label>
        </Step>
      ),
    },
    {
      valid: true,
      node: (
        <Step
          title="Anything else to say?"
          hint="A short description. You can leave this empty."
        >
          <textarea
            rows={5}
            value={draft.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Condition, calibre, what's included…"
            className="field resize-y py-3"
          />
        </Step>
      ),
    },
    {
      valid: true,
      node: (
        <Step title="Ready to go?" hint="This is how it will look on the website.">
          <div className="mx-auto max-w-xs overflow-hidden rounded-sm border border-steel-800 bg-steel-900/40">
            <div className="aspect-square bg-steel-950">
              {draft.photo ? (
                <img src={draft.photo} alt="" className="h-full w-full object-contain p-4" />
              ) : (
                <div className="grid h-full place-items-center font-mono text-xs text-steel-600 uppercase">
                  No photo
                </div>
              )}
            </div>
            <div className="p-4">
              <p className="font-500 text-steel-100">{draft.name}</p>
              <p className="mt-2 font-mono text-brass-300">
                {formatPrice(draft.price === '' ? null : Number(draft.price))}
              </p>
              <p className="mt-2 text-xs text-steel-500">
                {draft.saleType === 'ship' ? 'Posted to customer' : 'Collect in store'}
              </p>
            </div>
          </div>
        </Step>
      ),
    },
  ]

  const current = steps[step]
  const last = step === steps.length - 1

  return (
    <div className="mx-auto max-w-xl">
      <p className="font-mono text-xs tracking-widest text-steel-500 uppercase">
        Step {step + 1} of {steps.length}
      </p>
      <div className="mt-2 mb-8 h-1 w-full overflow-hidden rounded-full bg-steel-800">
        <div
          className="h-full bg-brass-400 transition-all duration-300"
          style={{ width: `${((step + 1) / steps.length) * 100}%` }}
        />
      </div>

      {current.node}

      {error && (
        <p role="alert" className="mt-6 rounded-sm border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="mt-10 flex gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="btn-ghost py-4"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back
          </button>
        )}
        <button
          type="button"
          disabled={!current.valid || busy || shrinking}
          onClick={() => (last ? void submit() : setStep((s) => s + 1))}
          className="btn-primary flex-1 justify-center py-4 text-base"
        >
          {busy ? 'Adding…' : last ? 'Put it on the website' : 'Next'}
          {!last && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
    </div>
  )
}
