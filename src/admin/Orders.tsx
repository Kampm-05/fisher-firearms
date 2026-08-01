import { useEffect, useState } from 'react'
import { Lock, PackageCheck, ShoppingBag } from 'lucide-react'
import { adminOrders, type AdminOrder } from '../lib/api'
import { formatPrice } from '../data/catalog'

/** What the shop needs to see: who bought what, and what to put aside. */
export default function Orders() {
  const [orders, setOrders] = useState<AdminOrder[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    adminOrders()
      .then(({ orders }) => setOrders(orders))
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Could not load orders.')
      )
  }, [])

  if (error) {
    return (
      <p className="rounded-sm border border-red-900/60 bg-red-950/40 p-4 text-red-300">
        {error}
      </p>
    )
  }

  if (!orders) {
    return (
      <p className="py-16 text-center font-mono text-sm tracking-widest text-steel-500 uppercase">
        Loading orders…
      </p>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="py-16 text-center">
        <PackageCheck className="mx-auto h-10 w-10 text-steel-700" aria-hidden="true" />
        <p className="mt-4 text-steel-400">No orders yet.</p>
        <p className="mt-1 text-sm text-steel-600">
          They'll appear here as soon as someone buys something.
        </p>
      </div>
    )
  }

  return (
    <ul className="space-y-4">
      {orders.map((o) => (
        <li
          key={o.id}
          className={`rounded-sm border p-5 ${
            o.paid
              ? 'border-brass-600/40 bg-brass-500/5'
              : 'border-steel-800 bg-steel-900/40'
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-500 text-steel-100">
                {o.customer?.name || 'Customer'}
              </p>
              <p className="mt-1 text-sm text-steel-400">
                {o.customer?.phone} {o.customer?.email && `· ${o.customer.email}`}
              </p>
              <p className="mt-1 font-mono text-xs text-steel-600">
                {new Date(o.created).toLocaleString('en-AU')}
              </p>
            </div>
            <span
              className={`rounded-sm border px-3 py-1.5 font-mono text-xs tracking-widest uppercase ${
                o.paid
                  ? 'border-brass-600/50 bg-brass-500/10 text-brass-300'
                  : 'border-steel-700 text-steel-400'
              }`}
            >
              {o.paid ? `Paid ${formatPrice(o.amount)}` : 'Not paid'}
            </span>
          </div>

          {o.shipLines?.length > 0 && (
            <section className="mt-4">
              <h3 className="text-eyebrow flex items-center gap-2">
                <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
                Post these out
              </h3>
              <ul className="mt-2 space-y-1 text-sm">
                {o.shipLines.map((l, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span className="text-steel-300">
                      {l.qty}× {l.name}
                    </span>
                    <span className="font-mono text-steel-400">
                      {formatPrice(l.price * l.qty)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {o.reserveLines?.length > 0 && (
            <section className="mt-4">
              <h3 className="text-eyebrow flex items-center gap-2">
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                Put aside for collection
              </h3>
              <ul className="mt-2 space-y-1 text-sm">
                {o.reserveLines.map((l, i) => (
                  <li key={i} className="text-steel-300">
                    {l.qty}× {l.name}
                  </li>
                ))}
              </ul>
              {o.customer?.licence && (
                <p className="mt-2 text-sm text-steel-400">
                  Licence given:{' '}
                  <span className="font-mono text-steel-200">{o.customer.licence}</span>
                  {' — check it matches on handover.'}
                </p>
              )}
            </section>
          )}

          {o.customer?.notes && (
            <p className="mt-4 border-t border-steel-800 pt-3 text-sm text-steel-400">
              <span className="text-steel-500">Note from customer: </span>
              {o.customer.notes}
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}
