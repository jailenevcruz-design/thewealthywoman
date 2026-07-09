import { useState } from 'react'
import { money, curMonth, todayISO } from './lib'

function CheckCard({ c, db, plan }) {
  const m = c.date.slice(0, 7)
  // bills paid this month, spending this week window (simple: same month)
  const billsPaid = db.bills.filter(b => !b.archived && b.status !== 'unpaid').reduce((s, b) => s + (b.status === 'paid' ? b.amount : b.paid_amount || 0), 0)
  const spend = db.spend.filter(s => s.date.slice(0, 7) === m).reduce((s, x) => s + x.amount, 0)
  // proportional per check within month
  const monthChecks = db.checks.filter(x => x.date.slice(0, 7) === m)
  const share = monthChecks.length ? 1 / monthChecks.length : 1
  const bills = billsPaid * share, spd = spend * share
  const left = c.net - bills
  const free = left - spd
  const good = free >= plan
  return (
    <div className="check">
      <div className="chead"><span className="wk">Week of {new Date(c.date + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span><span className="dt">paid</span></div>
      <div className="flow">
        <div className="frow"><span className="fl">Gross earned</span><span className="fv">{money(c.gross, 2)}</span></div>
        <div className="frow minus"><span className="fl">Taxes</span><span className="fv">−{money(c.tax, 2)}</span></div>
        <div className="frow minus"><span className="fl">Deductions</span><span className="fv">−{money(c.ded, 2)}</span></div>
        <div className="frow net"><span className="fl">Net take-home</span><span className="fv">{money(c.net, 2)}</span></div>
      </div>
      <div className="cstep sub"><span>− Bills (this check's share)</span><span className="cv">−{money(bills, 2)}</span></div>
      <div className="cstep left"><span>Left after bills</span><span className="cv">{money(left, 2)}</span></div>
      <div className="cstep sub"><span>− Spending</span><span className="cv">−{money(spd, 2)}</span></div>
      <div className={'cstep final' + (good ? '' : ' tight')}><span>✓ Free to save</span><span className="cv">{money(free, 2)}</span></div>
      <div className="pyf">
        <div className="prow"><div><div className="plabel">🌱 Pay yourself first</div><div className="psub">your intention</div></div><div className="pval">{money(plan)}</div></div>
        <div className={'flag ' + (good ? 'good' : 'tight')}>
          {good
            ? `🎉 You had ${money(free)} free — more than your ${money(plan)} goal. Send extra?`
            : `💛 Only ${money(free, 2)} was free this week. Save what you can; no guilt.`}
        </div>
        <button className="sendbtn">→ Send to savings</button>
      </div>
    </div>
  )
}

export default function Checks({ db, insert, showToast }) {
  const [pill, setPill] = useState('week')
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
    insert('checks', { date: form.date, gross: +form.gross || 0, tax: +form.tax || 0, ded: +form.ded || 0, net })
    showToast('Check logged'); setPill('week')
  }

  const totG = db.checks.reduce((s, c) => s + c.gross, 0)
  const totT = db.checks.reduce((s, c) => s + c.tax + c.ded, 0)
  const totN = db.checks.reduce((s, c) => s + c.net, 0)

  return (
    <div className="screen">
      <div className="pagetitle">Weekly checks 💵</div>
      <p className="pagesub">Every paycheck, start to finish</p>
      <div className="pills">
        <button className={pill === 'week' ? 'on' : ''} onClick={() => setPill('week')}>This week</button>
        <button className={pill === 'hist' ? 'on' : ''} onClick={() => setPill('hist')}>History</button>
        <button className={pill === 'log' ? 'on' : ''} onClick={() => setPill('log')}>+ Log</button>
      </div>

      {pill === 'week' && (last ? <CheckCard c={last} db={db} plan={plan} /> : <p style={{ color: 'var(--ink2)' }}>No checks yet — tap + Log.</p>)}

      {pill === 'hist' && (
        <div className="logtable">
          <div className="lhd"><span>Week</span><span style={{ textAlign: 'right' }}>Gross</span><span style={{ textAlign: 'right' }}>Tax+Ded</span><span style={{ textAlign: 'right' }}>Net</span></div>
          {sorted.map(c => (
            <div className="ltr" key={c.id}>
              <span className="wl">{new Date(c.date + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              <span className="num">{money(c.gross)}</span><span className="num">{money(c.tax + c.ded)}</span><span className="num lnet">{money(c.net)}</span>
            </div>
          ))}
          <div className="ltr tot"><span className="wl">Total</span><span className="num">{money(totG)}</span><span className="num">{money(totT)}</span><span className="num lnet">{money(totN)}</span></div>
        </div>
      )}

      {pill === 'log' && (
        <div>
          <div className="statcard" style={{ background: 'var(--lav)', color: '#5a52a0', fontSize: 11, fontWeight: 700, marginBottom: 14, padding: '9px 11px' }}>
            ✨ Pre-filled from your last check — change what's different.
          </div>
          <div className="field"><label>Pay date</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
          <div className="field"><label>Gross earned</label><input type="number" step="0.01" value={form.gross} onChange={e => setForm({ ...form, gross: e.target.value })} /></div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div className="field" style={{ flex: 1 }}><label>Taxes</label><input type="number" step="0.01" value={form.tax} onChange={e => setForm({ ...form, tax: e.target.value })} /></div>
            <div className="field" style={{ flex: 1 }}><label>Deductions</label><input type="number" step="0.01" value={form.ded} onChange={e => setForm({ ...form, ded: e.target.value })} /></div>
          </div>
          <div className="flow" style={{ padding: '12px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 800, color: '#4a3f58' }}>Net take-home</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 17, fontWeight: 800, color: '#6a4fa0' }}>{money(net, 2)}</span>
          </div>
          <button className="apply" style={{ marginTop: 12 }} onClick={saveCheck}>Save check ✨</button>
        </div>
      )}
    </div>
  )
}
