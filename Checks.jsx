import { useState, useMemo } from 'react'
import { money, curMonth, todayISO, MS } from './lib'

// Get the week boundaries for a given date
function weekOf(date) {
  const d = new Date(date + 'T00:00')
  const start = new Date(d); start.setDate(d.getDate() - d.getDay())
  const end = new Date(start); end.setDate(start.getDate() + 6)
  return { start: start.toISOString().slice(0,10), end: end.toISOString().slice(0,10) }
}

// Get bills that fall within a check's week (by due_day or autopay timing)
function getBillsForCheck(check, allBills, allChecks) {
  const m = check.date.slice(0, 7)
  const monthChecks = [...allChecks].filter(c => c.date.slice(0,7) === m).sort((a,b) => a.date.localeCompare(b.date))
  const checkIdx = monthChecks.findIndex(c => c.id === check.id)
  const totalChecks = monthChecks.length

  return allBills.filter(b => !b.archived).filter(b => {
    // For manual assignments stored on the bill
    if (b.check_slot !== undefined && b.check_slot !== null) return b.check_slot === checkIdx
    // Auto-assign by due date proximity
    if (!b.due_day) return false
    // Find which check slot this due date falls closest to
    const slotSize = 31 / totalChecks
    const slot = Math.min(totalChecks - 1, Math.floor((b.due_day - 1) / slotSize))
    return slot === checkIdx
  })
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
        <div style={{ fontSize: 12, color: 'var(--ink2)', marginBottom: 16 }}>{money(bill.amount, 2)} · {bill.autopay ? '🔄 autopay' : 'manual'}</div>

        {!split ? (
          <>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink2)', marginBottom: 8 }}>MOVE TO CHECK</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {Array.from({ length: totalChecks }, (_, i) => (
                <button key={i} onClick={() => onAssign(bill, i)} style={{ flex: 1, minWidth: 60, padding: '10px 6px', borderRadius: 12, fontWeight: 800, fontSize: 13, border: 'none', background: currentSlot === i ? 'var(--pink)' : 'var(--lav)', color: currentSlot === i ? '#fff' : '#5a52a0', cursor: 'pointer' }}>
                  Check {i + 1}
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
                <div style={{ fontSize: 10, color: 'var(--ink2)', marginBottom: 4 }}>Amount</div>
                <input value={String((bill.amount - (+amt1 || 0)).toFixed(2))} readOnly style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: '1.5px solid var(--line)', fontSize: 13, background: '#f8f4fb' }} />
              </div>
            </div>
            <button onClick={() => onSplit(bill, slot1, +amt1, slot2, bill.amount - (+amt1||0))} className="apply" style={{ marginBottom: 8 }}>Confirm split ✨</button>
            <button onClick={() => setSplit(false)} className="cancel">Back</button>
          </>
        )}
        <button className="cancel" onClick={onClose} style={{ marginTop: 8 }}>Cancel</button>
      </div>
    </div>
  )
}

function CheckDetail({ check, db, plan, allChecks, update, insert, showToast, onClose }) {
  const [assignSheet, setAssignSheet] = useState(null)
  const m = check.date.slice(0, 7)
  const monthChecks = [...allChecks].filter(c => c.date.slice(0,7) === m).sort((a,b) => a.date.localeCompare(b.date))
  const checkIdx = monthChecks.findIndex(c => c.id === check.id)
  const totalChecks = monthChecks.length
  const billsForCheck = getBillsForCheck(check, db.bills, allChecks)
  
  // Get spend entries linked to bills this check owns
  const linkedSpend = db.spend.filter(s => {
    const bill = billsForCheck.find(b => b.id === s.bill_id)
    return !!bill
  })
  
  const totalBills = billsForCheck.reduce((s, b) => {
    // Check if this bill is split
    if (b.split_amt !== undefined) return s + b.split_amt
    return s + b.amount
  }, 0)
  
  const paidBills = billsForCheck.filter(b => b.status === 'paid' || b.paid_amount > 0)
  const paidTotal = billsForCheck.reduce((s, b) => s + (b.status === 'paid' ? b.amount : b.paid_amount || 0), 0)
  const leftAfterBills = check.net - totalBills
  const savingsRec = Math.min(plan, leftAfterBills)
  const pctPaid = totalBills > 0 ? Math.round(paidTotal / totalBills * 100) : 0

  const handleAssign = (bill, newSlot) => {
    update('bills', bill.id, { check_slot: newSlot })
    showToast(`${bill.name} moved to Check ${newSlot + 1}`)
    setAssignSheet(null)
  }

  const handleSplit = (bill, slot1, amt1, slot2, amt2) => {
    update('bills', bill.id, { check_slot: slot1, split_slot2: slot2, split_amt: amt1, split_amt2: amt2 })
    showToast(`${bill.name} split across checks ${slot1+1} & ${slot2+1}`)
    setAssignSheet(null)
  }

  const markPaid = (bill) => {
    update('bills', bill.id, { status: 'paid', paid_amount: bill.amount })
    insert('spend', { place: bill.name, category: bill.grp || 'Housing', emoji: '🧾', color: '#a89be6', amount: bill.amount, date: todayISO(), bill_id: bill.id })
    showToast(`${bill.name} marked paid`)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(60,45,70,.45)', display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ position: 'fixed', bottom: 80, left: 0, right: 0, top: '5vh', background: 'var(--bg)', borderRadius: '20px 20px 0 0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px 16px 10px', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, background: '#dcd6e0', borderRadius: 2, margin: '0 auto 10px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>Check {checkIdx + 1} · {new Date(check.date + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
              <div style={{ fontSize: 11, color: 'var(--ink2)', marginTop: 2 }}>{paidBills.length}/{billsForCheck.length} bills paid · {pctPaid}% done</div>
            </div>
            <button onClick={onClose} style={{ fontSize: 12, fontWeight: 700, color: '#9c3f74', background: 'var(--pink-soft)', border: 'none', padding: '5px 12px', borderRadius: 20 }}>Done</button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 8px' }}>
          {/* Paycheck breakdown */}
          <div style={{ background: 'var(--lav2)', borderRadius: 14, padding: '12px 14px', marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', color: 'var(--ink2)' }}><span>Gross</span><span style={{ fontFamily: 'var(--mono)' }}>{money(check.gross, 2)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', color: '#c0483f' }}><span>Taxes</span><span style={{ fontFamily: 'var(--mono)' }}>−{money(check.tax, 2)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', color: '#c0483f' }}><span>Deductions</span><span style={{ fontFamily: 'var(--mono)' }}>−{money(check.ded, 2)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 800, padding: '6px 0 0', borderTop: '1px solid rgba(90,82,160,.15)', marginTop: 4, color: '#5a52a0' }}><span>Net take-home</span><span style={{ fontFamily: 'var(--mono)' }}>{money(check.net, 2)}</span></div>
          </div>

          {/* Bills for this check */}
          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--ink2)', letterSpacing: '.5px', marginBottom: 8 }}>BILLS THIS CHECK</div>
          <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
            {billsForCheck.length === 0 && <div style={{ padding: 14, fontSize: 12, color: 'var(--ink2)' }}>No bills assigned to this check</div>}
            {billsForCheck.map(b => {
              const isPaid = b.status === 'paid' || (b.paid_amount || 0) >= b.amount
              const isAuto = b.autopay
              const splitAmt = b.split_amt !== undefined ? b.split_amt : b.amount
              return (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${isPaid ? '#3b8f6a' : '#dcd6e0'}`, background: isPaid ? '#3b8f6a' : '#fff', display: 'grid', placeItems: 'center', fontSize: 10, color: '#fff', flexShrink: 0 }}>{isPaid ? '✓' : ''}</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{b.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--ink2)', display: 'flex', gap: 4, marginTop: 2 }}>
                        {isAuto && <span style={{ background: '#e0f2fe', color: '#0878a0', padding: '1px 5px', borderRadius: 6, fontWeight: 800 }}>auto</span>}
                        {b.split_amt !== undefined && <span style={{ background: '#fff3dc', color: '#9a6a1a', padding: '1px 5px', borderRadius: 6, fontWeight: 800 }}>split</span>}
                        <span>due {b.due_day}{b.due_day === 1 ? 'st' : 'th'}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--mono)', color: isPaid ? '#3b8f6a' : 'var(--ink)' }}>{money(splitAmt, 2)}</div>
                    {!isPaid && !isAuto && <button onClick={() => setAssignSheet(b)} style={{ fontSize: 10, fontWeight: 800, color: '#5a52a0', background: 'var(--lav)', border: 'none', borderRadius: 8, padding: '3px 8px', cursor: 'pointer' }}>move</button>}
                    {!isPaid && <button onClick={() => markPaid(b)} style={{ fontSize: 10, fontWeight: 800, color: '#3b8f6a', background: '#e1f5ee', border: 'none', borderRadius: 8, padding: '3px 8px', cursor: 'pointer' }}>pay</button>}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Running total */}
          <div style={{ background: 'linear-gradient(135deg,#eef6dd,#e8f3fb)', borderRadius: 14, padding: '12px 14px', marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#51691f' }}>Paid so far · {money(paidTotal, 2)} of {money(totalBills, 2)}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#245b86', fontFamily: 'var(--mono)' }}>{money(leftAfterBills, 2)}<div style={{ fontSize: 9, color: 'var(--ink2)', fontFamily: 'var(--sans)', fontWeight: 600, textAlign: 'right' }}>left after bills</div></div>
            </div>
            <div style={{ height: 6, background: 'rgba(0,0,0,.08)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pctPaid}%`, background: 'linear-gradient(90deg,#5bbd8e,#7bafe0)', borderRadius: 3 }} />
            </div>
          </div>

          {/* Savings rec */}
          <div style={{ background: 'linear-gradient(135deg,#e7f2c7,#e0f2fe)', borderRadius: 14, padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><div style={{ fontSize: 12, fontWeight: 800, color: '#3a5a1f' }}>🌱 Recommended savings</div><div style={{ fontSize: 10, color: '#6a8a50', marginTop: 2 }}>pay yourself first</div></div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#3b8f6a', fontFamily: 'var(--mono)' }}>{money(savingsRec)}</div>
            </div>
          </div>
        </div>

        {assignSheet && (
          <BillAssignSheet
            bill={assignSheet}
            totalChecks={totalChecks}
            currentSlot={checkIdx}
            onAssign={handleAssign}
            onSplit={handleSplit}
            onClose={() => setAssignSheet(null)}
          />
        )}
      </div>
    </div>
  )
}

function PlanMonth({ db, allChecks, update, showToast }) {
  const [assignSheet, setAssignSheet] = useState(null)
  const m = curMonth()
  const monthChecks = [...allChecks].filter(c => c.date.slice(0,7) === m).sort((a,b) => a.date.localeCompare(b.date))
  const totalChecks = monthChecks.length || 4
  const slots = Array.from({ length: totalChecks }, (_, i) => i)

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
        💡 Tap any bill to move it or split it across two checks. Auto bills are placed by due date automatically.
      </div>

      {slots.map(slot => {
        const check = monthChecks[slot]
        const billsHere = db.bills.filter(b => !b.archived).filter(b => {
          if (b.check_slot !== undefined && b.check_slot !== null) return b.check_slot === slot
          const slotSize = 31 / totalChecks
          return b.due_day && Math.min(totalChecks-1, Math.floor((b.due_day-1)/slotSize)) === slot
        })
        const total = billsHere.reduce((s, b) => s + (b.split_amt !== undefined ? b.split_amt : b.amount), 0)

        return (
          <div key={slot} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--pink)', letterSpacing: '.5px', marginBottom: 6 }}>
              CHECK {slot + 1}{check ? ` · ${new Date(check.date + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ' · not logged yet'}{slot === totalChecks - 1 && totalChecks === 5 ? ' · 🎁 bonus check' : ''}
            </div>
            <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
              {billsHere.length === 0 && (
                <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--ink2)' }}>No bills assigned here</div>
              )}
              {billsHere.map(b => (
                <button key={b.id} onClick={() => setAssignSheet({ bill: b, currentSlot: slot })} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--line)', background: 'none', border: 'none', borderBottom: '1px solid var(--line)', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 7, background: b.autopay ? '#e0f2fe' : 'var(--lav)', color: b.autopay ? '#0878a0' : '#5a52a0', fontSize: 9, fontWeight: 800, display: 'grid', placeItems: 'center', flexShrink: 0 }}>{b.autopay ? 'A' : slot+1}</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{b.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--ink2)', marginTop: 1 }}>
                        {b.autopay ? '🔄 autopay · ' : ''}due {b.due_day}{b.due_day===1?'st':'th'}
                        {b.split_amt !== undefined ? ' · split' : ''}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--mono)' }}>{money(b.split_amt !== undefined ? b.split_amt : b.amount, 2)}</div>
                    <div style={{ fontSize: 10, color: '#9c3f74' }}>›</div>
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

export default function Checks({ db, insert, update, showToast }) {
  const [pill, setPill] = useState('week')
  const [selectedCheck, setSelectedCheck] = useState(null)
  const plan = db.profile?.pay_yourself_target || 125
  const sorted = [...db.checks].sort((a, b) => b.date.localeCompare(a.date))
  const last = sorted[0]
  const [form, setForm] = useState({
    date: todayISO(),
    gross: last ? String(last.gross) : '',
    tax: last ? String(last.tax) : '',
    ded: last ? String(last.ded) : '',
  })
  const net = (+form.gross || 0) - (+form.tax || 0) - (+form.ded || 0)

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

      {/* THIS WEEK */}
      {pill === 'week' && (
        last ? (
          <div>
            <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden', marginBottom: 12 }}>
              <div style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>Check · {new Date(last.date+'T00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink2)', marginTop: 2 }}>{money(last.net, 2)} net take-home</div>
                </div>
                <button onClick={() => setSelectedCheck(last)} style={{ fontSize: 12, fontWeight: 800, color: '#5a52a0', background: 'var(--lav)', border: 'none', borderRadius: 20, padding: '6px 14px', cursor: 'pointer' }}>View detail →</button>
              </div>
              <div style={{ padding: '12px 14px', background: 'var(--lav2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0', color: 'var(--ink2)' }}><span>Gross</span><span style={{fontFamily:'var(--mono)'}}>{money(last.gross,2)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0', color: '#c0483f' }}><span>Taxes + deductions</span><span style={{fontFamily:'var(--mono)'}}>−{money(last.tax+last.ded,2)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 800, padding: '6px 0 0', borderTop: '1px solid rgba(90,82,160,.15)', marginTop: 4, color: '#5a52a0' }}><span>Net take-home</span><span style={{fontFamily:'var(--mono)'}}>{money(last.net,2)}</span></div>
              </div>
            </div>
            <button onClick={() => setPill('plan')} style={{ width: '100%', padding: 13, borderRadius: 14, background: 'var(--pink-soft)', border: '1.5px solid var(--pink)', color: '#9c3f74', fontWeight: 800, fontSize: 13, cursor: 'pointer', marginBottom: 10 }}>
              📋 View / edit monthly plan →
            </button>
            <button onClick={() => setPill('log')} style={{ width: '100%', padding: 13, borderRadius: 14, background: 'var(--matcha)', border: 'none', color: '#4e6327', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
              + Log new check
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink2)' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>📬</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>No checks logged yet</div>
            <button onClick={() => setPill('log')} className="apply" style={{ marginTop: 16 }}>+ Log your first check</button>
          </div>
        )
      )}

      {/* HISTORY */}
      {pill === 'hist' && (
        <div>
          {sorted.map(c => {
            const billsHere = getBillsForCheck(c, db.bills, db.checks)
            const paidCount = billsHere.filter(b => b.status === 'paid').length
            return (
              <button key={c.id} onClick={() => setSelectedCheck(c)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: '12px 14px', marginBottom: 8, cursor: 'pointer', textAlign: 'left' }}>
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
          <div style={{ background: 'var(--lav)', borderRadius: 13, padding: '9px 12px', fontSize: 11, fontWeight: 700, color: '#5a52a0', marginBottom: 14 }}>✨ Pre-filled from your last check — just change what's different.</div>
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
          <button className="apply" onClick={saveCheck}>Save check ✨</button>
          <button className="cancel" onClick={()=>setPill('week')} style={{marginTop:8}}>Cancel</button>
        </div>
      )}

      {/* Check detail overlay */}
      {selectedCheck && (
        <CheckDetail
          check={selectedCheck}
          db={db}
          plan={plan}
          allChecks={db.checks}
          update={update}
          insert={insert}
          showToast={showToast}
          onClose={() => setSelectedCheck(null)}
        />
      )}
    </div>
  )
}
