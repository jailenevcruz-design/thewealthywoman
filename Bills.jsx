import { useState } from 'react'
import { money, curMonth } from './lib'

function PayHistory({ bill, payments, onDelete, onClose }) {
  const billPayments = payments.filter(p => p.bill_id === bill.id)
  return (
    <div className="overlay" style={{ position: 'fixed', inset: 0, zIndex: 100 }} onClick={onClose}>
      <div className="sheet" style={{ maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <h3>💳 {bill.name} — payments</h3>
        <p className="shint">Tap a payment to delete it if it was logged incorrectly.</p>
        {billPayments.length === 0 && <div style={{ textAlign: 'center', color: 'var(--ink2)', padding: '20px 0', fontSize: 13 }}>No payments logged yet.</div>}
        {billPayments.map(p => (
          <div key={p.id} style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: 14, marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{money(p.amount, 2)}</div>
              <div style={{ fontSize: 11, color: 'var(--ink2)', marginTop: 3 }}>{p.date}{p.bill_month && p.bill_month !== p.date?.slice(0,7) ? ` · for ${p.bill_month}` : ''}</div>
              {p.note && <div style={{ fontSize: 11, color: 'var(--ink2)', marginTop: 2 }}>{p.note}</div>}
            </div>
            <button onClick={() => onDelete(p)} style={{ fontSize: 12, fontWeight: 700, color: '#c0483f', background: '#fee2e2', border: 'none', borderRadius: 10, padding: '6px 12px' }}>Delete</button>
          </div>
        ))}
        <div style={{ background: 'var(--lav)', borderRadius: 12, padding: '11px 13px', fontSize: 12, color: '#5a52a0', fontWeight: 700, marginTop: 8 }}>
          Total paid: {money(billPayments.reduce((s, p) => s + p.amount, 0), 2)} of {money(bill.amount, 2)}
        </div>
        <button className="cancel" style={{ marginTop: 12 }} onClick={onClose}>Close</button>
      </div>
    </div>
  )
}

function PayForm({ bill, onSave, onClose }) {
  const [amt, setAmt] = useState('')
  const [note, setNote] = useState('')
  const [billMonth, setBillMonth] = useState(curMonth())
  return (
    <div>
      <div className="amountf"><input value={amt} onChange={e => setAmt(e.target.value)} placeholder="$0.00" inputMode="decimal" autoFocus /></div>
      <div className="field"><label>Note (optional)</label><input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. partial payment" /></div>
      <div className="field">
        <label>Which month is this for?</label>
        <input type="month" value={billMonth} onChange={e => setBillMonth(e.target.value)} style={{ width: '100%', padding: '11px 13px', borderRadius: 12, border: '1.5px solid var(--line)', background: '#fff', fontSize: 14 }} />
        <div style={{ fontSize: 10, color: 'var(--ink2)', marginTop: 5 }}>Use if catching up on a late payment</div>
      </div>
      <button className="apply" onClick={() => { if (+amt > 0) onSave(+amt, note, billMonth) }}>Apply payment ✨</button>
      <button className="cancel" onClick={onClose}>Cancel</button>
    </div>
  )
}

export default function Bills({ db, update, insert, remove, showToast }) {
  const [arch, setArch] = useState(false)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)
  const [paySheet, setPaySheet] = useState(null)
  const [warnBill, setWarnBill] = useState(null)
  const [historyBill, setHistoryBill] = useState(null)

  const active = db.bills.filter(b => !b.archived)
  const archived = db.bills.filter(b => b.archived)
  const groups = [...new Set(active.map(b => b.grp))]
  const total = active.reduce((s, b) => s + (b.status === 'paid' ? 0 : b.amount - (b.paid_amount || 0)), 0)
  const paidSoFar = active.reduce((s, b) => s + (b.paid_amount || 0) + (b.status === 'paid' ? b.amount : 0), 0)

  // get spend entries that are linked to bills (payment history)
  const billPayments = (db.spend || []).filter(s => s.bill_id)

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

  const logPayment = (b, amt, note, billMonth) => {
    const paid = (b.paid_amount || 0) + amt
    const status = paid >= b.amount ? 'paid' : paid > 0 ? 'partial' : 'unpaid'
    update('bills', b.id, { paid_amount: Math.min(paid, b.amount), status })
    // also log in spend
    insert('spend', {
      place: b.name, category: b.grp || 'Housing',
      emoji: '🧾', color: '#a89be6', amount: amt,
      date: new Date().toISOString().slice(0, 10),
      bill_id: b.id, bill_month: billMonth, note
    })
    showToast(`Payment logged — ${money(amt)} on ${b.name}`)
    setPaySheet(null)
  }

  const deletePayment = async (payment) => {
    if (!window.confirm('Delete this payment? The bill balance will be adjusted.')) return
    const bill = db.bills.find(b => b.id === payment.bill_id)
    // remove this payment first, then recalculate from all remaining payments
    const remaining = billPayments.filter(p => p.id !== payment.id && p.bill_id === payment.bill_id)
    const newPaid = remaining.reduce((s, p) => s + p.amount, 0)
    if (bill) {
      const status = newPaid <= 0 ? 'unpaid' : newPaid >= bill.amount ? 'paid' : 'partial'
      update('bills', bill.id, { paid_amount: newPaid, status })
    }
    remove('spend', payment.id)
    showToast('Payment deleted — balance recalculated')
  }

  const unsubscribe = b => { update('bills', b.id, { archived: true }); showToast(`${b.name} unsubscribed`) }
  const LAB = { unpaid: 'Unpaid', partial: 'Partial', paid: 'Paid' }

  return (
    <div className="screen">
      <div className="pagetitle">Monthly bills 💌</div>
      <p className="pagesub">Tap Pay to log a payment · tap History to review</p>
      <div className="grid2" style={{ marginBottom: 6 }}>
        <div className="tile t-pink"><div className="big">{money(total)}</div><div className="cap">still owed 💌</div></div>
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
                const overdue = b.status === 'unpaid' && b.due_day < new Date().getDate() && !b.running
                const left = b.amount - (b.paid_amount || 0)
                const payCount = billPayments.filter(p => p.bill_id === b.id).length
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
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <button className="tag" style={{ background: 'var(--lav)', color: '#5a52a0' }} onClick={() => setEditing(b)}>Edit</button>
                        <button className="tag" style={{ background: 'var(--matcha)', color: '#38571f' }} onClick={() => setWarnBill(b)}>Pay</button>
                        {payCount > 0 && <button className="tag" style={{ background: '#e0f2fe', color: '#0891b2' }} onClick={() => setHistoryBill(b)}>History ({payCount})</button>}
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
        <div className="overlay" style={{ position: 'fixed', inset: 0, zIndex: 100 }} onClick={() => setWarnBill(null)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <h3>⚠️ Heads up</h3>
            <p className="shint" style={{ fontSize: 13, color: 'var(--ink)', marginBottom: 18, lineHeight: 1.5 }}>This will also add a spend record. Skip if you already logged this in Spend.</p>
            <button className="apply" onClick={() => { setPaySheet(warnBill); setWarnBill(null) }}>Got it, continue</button>
            <button className="cancel" onClick={() => setWarnBill(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Pay sheet */}
      {paySheet && (
        <div className="overlay" style={{ position: 'fixed', inset: 0, zIndex: 100 }} onClick={() => setPaySheet(null)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <h3>Log a payment 💳</h3>
            <p className="shint">{paySheet.name} · {money(paySheet.amount - (paySheet.paid_amount || 0))} remaining</p>
            <PayForm bill={paySheet} onSave={(amt, note, month) => logPayment(paySheet, amt, note, month)} onClose={() => setPaySheet(null)} />
          </div>
        </div>
      )}

      {/* Edit sheet */}
      {editing && (
        <div className="overlay" style={{ position: 'fixed', inset: 0, zIndex: 100 }} onClick={() => setEditing(null)}>
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

      {/* Payment history */}
      {historyBill && (
        <PayHistory
          bill={historyBill}
          payments={billPayments}
          onDelete={deletePayment}
          onClose={() => setHistoryBill(null)}
        />
      )}
    </div>
  )
}
