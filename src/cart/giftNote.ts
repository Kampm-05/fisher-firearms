/**
 * Who a gift certificate is for.
 *
 * The recipient is asked for on the gift certificate page, but the shop reads
 * it off the order — several screens later, after the cart and possibly a trip
 * to Stripe. A cart line has nowhere to carry it, so it waits here and is
 * dropped into the checkout notes.
 *
 * Session storage rather than local: this tab, this order, gone afterwards.
 */

const KEY = 'ff.gift.note'

export function rememberGiftNote(note: string) {
  try {
    if (note) sessionStorage.setItem(KEY, note)
  } catch {
    // Site data blocked. The customer can still type it into the notes box.
  }
}

export function readGiftNote(): string {
  try {
    return sessionStorage.getItem(KEY) ?? ''
  } catch {
    return ''
  }
}

export function forgetGiftNote() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // Nothing was stored in the first place.
  }
}
