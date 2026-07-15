import { useState } from 'react'
import { useData } from './useData'
import Home from './Home.jsx'
import Bills from './Bills.jsx'
import Spend from './Spend.jsx'
import Checks from './Checks.jsx'
import Savings from './Savings.jsx'
import More from './More.jsx'
import Settings from './Settings.jsx'

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
  const [catColors, setCatColors] = useState({})
  const { db, setDb, loading, insert, update, remove } = useData()

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
        {tab === 'more' && <More {...api} demo={false} />}
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
      <button onClick={() => setShowSettings(true)} style={{ position: 'fixed', top: 14, right: 18, zIndex: 99, background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>⚙️</button>
    </div>
  )
}
