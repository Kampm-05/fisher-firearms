import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Phone, RotateCcw } from 'lucide-react'
import { business } from '../data/site'

type Props = { children: ReactNode }
type State = { failed: boolean }

/**
 * The site's last line of defence.
 *
 * React tears the whole tree down when a render throws, so without a boundary
 * one bad product record blanks the page — header, phone number and all — and
 * the customer has nothing to act on. This catches it, keeps the shop
 * reachable by voice, and offers one button rather than an explanation.
 *
 * Has to be a class: there is no hook equivalent of componentDidCatch.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // No error-reporting service is wired up, so the browser console is the
    // only record anyone can go back to.
    console.error('Render failed:', error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children

    return (
      <div className="grid min-h-[60vh] place-items-center px-5 py-20">
        <div className="max-w-md text-center">
          <h1 className="font-display text-3xl font-700 tracking-wide uppercase sm:text-4xl">
            Something went wrong
          </h1>
          <p className="mt-4 leading-relaxed text-steel-300">
            This part of the page stopped working. Nothing you did caused it,
            and nothing has been lost.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => this.setState({ failed: false })}
              className="btn-primary"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Try again
            </button>
            <a href={business.phoneHref} className="btn-ghost">
              <Phone className="h-4 w-4" aria-hidden="true" />
              {business.phone}
            </a>
          </div>

          <p className="mt-6 text-sm leading-relaxed text-steel-400">
            If it happens again, give the shop a ring on {business.phone} and
            we'll sort it out over the phone.
          </p>
        </div>
      </div>
    )
  }
}
