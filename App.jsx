import { useState, useEffect } from 'react'
import { useData } from './useData'
import Home from './Home.jsx'
import Bills from './Bills.jsx'
import Spend from './Spend.jsx'
import Checks from './Checks.jsx'
import Savings from './Savings.jsx'
import More from './More.jsx'
import Settings from './Settings.jsx'

const FIXED_USER_ID = 'b8596a83-3ce9-41ea-871d-bc6e64e41b53'

const TABS = [
  ['home', '🌸', 'Home'],
  ['bills', '💌', 'Bills'],
  ['spend', '💸', 'Spend'],
  ['checks', '📬', 'Checks'],
  ['savings', '💫', 'Savings'],
  ['more', '•••', 'More'],
]

export default function App() {
  const [tab, setTab] = useState('home')
  const [toast, setToast] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [catColors, setCatColorsState] = useState({})
  const { db, setDb, loading, insert, update, remove } = useData()

  // Load saved colors from profile once db loads
  useEffect(() => {
    if (db?.profile?.cat_colors && Object.keys(db.profile.cat_colors).length > 0) {
      setCatColorsState(db.profile.cat_colors)
    }
  }, [db?.profile?.cat_colors])

  const setCatColors = (updater) => {
    setCatColorsState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      update('profiles', FIXED_USER_ID, { cat_colors: next })
      return next
    })
  }

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(null), 2200) }

  if (loading || !db) return <div className="loadwrap"><div className="spin" /></div>

  const api = { db, setDb, insert, update, remove, showToast, go: setTab }

  return (
    <div className="appframe">
      <div className="appscroll">
        {tab === 'home' && <Home {...api} />}
        {tab === 'bills' && <Bills {...api} />}
        {tab === 'spend' && <Spend {...api} catColors={catColors} />}
        {tab === 'checks' && <Checks {...api} />}
        {tab === 'savings' && <Savings {...api} />}
        {tab === 'more' && <More {...api} demo={false} catColors={catColors} setCatColors={setCatColors} />}
      </div>
      <nav className="nav">
        {TABS.map(([id, e, l]) => (
          <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
            <span className="emo">{e}</span>{l}
          </button>
        ))}
      </nav>
      {toast && <div className="toast">{toast}</div>}
      {showSettings && <Settings catColors={catColors} setCatColors={setCatColors} onClose={() => setShowSettings(false)} />}
    </div>
  )
}
