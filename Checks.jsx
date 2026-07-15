import { useState, useMemo } from 'react'
import { money, curMonth, todayISO, MS } from './lib'

function getBillsForCheck(check, allBills, allChecks) {
  const m = check.date.slice(0, 7)
  const monthChecks = [...allChecks].filter(c => c.date.slice(0,7) === m).sort((a,b) => a.date.localeCompare(b.date))
  const checkIdx = monthChecks.findIndex(c => c.id === check.id)
  const totalChecks = monthChecks.length || 4
  return allBills.filter(b => !b.archived).filter(b => {
    if (b.check_slot !== undefined && b.check_slot !== null) return b.check_slot === checkIdx
    if (!b.due_day) return false
    const slotSize = 31 / totalChecks
    const slot = Math.min(totalChecks - 1, Math.floor((b.due_day - 1) / slotSize))
    return slot === checkIdx
  })
}

function getMonthThursdays(m) {
  const [yr, mo] = m.split('-').map(Number)
  const days = new Date(yr, mo, 0).getDate()
  const thursdays = []
  for (let d = 1; d <= days; d++) {
    if (new Date(yr, mo-1, d).getDay() === 4) thursdays.push(d)
  }
  return thursdays
}

function ThisWeek({ check, db, update, insert, showToast, debtExtra }) {
  const [assignSheet, setAssignSheet] = useState(null)
  const allChecks = db.checks
  const m = check.date.slice(0, 7)
  const monthChecks = [...allChecks].filter(c => c.date.slice(0,7) === m).sort((a,b) => a.date.localeCompare(b.date))
  const checkIdx = monthChecks.findIndex(c => c.id === check.id)
  const billsForCheck = getBillsForCheck(check, db.bills, allChecks)
  const totalBills = billsForCheck.reduce((s, b) => s + (b.split_amt !== undefined ? b.split_amt : b.amount), 0)
  const paidTotal = billsForCheck.reduce((s, b) => s + (b.status === 'paid' ? (b.split_amt || b.amount) : b.paid_amount || 0), 0)
  const paidCount = billsForCheck.filter(b => b.status === 'paid' || (b.paid_amount||0) >= b.amount).length
  const pctPaid = totalBills > 0 ? Math.round(paidTotal / totalBills * 100) : 0
  const leftAfterBills = check.net - totalBills
  const savingsRec = Math.max(0, Math.min(125, leftAfterBills - (debtExtra || 0)))
  const leftFinal = leftAfterBills - (debtExtra || 0) - savingsRec

  // Debt assigned to this check (focus debt from snowball)
  const debts = [...db.debts].filter(d => d.balance > 0).sort((a,b) => a.balance - b.balance)
  const focusDebt = debts[0]

  const markPaid = (bill) => {
    update('bills', bill.id, { status: 'paid', paid_amount: bill.amount })
    insert('spend', { place: bill.name, category: bill.grp || 'Housing', emoji: '🧾', color: '#a89be6', amount: bill.amount, date: todayISO(), bill_id: bill.id })
    showToast(`${bill.name} marked paid ✨`)
  }

  const logDebtPayment = (debt, amt) => {
    const newBal = Math.max(0, debt.balance - (+amt || 0))
    update('debts', debt.id, { balance: newBal })
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

      {/* Bills */}
      <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--ink2)', letterSpacing: '.5px', marginBottom: 8 }}>BILLS THIS CHECK · {paidCount}/{billsForCheck.length} paid</div>
      <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
        {billsForCheck.length === 0 && <div style={{ padding: 14, fontSize: 12, color: 'var(--ink2)' }}>No bills assigned — go to Plan month to assign</div>}
        {billsForCheck.map(b => {
          const isPaid = b.status === 'paid' || (b.paid_amount||0) >= b.amount
          const splitAmt = b.split_amt !== undefined ? b.split_amt : b.amount
          return (
            <div key={b.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${isPaid ? '#3b8f6a' : '#dcd6e0'}`, background: isPaid ? '#3b8f6a' : '#fff', display: 'grid', placeItems: 'center', fontSize: 10, color: '#fff', flexShrink: 0 }}>{isPaid ? '✓' : ''}</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{b.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--ink2)', display: 'flex', gap: 4, marginTop: 2, flexWrap: 'wrap' }}>
                    {b.autopay && <span style={{ background: '#e0f2fe', color: '#0878a0', padding: '1px 5px', borderRadius: 6, fontWeight: 800 }}>auto</span>}
                    <span>due {b.due_day}{b.due_day===1?'st':b.due_day===2?'nd':b.due_day===3?'rd':'th'}</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--mono)', color: isPaid ? '#3b8f6a' : 'var(--ink)' }}>{money(splitAmt, 2)}</div>
                {!isPaid && <button onClick={() => markPaid(b)} style={{ fontSize: 10, fontWeight: 800, color: '#3b8f6a', background: '#e1f5ee', border: 'none', borderRadius: 8, padding: '4px 10px', cursor: 'pointer' }}>pay</button>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Debt payment this check */}
      {focusDebt && (
        <>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--ink2)', letterSpacing: '.5px', marginBottom: 8 }}>DEBT PAYMENT THIS CHECK</div>
          <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: '12px 14px', marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800 }}>{focusDebt.name}</div>
                <div style={{ fontSize: 11, color: 'var(--ink2)', marginTop: 2 }}>{money(focusDebt.balance, 2)} remaining · snowball focus</div>
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#9c3f74', fontFamily: 'var(--mono)' }}>{money(debtExtra || 75)}</div>
            </div>
            <button onClick={() => {
              const amt = prompt(`Log payment on ${focusDebt.name}`, debtExtra || 75)
              if (amt && +amt > 0) logDebtPayment(focusDebt, amt)
            }} style={{ width: '100%', padding: '10px', borderRadius: 12, background: 'linear-gradient(135deg,var(--pink-soft),var(--lav))', border: 'none', color: '#7a3f6a', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
              💳 Log this debt payment
            </button>
          </div>
        </>
      )}

      {/* Running total */}
      <div style={{ background: 'linear-gradient(135deg,#eef6dd,#e8f3fb)', borderRadius: 14, padding: '12px 14px', marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#51691f' }}>Bills paid so far · {money(paidTotal, 2)} of {money(totalBills, 2)}</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#245b86', fontFamily: 'var(--mono)', textAlign: 'right' }}>{money(leftAfterBills, 2)}<div style={{ fontSize: 9, color: 'var(--ink2)', fontFamily: 'var(--sans)', fontWeight: 600 }}>left after bills</div></div>
        </div>
        <div style={{ height: 6, background: 'rgba(0,0,0,.08)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pctPaid}%`, background: 'linear-gradient(90deg,#5bbd8e,#7bafe0)', borderRadius: 3 }} />
        </div>
      </div>

      {/* Savings */}
      <div style={{ background: 'linear-gradient(135deg,#e7f2c7,#e0f2fe)', borderRadius: 14, padding: '12px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><div style={{ fontSize: 12, fontWeight: 800, color: '#3a5a1f' }}>🌱 Recommended savings</div><div style={{ fontSize: 10, color: '#6a8a50', marginTop: 2 }}>pay yourself first</div></div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#3b8f6a', fontFamily: 'var(--mono)' }}>{money(savingsRec)}</div>
        </div>
      </div>
    </div>
  )
}

function PlanMonth({ db, allChecks, update, showToast }) {
  const [assignSheet, setAssignSheet] = useState(null)
  const m = curMonth()
  const thursdays = getMonthThursdays(m)
  const totalChecks = thursdays.length
  const monthChecks = [...allChecks].filter(c => c.date.slice(0,7) === m).sort((a,b) => a.date.localeCompare(b.date))

  const handleAssign = (bill, newSlot) => {
    update('bills', bill.id, { check_slot: newSlot })
    showToast(`${bill.name} → Check ${newSlot + 1}`)
    setAssignSheet(null)
  }

  const handleSplit = (bill, slot1, amt1, slot2, amt2) => {
    update('bills', bill.id, { check_slot: slot1, split_slot2: slot2, split_amt: amt1, split_amt2: amt2 })
    showToast(`${bill.name} split ✨`)
    setAssignSheet(null)
  }

  return (
    <div>
      <div style={{ background: 'var(--lav)', borderRadius: 14, padding: '10px 13px', marginBottom: 14, fontSize: 11, color: '#5a52a0', fontWeight: 600, lineHeight: 1.5 }}>
        💡 {totalChecks} checks this month. Tap any bill to move or split it. Auto bills placed by due date.
      </div>
      {Array.from({ length: totalChecks }, (_, slot) => {
        const check = monthChecks[slot]
        const billsHere = db.bills.filter(b => !b.archived).filter(b => {
          if (b.check_slot !== undefined && b.check_slot !== null) return b.check_slot === slot
          const slotSize = 31 / totalChecks
          return b.due_day && Math.min(totalChecks-1, Math.floor((b.due_day-1)/slotSize)) === slot
        })
        const total = billsHere.reduce((s, b) => s + (b.split_amt !== undefined ? b.split_amt : b.amount), 0)
        const thursdayDate = thursdays[slot]
        const [yr, mo] = m.split('-').map(Number)
        const dateStr = `${new Date(yr, mo-1, thursdayDate).toLocaleDateString('en-US',{month:'short',day:'numeric'})}`

        return (
          <div key={slot} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--pink)', letterSpacing: '.5px', marginBottom: 6 }}>
              CHECK {slot + 1} · {dateStr}{slot === totalChecks-1 && totalChecks === 5 ? ' · 🎁 bonus' : ''}{check ? '' : ' · not logged yet'}
            </div>
            <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
              {billsHere.length === 0 && <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--ink2)' }}>No bills assigned here yet</div>}
              {billsHere.map(b => (
                <button key={b.id} onClick={() => setAssignSheet({ bill: b, currentSlot: slot })} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--line)', background: 'none', border: 'none', borderBottom: '1px solid var(--line)', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 7, background: b.autopay ? '#e0f2fe' : 'var(--lav)', color: b.autopay ? '#0878a0' : '#5a52a0', fontSize: 9, fontWeight: 800, display: 'grid', placeItems: 'center', flexShrink: 0 }}>{b.autopay ? 'A' : slot+1}</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{b.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--ink2)', marginTop: 1 }}>{b.autopay ? '🔄 auto · ' : ''}due {b.due_day}{b.due_day===1?'st':'th'}{b.split_amt !== undefined ? ' · split' : ''}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--mono)' }}>{money(b.split_amt !== undefined ? b.split_amt : b.amount, 2)}</div>
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

      {assignSheet && (
        <BillAssignSheet
          bill={assignSheet.bill}
          totalChecks={totalChecks}
          currentSlot={assignSheet.currentSlot}
          onAssign={handleAssign}
          onSplit={handleSplit}
          onClose={() => setAssignSheet(null)}
        />
      )}
    </div>
  )
}

function BillAssignSheet({ bill, totalChecks, currentSlot, onAssign, onSplit, onClose }) {
  const [split, setSplit] = useState(false)
  const [amt1, setAmt1] = useState(String(Math.round(bill.amount / 2)))
  const [slot1, setSlot1] = useState(currentSlot)
  const [slot2, setSlot2] = useState(Math.min(currentSlot + 1, totalChecks - 1))

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(60,45,70,.45)', display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: 'var(--bg)', borderRadius: '20px 20px 0 0', padding: '14px 16px 32px' }}>
        <div style={{ width: 36, height: 4, background: '#dcd6e0', borderRadius: 2, margin: '0 auto 12px' }} />
        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>{bill.name}</div>
        <div style={{ fontSize: 12, color: 'var(--ink2)', marginBottom: 16 }}>{money(bill.amount, 2)}{bill.autopay ? ' · 🔄 autopay' : ''}</div>
        {!split ? (
          <>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink2)', marginBottom: 8 }}>MOVE TO CHECK</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {Array.from({ length: totalChecks }, (_, i) => (
                <button key={i} onClick={() => onAssign(bill, i)} style={{ flex: 1, minWidth: 55, padding: '10px 6px', borderRadius: 12, fontWeight: 800, fontSize: 13, border: 'none', background: currentSlot === i ? 'var(--pink)' : 'var(--lav)', color: currentSlot === i ? '#fff' : '#5a52a0', cursor: 'pointer' }}>
                  {i + 1}
                </button>
              ))}
            </div>
            <button onClick={() => setSplit(true)} style={{ width: '100%', padding: 12, borderRadius: 14, background: '#fff6ea', border: '1.5px solid #f5e2c4', color: '#9a6a1a', fontWeight: 800, fontSize: 13, cursor: 'pointer', marginBottom: 8 }}>
              ✂️ Split across two checks
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink2)', marginBottom: 10 }}>SPLIT BETWEEN TWO CHECKS</div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: 'var(--ink2)', marginBottom: 4 }}>Check</div>
                <select value={slot1} onChange={e => setSlot1(+e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: '1.5px solid var(--line)', fontSize: 13 }}>
                  {Array.from({ length: totalChecks }, (_, i) => <option key={i} value={i}>Check {i+1}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: 'var(--ink2)', marginBottom: 4 }}>Amount</div>
                <input value={amt1} onChange={e => setAmt1(e.target.value)} inputMode="decimal" style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: '1.5px solid var(--line)', fontSize: 13 }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: 'var(--ink2)', marginBottom: 4 }}>Check</div>
                <select value={slot2} onChange={e => setSlot2(+e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: '1.5px solid var(--line)', fontSize: 13 }}>
                  {Array.from({ length: totalChecks }, (_, i) => <option key={i} value={i}>Check {i+1}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: 'var(--ink2)', marginBottom: 4 }}>Remainder</div>
                <input value={String(Math.max(0, bill.amount - (+amt1||0)).toFixed(2))} readOnly style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: '1.5px solid var(--line)', fontSize: 13, background: '#f8f4fb' }} />
              </div>
            </div>
            <button onClick={() => onSplit(bill, slot1, +amt1, slot2, bill.amount-(+amt1||0))} className="apply" style={{ width: '100%', padding: 12, borderRadius: 14, background: 'var(--matcha)', color: '#4e6327', fontWeight: 800, fontSize: 13, border: 'none', marginBottom: 8 }}>Confirm split ✨</button>
            <button onClick={() => setSplit(false)} style={{ width: '100%', padding: 11, borderRadius: 14, background: '#fff', border: '1.5px solid var(--line)', color: 'var(--ink2)', fontWeight: 700, fontSize: 13 }}>Back</button>
          </>
        )}
        <button onClick={onClose} style={{ width: '100%', padding: 11, borderRadius: 14, background: '#fff', border: '1.5px solid var(--line)', color: 'var(--ink2)', fontWeight: 700, fontSize: 13, marginTop: 8 }}>Cancel</button>
      </div>
    </div>
  )
}

export default function Checks({ db, insert, update, showToast }) {
  const [pill, setPill] = useState('week')
  const [debtExtra, setDebtExtra] = useState(75)
  const [editingExtra, setEditingExtra] = useState(false)
  const plan = db.profile?.pay_yourself_target || 125
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
    showToast('Check logged ✨'); setPill('week')
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

      {/* THIS WEEK — default, no drawer */}
      {pill === 'week' && (
        last ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>Check · {new Date(last.date+'T00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>
                <div style={{ fontSize: 11, color: 'var(--ink2)', marginTop: 2 }}>{getBillsForCheck(last, db.bills, db.checks).filter(b => b.status==='paid').length}/{getBillsForCheck(last, db.bills, db.checks).length} bills paid</div>
              </div>
              <button onClick={() => setPill('log')} style={{ fontSize: 12, fontWeight: 800, color: '#5a52a0', background: 'var(--lav)', border: 'none', borderRadius: 20, padding: '6px 14px', cursor: 'pointer' }}>+ Log new</button>
            </div>
            <ThisWeek check={last} db={db} update={update} insert={insert} showToast={showToast} debtExtra={debtExtra} />
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink2)' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>📬</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>No checks logged yet</div>
            <button onClick={() => setPill('log')} style={{ marginTop: 16, padding: '12px 24px', borderRadius: 14, background: 'var(--pink)', color: '#fff', fontWeight: 800, fontSize: 14, border: 'none', cursor: 'pointer' }}>+ Log your first check</button>
          </div>
        )
      )}

      {/* HISTORY */}
      {pill === 'hist' && (
        <div>
          {sorted.map(c => {
            const billsHere = getBillsForCheck(c, db.bills, db.checks)
            const paidCount = billsHere.filter(b => b.status==='paid').length
            return (
              <button key={c.id} onClick={() => { setForm({ date: c.date, gross: String(c.gross), tax: String(c.tax), ded: String(c.ded) }); setPill('week') }} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: '12px 14px', marginBottom: 8, cursor: 'pointer', textAlign: 'left' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800 }}>{new Date(c.date+'T00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink2)', marginTop: 2 }}>{paidCount}/{billsHere.length} bills paid · {money(c.gross,2)} gross</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#5a52a0', fontFamily: 'var(--mono)' }}>{money(c.net,2)}</div>
                  <div style={{ fontSize: 10, color: 'var(--ink2)' }}>net</div>
                </div>
              </button>
            )
          })}
          <div style={{ background: 'linear-gradient(135deg,#eef6dd,#e8f3fb)', borderRadius: 14, padding: '12px 14px', marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 800 }}>
              <span>YTD total</span><span style={{ fontFamily: 'var(--mono)', color: '#245b86' }}>{money(totN,2)}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink2)', marginTop: 3 }}>{db.checks.length} checks · {money(totG,2)} gross</div>
          </div>
        </div>
      )}

      {/* PLAN MONTH */}
      {pill === 'plan' && <PlanMonth db={db} allChecks={db.checks} update={update} showToast={showToast} />}

      {/* LOG */}
      {pill === 'log' && (
        <div>
          <div style={{ background: 'var(--lav)', borderRadius: 13, padding: '9px 12px', fontSize: 11, fontWeight: 700, color: '#5a52a0', marginBottom: 14 }}>✨ Pre-filled from your last check — change what's different.</div>
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
