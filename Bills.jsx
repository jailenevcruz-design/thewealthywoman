import { useState } from 'react'
import { money, curMonth } from './lib'

export default function Bills({ db, update, insert, remove, showToast }) {
  const [arch, setArch] = useState(false)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)
  const [paySheet, setPaySheet] = useState(null)
  const [warnBill, setWarnBill] = useState(null)

  const active = db.bills.filter(b => !b.archived)
  const archived = db.bills.filter(b => b.archived)
  const groups = [...new Set(active.map(b => b.grp))]
  const total = active.reduce((s, b) => s + (b.status === 'paid' ? 0 : b.amount - (b.paid_amount || 0)), 0)
  const paidSoFar = active.reduce((s, b) => s + (b.paid_amount || 0) + (b.status === 'paid' ? b.amount : 0), 0)

  const addBill = e => {
    e.preventDefault()
    const f = e.target
    insert('bills', { name: f.bname.value, amount: +f.amount.value || 0, grp: f.grp.value || '🛒 Everyday', due_day: +f.due.value || 1, month: curMonth(), status: 'unpaid', paid_amount: 0, running: false, autopay: false, archived: false, sort: db.bills.length })
    setAdding(false); showToast('Bill added')
  }

  const savEdit = e => {
    e.preventDefault()
    const f = e.target
    update('bills', editing.id, { name: f.bname.value, amount: +f.amount.value || 0, grp: f.grp.value, due_day: +f.due.value || 1 })
    setEditing(null); showToast('Bill updated')
  }

  const logPayment = (b, amt, note) => {
    const paid = (b.paid_amount || 0) + amt
    const status = paid >= b.amount ? 'paid' : paid > 0 ? 'partial' : 'unpaid'
    update('bills', b.id, { paid_amount: Math.min(paid, b.amount), status })
    // auto-log in spend too
    insert('spend', {
      place: b.name, category: b.grp || 'Housing',
      emoji: '🧾', color: '#a89be6', amount: amt,
      date: new Date().toISOString().slice(0, 10), bill_id: b.id
    })
    showToast(`Payment logged — ${money(amt)} on ${b.name}`)
    setPaySheet(null)
  }

  const unsubscribe = b => {
    update('bills', b.id, { archived: true })
    showToast(`${b.name} unsubscribed — find it in archived`)
  }

  const LAB = { unpaid: 'Unpaid', partial: 'Partial', paid: 'Paid' }

  return (
    <div className="screen">
      <div className="pagetitle">Monthly bills 🧾</div>
      <p className="pagesub">Log a spend to mark bills paid</p>
      <div className="grid2" style={{ marginBottom: 6 }}>
        <div className="tile t-pink"><div className="big">{money(total)}</div><div className="cap">still owed 🧾</div></div>
        <div className="tile t-sage"><div className="big">{money(paidSoFar)}</div><div className="cap">paid so far ✅</div></div>
      </div>

      {groups.map(g => {
        const rows = active.filter(b => b.grp === g)
        const due = rows.reduce((s, b) => s + (b.status === 'paid' ? 0 : b.amount - (b.paid_amount || 0)), 0)
        return (
          <div key={g}>
            <div className="grouphead"><span className="gt">{g}</span><span className="gs">{money(due)} due</span></div>
            <div className="card">
              {rows.map(b => {
                const overdue = b.status === 'unpaid' && b.due_day <= new Date().getDate() && !b.running
                const left = b.amount - (b.paid_amount || 0)
                return (
                  <div className={'brow' + (overdue ? ' overdue' : '')} key={b.id}>
                    <div className="blft">
                      <span className={'sdot ' + (b.running ? 'd-run' : overdue ? 'd-overdue' : 'd-' + b.status)} />
                      <div>
                        <div className="nm">{b.name}</div>
                        {b.running
                          ? <div className="mt accent">Running · {money(b.paid_amount || 0)} paid · {money(left)} owed</div>
                          : b.status === 'partial'
                            ? <div className="mt">{money(b.paid_amount)} of {money(b.amount)} · {money(left)} left</div>
                            : <div className={'mt' + (overdue ? ' red' : '')}>{overdue ? 'overdue' : b.autopay ? 'autopay' : `due ${b.due_day}${b.due_day === 1 ? 'st' : 'th'}`}</div>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <div className={'amt' + (b.status === 'paid' ? ' paid' : '')}>{money(b.amount, 2)}</div>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button className="tag" style={{ background: 'var(--lav)', color: '#5a52a0' }} onClick={() => setEditing(b)}>Edit</button>
                        <button className="tag pay" style={{ background: 'var(--matcha)', color: '#38571f' }} onClick={() => setWarnBill(b)}>Pay</button>
                        <button className="tag" style={{ background: '#ffdada', color: '#8a2020' }} onClick={() => unsubscribe(b)}>Unsub</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      <div className="statcard" style={{ background: 'var(--lav)', marginTop: 14, color: '#5a52a0', fontSize: 11, fontWeight: 700, padding: '11px 13px' }}>
        🔁 Rent is a running balance — it climbs when charged and drops as you pay.
      </div>

      {adding ? (
        <form className="card" style={{ marginTop: 13, padding: 14 }} onSubmit={addBill}>
          <div className="field"><label>Name</label><input name="bname" required placeholder="e.g. Spotify" /></div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div className="field" style={{ flex: 1 }}><label>Amount</label><input name="amount" type="number" step="0.01" placeholder="0" /></div>
            <div className="field" style={{ flex: 1 }}><label>Due day</label><input name="due" type="number" placeholder="1" /></div>
          </div>
          <div className="field"><label>Group</label><input name="grp" placeholder="🛒 Everyday" /></div>
          <button className="apply" type="submit">Add bill</button>
          <button className="cancel" type="button" onClick={() => setAdding(false)}>Cancel</button>
        </form>
      ) : (
        <button className="addbtn" onClick={() => setAdding(true)}>+ Add a bill</button>
      )}

      {archived.length > 0 && <>
        <button className="archtog" onClick={() => setArch(!arch)}>📁 {arch ? 'Hide' : 'Show'} archived ({archived.length}) {arch ? '▴' : '▾'}</button>
        {arch && <div className="card" style={{ marginTop: 10, background: '#f6f2f7' }}>
          {archived.map(b => (
            <div className="brow" key={b.id}>
              <div><div className="nm" style={{ color: 'var(--ink2)' }}>{b.name}</div><div className="mt">was {money(b.amount)}/mo · unsubscribed</div></div>
              <button className="tag" style={{ background: '#e1f5ee', color: '#3b8f6a' }} onClick={() => update('bills', b.id, { archived: false })}>↩ Restore</button>
            </div>
          ))}
        </div>}
      </>}

      {/* Warning popup */}
      {warnBill && (
        <div className="overlay" onClick={() => setWarnBill(null)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <h3>⚠️ Heads up</h3>
            <p className="shint" style={{fontSize:13,color:'var(--ink)',marginBottom:18,lineHeight:1.5}}>This will also add a spend record. Skip if you already logged this in Spend.</p>
            <button className="apply" onClick={() => { setPaySheet(warnBill); setWarnBill(null) }}>Got it, continue</button>
            <button className="cancel" onClick={() => setWarnBill(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Pay sheet */}
      {paySheet && (
        <div className="overlay" onClick={() => setPaySheet(null)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <h3>Log a payment 💳</h3>
            <p className="shint">{paySheet.name} · {money(paySheet.amount - (paySheet.paid_amount || 0))} remaining</p>
            <PayForm bill={paySheet} onSave={logPayment} onClose={() => setPaySheet(null)} />
          </div>
        </div>
      )}

      {/* Edit sheet */}
      {editing && (
        <div className="overlay" onClick={() => setEditing(null)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <h3>Edit bill ✏️</h3>
            <form onSubmit={savEdit}>
              <div className="field"><label>Name</label><input name="bname" defaultValue={editing.name} required /></div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div className="field" style={{ flex: 1 }}><label>Amount</label><input name="amount" type="number" step="0.01" defaultValue={editing.amount} /></div>
                <div className="field" style={{ flex: 1 }}><label>Due day</label><input name="due" type="number" defaultValue={editing.due_day} /></div>
              </div>
              <div className="field"><label>Group</label><input name="grp" defaultValue={editing.grp} /></div>
              <button className="apply" type="submit">Save changes</button>
              <button className="cancel" type="button" onClick={() => setEditing(null)}>Cancel</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function PayForm({ bill, onSave, onClose }) {
  const [amt, setAmt] = useState('')
  const [note, setNote] = useState('')
  return (
    <div>
      <div className="amountf"><input value={amt} onChange={e => setAmt(e.target.value)} placeholder="$0.00" inputMode="decimal" /></div>
      <div className="field"><label>Note (optional)</label><input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. partial payment" /></div>
      <button className="apply" onClick={() => { if (+amt > 0) onSave(bill, +amt, note) }}>Apply payment ✨</button>
      <button className="cancel" onClick={onClose}>Cancel</button>
    </div>
  )
}
