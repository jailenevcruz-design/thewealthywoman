import { useState, useEffect } from 'react'
import { supabase, hasSupabase } from './supabaseClient'
import { useData } from './useData'
import Home from './Home.jsx'
import Bills from './Bills.jsx'
import Spend from './Spend.jsx'
import Checks from './Checks.jsx'
import Savings from './Savings.jsx'
import More from './More.jsx'

const TABS = [
  ['home', '🌸', 'Home'],
  ['bills', '🧾', 'Bills'],
  ['spend', '💸', 'Spend'],
  ['checks', '💵', 'Checks'],
  ['savings', '🐷', 'Savings'],
  ['more', '•••', 'More'],
]

function Login({ onDemo }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const send = async () => {
    if (!email) return
    setBusy(true)
    await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } })
    setSent(true); setBusy(false)
  }
  return (
    <div className="login">
      <div className="flower">🌸</div>
      <h1>The Wealthy Woman</h1>
      <p>Bills · Savings · Debt · Take-home — all in one soft, calm place.</p>
      <div className="card">
        {sent ? (
          <p style={{ margin: 0, color: '#5a3f56', fontWeight: 600 }}>
            ✨ Check your email for a magic link to sign in.
          </p>
        ) : (
          <>
            <input type="email" placeholder="you@email.com" value={email}
              onChange={e => setEmail(e.target.value)} />
            <button onClick={send} disabled={busy}>{busy ? 'Sending…' : 'Send me a magic link'}</button>
          </>
        )}
        <div className="muted">
          No password — we email you a secure link. Your data is private to you.
        </div>
      </div>
      <button className="miniadd" style={{ marginTop: 22 }} onClick={onDemo}>
        or explore a demo →
      </button>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [demo, setDemo] = useState(false)
  const [tab, setTab] = useState('home')
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (!hasSupabase) { setAuthReady(true); return }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2200) }
  const active = session || demo
  const { db, setDb, loading, insert, update, remove } = useData(active ? (session || { user: { id: 'demo' } }) : null)

  if (!authReady) return <div className="loadwrap"><div className="spin" /></div>
  if (hasSupabase && !session && !demo) return <Login onDemo={() => setDemo(true)} />
  if (loading || !db) return <div className="loadwrap"><div className="spin" /></div>

  const api = { db, setDb, insert, update, remove, showToast, go: setTab }
  const signOut = async () => { if (hasSupabase) await supabase.auth.signOut(); setDemo(false); setTab('home') }

  return (
    <div className="appframe">
      <div className="appscroll">
        {tab === 'home' && <Home {...api} />}
        {tab === 'bills' && <Bills {...api} />}
        {tab === 'spend' && <Spend {...api} />}
        {tab === 'checks' && <Checks {...api} />}
        {tab === 'savings' && <Savings {...api} />}
        {tab === 'more' && <More {...api} signOut={signOut} demo={demo && !session} />}
      </div>

      <nav className="nav">
        {TABS.map(([id, e, l]) => (
          <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
            <span className="emo">{e}</span>{l}
          </button>
        ))}
      </nav>
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
