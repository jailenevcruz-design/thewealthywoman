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
  ['bills', '💌', 'Bills'],
  ['spend', '💸', 'Spend'],
  ['checks', '📬', 'Checks'],
  ['savings', '💫', 'Savings'],
  ['more', '•••', 'More'],
]

export default function App() {
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [tab, setTab] = useState('home')
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (!hasSupabase) { setAuthReady(true); return }
    // Try to get existing session first
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        setSession(data.session)
        setAuthReady(true)
      } else {
        // No session — sign in anonymously, no email needed
        const { data: anonData } = await supabase.auth.signInAnonymously()
        setSession(anonData.session)
        setAuthReady(true)
      }
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(null), 2200) }
  const { db, setDb, loading, insert, update, remove } = useData(authReady ? (session || { user: { id: 'demo' } }) : null)

  if (!authReady || loading || !db) return (
    <div className="loadwrap"><div className="spin" /></div>
  )

  const api = { db, setDb, insert, update, remove, showToast, go: setTab }

  return (
    <div className="appframe">
      <div className="appscroll">
        {tab === 'home' && <Home {...api} />}
        {tab === 'bills' && <Bills {...api} />}
        {tab === 'spend' && <Spend {...api} />}
        {tab === 'checks' && <Checks {...api} />}
        {tab === 'savings' && <Savings {...api} />}
        {tab === 'more' && <More {...api} demo={!hasSupabase} />}
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
