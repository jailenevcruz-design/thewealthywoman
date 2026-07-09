import { useState } from 'react'
import { money, curMonth, todayISO, CATS } from './lib'

function SpendSheet({ db, insert, update, remove, onClose, showToast, editing }) {
  const [cat, setCat] = useState(editing?.category || 'Dining')
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '')
  const [place, setPlace] = useState(editing?.place || '')
  const [date, setDate] = useState(editing?.date || todayISO())
  const [linkBill, setLinkBill] = useState(!!editing?.bill_id)
  const [billId, setBillId] = useState(editing?.bill_id || '')
  const [customCat, setCustomCat] = useState('')
  const [addingCat, setAddingCat] = useState(false)

  const allCats = [...CATS, ...(customCat ? [[customCat, '✨', '#c9b8ee', 'c-custom']] : [])]
  const catMeta = allCats.find(c => c[0] === cat) || CATS[0]
  const unpaidBills = db.bills.filter(b => !b.archived && b.status !== 'paid')

  const save = () => {
    const amt = +amount || 0
    const row = { place, category: cat, emoji: catMeta[1], color: catMeta[2], amount: amt, date, bill_id: linkBill ? billId : null }
    if (editing) update('spend', editing.id, row)
    else insert('spend', row)
    if (linkBill && billId) {
      const b = db.bills.find(x => x.id === billId)
      if (b) {
        const paid = (b.paid_amount || 0) + amt
        update('bills', billId, { paid_amount: paid, status: paid >= b.amount ? 'paid' : 'partial' })
      }
    }
    showToast(editing ? 'Updated' : 'Spend added')
    onClose()
  }

  const del = () => {
    if (editing && confirm('Delete this entry?')) { remove('spend', editing.id); showToast('Deleted'); onClose() }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <h3>{editing ? 'Edit spend' : 'Log a spend 💸'}</h3>
        <p className="shint">A quick entry — lands in your log and category totals.</p>
        <div className="amountf"><input value={amount} onChange={e => setAmount(e.target.value)} placeholder="$0.00" inputMode="decimal" /></div>
        <div className="field"><label>Where</label><input value={place} onChange={e => setPlace(e.target.value)} placeholder="e.g. Whole Foods" /></div>
        <div className="field">
          <label>Category</label>
          <div className="catgrid">
            {CATS.map(([c, e, col, cl]) => (
              <button key={c} className={'cat ' + cl + (cat === c ? ' on' : '')} onClick={() => setCat(c)}>{e} {c}</button>
            ))}
            {addingCat
              ? <div style={{ display: 'flex', gap: 6, width: '100%' }}>
                  <input style={{ flex: 1, padding: '8px 12px', borderRadius: 12, border: '1.5px solid var(--line)', fontSize: 13 }} placeholder="Category name" value={customCat} onChange={e => setCustomCat(e.target.value)} />
                  <button style={{ padding: '8px 12px', borderRadius: 12, background: 'var(--matcha)', color: '#4e6327', fontWeight: 700, fontSize: 12 }} onClick={() => { if (customCat) { setCat(customCat); setAddingCat(false) } }}>Add</button>
                </div>
              : <button className="cat" style={{ background: '#fff', border: '1.5px dashed var(--pink)', color: '#9c3f74' }} onClick={() => setAddingCat(true)}>+ custom</button>
            }
          </div>
        </div>
        <div className="field"><label>Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
        <div className="statcard" style={{ background: '#fff', border: '1.5px solid #e7f0f8' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div><div style={{ fontSize: 13, fontWeight: 800 }}>Does this pay a bill? 🧾</div>
              <div style={{ fontSize: 10, color: 'var(--ink2)', marginTop: 2 }}>{linkBill ? 'on — linked' : 'off — everyday spending'}</div></div>
            <button onClick={() => setLinkBill(v => !v)} style={{ width: 46, height: 27, borderRadius: 20, background: linkBill ? '#5aa0d8' : '#dcd6e0', position: 'relative', border: 'none' }}>
              <div style={{ position: 'absolute', top: 3, [linkBill ? 'right' : 'left']: 3, width: 21, height: 21, borderRadius: '50%', background: '#fff' }} />
            </button>
          </div>
          {linkBill && (
            <div style={{ marginTop: 12 }}>
              <select value={billId} onChange={e => setBillId(e.target.value)} style={{ width: '100%', padding: '11px 13px', borderRadius: 12, border: '1.5px solid #dce8f4', background: '#f4f9fd', fontSize: 14, fontWeight: 600, color: '#245b86' }}>
                <option value="">Pick a bill…</option>
                {unpaidBills.map(b => <option key={b.id} value={b.id}>{b.name} — {money(b.amount - (b.paid_amount || 0))} left</option>)}
              </select>
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

export default function Spend({ db, insert, update, remove, showToast }) {
  const [sheet, setSheet] = useState(false)
  const [editing, setEditing] = useState(null)
  const m = curMonth()
  const monthSpend = db.spend.filter(s => s.date.slice(0, 7) === m)
  const total = monthSpend.reduce((s, x) => s + x.amount, 0)
  const cats = {}; monthSpend.forEach(s => { cats[s.category] = (cats[s.category] || 0) + s.amount })
  const colorOf = c => (CATS.find(x => x[0] === c) || ['','','#c9b8ee'])[2]
  let acc = 0
  const stops = Object.entries(cats).map(([k, v]) => { const f = v / total * 100; const s = `${colorOf(k)} ${acc}% ${acc + f}%`; acc += f; return s })
  const days = [...new Set(monthSpend.map(s => s.date))].sort().reverse()

  return (
    <div className="screen">
      <div className="pagetitle">Spending 💸</div>
      <p className="pagesub">Everything you spend, in one place</p>
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
              <button className="erow" key={s.id} onClick={() => { setEditing(s); setSheet(true) }} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', borderBottom: '1px solid var(--line)' }}>
                <div className="eleft">
                  <div className="cdot" style={{ background: (s.color || '#c9b8ee') + '22' }}>{s.emoji}</div>
                  <div><div className="nm">{s.place || s.category}</div><div className="mt">{s.category}{s.bill_id && <span className="feeds">→ Bill</span>}</div></div>
                </div>
                <div className="amt">{money(s.amount, 2)}</div>
              </button>
            ))}
          </div>
        </div>
      ))}
      <button className="paybtn" onClick={() => { setEditing(null); setSheet(true) }}>+ Log a spend ✨</button>
      {sheet && <SpendSheet db={db} insert={insert} update={update} remove={remove} showToast={showToast} editing={editing} onClose={() => { setSheet(false); setEditing(null) }} />}
    </div>
  )
}
