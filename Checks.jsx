import { useState } from 'react'
import { money, curMonth, todayISO } from './lib'

function getMonthThursdays(m) {
  const [yr, mo] = m.split('-').map(Number)
  const days = new Date(yr, mo, 0).getDate()
  const out = []
  for (let d = 1; d <= days; d++) {
    if (new Date(yr, mo-1, d).getDay() === 4) out.push(d)
  }
  return out
}

function getBillsForCheck(checkIdx, totalChecks, allBills) {
  const results = []
  allBills.filter(b => !b.archived).forEach(b => {
    // Split bill — appears on multiple checks with split amounts
    if (b.split_slots) {
      try {
        const slots = JSON.parse(b.split_slots)
        const amts = b.split_amts ? JSON.parse(b.split_amts) : []
        const idx = slots.indexOf(checkIdx)
        if (idx !== -1) {
          results.push({ ...b, split_amt: amts[idx] || b.amount / slots.length })
        }
        return
      } catch(e) {}
    }
    // Manually assigned to this slot
    if (b.check_slot !== null && b.check_slot !== undefined) {
      if (b.check_slot === checkIdx) results.push(b)
      return
    }
    // Auto-placed by due date
    if (!b.due_day) return
    const slot = Math.min(totalChecks - 1, Math.floor((b.due_day - 1) / (31 / totalChecks)))
    if (slot === checkIdx) results.push(b)
  })
  return results
}

function BillAssignSheet({ bill, totalChecks, currentSlot, onAssign, onSplit, onClose }) {
  const [mode, setMode] = useState('move')
  const [splitCount, setSplitCount] = useState(2)
  const initSplits = n => Array.from({length: n}, (_, i) => ({
    slot: Math.min(currentSlot + i, totalChecks - 1),
    amount: +(bill.amount / n).toFixed(2)
  }))
  const [splits, setSplits] = useState(initSplits(2))

  const updateSplitCount = n => { setSplitCount(n); setSplits(initSplits(n)) }
  const updateSplit = (idx, key, val) => setSplits(prev => prev.map((s, i) => i === idx ? {...s, [key]: key === 'slot' ? +val : val} : s))
  const splitTotal = splits.reduce((s, x) => s + (+x.amount || 0), 0)
  const remainder = +(bill.amount - splitTotal).toFixed(2)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(60,45,70,.45)', display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: 'var(--bg)', borderRadius: '20px 20px 0 0', padding: '14px 16px 32px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ width: 36, height: 4, background: '#dcd6e0', borderRadius: 2, margin: '0 auto 12px' }} />
        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>{bill.name}</div>
        <div style={{ fontSize: 12, color: 'var(--ink2)', marginBottom: 14 }}>{money(bill.amount, 2)}{bill.autopay ? ' · 🔄 autopay' : ''}</div>
        <div style={{ display: 'flex', background: '#efe7f2', borderRadius: 12, padding: 3, marginBottom: 16 }}>
          <button onClick={() => setMode('move')} style={{ flex: 1, padding: 8, borderRadius: 10, fontWeight: 800, fontSize: 12, border: 'none', background: mode === 'move' ? '#fff' : 'none', color: mode === 'move' ? '#9c3f74' : 'var(--ink2)', cursor: 'pointer' }}>Move to check</button>
          <button onClick={() => setMode('split')} style={{ flex: 1, padding: 8, borderRadius: 10, fontWeight: 800, fontSize: 12, border: 'none', background: mode === 'split' ? '#fff' : 'none', color: mode === 'split' ? '#9c3f74' : 'var(--ink2)', cursor: 'pointer' }}>Split payments</button>
        </div>
        {mode === 'move' ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Array.from({ length: totalChecks }, (_, i) => (
              <button key={i} onClick={() => onAssign(bill, i)} style={{ flex: 1, minWidth: 55, padding: '12px 6px', borderRadius: 12, fontWeight: 800, fontSize: 14, border: 'none', background: currentSlot === i ? 'var(--pink)' : 'var(--lav)', color: currentSlot === i ? '#fff' : '#5a52a0', cursor: 'pointer' }}>
                {i + 1}
              </button>
            ))}
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink2)', marginBottom: 8 }}>SPLIT ACROSS HOW MANY CHECKS?</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {[2, 3, 4].map(n => (
                <button key={n} onClick={() => updateSplitCount(n)} style={{ flex: 1, padding: '10px', borderRadius: 12, fontWeight: 800, fontSize: 14, border: 'none', background: splitCount === n ? 'var(--pink)' : 'var(--lav)', color: splitCount === n ? '#fff' : '#5a52a0', cursor: 'pointer' }}>{n}</button>
              ))}
            </div>
            {splits.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: 'var(--ink2)', marginBottom: 4, fontWeight: 800 }}>CHECK</div>
                  <select value={s.slot} onChange={e => updateSplit(i, 'slot', e.target.value)} style={{ width: '100%', padding: '9px 10px', borderRadius: 11, border: '1.5px solid var(--line)', fontSize: 13 }}>
                    {Array.from({ length: totalChecks }, (_, j) => <option key={j} value={j}>Check {j+1}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: 'var(--ink2)', marginBottom: 4, fontWeight: 800 }}>AMOUNT</div>
                  <input value={s.amount} onChange={e => updateSplit(i, 'amount', e.target.value)} inputMode="decimal" style={{ width: '100%', padding: '9px 10px', borderRadius: 11, border: '1.5px solid var(--line)', fontSize: 13 }} />
                </div>
              </div>
            ))}
            <div style={{ background: remainder === 0 ? '#e1f5ee' : '#fff6ea', borderRadius: 12, padding: '9px 13px', fontSize: 12, fontWeight: 700, color: remainder === 0 ? '#3b8f6a' : '#9a6a1a', marginBottom: 14, display: 'flex', justifyContent: 'space-between' }}>
              <span>{remainder === 0 ? '✅ Amounts match' : '⚠️ Remainder'}</span>
              {remainder !== 0 && <span style={{ fontFamily: 'var(--mono)' }}>{money(Math.abs(remainder), 2)}</span>}
            </div>
            <button onClick={() => onSplit(bill, splits)} disabled={remainder !== 0} style={{ width: '100%', padding: 13, borderRadius: 14, background: remainder === 0 ? 'var(--matcha)' : '#dcd6e0', color: remainder === 0 ? '#4e6327' : 'var(--ink2)', fontWeight: 800, fontSize: 14, border: 'none', cursor: remainder === 0 ? 'pointer' : 'default', marginBottom: 8 }}>
              Confirm split ✨
            </button>
          </div>
        )}
        <button onClick={onClose} style={{ width: '100%', padding: 11, borderRadius: 14, background: '#fff', border: '1.5px solid var(--line)', color: 'var(--ink2)', fontWeight: 700, fontSize: 13, cursor: 'pointer', marginTop: 8 }}>Cancel</button>
      </div>
    </div>
  )
}

function ThisWeek({ check, db, update, insert, remove, showToast, debtExtra }) {
  const m = check.date.slice(0, 7)
  const monthChecks = [...db.checks].filter(c => c.date.slice(0,7) === m).sort((a,b) => a.date.localeCompare(b.date))
  const checkIdx = Math.max(0, monthChecks.findIndex(c => c.id === check.id))
  const totalChecks = getMonthThursdays(m).length || 4
  const billsForCheck = getBillsForCheck(checkIdx, totalChecks, db.bills)
  const totalBills = billsForCheck.reduce((s, b) => s + (b.split_amt && b.split_amt > 0 ? b.split_amt : b.amount), 0)
  const paidTotal = billsForCheck.reduce((s, b) => s + (b.status === 'paid' ? (b.split_amt && b.split_amt > 0 ? b.split_amt : b.amount) : b.paid_amount || 0), 0)
  const paidCount = billsForCheck.filter(b => b.status === 'paid' || (b.paid_amount||0) >= b.amount).length
  const pctPaid = totalBills > 0 ? Math.round(paidTotal / totalBills * 100) : 0
  const leftAfterBills = check.net - totalBills
  const savingsRec = Math.max(0, Math.min(125, leftAfterBills - (debtExtra || 0)))
  const debts = [...(db.debts || [])].filter(d => d.balance > 0).sort((a, b) => a.balance - b.balance)
  const focusDebt = debts[0]

  const markPaid = (bill) => {
    const isPaid = bill.status === 'paid' || (bill.paid_amount || 0) >= bill.amount
    if (isPaid) {
      const linked = (db.spend || []).find(s => s.bill_id === bill.id)
      if (linked) remove('spend', linked.id)
      update('bills', bill.id, { status: 'unpaid', paid_amount: 0 })
      showToast(`${bill.name} reverted`)
    } else {
      update('bills', bill.id, { status: 'paid', paid_amount: bill.amount })
      insert('spend', { place: bill.name, category: bill.grp || 'Housing', emoji: '🧾', color: '#a89be6', amount: bill.amount, date: todayISO(), bill_id: bill.id })
      showToast(`${bill.name} paid ✨`)
    }
  }

  const logDebtPayment = (debt, amt) => {
    update('debts', debt.id, { balance: Math.max(0, debt.balance - (+amt || 0)) })
    insert('debt_payments', { debt_id: debt.id, amount: +amt, date: todayISO() })
    showToast(`Payment logged on ${debt.name} ✨`)
  }

  return (
    <div>
      <div style={{ background: 'var(--lav2)', borderRadius: 14, padding: '12px 14px', marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0', color: 'var(--ink2)' }}><span>Gross</span><span style={{fontFamily:'var(--mono)'}}>{money(check.gross,2)}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0', color: '#c0483f' }}><span>Taxes</span><span style={{fontFamily:'var(--mono)'}}>−{money(check.tax,2)}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0', color: '#c0483f' }}><span>Deductions</span><span style={{fontFamily:'var(--mono)'}}>−{money(check.ded,2)}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 800, padding: '6px 0 0', borderTop: '1px solid rgba(90,82,160,.15)', marginTop: 4, color: '#5a52a0' }}><span>Net take-home</span><span style={{fontFamily:'var(--mono)'}}>{money(check.net,2)}</span></div>
      </div>

      <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--ink2)', letterSpacing: '.5px', marginBottom: 8 }}>BILLS THIS CHECK · {paidCount}/{billsForCheck.length} paid</div>
      <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
        {billsForCheck.length === 0 && <div style={{ padding: 14, fontSize: 12, color: 'var(--ink2)' }}>No bills assigned — go to Plan month to assign</div>}
        {billsForCheck.map((b, idx) => {
          const isPaid = b.status === 'paid' || (b.paid_amount||0) >= b.amount
          const splitAmt = b.split_amt && b.split_amt > 0 ? b.split_amt : b.amount
          return (
            <div key={b.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: idx < billsForCheck.length - 1 ? '1px solid var(--line)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${isPaid ? '#3b8f6a' : '#dcd6e0'}`, background: isPaid ? '#3b8f6a' : '#fff', display: 'grid', placeItems: 'center', fontSize: 10, color: '#fff', flexShrink: 0 }}>{isPaid ? '✓' : ''}</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{b.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--ink2)', marginTop: 2 }}>
                    {b.autopay && <span style={{ background: '#e0f2fe', color: '#0878a0', padding: '1px 5px', borderRadius: 6, fontWeight: 800, marginRight: 4 }}>auto</span>}
                    due {b.due_day}{b.due_day===1?'st':b.due_day===2?'nd':b.due_day===3?'rd':'th'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--mono)', color: isPaid ? '#3b8f6a' : 'var(--ink)' }}>{money(splitAmt, 2)}</div>
                <button onClick={() => markPaid(b)} style={{ fontSize: 10, fontWeight: 800, color: isPaid ? '#c0483f' : '#3b8f6a', background: isPaid ? '#fee2e2' : '#e1f5ee', border: 'none', borderRadius: 8, padding: '4px 10px', cursor: 'pointer' }}>{isPaid ? 'undo' : 'pay'}</button>
              </div>
            </div>
          )
        })}
      </div>

      {focusDebt && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--ink2)', letterSpacing: '.5px', marginBottom: 8 }}>DEBT PAYMENT THIS CHECK</div>
          <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: '12px 14px', marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div><div style={{ fontSize: 13, fontWeight: 800 }}>{focusDebt.name}</div><div style={{ fontSize: 11, color: 'var(--ink2)', marginTop: 2 }}>{money(focusDebt.balance, 2)} remaining · snowball</div></div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#9c3f74', fontFamily: 'var(--mono)' }}>{money(debtExtra || 75)}</div>
            </div>
            <button onClick={() => { const amt = prompt(`Log payment on ${focusDebt.name}`, debtExtra || 75); if (amt && +amt > 0) logDebtPayment(focusDebt, amt) }} style={{ width: '100%', padding: '10px', borderRadius: 12, background: 'linear-gradient(135deg,var(--pink-soft),var(--lav))', border: 'none', color: '#7a3f6a', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
              💳 Log this debt payment
            </button>
          </div>
        </div>
      )}

      <div style={{ background: 'linear-gradient(135deg,#eef6dd,#e8f3fb)', borderRadius: 14, padding: '12px 14px', marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#51691f' }}>Bills paid · {money(paidTotal, 2)} of {money(totalBills, 2)}</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#245b86', fontFamily: 'var(--mono)', textAlign: 'right' }}>{money(leftAfterBills, 2)}<div style={{ fontSize: 9, color: 'var(--ink2)', fontFamily: 'var(--sans)', fontWeight: 600 }}>left after bills</div></div>
        </div>
        <div style={{ height: 6, background: 'rgba(0,0,0,.08)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pctPaid}%`, background: 'linear-gradient(90deg,#5bbd8e,#7bafe0)', borderRadius: 3 }} />
        </div>
      </div>

      <div style={{ background: 'linear-gradient(135deg,#e7f2c7,#e0f2fe)', borderRadius: 14, padding: '12px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><div style={{ fontSize: 12, fontWeight: 800, color: '#3a5a1f' }}>🌱 Recommended savings</div><div style={{ fontSize: 10, color: '#6a8a50', marginTop: 2 }}>pay yourself first</div></div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#3b8f6a', fontFamily: 'var(--mono)' }}>{money(savingsRec)}</div>
        </div>
      </div>
    </div>
  )
}

function PlanMonth({ db, update, showToast }) {
  const [assignSheet, setAssignSheet] = useState(null)
  const m = curMonth()
  const thursdays = getMonthThursdays(m)
  const totalChecks = thursdays.length
  const monthChecks = [...db.checks].filter(c => c.date.slice(0,7) === m).sort((a,b) => a.date.localeCompare(b.date))
  const [yr, mo] = m.split('-').map(Number)

  const handleAssign = (bill, newSlot) => {
    update('bills', bill.id, { check_slot: newSlot, split_slots: null, split_amts: null })
    showToast(`${bill.name} → Check ${newSlot + 1}`)
    setAssignSheet(null)
  }

  const handleSplit = (bill, splits) => {
    update('bills', bill.id, {
      check_slot: splits[0].slot,
      split_slots: JSON.stringify(splits.map(s => s.slot)),
      split_amts: JSON.stringify(splits.map(s => s.amount)),
      split_amt: splits[0].amount
    })
    showToast(`${bill.name} split across ${splits.length} checks ✨`)
    setAssignSheet(null)
  }

  return (
    <div>
      <div style={{ background: 'var(--lav)', borderRadius: 14, padding: '10px 13px', marginBottom: 14, fontSize: 11, color: '#5a52a0', fontWeight: 600, lineHeight: 1.5 }}>
        💡 {totalChecks} checks this month. Tap any bill to move or split it.
      </div>
      {Array.from({ length: totalChecks }, (_, slot) => {
        const check = monthChecks[slot]
        const billsHere = getBillsForCheck(slot, totalChecks, db.bills)
        const total = billsHere.reduce((s, b) => s + (b.split_amt && b.split_amt > 0 ? b.split_amt : b.amount), 0)
        const dateStr = new Date(yr, mo-1, thursdays[slot]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        return (
          <div key={slot} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--pink)', letterSpacing: '.5px', marginBottom: 6 }}>
              CHECK {slot + 1} · {dateStr}{slot === totalChecks-1 && totalChecks === 5 ? ' · 🎁 bonus' : ''}{!check ? ' · not logged yet' : ''}
            </div>
            <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
              {billsHere.length === 0 && <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--ink2)' }}>No bills assigned here yet</div>}
              {billsHere.map((b, idx) => (
                <button key={b.id} onClick={() => setAssignSheet({ bill: b, currentSlot: slot })}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'none', border: 'none', borderBottom: idx < billsHere.length - 1 ? '1px solid var(--line)' : 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 7, background: b.autopay ? '#e0f2fe' : 'var(--lav)', color: b.autopay ? '#0878a0' : '#5a52a0', fontSize: 9, fontWeight: 800, display: 'grid', placeItems: 'center', flexShrink: 0 }}>{b.autopay ? 'A' : slot+1}</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{b.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--ink2)', marginTop: 1 }}>{b.autopay ? '🔄 auto · ' : ''}due {b.due_day}{b.due_day===1?'st':'th'}{b.split_slots ? ' · split' : ''}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--mono)' }}>{money(b.split_amt && b.split_amt > 0 ? b.split_amt : b.amount, 2)}</div>
                    <div style={{ fontSize: 12, color: '#9c3f74' }}>›</div>
                  </div>
                </button>
              ))}
              <div style={{ padding: '8px 14px', background: '#f8f4fb', display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700 }}>
                <span style={{ color: 'var(--ink2)' }}>{billsHere.length} bills</span>
                <span style={{ color: '#5a3f56', fontFamily: 'var(--mono)' }}>{money(total, 2)}</span>
              </div>
            </div>
          </div>
        )
      })}
      {assignSheet && <BillAssignSheet bill={assignSheet.bill} totalChecks={totalChecks} currentSlot={assignSheet.currentSlot} onAssign={handleAssign} onSplit={handleSplit} onClose={() => setAssignSheet(null)} />}
    </div>
  )
}

export default function Checks({ db, insert, update, remove, showToast }) {
  const [pill, setPill] = useState('week')
  const debtExtra = 75
  const sorted = [...db.checks].sort((a, b) => b.date.localeCompare(a.date))
  const last = sorted[0]
  const [form, setForm] = useState({
    date: todayISO(),
    gross: last ? String(last.gross) : '',
    tax: last ? String(last.tax) : '',
    ded: last ? String(last.ded) : '',
  })
  const net = (+form.gross||0) - (+form.tax||0) - (+form.ded||0)

  const saveCheck = () => {
    insert('checks', { date: form.date, gross: +form.gross||0, tax: +form.tax||0, ded: +form.ded||0, net })
    showToast('Check logged ✨')
    setPill('week')
  }

  const totG = db.checks.reduce((s,c)=>s+c.gross,0)
  const totN = db.checks.reduce((s,c)=>s+c.net,0)

  return (
    <div className="screen">
      <div className="pagetitle">Checks 📬</div>
      <p className="pagesub">Every paycheck, start to finish</p>
      <div className="pills">
        <button className={pill==='week'?'on':''} onClick={()=>setPill('week')}>This week</button>
        <button className={pill==='hist'?'on':''} onClick={()=>setPill('hist')}>History</button>
        <button className={pill==='plan'?'on':''} onClick={()=>setPill('plan')}>Plan month</button>
        <button className={pill==='log'?'on':''} onClick={()=>setPill('log')}>+ Log</button>
      </div>

      {pill === 'week' && (
        last ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>Check · {new Date(last.date+'T00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>
                <div style={{ fontSize: 11, color: 'var(--ink2)', marginTop: 2 }}>tap Plan month to assign bills</div>
              </div>
              <button onClick={() => setPill('log')} style={{ fontSize: 12, fontWeight: 800, color: '#5a52a0', background: 'var(--lav)', border: 'none', borderRadius: 20, padding: '6px 14px', cursor: 'pointer' }}>+ Log new</button>
            </div>
            <ThisWeek check={last} db={db} update={update} insert={insert} remove={remove} showToast={showToast} debtExtra={debtExtra} />
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink2)' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>📬</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>No checks logged yet</div>
            <button onClick={() => setPill('log')} style={{ marginTop: 16, padding: '12px 24px', borderRadius: 14, background: 'var(--pink)', color: '#fff', fontWeight: 800, fontSize: 14, border: 'none', cursor: 'pointer' }}>+ Log your first check</button>
          </div>
        )
      )}

      {pill === 'hist' && (
        <div>
          {sorted.map(c => (
            <button key={c.id} onClick={() => setPill('week')} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: '12px 14px', marginBottom: 8, cursor: 'pointer', textAlign: 'left' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800 }}>{new Date(c.date+'T00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div>
                <div style={{ fontSize: 11, color: 'var(--ink2)', marginTop: 2 }}>{money(c.gross,2)} gross</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#5a52a0', fontFamily: 'var(--mono)' }}>{money(c.net,2)}</div>
                <div style={{ fontSize: 10, color: 'var(--ink2)' }}>net</div>
              </div>
            </button>
          ))}
          <div style={{ background: 'linear-gradient(135deg,#eef6dd,#e8f3fb)', borderRadius: 14, padding: '12px 14px', marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 800 }}>
              <span>YTD total</span><span style={{ fontFamily: 'var(--mono)', color: '#245b86' }}>{money(totN,2)}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink2)', marginTop: 3 }}>{db.checks.length} checks · {money(totG,2)} gross</div>
          </div>
        </div>
      )}

      {pill === 'plan' && <PlanMonth db={db} update={update} showToast={showToast} />}

      {pill === 'log' && (
        <div>
          <div style={{ background: 'var(--lav)', borderRadius: 13, padding: '9px 12px', fontSize: 11, fontWeight: 700, color: '#5a52a0', marginBottom: 14 }}>✨ Pre-filled from last check — change what's different.</div>
          <div className="field"><label>Pay date</label><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} /></div>
          <div className="field"><label>Gross earned</label><input type="number" step="0.01" value={form.gross} onChange={e=>setForm({...form,gross:e.target.value})} /></div>
          <div style={{ display:'flex',gap:10 }}>
            <div className="field" style={{flex:1}}><label>Taxes</label><input type="number" step="0.01" value={form.tax} onChange={e=>setForm({...form,tax:e.target.value})} /></div>
            <div className="field" style={{flex:1}}><label>Deductions</label><input type="number" step="0.01" value={form.ded} onChange={e=>setForm({...form,ded:e.target.value})} /></div>
          </div>
          <div style={{ background:'var(--lav2)',borderRadius:13,padding:'11px 14px',display:'flex',justifyContent:'space-between',marginBottom:16 }}>
            <span style={{fontWeight:800,color:'#4a3f58'}}>Net take-home</span>
            <span style={{fontFamily:'var(--mono)',fontSize:17,fontWeight:800,color:'#6a4fa0'}}>{money(net,2)}</span>
          </div>
          <button onClick={saveCheck} style={{ width:'100%',padding:13,borderRadius:14,background:'var(--matcha)',color:'#4e6327',fontWeight:800,fontSize:14,border:'none',cursor:'pointer',marginBottom:8 }}>Save check ✨</button>
          <button onClick={()=>setPill('week')} style={{ width:'100%',padding:11,borderRadius:14,background:'#fff',border:'1.5px solid var(--line)',color:'var(--ink2)',fontWeight:700,fontSize:13,cursor:'pointer' }}>Cancel</button>
        </div>
      )}
    </div>
  )
}
