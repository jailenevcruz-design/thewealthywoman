export const money = (n, dp = 0) =>
  '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })

export const MN = ['January','February','March','April','May','June','July','August','September','October','November','December']
export const MS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
export const monthLabel = m => { const [y, mm] = m.split('-'); return `${MN[+mm - 1]} ${y}` }
export const curMonth = () => new Date().toISOString().slice(0, 7)
export const todayISO = () => new Date().toISOString().slice(0, 10)

export const QUOTES = [
  { t: 'A woman with money is a woman with options.', by: '' },
  { t: "I've never been poor, only broke. Poor is a state of mind.", by: 'Della Reese' },
  { t: 'A budget is telling your money where to go instead of wondering where it went.', by: '' },
  { t: 'Money, like emotions, is something you must control to keep your life on track.', by: 'Natasha Munson' },
  { t: 'I want to be able to take care of myself, even if I never have to.', by: 'Katharine Hepburn' },
  { t: "Don't tell me what you value. Show me your budget.", by: '' },
  { t: "The question isn't who's going to let me; it's who's going to stop me.", by: 'Ayn Rand' },
  { t: "Budgeting isn't restriction — it's self-respect.", by: '' },
  { t: "The goal isn't more money. The goal is living life on your terms.", by: '' },
  { t: 'Do not save what is left after spending, but spend what is left after saving.', by: 'Warren Buffett' },
  { t: "Your emergency fund starts at $0. So did everyone else's.", by: '' },
  { t: "The Wealthy Woman isn't a destination. She's showing up every time you open this app.", by: '' },
  { t: 'You track it. You face it. Most people look away. That\'s already different.', by: '' },
  { t: "She's not perfect with money. She's just more intentional than yesterday.", by: '' },
  { t: "The Wealthy Woman budgets not because she has to — because she knows where she's going.", by: '' },
  { t: 'She decided her finances were worth her full attention. That was the turning point.', by: '' },
  { t: 'Quiet wealth is built in the in-between moments — the logged receipt, the skipped impulse.', by: '' },
  { t: "She's not where she wants to be. But she knows exactly where she is. That's power.", by: '' },
  { t: 'Every bill she faces, every debt she logs, every dollar she tracks — that\'s her building her empire.', by: '' },
  { t: "An emergency fund isn't savings. It's insurance against going further into debt.", by: '' },
  { t: 'Your credit score goes up when you pay on time and bring your balances down. That\'s it.', by: '' },
  { t: 'Interest is the cost of debt. The faster you pay, the less it costs.', by: '' },
  { t: 'Savings accounts earn. Debt costs. The goal is to flip which one is bigger.', by: '' },
  { t: 'Late payments stay on your credit report for 7 years. On-time ones build forever.', by: '' },
]

const IMAGES = Array.from({ length: 12 }, (_, i) => `/hero${i + 1}.jpg`)

function dailyShuffle(arr, count, salt = 0) {
  const d = new Date()
  let s = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate() + salt
  const copy = [...arr]
  const rand = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff }
  for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]] }
  return copy.slice(0, count)
}

export function getDailySlots() {
  const quotes = dailyShuffle(QUOTES, 3, 0)
  const images = dailyShuffle(IMAGES, 3, 99)
  return quotes.map((q, i) => ({ quote: q, image: images[i] }))
}

export const TEACHINGS = [
  { id:'snowball', topic:'Debt', source:'The Total Money Makeover · Ramsey', label:'Debt Snowball',
    principle:'Pay off the smallest debt first — the quick win builds momentum that keeps you going.',
    apply: c => `Your smallest is ${c.smallestDebtName} at ${money(c.smallestDebt)}. Knock it out and only ${c.debtCount-1} debts remain.` },
  { id:'avalanche', topic:'Debt', source:'personal-finance math', label:'Debt Avalanche',
    principle:'Attack the highest-interest debt first to pay the least interest over time.',
    apply: c => `Your highest APR is ${c.highAprName} at ${c.highApr}%. Every extra dollar here saves the most.` },
  { id:'payyourself', topic:'Saving', source:'Bach, Sethi & Ramsey', label:'Pay yourself first',
    principle:"Treat savings like a bill — take it off the top the day you get paid, not from what's left.",
    apply: c => `Move ${money(c.payTarget)}/check the day it lands and you'd reach your ${c.topGoalName} noticeably sooner.` },
  { id:'emergency', topic:'Saving', source:'Ramsey · Baby Step 3', label:'The 3–6 month rule',
    principle:"Build 3–6 months of expenses before investing aggressively — it's your peace-of-mind fund.",
    apply: c => `Your bills run ~${money(c.monthlyBills)}/mo. A 3-month cushion is ~${money(c.monthlyBills*3)}. You're building toward it.` },
  { id:'assets', topic:'Investing', source:'Rich Dad Poor Dad · Kiyosaki', label:'Assets vs. liabilities',
    principle:'Buy things that put money in your pocket (assets); minimize things that take it out (liabilities).',
    apply: c => `Right now ${money(c.totalDebt)} in debt pulls money out monthly. Clearing it frees cash to build assets.` },
  { id:'automation', topic:'Mindset', source:'I Will Teach You to Be Rich · Sethi', label:'Automate the boring stuff',
    principle:'Set money to move automatically so good choices happen without willpower.',
    apply: c => `You have ${c.autopayCount} bills on autopay already — extending that to savings removes the decision entirely.` },
  { id:'wealthunseen', topic:'Mindset', source:'The Psychology of Money · Housel', label:"Wealth is what you don't see",
    principle:"Real wealth is the money you don't spend — the restraint nobody notices is the point.",
    apply: c => `You logged ${money(c.spendThisMonth)} in spending this month. Every skipped purchase is invisible wealth.` },
  { id:'503020', topic:'Mindset', source:'Elizabeth Warren', label:'The 50/30/20 guideline',
    principle:'Aim roughly 50% needs, 30% wants, 20% savings/debt — a simple sanity check, not a rule.',
    apply: c => `On ${money(c.avgNet)}/mo take-home, 20% is ~${money(c.avgNet*0.2)} toward savings & debt.` },
  { id:'latte', topic:'Saving', source:'The Automatic Millionaire · Bach', label:'The latte factor',
    principle:'Small recurring expenses add up — find one to redirect toward a goal.',
    apply: c => `Your subscriptions each cost a few dollars — redirecting one covers part of your ${c.topGoalName}.` },
  { id:'sinking', topic:'Saving', source:'budgeting classic', label:'Sinking funds',
    principle:"Save a little each month for known future costs so they never become emergencies.",
    apply: () => `Car insurance hits periodically — setting aside a bit monthly softens the blow.` },
  { id:'minonly', topic:'Debt', source:'consumer-finance research', label:'Minimums are a trap',
    principle:'Paying only the minimum on high-APR cards can mean years of payments and huge interest.',
    apply: c => `Your ${c.highAprName} at ${c.highApr}% grows fast on minimums — even $20 extra changes the math.` },
  { id:'firstgoal', topic:'Mindset', source:'behavioral finance', label:'One goal at a time',
    principle:'Focus beats spreading thin — one primary goal gets done faster and feels better.',
    apply: c => `Pick ${c.topGoalName} as your focus this season; the others can idle until it's done.` },
  { id:'creditutil', topic:'Debt', source:'credit-score research', label:'Keep utilization under 30%',
    principle:'Your credit utilization — balance divided by limit — should stay under 30% to protect your score.',
    apply: c => `Paying down ${c.highAprName} also lowers your utilization and boosts your score.` },
  { id:'networth', topic:'Mindset', source:'personal finance fundamentals', label:'Know your net worth',
    principle:'Net worth = what you own minus what you owe. Track it monthly — it tells the real story.',
    apply: c => `Right now your debt is ${money(c.totalDebt)}. Every dollar paid is a direct net worth gain.` },
  { id:'debtfree', topic:'Debt', source:'Dave Ramsey', label:'Debt-free is a feeling',
    principle:"Paying off debt isn't just financial — it removes weight you didn't know you were carrying.",
    apply: c => `${c.debtCount} debts left. Each one cleared is a door you unlock permanently.` },
  { id:'compound', topic:'Investing', source:'finance fundamentals', label:'Compound interest works both ways',
    principle:'Compound interest builds wealth when you save — and drains it when you carry debt.',
    apply: c => `At ${c.highApr}% APR, ${c.highAprName} is compounding against you. Clearing it is the investment.` },
]

export function teachCtx(db) {
  const debts = [...db.debts].filter(d => d.balance > 0)
  const bySmall = [...debts].sort((a,b)=>a.balance-b.balance)
  const byApr = [...debts].sort((a,b)=>(b.apr||0)-(a.apr||0))
  const totalDebt = debts.reduce((s,d)=>s+d.balance,0)
  const monthlyBills = db.bills.filter(b=>!b.archived).reduce((s,b)=>s+b.amount,0)
  const goals = db.goals || []
  const topGoal = goals[0] || { name:'your goal' }
  const nets = db.checks.map(c=>c.net)
  const avgNet = nets.length ? nets.reduce((a,b)=>a+b,0)/(new Set(db.checks.map(c=>c.date.slice(0,7))).size||1) : 0
  const m = curMonth()
  const spendThisMonth = db.spend.filter(s=>s.date.slice(0,7)===m).reduce((s,x)=>s+x.amount,0)
  return {
    smallestDebtName: bySmall[0]?.name||'—', smallestDebt: bySmall[0]?.balance||0,
    highAprName: byApr[0]?.name||'—', highApr: byApr[0]?.apr||0,
    debtCount: debts.length, totalDebt, monthlyBills,
    topGoalName: topGoal.name, payTarget: db.profile?.pay_yourself_target||125,
    autopayCount: db.bills.filter(b=>b.autopay).length, spendThisMonth, avgNet: avgNet||0,
  }
}

export function pickNudge(db) {
  const ctx = teachCtx(db)
  const day = new Date().getDate()
  let pool = TEACHINGS
  if (ctx.highApr >= 25) pool = TEACHINGS.filter(t => ['avalanche','minonly','snowball','payyourself','wealthunseen','creditutil'].includes(t.id))
  const t = pool[day % pool.length]
  return { t, text: t.apply(ctx) }
}

export const CATS = [
  ['Groceries','🛒','#8bb23a','c-groc'],
  ['Dining','🍽️','#f0997b','c-dine'],
  ['Gas','⛽','#e0a24a','c-gas'],
  ['Shopping','🛍️','#7bafe0','c-shop'],
  ['Transport','🚗','#5aa0d8','c-trans'],
  ['Housing','🏠','#a89be6','c-house'],
  ['Pet','🐾','#b07bb0','c-pet'],
  ['Subscriptions','📺','#c48fd0','c-sub'],
  ['Pay in 4','💳','#e88f8f','c-p4'],
  ['Personal','💅','#ef9fc9','c-pers'],
  ['Gifts','🎁','#f6b26b','c-gift'],
  ['Health','🏥','#5bbd8e','c-health'],
]
