import { setTimeout as sleep } from 'node:timers/promises'

const ORIGIN = 'https://www.fisherfirearms.com.au'
const UA = 'Mozilla/5.0 (compatible; FisherFirearmsSiteRebuild/1.0)'

/** Minimum gap between requests, ms. ~2 req/s is polite for a small shop host. */
const THROTTLE_MS = 500

let lastRequest = 0

/** Serialises and rate-limits every outbound request. */
async function throttle() {
  const wait = lastRequest + THROTTLE_MS - Date.now()
  if (wait > 0) await sleep(wait)
  lastRequest = Date.now()
}

export { ORIGIN }

export function absolute(url) {
  if (!url) return null
  if (url.startsWith('http')) return url
  return ORIGIN + (url.startsWith('/') ? '' : '/') + url
}

/** GET with retry + backoff. Returns text, or null after exhausting attempts. */
export async function fetchText(url, { attempts = 3 } = {}) {
  for (let i = 0; i < attempts; i++) {
    await throttle()
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } })
      if (res.status === 404) return null
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.text()
    } catch (err) {
      if (i === attempts - 1) {
        console.warn(`  ! give up ${url} — ${err.message}`)
        return null
      }
      await sleep(1000 * 2 ** i)
    }
  }
  return null
}

/** GET binary. Returns a Buffer, or null. */
export async function fetchBuffer(url, { attempts = 3 } = {}) {
  for (let i = 0; i < attempts; i++) {
    await throttle()
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } })
      if (res.status === 404) return null
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return Buffer.from(await res.arrayBuffer())
    } catch (err) {
      if (i === attempts - 1) {
        console.warn(`  ! give up ${url} — ${err.message}`)
        return null
      }
      await sleep(1000 * 2 ** i)
    }
  }
  return null
}
