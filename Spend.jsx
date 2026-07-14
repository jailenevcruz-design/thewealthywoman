import { useState, useRef, useEffect } from 'react'
import { money, curMonth, todayISO, CATS, guessCategory } from './lib'
export default function Spend({ db, insert, update, remove, showToast }) {
  const [sheet, setSheet] = useState(false)
  const [editing, setEditing] = useState(null)
  const [csvOpen, setCsvOpen] = useState(false)
  const scrollRef = useRef()
  const m = curMonth()
  const monthSpend = db.spend.filter(s => s.date.slice(0, 7) === m)
  const total = monthSpend.reduce((s, x) => s + x.amount, 0)
  const cats = {}; monthSpend.forEach(s => { cats[s.category] = (cats[s.category] || 0) + s.amount })
const colorOf = c => {
  if (!c) return '#e5dced';
  const match = CATS.find(x => x[0].toLowerCase().trim() === c.toLowerCase().trim());
  if (match) return match[2];
  
  // Dynamic fallback so custom categories don't turn purple
  let hash = 0;
  for (let i = 0; i < c.length; i++) hash = c.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash % 360)}, 65%, 70%)`;
};

let acc = 0;
const stops = [];
Object.entries(cats).forEach(([k, v]) => {
  const f = (v / total) * 100;
  const color = colorOf(k);

  
  // Push the explicit start and end markers for a sharp slice edge
  stops.push(`${color} ${acc}%`)
  stops.push(`${color} ${acc + f}%`)
  
  acc += f
})
  const days = [...new Set(monthSpend.map(s => s.date))].sort().reverse()


const CAT_STYLES = { 
  'Groceries': '#e8f5e0',
  'Dining': '#fde8df',
  'Gas': '#fef3c7',
  'Shopping': '#dbeafe',
  'Auto': '#d1fae5',
  'Housing': '#ede9fe',
  'Pet': '#fae8ff',
  'Subscriptions': '#fce7f3',
  'Pay in 4': '#fee2e2',
  'Personal': '#f4f4f5',
  'Gifts': '#ffedd5',
  'Health': '#e0f2fe',
  'Utilities': '#fdba74',
  'Cards': '#e0f7fa'
};


function SpendSheet({ db, insert, update, remove, onClose, showToast, editing }) {
  const [cat, setCat] = useState(editing?.category || 'Dining')
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '')
  const [place, setPlace] = useState(editing?.place || '')
  const [date, setDate] = useState(editing?.date || todayISO())
  const [linkBill, setLinkBill] = useState(!!editing?.bill_id)
  const [billId, setBillId] = useState(editing?.bill_id || '')
  const [billMonth, setBillMonth] = useState(editing?.bill_month || curMonth())
  const [customCat, setCustomCat] = useState('')
  const [addingCat, setAddingCat] = useState(false)
  const catMeta = CATS.find(c => c[0] === cat) || CATS[0]
  // show ALL bills including paid, across all months
  const allBills = db.bills.filter(b => !b.archived)

  const save = () => {
    const amt = +amount || 0
    const row = { place, category: cat, emoji: catMeta[1], color: catMeta[2], amount: amt, date, bill_id: linkBill ? billId : null, bill_month: linkBill ? billMonth : null }
    if (editing) update('spend', editing.id, row)
    else insert('spend', row)
    if (linkBill && billId) {
      const b = db.bills.find(x => x.id === billId)
      if (b) {
        const p = (b.paid_amount || 0) + amt
        update('bills', billId, { paid_amount: p, status: p >= b.amount ? 'paid' : 'partial' })
      }
    }
    showToast(editing ? 'Updated' : 'Spend added')
    onClose()
  }

  const del = () => {
    if (window.confirm('Delete this entry?')) { remove('spend', editing.id); showToast('Deleted'); onClose() }
  }

  return (
    <div className="overlay" style={{ position: 'fixed', inset: 0, zIndex: 100 }} onClick={onClose}>
      <div className="sheet" style={{ maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <h3>{editing ? 'Edit spend' : 'Log a spend 💸'}</h3>
        <p className="shint">A quick entry — lands in your log and category totals.</p>
        <div className="amountf"><input value={amount} onChange={e => setAmount(e.target.value)} placeholder="$0.00" inputMode="decimal" autoFocus /></div>
        <div className="field"><label>Where</label><input value={place} onChange={e => setPlace(e.target.value)} placeholder="e.g. Whole Foods" /></div>
        <div className="field">
          <label>Category</label>
          <div className="catgrid">
            {CATS.map(([c, e, col, cl]) => (
              <button key={c} className={'cat ' + cl + (cat === c ? ' on' : '')} onClick={() => setCat(c)}
                style={{ background: cat === c ? CAT_STYLES[c] || '#f0edf5' : '#f4f0f6', color: col, borderColor: cat === c ? col : 'transparent', border: '2px solid' }}>
                {e} {c}
              </button>
            ))}
            {addingCat
              ? <div style={{ display: 'flex', gap: 6, width: '100%' }}>
                  <input style={{ flex: 1, padding: '8px 12px', borderRadius: 12, border: '1.5px solid var(--line)', fontSize: 13 }} placeholder="Category name" value={customCat} onChange={e => setCustomCat(e.target.value)} />
                  <button style={{ padding: '8px 12px', borderRadius: 12, background: 'var(--matcha)', color: '#4e6327', fontWeight: 700, fontSize: 12, border: 'none' }} onClick={() => { if (customCat) { setCat(customCat); setAddingCat(false) } }}>Add</button>
                </div>
              : <button className="cat" style={{ background: '#fff', border: '1.5px dashed var(--pink)', color: '#9c3f74' }} onClick={() => setAddingCat(true)}>+ custom</button>}
          </div>
        </div>
        <div className="field"><label>Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>

        {/* Does this pay a bill — expanded with all bills + month picker */}
        <div style={{ background: '#fff', border: '1.5px solid #e7f0f8', borderRadius: 16, padding: 15, marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: linkBill ? 14 : 0 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800 }}>Does this pay a bill? 🧾</div>
              <div style={{ fontSize: 10, color: 'var(--ink2)', marginTop: 2 }}>{linkBill ? 'on — linked' : 'off — everyday spending'}</div>
            </div>
            <button onClick={() => setLinkBill(v => !v)} style={{ width: 46, height: 27, borderRadius: 20, background: linkBill ? '#5aa0d8' : '#dcd6e0', position: 'relative', border: 'none' }}>
              <div style={{ position: 'absolute', top: 3, [linkBill ? 'right' : 'left']: 3, width: 21, height: 21, borderRadius: '50%', background: '#fff' }} />
            </button>
          </div>
          {linkBill && (
            <div>
              <div className="field" style={{ marginBottom: 10 }}>
                <label>Which bill</label>
                <select value={billId} onChange={e => setBillId(e.target.value)} style={{ width: '100%', padding: '11px 13px', borderRadius: 12, border: '1.5px solid #dce8f4', background: '#f4f9fd', fontSize: 14, fontWeight: 600, color: '#245b86' }}>
                  <option value="">Pick a bill…</option>
                  {allBills.map(b => <option key={b.id} value={b.id}>{b.name} — {b.status === 'paid' ? '✅ paid' : money(b.amount - (b.paid_amount || 0)) + ' left'}</option>)}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Which month is this for?</label>
                <input type="month" value={billMonth} onChange={e => setBillMonth(e.target.value)} style={{ width: '100%', padding: '11px 13px', borderRadius: 12, border: '1.5px solid #dce8f4', background: '#f4f9fd', fontSize: 14, color: '#245b86' }} />
                <div style={{ fontSize: 10, color: 'var(--ink2)', marginTop: 5 }}>Use this if you're catching up on a late payment from a previous month</div>
              </div>
            </div>
          )}
        </div>

        <button className="apply" onClick={save}>{editing ? 'Save changes ✨' : 'Add spend ✨'}</button>
        <button className="cancel" onClick={onClose}>Cancel</button>
        {editing && <button onClick={del} style={{ width: '100%', marginTop: 10, padding: 12, borderRadius: 14, background: 'none', border: 'none', color: '#c0483f', fontWeight: 700, fontSize: 13 }}>🗑 Delete this entry</button>}
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
    <div className="overlay" style={{ position: 'fixed', inset: 0, zIndex: 100 }} onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <h3>Import from bank CSV 📥</h3>
        <p className="shint">Download transactions from your bank and upload the CSV file.</p>
        <div style={{ border: '2px dashed var(--pink)', borderRadius: 20, padding: 32, textAlign: 'center', background: 'var(--pink-soft)', marginBottom: 16 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📂</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#7a2f57', marginBottom: 6 }}>Choose your CSV file</div>
          <div style={{ fontSize: 12, color: '#9c6f84', lineHeight: 1.5, marginBottom: 14 }}>Works with Chase, Bank of America, Capital One, and most banks</div>
          <input ref={fileRef} type="file" accept=".csv" onChange={parseCSV} style={{ display: 'none' }} />
          <button style={{ padding: '12px 24px', borderRadius: 14, background: 'var(--pink)', color: '#fff', fontWeight: 800, fontSize: 14, border: 'none' }} onClick={() => fileRef.current.click()}>Choose file</button>
        </div>
        <button className="cancel" onClick={onClose}>Cancel</button>
      </div>
    </div>
  )

  const total = rows.filter((_, i) => cats[i] !== '__skip__').reduce((s, r) => s + r.amount, 0)
  const matched = rows.filter((_, i) => cats[i] !== '__unrecognized__' && cats[i] !== '__skip__').length
  const unrecognized = rows.filter((_, i) => cats[i] === '__unrecognized__').length

  return (
    <div className="overlay" style={{ position: 'fixed', inset: 0, zIndex: 100 }} onClick={onClose}>
      <div className="sheet" style={{ maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <h3>Review import 📥</h3>
        <p className="shint">{rows.length} transactions found</p>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, borderRadius: 14, padding: 12, textAlign: 'center', background: 'var(--pink-soft)', color: '#9c3f74' }}><div style={{ fontSize: 17, fontWeight: 800 }}>{rows.length}</div><div style={{ fontSize: 10, fontWeight: 700, marginTop: 3, opacity: .75 }}>FOUND</div></div>
          <div style={{ flex: 1, borderRadius: 14, padding: 12, textAlign: 'center', background: 'var(--lav)', color: '#5a52a0' }}><div style={{ fontSize: 17, fontWeight: 800 }}>{money(total)}</div><div style={{ fontSize: 10, fontWeight: 700, marginTop: 3, opacity: .75 }}>TOTAL</div></div>
          <div style={{ flex: 1, borderRadius: 14, padding: 12, textAlign: 'center', background: '#e7f2c7', color: '#51691f' }}><div style={{ fontSize: 17, fontWeight: 800 }}>{matched}/{rows.length}</div><div style={{ fontSize: 10, fontWeight: 700, marginTop: 3, opacity: .75 }}>MATCHED</div></div>
        </div>
        {unrecognized > 0 && <div style={{ background: '#fff6ea', border: '1px solid #f5e2c4', borderRadius: 12, padding: '10px 13px', fontSize: 12, color: '#9a6a1a', fontWeight: 600, marginBottom: 14 }}>💛 {unrecognized} unrecognized — they'll import as "Needs category" so you can fix them later.</div>}
        {rows.map((r, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: 13, marginBottom: 10, opacity: cats[i] === '__skip__' ? .45 : 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <div><div style={{ fontSize: 13, fontWeight: 800 }}>{r.merchant}</div><div style={{ fontSize: 11, color: 'var(--ink2)', marginTop: 2 }}>{r.date}</div></div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 800, color: '#c0483f' }}>${r.amount.toFixed(2)}</div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[...CATS.map(c => c[0]), '__skip__'].map(c => (
                <button key={c} onClick={() => setCats(prev => ({ ...prev, [i]: c }))}
                  style={{ fontSize: 11, fontWeight: 700, padding: '6px 11px', borderRadius: 20, border: 'none', background: cats[i] === c ? 'var(--lav)' : '#f4f0f6', color: cats[i] === c ? '#5a52a0' : 'var(--ink2)', boxShadow: cats[i] === c ? '0 2px 6px rgba(150,120,160,.2)' : 'none' }}>
                  {c === '__skip__' ? '⏭ Skip' : CATS.find(x => x[0] === c)?.[1] + ' ' + c || c}
                      </button>
            ))}
            </div>
          </div>
        ))}
        <button className="apply" onClick={doImport}>Import {rows.filter((_, i) => cats[i] !== '__skip__').length} transactions ✨</button>
        <button className="cancel" onClick={onClose}>Cancel</button>
      </div>
    </div>
  )
}

export default function Spend({ db, insert, update, remove, showToast }) {
  const [sheet, setSheet] = useState(false)
  const [editing, setEditing] = useState(null)
  const [csvOpen, setCsvOpen] = useState(false)
  const scrollRef = useRef()
  const m = curMonth()
  const monthSpend = db.spend.filter(s => s.date.slice(0, 7) === m)
  const total = monthSpend.reduce((s, x) => s + x.amount, 0)
  const cats = {}; monthSpend.forEach(s => { cats[s.category] = (cats[s.category] || 0) + s.amount })

  const colorOf = c => {
    if (!c) return '#c9b8ee';
    const match = CATS.find(x => x[0].toLowerCase().trim() === c.toLowerCase().trim());
    return match ? match[2] : '#c9b8ee';
  };

  let acc = 0;
  const stops = [];
  Object.entries(cats).forEach(([k, v]) => {
    const f = (v / total) * 100;
    const color = colorOf(k);
    stops.push(`${color} ${acc}%`);
    stops.push(`${color} ${acc + f}%`);
    acc += f;
  });

  const days = [...new Set(monthSpend.map(s => s.date))].sort().reverse()
  const openNew = () => { setEditing(null); setSheet(true) }
  const openEdit = s => { setEditing(s); setSheet(true) }
  const closeSheet = () => { setSheet(false); setEditing(null) }

  return (
    <div className="screen" ref={scrollRef}>
      <div className="pagetitle">Spending 💸</div>
      <p className="pagesub">Everything you spend, in one place</p>

      {/* Buttons at TOP */}
      <button className="paybtn" onClick={openNew} style={{ marginBottom: 10 }}>+ Log a spend ✨</button>
      <button style={{ width: '100%', marginBottom: 16, padding: 13, borderRadius: 16, border: '1.5px solid var(--lav)', background: 'var(--lav)', color: '#5a52a0', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={() => setCsvOpen(true)}>📥 Import from bank CSV</button>

      <div className="summary">
        <div className="donut" style={{ background: total > 0 ? `conic-gradient(${stops.join(',')})` : '#e5dced' }}>
          <b><span>{money(total)}</span>this month</b>
        </div>
        <div className="legend">
          {Object.keys(cats).length === 0 && <div style={{ fontSize: 12, color: 'var(--ink2)' }}>No spending logged yet.</div>}
          {Object.entries(cats).map(([k, v]) => (
            <div className="lgrow" key={k}><span className="d" style={{ background: colorOf(k) }} /><span className="lname">{k}</span><span className="lv">{money(v)}</span></div>
          ))}
        </div>
      </div>
      
      {days.map(day => (
        <div key={day}>
          <div className="daylabel">{day === todayISO() ? 'Today' : new Date(day + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
          <div className="card">
            {monthSpend.filter(s => s.date === day).map(s => (
              <button className="erow" key={s.id} onClick={() => openEdit(s)} style={{ width: '100%', textAlign: 'left', background: s.needs_category ? '#fff6ea' : 'none', border: 'none', borderBottom: '1px solid var(--line)' }}>
                <div className="eleft">
                  <div className="cdot" style={{ background: (s.color || '#c9b8ee') + '22' }}>{s.emoji}</div>
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

      {sheet && <SpendSheet db={db} insert={insert} update={update} remove={remove} showToast={showToast} editing={editing} onClose={closeSheet} />}
      {csvOpen && <CSVImport db={db} insert={insert} update={update} showToast={showToast} onClose={() => setCsvOpen(false)} />}
    </div>
  )
}
