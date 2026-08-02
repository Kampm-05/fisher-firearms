/**
 * Where a reservation reference waits out the trip to Stripe.
 *
 * A cart holding both postable and licensed goods records the reservation
 * before the customer leaves the site to pay, so the reference has to survive
 * a full page navigation away and back — router state does not. Session
 * storage is the right scope for it: this tab, this order, gone afterwards.
 */

const KEY = 'ff.reserve.ref'

export function rememberReserve(reference: string) {
  try {
    sessionStorage.setItem(KEY, reference)
  } catch {
    // Site data blocked. The shop still has the reservation and can find it by
    // name — only the customer's copy of the reference is lost.
  }
}

export function readReserve(): string | null {
  try {
    return sessionStorage.getItem(KEY)
  } catch {
    return null
  }
}

/** Called once the reference is on screen, so the next order starts clean. */
export function forgetReserve() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // Nothing was stored in the first place.
  }
}
