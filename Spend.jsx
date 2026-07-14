import { useState, useRef } from 'react'
import { money, curMonth, todayISO, CATS, guessCategory } from './lib'

const SWATCHES = ['#ef9fc9','#c9b8ee','#9ec9ef','#8bb23a','#f6b26b','#5bbd8e','#e88f8f','#c48fd0','#7bafe0','#f0997b','#d4a017','#3a9e8f','#9b6dbd','#d45c8a','#4aa8c8']
const EMOJIS = ['✨','🌸','💫','🌿','🎀','🌙','💕','🔥','🍓','🌈','💎','🦋','🌺','🍰','🎵']

function CustomCatBuilder({ onAdd, onCancel }) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('✨')
  const [color, setColor] = useState('#ef9fc9')
  return (
    <div style={{ width: '100%', background: '#fff', border: '1.5px solid var(--line)', borderRadius: 14, padding: 10, marginTop: 4 }}>
      <input style={{ width: '100%', padding: '7px 10px', borderRadius: 10, border: '1.5px solid var(--line)', fontSize: 13, fontWeight: 600, marginBottom: 8 }} placeholder="Category name" value={name} onChange={e => setName(e.target.value)} autoFocus />
      <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--ink2)', marginBottom: 5 }}>EMOJI</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
        {EMOJIS.map(e => <button key={e} onClick={() => setEmoji(e)} style={{ width: 28, height: 28, borderRadius: 8, border: emoji === e ? '2px solid var(--pink)' : '2px solid transparent', background: emoji === e ? 'var(--pink-soft)' : '#f4f0f6', fontSize: 14, cursor: 'pointer' }}>{e}</button>)}
      </div>
      <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--ink2)', marginBottom: 5 }}>COLOR</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
        {SWATCHES.map(c => <button key={c} onClick={() => setColor(c)} style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: color === c ? '3px solid #3a3340' : '3px solid transparent', cursor: 'pointer' }} />)}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={() => { if (name) onAdd(name, emoji, color) }} style={{ flex: 1, padding: '8px', borderRadius: 10, background: 'var(--matcha)', color: '#4e6327', fontWeight: 800, fontSize: 11, border: 'none' }}>{emoji} Add</button>
        <button onClick={onCancel} style={{ padding: '8px 12px', borderRadius: 10, background: '#f4f0f6', color: 'var(--ink2)', fontWeight: 700, fontSize: 11, border: 'none' }}>Cancel</button>
      </div>
    </div>
  )
}

function SpendSheet({ db, insert, update, remove, onClose, showToast, editing }) {
  const [cat, setCat] = useState(editing?.category || 'Dining')
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '')
  const [place, setPlace] = useState(editing?.place || '')
  const [date, setDate] = useState(editing?.date || todayISO())
  const [linkBill, setLinkBill] = useState(!!editing?.bill_id)
  const [billId, setBillId] = useState(editing?.bill_id || '')
  const [billMonth, setBillMonth] = useState(editing?.bill_month || curMonth())
  const [showMore, setShowMore] = useState(false)
  const [addingCat, setAddingCat] = useState(false)
  const [customCats, setCustomCats] = useState([])
  const allCats = [...CATS, ...customCats.map(c => [c.name, c.emoji, c.color, 'c-custom'])]
  const catMeta = allCats.find(c => c[0] === cat) || CATS[0]
  const allBills = db.bills.filter(b => !b.archived)

  const save = () => {
    const amt = +amount || 0
    const row = { place, category: cat, emoji: catMeta[1], color: catMeta[2], amount: amt, date, bill_id: linkBill ? billId : null, bill_month: linkBill ? billMonth : null }
    if (editing) update('spend', editing.id, row)
    else insert('spend', row)
    if (linkBill && billId) {
      const b = db.bills.find(x => x.id === billId)
      if (b) { const p = (b.paid_amount || 0) + amt; update('bills', billId, { paid_amount: p, status: p >= b.amount ? 'paid' : 'partial' }) }
    }
    showToast(editing ? 'Updated' : 'Spend added')
    onClose()
  }

  const del = () => { if (window.confirm('Delete?')) { remove('spend', editing.id); showToast('Deleted'); onClose() } }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(60,45,70,.45)', display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: 'var(--bg)', borderRadius: '20px 20px 0 0', display: 'flex', flexDirection: 'column', maxHeight: '95vh' }}>
        {/* Fixed header */}
        <div style={{ padding: '12px 14px 8px', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, background: '#dcd6e0', borderRadius: 2, margin: '0 auto 10px' }} />
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>{editing ? 'Edit spend' : 'Log a spend 💸'}</div>
          <div className="amountf" style={{ margin: '8px 0 6px' }}>
            <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="$0.00" inputMode="decimal" autoFocus />
          </div>
          <input value={place} onChange={e => setPlace(e.target.value)} placeholder="Where? e.g. Whole Foods" style={{ width: '100%', padding: '7px 11px', borderRadius: 11, border: '1.5px solid var(--line)', background: '#fff', fontSize: 13, fontWeight: 600, color: '#3a3340', marginBottom: 8 }} />
        </div>

        {/* Scrollable category area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px' }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--ink2)', letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 5 }}>Category</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
            {allCats.map(([c, e, col]) => (
              <button key={c} onClick={() => setCat(c)} style={{
                padding: '5px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700, border: '2px solid',
                borderColor: cat === c ? col : 'transparent',
                background: cat === c ? col + '22' : '#f4f0f6',
                color: col, cursor: 'pointer'
              }}>{e} {c}</button>
            ))}
            {addingCat
              ? <CustomCatBuilder onAdd={(name, emoji, color) => { setCustomCats(p => [...p, { name, emoji, color }]); setCat(name); setAddingCat(false) }} onCancel={() => setAddingCat(false)} />
              : <button onClick={() => setAddingCat(true)} style={{ padding: '5px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700, border: '1.5px dashed var(--pink)', background: '#fff', color: '#9c3f74', cursor: 'pointer' }}>+ custom</button>
            }
          </div>

          {/* More options - collapsed by default */}
          <button onClick={() => setShowMore(v => !v)} style={{ fontSize: 12, fontWeight: 800, color: '#9c3f74', background: 'var(--pink-soft)', border: 'none', padding: '8px 14px', borderRadius: 12, marginBottom: 8, width: '100%', textAlign: 'left' }}>
            {showMore ? '▴ Hide date & bill options' : '▾ Date & bill options'}
          </button>
          {showMore && (
            <div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--ink2)', marginBottom: 4 }}>DATE</div>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: '100%', padding: '7px 11px', borderRadius: 11, border: '1.5px solid var(--line)', background: '#fff', fontSize: 13 }} />
              </div>
              <div style={{ background: '#fff', border: '1.5px solid #e7f0f8', borderRadius: 12, padding: '9px 12px', marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 12, fontWeight: 800 }}>Pays a bill? 🧾</div>
                  <button onClick={() => setLinkBill(v => !v)} style={{ width: 40, height: 24, borderRadius: 12, background: linkBill ? '#5aa0d8' : '#dcd6e0', position: 'relative', border: 'none', flexShrink: 0 }}>
                    <div style={{ position: 'absolute', top: 3, [linkBill ? 'right' : 'left']: 3, width: 18, height: 18, borderRadius: '50%', background: '#fff' }} />
                  </button>
                </div>
                {linkBill && (
                  <div style={{ marginTop: 8 }}>
                    <select value={billId} onChange={e => setBillId(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: 10, border: '1.5px solid #dce8f4', background: '#f4f9fd', fontSize: 13, marginBottom: 6 }}>
                      <option value="">Pick a bill…</option>
                      {allBills.map(b => <option key={b.id} value={b.id}>{b.name} — {b.status === 'paid' ? '✅ paid' : money(b.amount - (b.paid_amount || 0)) + ' left'}</option>)}
                    </select>
                    <input type="month" value={billMonth} onChange={e => setBillMonth(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: 10, border: '1.5px solid #dce8f4', background: '#f4f9fd', fontSize: 13 }} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Pinned buttons */}
        <div style={{ padding: '8px 14px 34px', flexShrink: 0 }}>
          <button className="apply" onClick={save}>{editing ? 'Save changes ✨' : 'Add spend ✨'}</button>
          <button className="cancel" onClick={onClose} style={{ marginTop: 6 }}>Cancel</button>
          {editing && <button onClick={del} style={{ width: '100%', marginTop: 6, padding: 9, borderRadius: 12, background: 'none', border: 'none', color: '#c0483f', fontWeight: 700, fontSize: 12 }}>🗑 Delete</button>}
        </div>
      </div>
    </div>
  )
}

function CSVImport({ db, insert, update, onClose, showToast }) {
  const [rows, setRows] = useState(null)
  const [cats, setCats] = useState({})
  const fileRef = useRef()

  const parseCSV = e => {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const lines = ev.target.result.split('\n').filter(l => l.trim())
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''))
      const dateIdx = headers.findIndex(h => h.includes('date'))
      const descIdx = headers.findIndex(h => h.includes('desc') || h.includes('merchant') || h.includes('name') || h.includes('memo'))
      const amtIdx = headers.findIndex(h => h.includes('amount') || h.includes('debit'))
      const parsed = lines.slice(1).map(line => {
        const cols = line.split(',').map(c => c.trim().replace(/"/g, ''))
        const amt = Math.abs(parseFloat(cols[amtIdx] || '0'))
        if (!amt || amt <= 0) return null
        const merchant = cols[descIdx] || 'Unknown'
        return { date: cols[dateIdx] || todayISO(), merchant, amount: amt, guessed: guessCategory(merchant) }
      }).filter(Boolean)
      const initCats = {}
      parsed.forEach((r, i) => { initCats[i] = r.guessed || '__unrecognized__' })
      setRows(parsed); setCats(initCats)
    }
    reader.readAsText(file)
  }

  const doImport = () => {
    rows.forEach((r, i) => {
      const cat = cats[i]; if (cat === '__skip__') return
      const needsCat = cat === '__unrecognized__'
      const catMeta = CATS.find(c => c[0] === cat)
      insert('spend', { place: r.merchant, category: needsCat ? 'Needs category' : cat, emoji: needsCat ? '❓' : (catMeta?.[1] || '💸'), color: needsCat ? '#dcd6e0' : (catMeta?.[2] || '#c9b8ee'), amount: r.amount, date: r.date, bill_id: null, needs_category: needsCat })
    })
    showToast(`${rows.filter((_, i) => cats[i] !== '__skip__').length} transactions imported ✨`)
    onClose()
  }

  if (!rows) return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(60,45,70,.45)', display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: 'var(--bg)', borderRadius: '20px 20px 0 0', padding: '14px 14px 24px' }}>
        <h3 style={{ fontSize: 15, marginBottom: 4 }}>Import from bank CSV 📥</h3>
        <p style={{ fontSize: 10, color: 'var(--ink2)', marginBottom: 14 }}>Download transactions from your bank and upload the CSV file.</p>
        <div style={{ border: '2px dashed var(--pink)', borderRadius: 16, padding: 24, textAlign: 'center', background: 'var(--pink-soft)', marginBottom: 12 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📂</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#7a2f57', marginBottom: 4 }}>Choose your CSV file</div>
          <input ref={fileRef} type="file" accept=".csv" onChange={parseCSV} style={{ display: 'none' }} />
          <button style={{ padding: '10px 20px', borderRadius: 12, background: 'var(--pink)', color: '#fff', fontWeight: 800, fontSize: 13, border: 'none' }} onClick={() => fileRef.current.click()}>Choose file</button>
        </div>
        <button className="cancel" onClick={onClose}>Cancel</button>
      </div>
    </div>
  )

  const total = rows.filter((_, i) => cats[i] !== '__skip__').reduce((s, r) => s + r.amount, 0)
  const matched = rows.filter((_, i) => cats[i] !== '__unrecognized__' && cats[i] !== '__skip__').length
  const unrecognized = rows.filter((_, i) => cats[i] === '__unrecognized__').length

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(60,45,70,.45)', display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: 'var(--bg)', borderRadius: '20px 20px 0 0', maxHeight: '95vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px 14px 8px', flexShrink: 0 }}>
          <h3 style={{ fontSize: 15, marginBottom: 2 }}>Review import 📥</h3>
          <p style={{ fontSize: 10, color: 'var(--ink2)', marginBottom: 8 }}>{rows.length} transactions found</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <div style={{ flex: 1, borderRadius: 12, padding: 10, textAlign: 'center', background: 'var(--pink-soft)', color: '#9c3f74' }}><div style={{ fontSize: 15, fontWeight: 800 }}>{rows.length}</div><div style={{ fontSize: 9, fontWeight: 700, marginTop: 2 }}>FOUND</div></div>
            <div style={{ flex: 1, borderRadius: 12, padding: 10, textAlign: 'center', background: 'var(--lav)', color: '#5a52a0' }}><div style={{ fontSize: 15, fontWeight: 800 }}>{money(total)}</div><div style={{ fontSize: 9, fontWeight: 700, marginTop: 2 }}>TOTAL</div></div>
            <div style={{ flex: 1, borderRadius: 12, padding: 10, textAlign: 'center', background: '#e7f2c7', color: '#51691f' }}><div style={{ fontSize: 15, fontWeight: 800 }}>{matched}/{rows.length}</div><div style={{ fontSize: 9, fontWeight: 700, marginTop: 2 }}>MATCHED</div></div>
          </div>
          {unrecognized > 0 && <div style={{ background: '#fff6ea', border: '1px solid #f5e2c4', borderRadius: 10, padding: '8px 11px', fontSize: 11, color: '#9a6a1a', fontWeight: 600, marginBottom: 8 }}>💛 {unrecognized} will import as "Needs category" — fix later.</div>}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px' }}>
          {rows.map((r, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12, padding: 10, marginBottom: 8, opacity: cats[i] === '__skip__' ? .45 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div><div style={{ fontSize: 12, fontWeight: 800 }}>{r.merchant}</div><div style={{ fontSize: 10, color: 'var(--ink2)', marginTop: 1 }}>{r.date}</div></div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 800, color: '#c0483f' }}>${r.amount.toFixed(2)}</div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {[...CATS.map(c => c[0]), '__skip__'].map(c => (
                  <button key={c} onClick={() => setCats(prev => ({ ...prev, [i]: c }))}
                    style={{ fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 10, border: 'none', background: cats[i] === c ? 'var(--lav)' : '#f4f0f6', color: cats[i] === c ? '#5a52a0' : 'var(--ink2)' }}>
                    {c === '__skip__' ? '⏭ Skip' : CATS.find(x => x[0] === c)?.[1] + ' ' + c || c}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: '8px 14px 34px', flexShrink: 0 }}>
          <button className="apply" onClick={doImport}>Import {rows.filter((_, i) => cats[i] !== '__skip__').length} transactions ✨</button>
          <button className="cancel" onClick={onClose} style={{ marginTop: 6 }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

export default function Spend({ db, insert, update, remove, showToast }) {
  const [sheet, setSheet] = useState(false)
  const [editing, setEditing] = useState(null)
  const [csvOpen, setCsvOpen] = useState(false)
  const m = curMonth()
  const monthSpend = db.spend.filter(s => s.date.slice(0, 7) === m)
  const total = monthSpend.reduce((s, x) => s + x.amount, 0)
  const cats = {}; monthSpend.forEach(s => { cats[s.category] = (cats[s.category] || 0) + s.amount })
  const colorOf = c => { const found = CATS.find(x => x[0] === c); return found ? found[2] : '#c9b8ee' }
  let acc = 0
  const stops = Object.entries(cats).map(([k, v]) => { const f = v / total * 100; const s = `${colorOf(k)} ${acc}% ${acc + f}%`; acc += f; return s })
  const days = [...new Set(monthSpend.map(s => s.date))].sort().reverse()

  return (
    <div className="screen">
      <div className="pagetitle">Spending 💸</div>
      <p className="pagesub">Everything you spend, in one place</p>
      <button className="paybtn" onClick={() => { setEditing(null); setSheet(true) }} style={{ marginBottom: 10 }}>+ Log a spend ✨</button>
      <button style={{ width: '100%', marginBottom: 16, padding: 12, borderRadius: 14, border: '1.5px solid var(--lav)', background: 'var(--lav)', color: '#5a52a0', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={() => setCsvOpen(true)}>📥 Import from bank CSV</button>
      <div className="summary">
        <div className="donut" style={{ background: total > 0 ? `conic-gradient(${stops.join(',')})` : '#e5dced' }}>
          <b><span>{money(total)}</span>this month</b>
        </div>
        <div className="legend">
          {Object.keys(cats).length === 0 && <div style={{ fontSize: 12, color: 'var(--ink2)' }}>No spending logged yet.</div>}
          {Object.entries(cats).map(([k, v]) => (
            <div className="lgrow" key={k}><span className="d" style={{ background: colorOf(k), width: 10, height: 10, borderRadius: '50%', display: 'inline-block', marginRight: 6, flexShrink: 0 }} /><span className="lname">{k}</span><span className="lv">{money(v)}</span></div>
          ))}
        </div>
      </div>
      {days.map(day => (
        <div key={day}>
          <div className="daylabel">{day === todayISO() ? 'Today' : new Date(day + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
          <div className="card">
            {monthSpend.filter(s => s.date === day).map(s => (
              <button className="erow" key={s.id} onClick={() => { setEditing(s); setSheet(true) }} style={{ width: '100%', textAlign: 'left', background: s.needs_category ? '#fff6ea' : 'none', border: 'none', borderBottom: '1px solid var(--line)' }}>
                <div className="eleft">
                  <div className="cdot" style={{ background: colorOf(s.category) + '22' }}>{s.emoji}</div>
                  <div>
                    <div className="nm">{s.place || s.category}</div>
                    <div className="mt">{s.category}{s.needs_category && <span style={{ fontSize: 9, fontWeight: 800, color: '#9a6a1a', background: '#fff6ea', padding: '1px 6px', borderRadius: 8, marginLeft: 5 }}>needs category</span>}{s.bill_id && <span className="feeds">→ Bill</span>}</div>
                  </div>
                </div>
                <div className="amt">{money(s.amount, 2)}</div>
              </button>
            ))}
          </div>
        </div>
      ))}
      {sheet && <SpendSheet db={db} insert={insert} update={update} remove={remove} showToast={showToast} editing={editing} onClose={() => { setSheet(false); setEditing(null) }} />}
      {csvOpen && <CSVImport db={db} insert={insert} update={update} showToast={showToast} onClose={() => setCsvOpen(false)} />}
    </div>
  )
}
