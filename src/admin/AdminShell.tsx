import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Boxes, ClipboardList, LogOut, Mail, Plus } from 'lucide-react'
import { adminLogout, getAdminToken, hasApi } from '../lib/api'
import AdminLogin from './AdminLogin'
import StockList from './StockList'
import AddItem from './AddItem'
import Orders from './Orders'
import Messages from './Messages'
import Backup from './Backup'

/**
 * The shop's own back office.
 *
 * Written for someone who isn't confident with computers: one job per screen,
 * plain English instead of jargon (no "SKU", "inventory", "publish"), large
 * tap targets, and every change saved the moment it's made — there is no
 * "save" button to forget.
 */

type Tab = 'stock' | 'add' | 'orders' | 'messages'

const TABS: { id: Tab; label: string; icon: typeof Boxes }[] = [
  { id: 'stock', label: 'My stock', icon: Boxes },
  { id: 'add', label: 'Add an item', icon: Plus },
  { id: 'orders', label: 'Orders', icon: ClipboardList },
  { id: 'messages', label: 'Messages', icon: Mail },
]

function Chrome({
  children,
  onSignOut,
  tab,
  setTab,
  footer,
}: {
  children: ReactNode
  onSignOut: () => void
  tab: Tab
  setTab: (t: Tab) => void
  footer: ReactNode
}) {
  return (
    <div className="min-h-dvh bg-steel-950">
      <header className="sticky top-0 z-40 border-b border-steel-800 bg-void/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <p className="font-display text-lg font-700 tracking-wide uppercase">
            Shop manager
          </p>
          <button
            type="button"
            onClick={onSignOut}
            className="flex items-center gap-2 rounded-sm border border-steel-700 px-4 py-2.5 text-sm text-steel-300 transition-colors hover:border-brass-500 hover:text-brass-300"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
        </div>

        {/* Two rows of two on a phone: four tabs across one line squeezes the
            labels down to unreadable stubs. */}
        <nav
          className="mx-auto grid max-w-5xl grid-cols-2 gap-2 px-4 pb-3 sm:grid-cols-4"
          aria-label="Sections"
        >
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-current={tab === id ? 'page' : undefined}
              className={`flex items-center justify-center gap-2 rounded-sm border px-3 py-3 font-display text-sm tracking-wide uppercase transition-colors ${
                tab === id
                  ? 'border-brass-500 bg-brass-500/10 text-brass-200'
                  : 'border-steel-800 text-steel-300 hover:border-steel-600'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>

      <footer className="mx-auto max-w-5xl px-4 pt-2 pb-10">{footer}</footer>
    </div>
  )
}

export default function AdminShell() {
  const [signedIn, setSignedIn] = useState(() => Boolean(getAdminToken()))
  const [tab, setTab] = useState<Tab>('stock')
  const [notice, setNotice] = useState<string | null>(null)

  // The admin screens are full-bleed; hide the shop's own header/footer.
  useEffect(() => {
    document.body.dataset.admin = 'true'
    return () => {
      delete document.body.dataset.admin
    }
  }, [])

  /*
   * A token can expire, or be revoked from another device, at any moment. When
   * that happens every screen in here is talking to a server that has stopped
   * listening, so the only useful thing to show is the password box — never a
   * red error on a page with no way to sign in again.
   */
  // Stable identity: the screens below hold this in their data-loading effects.
  const endSession = useCallback(() => {
    setSignedIn(false)
    setNotice('Your session has ended — please sign in again.')
  }, [])

  if (!hasApi()) {
    return (
      <div className="grid min-h-dvh place-items-center px-6 text-center">
        <div className="max-w-md">
          <h1 className="font-display text-3xl font-700 uppercase">
            Not connected yet
          </h1>
          <p className="mt-4 leading-relaxed text-steel-400">
            The shop manager needs the website's stock system switched on before
            it can be used. Nothing is broken — this page just has nothing to
            talk to yet.
          </p>
        </div>
      </div>
    )
  }

  if (!signedIn) {
    return (
      <AdminLogin
        notice={notice}
        onSuccess={() => {
          setNotice(null)
          setSignedIn(true)
        }}
      />
    )
  }

  return (
    <Chrome
      tab={tab}
      setTab={setTab}
      onSignOut={() => {
        // Hand the token back to the server as well: dropping the local copy
        // alone leaves a working key sitting on the shop's account.
        void adminLogout().finally(() => {
          setNotice(null)
          setSignedIn(false)
        })
      }}
      footer={<Backup onSignedOut={endSession} />}
    >
      {tab === 'stock' && <StockList onSignedOut={endSession} />}
      {tab === 'add' && (
        <AddItem onDone={() => setTab('stock')} onSignedOut={endSession} />
      )}
      {tab === 'orders' && <Orders onSignedOut={endSession} />}
      {tab === 'messages' && <Messages onSignedOut={endSession} />}
    </Chrome>
  )
}
