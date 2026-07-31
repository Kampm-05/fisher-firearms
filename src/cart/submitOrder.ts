import type { CartLine } from './CartContext'
import { contactEmail } from '../data/site'

export type OrderDetails = {
  name: string
  email: string
  phone: string
  licence: string
  notes: string
  fulfilment: 'pickup' | 'dealer'
}

/** Formspree form id, e.g. "xayzbwqd". Empty in dev -> mailto fallback. */
const FORM_ID = import.meta.env.VITE_FORMSPREE_ORDER_ID ?? ''

function money(n: number) {
  return `$${n.toFixed(2)}`
}

export function orderSummary(lines: CartLine[], details: OrderDetails): string {
  const group = (ls: CartLine[]) =>
    ls
      .map(
        (l) =>
          `  ${l.qty} x ${l.name} — ${l.price == null ? 'POA' : money(l.price * l.qty)}`
      )
      .join('\n')

  const ship = lines.filter((l) => l.saleType === 'ship')
  const reserve = lines.filter((l) => l.saleType !== 'ship')
  const total = lines.reduce((t, l) => t + (l.price ?? 0) * l.qty, 0)

  return [
    `Name:  ${details.name}`,
    `Email: ${details.email}`,
    `Phone: ${details.phone}`,
    details.licence ? `SA firearms licence: ${details.licence}` : null,
    reserve.length ? `Handover: ${details.fulfilment === 'dealer' ? 'Transfer to my dealer' : 'Collect at Norwood'}` : null,
    '',
    ship.length ? `SHIPPED ITEMS\n${group(ship)}` : null,
    reserve.length
      ? `COLLECT IN STORE (licence sighted on handover)\n${group(reserve)}`
      : null,
    '',
    `Order total (indicative): ${money(total)}`,
    details.notes ? `\nNotes:\n${details.notes}` : null,
  ]
    .filter((l) => l !== null)
    .join('\n')
}

export type SubmitResult =
  | { ok: true; via: 'formspree' }
  | { ok: true; via: 'mailto'; href: string }
  /** Nothing was sent — the customer has to phone the order through. */
  | { ok: true; via: 'phone'; summary: string }
  | { ok: false; error: string }

/**
 * Sends the order to the shop. Uses Formspree when configured; falls back to a
 * mailto: draft if an address is known; otherwise tells the customer to call,
 * since the shop publishes no email address.
 */
export async function submitOrder(
  lines: CartLine[],
  details: OrderDetails
): Promise<SubmitResult> {
  const summary = orderSummary(lines, details)

  if (!FORM_ID) {
    if (!contactEmail) return { ok: true, via: 'phone', summary }
    const href = `mailto:${contactEmail}?subject=${encodeURIComponent(
      `Online order — ${details.name}`
    )}&body=${encodeURIComponent(summary)}`
    return { ok: true, via: 'mailto', href }
  }

  try {
    const res = await fetch(`https://formspree.io/f/${FORM_ID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        name: details.name,
        email: details.email,
        phone: details.phone,
        licence: details.licence,
        fulfilment: details.fulfilment,
        notes: details.notes,
        order: summary,
      }),
    })
    if (!res.ok) throw new Error(`Formspree responded ${res.status}`)
    return { ok: true, via: 'formspree' }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Could not send the order.',
    }
  }
}
