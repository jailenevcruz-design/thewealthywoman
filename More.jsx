import { useState } from 'react'
import { money, monthLabel, MS, TEACHINGS, teachCtx } from './lib'

const START_DEBT = 39300

function Debts({ db, update, insert, showToast }) {
  const [strat, setStrat] = useState('avalanche')
  const [myOrder, setMyOrder] = useState(null)
  const [paySheet, setPaySheet] = useState(null)
  const [payIsCharge, setPayIsCharge] = useState(false)

  const debts = db.debts.filter(d => d.balance > 0)
  const total = debts.reduce((s, d) => s + d.balance, 0)
  const pct = Math.max(0, Math.round(((START_DEBT - total) / START_DEBT) * 100))

  const sorted = strat === 'myorder' && myOrder
    ? myOrder.map(id => debts.find(d => d.id === id)).filter(Boolean)
    : [...debts].sort((a, b) => strat === 'avalanche' ? (b.apr || 0) - (a.apr || 0) : a.balance - b.balance)

  // payoff breakdown math
  const extra = 200
  const breakdown = sorted.map((d, i) => {
    const mo = d.apr ? Math.ceil(d.balance / (extra + d.min_payment)) : Math.ceil(d.balance / d.min_payment)
    return { ...d, months: mo, wks: mo * 4 }
  })

  const doLog = (d, amt, isCharge) => {
    const delta = isCharge ? Math.abs(+amt) : -Math.abs(+amt)
    update('debts', d.id, { balance: Math.max(0, d.balance + delta) })
    insert('debt_payments', { debt_id: d.id, amount: delta, date: new Date().toISOString().slice(0, 10) })
    showToast(`${isCharge ? 'Charge' : 'Payment'} logged on ${d.name}`)
    setPaySheet(null)
  }

  return (
    <div>
      <div className="feat" style={{ marginTop: 0 }}>
        <div className="ring" style={{ background: `conic-gradient(#c48fd0 ${pct}%, #fff 0)` }}>
          <b style={{ color: '#8a5fa0' }}>{pct}%<small>paid off</small></b>
        </div>
        <div>
          <div className="goalname">{money(total)} to go</div>
          <div className="goalsub">was {money(START_DEBT)}</div>
          <div className="goaleta" style={{ color: '#b07bb0' }}>🕊️ lighter every month</div>
        </div>
      </div>

      <div className="stratseg" style={{ marginTop: 14 }}>
        <button className={strat === 'avalanche' ? 'on' : ''} onClick={() => setStrat('avalanche')}>🔥 Avalanche</button>
        <button className={strat === 'snowball' ? 'on' : ''} onClick={() => setStrat('snowball')}>❄️ Snowball</button>
        <button className={strat === 'myorder' ? 'on' : ''} onClick={() => { setStrat('myorder'); if (!myOrder) setMyOrder(debts.map(d => d.id)) }}>✋ My order</button>
      </div>

      <div className="stratbox">
        {strat === 'avalanche' && <>💡 <b>Avalanche</b> saves the most on interest. Pay <b>{sorted[0]?.name}</b> first — highest rate at <b>{sorted[0]?.apr}%</b>.</>}
        {strat === 'snowball' && <>💡 <b>Snowball</b> = fast wins. Pay <b>{sorted[0]?.name}</b> first — smallest balance at <b>{money(sorted[0]?.balance)}</b>.</>}
        {strat === 'myorder' && <>✋ <b>Your order</b> — tap ↑↓ to rearrange.</>}
      </div>

      <div className="card">
        {sorted.map((d, i) => (
          <div className={'drow' + (i === 0 ? ' focus' : '')} key={d.id}>
            <div className="blft">
              {strat === 'myorder' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginRight: 6 }}>
                  <button style={{ fontSize: 10, background: 'none', border: 'none', color: 'var(--ink2)' }} onClick={() => {
                    const o = [...myOrder]; const idx = o.indexOf(d.id); if (idx > 0) { [o[idx-1],o[idx]]=[o[idx],o[idx-1]]; setMyOrder(o) }
                  }}>↑</button>
                  <button style={{ fontSize: 10, background: 'none', border: 'none', color: 'var(--ink2)' }} onClick={() => {
                    const o = [...myOrder]; const idx = o.indexOf(d.id); if (idx < o.length-1) { [o[idx],o[idx+1]]=[o[idx+1],o[idx]]; setMyOrder(o) }
                  }}>↓</button>
                </div>
              )}
              <span className="rank">{i + 1}</span>
              <div>
                <div className="nm">{d.name}</div>
                <div className="mt">{d.apr != null ? <span className="apr">{d.apr}% APR</span> : 'no APR'} · min {money(d.min_payment)}</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="amt">{money(d.balance, 2)}</div>
              {i === 0 && <span className="tag" style={{ background: 'var(--pink-soft)', color: '#9c3f74' }}>pay first</span>}
              <button className="tag" style={{ background: 'var(--lav)', color: '#5a52a0', display: 'block', marginTop: 3 }} onClick={() => { setPaySheet(d); setPayIsCharge(false) }}>Pay</button>
            </div>
          </div>
        ))}
        <div className="rowtotal"><span>Total</span><span className="amt">{money(total, 2)}</span></div>
      </div>

      {/* Payoff breakdown */}
      <div style={{ background: 'linear-gradient(135deg,#eef6dd,#e8f3fb)', borderRadius: 16, padding: 15, marginTop: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.5px', color: '#51691f', marginBottom: 10 }}>📅 Payoff plan (+{money(extra)}/mo extra)</div>
        {breakdown.map((d, i) => (
          <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, padding: '6px 0', borderBottom: i < breakdown.length - 1 ? '1px solid rgba(0,0,0,.06)' : 'none' }}>
            <span>#{i+1} {d.name}</span>
            <span style={{ color: '#245b86', fontFamily: 'var(--mono)' }}>~{d.months}mo / {d.wks}wks</span>
          </div>
        ))}
        <div style={{ fontSize: 10, color: '#6a8a50', marginTop: 8 }}>Estimates based on {money(extra)}/mo extra above minimums</div>
      </div>

      <div className="dactions">
        <button className="abtn pay" onClick={() => { setPaySheet(sorted[0]); setPayIsCharge(false) }}>− Log a payment</button>
        <button className="abtn wd" onClick={() => { setPaySheet(sorted[0]); setPayIsCharge(true) }}>+ Withdraw / charge</button>
      </div>

      {paySheet && (
        <div className="overlay" onClick={() => setPaySheet(null)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <h3>{payIsCharge ? '+ Charge / withdraw' : '− Log a payment'}</h3>
            <p className="shint">{paySheet.name} · current balance {money(paySheet.balance, 2)}</p>
            <div style={{ display: 'flex', background: '#efe7f2', borderRadius: 12, padding: 4, marginBottom: 14 }}>
              <button onClick={() => setPayIsCharge(false)} style={{ flex: 1, padding: 9, borderRadius: 9, fontWeight: 800, fontSize: 12, background: !payIsCharge ? '#fff' : 'none', color: !payIsCharge ? '#3b8f6a' : 'var(--ink2)', border: 'none' }}>− Payment</button>
              <button onClick={() => setPayIsCharge(true)} style={{ flex: 1, padding: 9, borderRadius: 9, fontWeight: 800, fontSize: 12, background: payIsCharge ? '#fff' : 'none', color: payIsCharge ? '#c0483f' : 'var(--ink2)', border: 'none' }}>+ Charge</button>
            </div>
            <div className="field"><label>Which debt</label>
              <select value={paySheet.id} onChange={e => setPaySheet(debts.find(d => d.id === e.target.value))} style={{ width: '100%', padding: '11px 13px', borderRadius: 12, border: '1.5px solid var(--line)', fontSize: 14 }}>
                {debts.map(d => <option key={d.id} value={d.id}>{d.name} — {money(d.balance)}</option>)}
              </select>
            </div>
            <DebtPayForm debt={paySheet} isCharge={payIsCharge} onSave={doLog} onClose={() => setPaySheet(null)} />
          </div>
        </div>
      )}
    </div>
  )
}

function DebtPayForm({ debt, isCharge, onSave, onClose }) {
  const [amt, setAmt] = useState('')
  const [note, setNote] = useState('')
  const preview = +amt > 0 ? (isCharge ? debt.balance + +amt : Math.max(0, debt.balance - +amt)) : null
  return (
    <div>
      <div className="amountf" style={{ background: isCharge ? 'linear-gradient(135deg,#fdeaea,#faf0e2)' : 'linear-gradient(135deg,#eef6dd,#e8f3fb)' }}>
        <input value={amt} onChange={e => setAmt(e.target.value)} placeholder="$0.00" inputMode="decimal" style={{ color: isCharge ? '#c0483f' : '#51691f' }} />
      </div>
      {preview !== null && <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--ink2)', marginBottom: 10 }}>New balance → <b>{money(preview, 2)}</b></div>}
      <div className="field"><label>Note (optional)</label><input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. extra payment 💪" /></div>
      <button className="apply" style={{ background: isCharge ? '#e88f8f' : 'var(--matcha)', color: isCharge ? '#fff' : '#4e6327' }} onClick={() => { if (+amt > 0) onSave(debt, amt, isCharge) }}>
        {isCharge ? 'Log charge' : 'Apply payment ✨'}
      </button>
      <button className="cancel" onClick={onClose}>Cancel</button>
    </div>
  )
}

function Income({ db }) {
  const byMonth = {}
  db.checks.forEach(c => {
    const m = c.date.slice(0, 7)
    byMonth[m] = byMonth[m] || { gross: 0, net: 0, tax: 0, ded: 0, n: 0 }
    byMonth[m].gross += c.gross; byMonth[m].net += c.net; byMonth[m].tax += c.tax; byMonth[m].ded += c.ded; byMonth[m].n++
  })
  const months = Object.keys(byMonth).sort()
  const iGross = db.checks.reduce((s, c) => s + c.gross, 0)
  const iYtd = db.checks.reduce((s, c) => s + c.net, 0)
  const nMonths = months.length || 1
  const avgMo = iYtd / nMonths
  const avgCheck = db.checks.length ? iYtd / db.checks.length : 0
  const keepRate = iGross ? Math.round(iYtd / iGross * 100) : 0
  const nets = months.map(m => byMonth[m].net)
  const maxNet = Math.max(...nets, 1)
  const hi = months.reduce((a, m) => byMonth[m].net > byMonth[a].net ? m : a, months[0])
  const lo = months.reduce((a, m) => byMonth[m].net < byMonth[a].net ? m : a, months[0])
  const projected = Math.round(avgMo * 12)

  return (
    <div>
      <div className="grid2" style={{ marginBottom: 12 }}>
        <div className="tile t-sage"><div className="big">{money(iYtd)}</div><div className="cap">take-home YTD 💵</div></div>
        <div className="tile t-lav"><div className="big">{money(iGross)}</div><div className="cap">gross earned</div></div>
      </div>
      <div className="sec">Averages</div>
      <div className="grid3" style={{ marginBottom: 12 }}>
        <div className="tile t-sky" style={{ padding: 12 }}><div className="big" style={{ fontSize: 18 }}>{money(avgMo)}</div><div className="cap">/ month</div></div>
        <div className="tile t-sky" style={{ padding: 12 }}><div className="big" style={{ fontSize: 18 }}>{money(avgMo / 4)}</div><div className="cap">/ week</div></div>
        <div className="tile t-sky" style={{ padding: 12 }}><div className="big" style={{ fontSize: 18 }}>{money(avgCheck)}</div><div className="cap">/ check</div></div>
      </div>
      <div className="tile t-peach" style={{ textAlign: 'center', marginBottom: 12 }}>
        <div className="big" style={{ fontSize: 18 }}>You keep {keepRate}%</div>
        <div className="cap">of what you earn · {100 - keepRate}% to taxes & deductions</div>
      </div>
      <div className="sec">Net income trend</div>
      <div className="panel">
        <div className="chart">
          {months.map(m => {
            const h = Math.round(byMonth[m].net / maxNet * 100)
            const cls = m === hi ? 'hi' : m === lo ? 'lo' : ''
            return <div className={'cbar ' + cls} key={m}><div className="barfill" style={{ height: h + '%' }} /><div className="cm">{MS[+m.slice(5) - 1]}</div></div>
          })}
        </div>
        <div className="hilo">
          <div className="h hi"><div className="hlbl">▲ Highest</div><div className="hv">{money(byMonth[hi]?.net || 0)}</div><div className="hmo">{hi ? MS[+hi.slice(5) - 1] : '—'}</div></div>
          <div className="h lo"><div className="hlbl">▼ Lowest</div><div className="hv">{money(byMonth[lo]?.net || 0)}</div><div className="hmo">{lo ? MS[+lo.slice(5) - 1] : '—'}</div></div>
        </div>
      </div>
      <div className="sec">On pace for</div>
      <div className="project"><span style={{ fontSize: 30 }}>🔮</span><div><div className="pjv">{money(projected)}</div><div className="pjl">projected take-home at this pace</div></div></div>
      <div className="sec">By month</div>
      <div className="card">
        {months.map(m => (
          <div className="brow" key={m}>
            <div><div className="nm">{monthLabel(m).replace(/ \d+/, '')}</div><div className="mt">{byMonth[m].n} checks</div></div>
            <div style={{ textAlign: 'right' }}><div className="amt" style={{ color: '#245b86' }}>{money(byMonth[m].net)}</div><div className="mt">of {money(byMonth[m].gross)}</div></div>
          </div>
        ))}
      </div>
      <div className="statcard" style={{ background: '#f4f0f6', color: 'var(--ink2)', fontSize: 11, fontWeight: 700, textAlign: 'center', marginTop: 12 }}>
        🔒 Summary only — add paychecks in Weekly Checks
      </div>
    </div>
  )
}

function EZPass({ db, update, showToast }) {
  const [state, setState] = useState('NY')
  const [paySheet, setPaySheet] = useState(null)
  const vs = db.violations.filter(v => v.state === state)
  const owed = vs.filter(v => v.status !== 'paid').reduce((s, v) => s + v.due, 0)
  const cleared = vs.filter(v => v.status === 'paid').reduce((s, v) => s + v.due, 0)
  const pctCleared = Math.round(cleared / (cleared + owed || 1) * 100)
  const unpaid = vs.filter(v => v.status !== 'paid')

  const doPayment = (v, amt) => {
    update('violations', v.id, { status: 'paid' })
    showToast(`${v.ref} marked paid`)
    setPaySheet(null)
  }

  return (
    <div>
      <div className="pills" style={{ marginBottom: 14 }}>
        <button className={state === 'NY' ? 'on' : ''} onClick={() => setState('NY')}>NY ({db.violations.filter(v => v.state === 'NY' && v.status !== 'paid').length} owed)</button>
        <button className={state === 'NJ' ? 'on' : ''} onClick={() => setState('NJ')}>NJ ({db.violations.filter(v => v.state === 'NJ' && v.status !== 'paid').length} owed)</button>
      </div>
      <div className="feat" style={{ marginTop: 0, background: 'linear-gradient(135deg,#e9f7ef,#e6f2fa)' }}>
        <div className="ring" style={{ background: `conic-gradient(#5bbd8e ${pctCleared}%, #fff 0)` }}>
          <b style={{ color: '#3b8f6a' }}>{pctCleared}%<small>cleared</small></b>
        </div>
        <div>
          <div className="goalname">{money(owed)} to go</div>
          <div className="goalsub">{unpaid.length} of {vs.length} {state} violations left</div>
        </div>
      </div>
      <div className="sec" style={{ marginTop: 16 }}>{state} violations to clear</div>
      <div className="card">
        {unpaid.length === 0 && <div className="brow"><div className="nm" style={{ color: '#3b8f6a' }}>🎉 All {state} violations cleared!</div></div>}
        {unpaid.map(v => (
          <div className="vrow" key={v.id}>
            <div>
              <div className="vref">{v.ref}</div>
              <div className="mt">{v.vdate ? new Date(v.vdate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : ''} · <span style={{ color: v.status === 'collections' ? '#c0483f' : '#9a6a1a', fontWeight: 700 }}>{v.status}</span></div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="amt">{money(v.due, 2)}</div>
              <button className="tag" style={{ background: 'var(--matcha)', color: '#4e6327' }} onClick={() => setPaySheet(v)}>Log payment</button>
            </div>
          </div>
        ))}
      </div>

      {paySheet && (
        <div className="overlay" onClick={() => setPaySheet(null)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <h3>Log EZ-Pass payment</h3>
            <p className="shint">{paySheet.ref} · {money(paySheet.due, 2)} due</p>
            <div className="amountf"><input defaultValue={paySheet.due} id="ezamt" inputMode="decimal" /></div>
            <button className="apply" onClick={() => doPayment(paySheet, document.getElementById('ezamt').value)}>Mark paid ✨</button>
            <button className="cancel" onClick={() => setPaySheet(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

function Teachings({ db, insert, showToast }) {
  const [view, setView] = useState('topic')
  const [openTopic, setOpenTopic] = useState(null)
  const ctx = teachCtx(db)
  const topics = [['💳 Debt', 'Debt', 'tp1'], ['🐷 Saving', 'Saving', 'tp2'], ['📈 Investing', 'Investing', 'tp3'], ['🧠 Mindset', 'Mindset', 'tp4']]
  const sources = [...new Set(TEACHINGS.map(t => t.source.split('·')[0].trim()))]

  if (openTopic) {
    const list = TEACHINGS.filter(t => t.topic === openTopic)
    return (
      <div>
        <button className="link" onClick={() => setOpenTopic(null)}>← back to library</button>
        {list.map(t => (
          <div className="teach" key={t.id} style={{ marginTop: 12 }}>
            <div className="tlabel">{t.label}</div>
            <div className="tprinciple">{t.principle}</div>
            <div className="tsrc">— {t.source}</div>
            <div className="applybox"><div className="ah">📊 How this applies to you</div><div className="at">{t.apply(ctx)}</div></div>
          </div>
        ))}
        <button className="link" onClick={() => setOpenTopic(null)} style={{ display: 'block', marginTop: 16 }}>← back to library</button>
      </div>
    )
  }

  return (
    <div>
      <div className="pills"><button className={view === 'topic' ? 'on' : ''} onClick={() => setView('topic')}>By topic</button><button className={view === 'source' ? 'on' : ''} onClick={() => setView('source')}>By source</button></div>
      {view === 'topic' ? (
        <div className="topicgrid">
          {topics.map(([n, key, cl]) => (
            <button className={'topic ' + cl} key={key} onClick={() => setOpenTopic(key)}>{n}<span className="tcnt">{TEACHINGS.filter(t => t.topic === key).length} teachings</span></button>
          ))}
        </div>
      ) : (
        <div>
          {sources.map(src => {
            const first = TEACHINGS.find(t => t.source.startsWith(src))
            return (
              <button className="srcrow" key={src} onClick={() => setOpenTopic(first.topic)}>
                <div className="cover" style={{ background: '#8a5fa0' }}>📖</div>
                <div><div className="bt">{src}</div><div className="bn">{TEACHINGS.filter(t => t.source.startsWith(src)).map(t => t.label).join(' · ')}</div></div>
              </button>
            )
          })}
        </div>
      )}
      <button className="addbtn" onClick={() => {
        const text = prompt('Paste a tip you found')
        if (text) { insert('saved_tips', { text, source: 'my note', topic: 'Mindset' }); showToast('Tip saved') }
      }}>+ Save a tip you found</button>
    </div>
  )
}

export default function More({ db, update, insert, showToast, signOut, demo }) {
  const [sub, setSub] = useState('debts')
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const titles = { debts: 'Breaking Free 🕊️', income: 'Income 📈', ez: 'EZ-Pass 🚗', teach: 'Teachings 📚' }
  const subsub = { debts: 'Lighter every month', income: 'The big picture of what you earn', ez: 'Violations to clear', teach: 'Money wisdom, applied to you' }

  return (
    <div className="screen">
      <div className="pagetitle">{titles[sub]}</div>
      <p className="pagesub">{subsub[sub]}</p>
      <div className="monthbar">
        <button className={'chip' + (sub === 'debts' ? ' on' : '')} onClick={() => setSub('debts')}>💳 Debts</button>
        <button className={'chip' + (sub === 'income' ? ' on' : '')} onClick={() => setSub('income')}>📈 Income</button>
        <button className={'chip' + (sub === 'ez' ? ' on' : '')} onClick={() => setSub('ez')}>🚗 EZ-Pass</button>
        <button className={'chip' + (sub === 'teach' ? ' on' : '')} onClick={() => setSub('teach')}>📚 Teachings</button>
      </div>

      {sub === 'debts' && <Debts db={db} update={update} insert={insert} showToast={showToast} />}
      {sub === 'income' && <Income db={db} />}
      {sub === 'ez' && <EZPass db={db} update={update} showToast={showToast} />}
      {sub === 'teach' && <Teachings db={db} insert={insert} showToast={showToast} />}

      <div style={{ textAlign: 'center', marginTop: 28 }}>
        {demo
          ? <span style={{ fontSize: 11, color: 'var(--ink2)' }}>Demo mode — nothing is saved</span>
          : confirmSignOut
            ? <div style={{ background: '#fdeef5', borderRadius: 16, padding: 16, border: '1px solid #f0dced' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#5a3f56', marginBottom: 12 }}>Sign out? Your data stays safe — just enter your email to get back in.</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button style={{ flex: 1, padding: 12, borderRadius: 12, background: '#fff', border: '1px solid var(--line)', color: 'var(--ink2)', fontWeight: 700 }} onClick={() => setConfirmSignOut(false)}>Cancel</button>
                  <button style={{ flex: 1, padding: 12, borderRadius: 12, background: 'var(--pink)', color: '#fff', fontWeight: 700 }} onClick={signOut}>Yes, sign out</button>
                </div>
              </div>
            : <button className="link" onClick={() => setConfirmSignOut(true)}>Sign out</button>
        }
      </div>
    </div>
  )
}
