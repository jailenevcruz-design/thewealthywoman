import { useState, useEffect, useCallback } from 'react'
import { supabase, hasSupabase } from './supabaseClient'
import { SEED_CHECKS, SEED_BILLS, SEED_DEBTS, SEED_GOALS, SEED_CREDIT, SEED_EZ } from './seed'

const curMonth = () => new Date().toISOString().slice(0, 7)
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2))

// All tables live under a ww_ prefix so this app can share a Supabase project
// with other apps (e.g. the fitness app) without any table-name collisions.
const T = (name) => 'ww_' + name

// Build an in-memory database from the seed (used in demo mode, no Supabase)
function buildDemo() {
  const m = curMonth()
  return {
    bills: SEED_BILLS.map((b, i) => ({
      id: uid(), name: b.name, amount: b.amount, grp: b.grp, due_day: b.due_day,
      month: m, status: 'unpaid', paid_amount: 0,
      running: b.name === 'Rent', autopay: ['Tidal Music', 'iCloud', 'T-Mobile Phone'].includes(b.name),
      archived: false, sort: i,
    })),
    spend: [],
    checks: SEED_CHECKS.map(c => ({ id: uid(), ...c })),
    accounts: [{ id: 'acc1', name: 'Ally Savings', sort: 1 }],
    goals: SEED_GOALS.map((g, i) => ({ id: uid(), account_id: 'acc1', ...g, sort: i })),
    deposits: [],
    debts: SEED_DEBTS.map((d, i) => ({ id: uid(), name: d.name, balance: d.balance, apr: d.apr, min_payment: d.min, sort: i })),
    debt_payments: [],
    violations: SEED_EZ.map(v => ({ id: uid(), ...v })),
    credit_scores: SEED_CREDIT.map(c => ({ id: uid(), ...c })),
    saved_tips: [],
    profile: { pay_yourself_target: 125 },
  }
}

export function useData(session) {
  const [db, setDb] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadAll = useCallback(async () => {
    if (!hasSupabase || !session) { setDb(buildDemo()); setLoading(false); return }
    setLoading(true)
    // ensure seeded
    const { data: prof } = await supabase.from(T('profiles')).select('*').eq('id', session.user.id).maybeSingle()
    if (!prof || !prof.seeded) { await supabase.rpc('seed_wealthy_woman') }
    const tables = ['bills', 'spend', 'checks', 'accounts', 'goals', 'deposits', 'debts', 'debt_payments', 'violations', 'credit_scores', 'saved_tips']
    const out = {}
    await Promise.all(tables.map(async t => {
      const { data } = await supabase.from(T(t)).select('*')
      out[t] = data || []
    }))
    const { data: p2 } = await supabase.from(T('profiles')).select('*').eq('id', session.user.id).maybeSingle()
    out.profile = p2 || { pay_yourself_target: 125 }
    setDb(out); setLoading(false)
  }, [session])

  useEffect(() => { loadAll() }, [loadAll])

  // generic helpers — optimistic local update + Supabase write
  const insert = async (table, row) => {
    const local = { id: uid(), ...row }
    setDb(d => ({ ...d, [table]: [...d[table], local] }))
    if (hasSupabase && session) {
      const { data } = await supabase.from(T(table)).insert({ ...row, user_id: session.user.id }).select().single()
      if (data) setDb(d => ({ ...d, [table]: d[table].map(x => x.id === local.id ? data : x) }))
    }
    return local
  }
  const update = async (table, id, patch) => {
    setDb(d => ({ ...d, [table]: d[table].map(x => x.id === id ? { ...x, ...patch } : x) }))
    if (hasSupabase && session) await supabase.from(T(table)).update(patch).eq('id', id)
  }
  const remove = async (table, id) => {
    setDb(d => ({ ...d, [table]: d[table].filter(x => x.id !== id) }))
    if (hasSupabase && session) await supabase.from(T(table)).delete().eq('id', id)
  }

  return { db, setDb, loading, insert, update, remove, reload: loadAll }
}
