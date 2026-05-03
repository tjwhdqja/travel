import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import PillButton from '../components/PillButton'
import EmptyState from '../components/EmptyState'
import Spinner from '../components/Spinner'
import { btn } from '../lib/design'

interface Expense {
  id: string
  title: string
  amount: number
  paid_by: string
  split_with: string[]
  category: string
  currency: string
  payment_method: string
  created_at: string
}

interface Props {
  tripId: string
  userName: string
  budget?: number
  members: string[]
}

const CATEGORIES = [
  { id: '식비', emoji: '🍽' },
  { id: '교통', emoji: '🚌' },
  { id: '숙박', emoji: '🏨' },
  { id: '관광', emoji: '🎡' },
  { id: '쇼핑', emoji: '🛍' },
  { id: '기타', emoji: '💳' },
  { id: '정산', emoji: '💸' },
]

const CURRENCIES = ['KRW', 'JPY', 'USD', 'EUR', 'CNY', 'THB']

export default function ExpenseTab({ tripId, userName, budget = 0, members }: Props) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [rates, setRates] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [activeView, setActiveView] = useState<'list' | 'settlement'>('list')
  const [showPreSettle, setShowPreSettle] = useState(false)
  const [preFrom, setPreFrom] = useState(userName)
  const [preTo, setPreTo] = useState('')
  const [preAmount, setPreAmount] = useState('')

  const [form, setForm] = useState({
    title: '', amount: '', paid_by: userName,
    split_with: [] as string[], category: '식비', currency: 'KRW', payment_method: '카드'
  })

  useEffect(() => {
    if (userName) fetchAll()
  }, [tripId, userName])

  useEffect(() => {
    const channel = supabase
      .channel(`expenses:${tripId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'expenses', filter: `trip_id=eq.${tripId}` }, ({ new: row }) => {
        setExpenses(prev => prev.some(e => e.id === row.id) ? prev : [row as Expense, ...prev])
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'expenses', filter: `trip_id=eq.${tripId}` }, ({ old: row }) => {
        setExpenses(prev => prev.filter(e => e.id !== row.id))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [tripId])

  useEffect(() => {
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(r => r.json())
      .then(data => setRates(data.rates ?? {}))
      .catch(() => {})
  }, [])

  // X 외화 → KRW 변환
  function toKRW(amount: number, currency: string): number {
    if (currency === 'KRW') return amount
    if (!rates['KRW'] || !rates[currency]) return amount
    return Math.round(amount * rates['KRW'] / rates[currency])
  }

  async function fetchAll() {
    const { data: exp } = await supabase.from('expenses').select('*').eq('trip_id', tripId).order('created_at', { ascending: false })
    setExpenses(exp ?? [])
    setLoading(false)
  }

  async function addExpense(e: React.FormEvent) {
    e.preventDefault()
    if (form.split_with.length === 0) return alert('정산할 사람을 선택해주세요')
    const { data } = await supabase
      .from('expenses')
      .insert([{
        trip_id: tripId, title: form.title, amount: Number(form.amount),
        paid_by: form.paid_by, split_with: form.split_with,
        category: form.category, currency: form.currency,
        payment_method: form.payment_method,
      }])
      .select().single()
    if (data) {
      setExpenses(prev => [data, ...prev])
      setShowForm(false)
      setForm({ title: '', amount: '', paid_by: userName, split_with: [...members], category: '식비', currency: 'KRW', payment_method: '카드' })
    }
  }

  async function updateExpense(e: React.FormEvent) {
    e.preventDefault()
    if (!editingExpense) return
    if (form.split_with.length === 0) return alert('정산할 사람을 선택해주세요')
    const { data } = await supabase
      .from('expenses')
      .update({
        title: form.title, amount: Number(form.amount),
        paid_by: form.paid_by, split_with: form.split_with,
        category: form.category, currency: form.currency,
        payment_method: form.payment_method,
      })
      .eq('id', editingExpense.id)
      .select().single()
    if (data) {
      setExpenses(prev => prev.map(ex => ex.id === data.id ? data : ex))
      cancelForm()
    }
  }

  function openEdit(exp: Expense) {
    setEditingExpense(exp)
    setShowForm(false)
    setForm({
      title: exp.title, amount: String(exp.amount),
      paid_by: exp.paid_by, split_with: exp.split_with,
      category: exp.category, currency: exp.currency,
      payment_method: exp.payment_method,
    })
  }

  function cancelForm() {
    setShowForm(false)
    setEditingExpense(null)
    setForm({ title: '', amount: '', paid_by: userName, split_with: [...members], category: '식비', currency: 'KRW', payment_method: '카드' })
  }

  function formatExpenseDate(dateStr: string) {
    const d = new Date(dateStr)
    return `${d.getMonth() + 1}월 ${d.getDate()}일`
  }

  async function addPreSettlement(e: React.FormEvent) {
    e.preventDefault()
    if (!preTo || preFrom === preTo) return alert('보낸 사람과 받은 사람이 달라야 합니다')
    const { data } = await supabase
      .from('expenses')
      .insert([{
        trip_id: tripId,
        title: `${preFrom} → ${preTo} 선 정산`,
        amount: Number(preAmount),
        paid_by: preFrom,
        split_with: [preTo],
        category: '정산',
        currency: 'KRW',
        payment_method: '송금',
      }])
      .select().single()
    if (data) {
      setExpenses(prev => [data, ...prev])
      setShowPreSettle(false)
      setPreAmount('')
      setPreTo('')
    }
  }

  async function deleteExpense(id: string) {
    await supabase.from('expenses').delete().eq('id', id)
    setExpenses(prev => prev.filter(e => e.id !== id))
  }

  function toggleSplit(name: string) {
    setForm(f => ({
      ...f,
      split_with: f.split_with.includes(name)
        ? f.split_with.filter(n => n !== name)
        : [...f.split_with, name]
    }))
  }

  function calcBalances() {
    const paid: Record<string, number> = {}
    const owed: Record<string, number> = {}
    members.forEach(m => { paid[m] = 0; owed[m] = 0 })

    expenses.forEach(exp => {
      const krw = toKRW(exp.amount, exp.currency)
      const share = krw / exp.split_with.length
      if (paid[exp.paid_by] !== undefined) paid[exp.paid_by] += krw
      exp.split_with.forEach(person => {
        if (owed[person] !== undefined) owed[person] += share
      })
    })

    return members.map(m => ({
      name: m,
      paid: paid[m] ?? 0,
      owed: owed[m] ?? 0,
      net: (paid[m] ?? 0) - (owed[m] ?? 0),
    }))
  }

  function calcSettlement() {
    const balances = calcBalances()
    const creditors = balances.filter(b => b.net > 0).map(b => ({ name: b.name, amt: b.net })).sort((a, b) => b.amt - a.amt)
    const debtors = balances.filter(b => b.net < 0).map(b => ({ name: b.name, amt: -b.net })).sort((a, b) => b.amt - a.amt)
    const result: { from: string; to: string; amount: number }[] = []
    let i = 0, j = 0
    while (i < creditors.length && j < debtors.length) {
      const transfer = Math.min(creditors[i].amt, debtors[j].amt)
      if (transfer > 0) result.push({ from: debtors[j].name, to: creditors[i].name, amount: Math.round(transfer) })
      creditors[i].amt -= transfer
      debtors[j].amt -= transfer
      if (creditors[i].amt < 1) i++
      if (debtors[j].amt < 1) j++
    }
    return result
  }

  const totalKRW = expenses.reduce((sum, e) => sum + toKRW(e.amount, e.currency), 0)
  const remaining = budget > 0 ? budget - totalKRW : null
  const budgetPct = budget > 0 ? Math.min((totalKRW / budget) * 100, 100) : 0

  function getCategoryEmoji(cat: string) {
    return CATEGORIES.find(c => c.id === cat)?.emoji ?? '💳'
  }

  const balances = calcBalances()
  const settlements = calcSettlement()

  return (
    <div className="space-y-4">
      {budget > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">예산 사용</span>
            <span className={remaining! < 0 ? 'text-red-500 font-bold' : 'text-gray-700 font-medium'}>
              {totalKRW.toLocaleString()}원 / {budget.toLocaleString()}원
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${budgetPct >= 100 ? 'bg-red-400' : budgetPct >= 80 ? 'bg-yellow-400' : 'bg-indigo-400'}`} style={{ width: `${budgetPct}%` }} />
          </div>
          <p className={`text-xs ${remaining! < 0 ? 'text-red-500' : 'text-gray-400'}`}>
            {remaining! < 0 ? `${Math.abs(remaining!).toLocaleString()}원 초과` : `${remaining!.toLocaleString()}원 남음`}
          </p>
        </div>
      )}

      <button
        onClick={() => { setEditingExpense(null); setShowForm(true); setForm({ title: '', amount: '', paid_by: userName, split_with: [...members], category: '식비', currency: 'KRW', payment_method: '카드' }) }}
        className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 rounded-xl transition text-sm"
      >
        + 지출 추가
      </button>

      {(showForm || editingExpense) && (
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="font-bold text-gray-800 mb-4">{editingExpense ? '지출 수정' : '지출 추가'}</h3>
          <form onSubmit={editingExpense ? updateExpense : addExpense} className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 mb-2 block">카테고리</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <PillButton key={cat.id} label={`${cat.emoji} ${cat.id}`}
                    selected={form.category === cat.id}
                    onClick={() => setForm({ ...form, category: cat.id })}
                  />
                ))}
              </div>
            </div>

            <input
              placeholder="내용 (예: 저녁 식사)"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
            />

            <div>
              <label className="text-xs text-gray-500 mb-2 block">결제 수단</label>
              <div className="flex gap-2">
                {['카드', '현금'].map(m => (
                  <PillButton key={m} label={m === '카드' ? '💳 카드' : '💵 현금'}
                    selected={form.payment_method === m}
                    onClick={() => setForm({ ...form, payment_method: m })}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-2 block">통화</label>
              <div className="flex gap-1.5 flex-wrap">
                {CURRENCIES.map(cur => (
                  <PillButton key={cur} label={cur}
                    selected={form.currency === cur}
                    onClick={() => setForm({ ...form, currency: cur })}
                  />
                ))}
              </div>
            </div>

            <div>
              <input
                type="number"
                placeholder="금액"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
              />
              {form.currency !== 'KRW' && form.amount && rates['KRW'] && rates[form.currency] && (
                <p className="text-xs text-gray-400 mt-1.5">
                  ≈ {toKRW(Number(form.amount), form.currency).toLocaleString()}원
                </p>
              )}
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-2 block">결제한 사람</label>
              <div className="flex flex-wrap gap-2">
                {members.map(m => (
                  <PillButton key={m} label={m}
                    selected={form.paid_by === m}
                    onClick={() => setForm({ ...form, paid_by: m })}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-2 block">나눌 사람</label>
              <div className="flex flex-wrap gap-2">
                {members.map(m => (
                  <PillButton key={m} label={m}
                    selected={form.split_with.includes(m)}
                    onClick={() => toggleSplit(m)}
                  />
                ))}
              </div>
              {form.split_with.length > 0 && form.amount && (
                <p className="text-xs text-gray-400 mt-1.5">
                  1인당 {Math.round(toKRW(Number(form.amount), form.currency) / form.split_with.length).toLocaleString()}원
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={cancelForm} className={btn.secondary}>취소</button>
              <button type="submit" className={btn.action}>{editingExpense ? '저장' : '추가'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex bg-gray-100 rounded-xl p-1">
        <button onClick={() => setActiveView('list')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${activeView === 'list' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400'}`}>지출 목록</button>
        <button onClick={() => setActiveView('settlement')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${activeView === 'settlement' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400'}`}>정산</button>
      </div>

      {loading ? (
        <Spinner />
      ) : activeView === 'list' ? (
        <>
          {expenses.length === 0 ? (
            <EmptyState icon="💰" title="아직 지출이 없어요" subtitle="+ 지출 추가를 눌러보세요" />
          ) : (
            <>
              <div className="bg-indigo-50 rounded-xl px-4 py-3 flex justify-between items-center">
                <span className="text-sm text-indigo-600">총 지출</span>
                <span className="font-bold text-indigo-600">{totalKRW.toLocaleString()}원</span>
              </div>
              {members.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  {members.map(m => {
                    const memberExpenses = expenses.filter(e => e.paid_by === m && e.category !== '정산')
                    const memberPaid = memberExpenses.reduce((sum, e) => sum + toKRW(e.amount, e.currency), 0)
                    const expenseTotal = expenses.filter(e => e.category !== '정산').reduce((sum, e) => sum + toKRW(e.amount, e.currency), 0)
                    const pct = expenseTotal > 0 ? (memberPaid / expenseTotal) * 100 : 0
                    const cardTotal = memberExpenses.filter(e => e.payment_method === '카드').reduce((sum, e) => sum + toKRW(e.amount, e.currency), 0)
                    const cashTotal = memberExpenses.filter(e => e.payment_method === '현금').reduce((sum, e) => sum + toKRW(e.amount, e.currency), 0)
                    const byCurrency: Record<string, number> = {}
                    memberExpenses.forEach(e => { byCurrency[e.currency] = (byCurrency[e.currency] ?? 0) + e.amount })
                    return (
                      <div key={m} className="px-4 py-3 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold shrink-0">
                            {m.slice(0, 1)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between mb-1.5">
                              <span className="text-sm font-medium text-gray-700">{m}</span>
                              <span className="text-sm font-semibold text-gray-800">{memberPaid.toLocaleString()}원</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        </div>
                        {memberPaid > 0 && (
                          <div className="ml-10 mt-2 space-y-1">
                            <div className="flex gap-3 flex-wrap">
                              {cardTotal > 0 && <span className="text-xs text-gray-400">💳 {cardTotal.toLocaleString()}원</span>}
                              {cashTotal > 0 && <span className="text-xs text-gray-400">💵 {cashTotal.toLocaleString()}원</span>}
                            </div>
                            <div className="flex gap-3 flex-wrap">
                              {Object.entries(byCurrency).map(([cur, amt]) => (
                                <span key={cur} className="text-xs text-gray-400">
                                  {cur} {amt.toLocaleString()}
                                  {cur !== 'KRW' && <span className="text-gray-300"> ≈{toKRW(amt, cur).toLocaleString()}원</span>}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
              {expenses.map(exp => (
                <div key={exp.id} className={`rounded-xl p-4 shadow-sm flex items-center gap-3 ${exp.category === '정산' ? 'bg-indigo-50' : 'bg-white'}`}>
                  <span className="text-2xl">{getCategoryEmoji(exp.category)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm">{exp.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {exp.paid_by} 결제 · {exp.split_with.join(', ')} 분담
                      {exp.payment_method && <span className="ml-1 text-gray-300">· {exp.payment_method === '카드' ? '💳' : '💵'}</span>}
                      <span className="ml-1 text-gray-300">· {formatExpenseDate(exp.created_at)}</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-gray-800 text-sm">
                      {exp.amount.toLocaleString()} {exp.currency}
                    </p>
                    {exp.currency !== 'KRW' && rates['KRW'] && (
                      <p className="text-xs text-gray-400">≈ {toKRW(exp.amount, exp.currency).toLocaleString()}원</p>
                    )}
                    <p className="text-xs text-gray-400">
                      1인 {Math.round(toKRW(exp.amount, exp.currency) / exp.split_with.length).toLocaleString()}원
                    </p>
                  </div>
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button onClick={() => openEdit(exp)} className="p-2 text-gray-300 hover:text-indigo-400 transition text-xs">수정</button>
                    <button onClick={() => deleteExpense(exp.id)} className="p-2 text-gray-300 hover:text-red-400 transition text-xs">삭제</button>
                  </div>
                </div>
              ))}
            </>
          )}
        </>
      ) : (
        <div className="space-y-3">
          {members.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">멤버를 추가해주세요</p>
          ) : (
            <>
              {/* 잔액 요약 */}
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-50">
                  <p className="text-sm font-semibold text-gray-700">잔액 요약</p>
                </div>
                {balances.map(b => (
                  <div key={b.name} className="flex items-center px-4 py-3 border-b border-gray-50 last:border-0">
                    <span className="text-sm font-medium text-gray-800 w-20 flex-shrink-0">{b.name}</span>
                    <div className="flex-1 text-xs text-gray-400 space-y-0.5">
                      <p>낸 금액 <span className="text-gray-600">{Math.round(b.paid).toLocaleString()}원</span></p>
                      <p>부담액 <span className="text-gray-600">{Math.round(b.owed).toLocaleString()}원</span></p>
                    </div>
                    <span className={`text-sm font-bold ${b.net > 0 ? 'text-emerald-500' : b.net < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                      {b.net > 0 ? `+${Math.round(b.net).toLocaleString()}원` : b.net < 0 ? `${Math.round(b.net).toLocaleString()}원` : '정산 완료'}
                    </span>
                  </div>
                ))}
              </div>

              {/* 선 정산 */}
              <button
                onClick={() => setShowPreSettle(v => !v)}
                className="w-full py-2.5 rounded-xl border border-dashed border-gray-200 text-sm text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition"
              >
                💸 선 정산 추가
              </button>
              {showPreSettle && (
                <div className="bg-white rounded-2xl shadow-sm p-4">
                  <form onSubmit={addPreSettlement} className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-2 block">보낸 사람</label>
                      <div className="flex flex-wrap gap-2">
                        {members.map(m => (
                          <PillButton key={m} label={m} selected={preFrom === m} onClick={() => setPreFrom(m)} />
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-2 block">받은 사람</label>
                      <div className="flex flex-wrap gap-2">
                        {members.map(m => (
                          <PillButton key={m} label={m} selected={preTo === m} onClick={() => setPreTo(m)} />
                        ))}
                      </div>
                    </div>
                    <input
                      type="number"
                      placeholder="금액 (KRW)"
                      value={preAmount}
                      onChange={e => setPreAmount(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                    />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setShowPreSettle(false)} className={btn.secondary}>취소</button>
                      <button type="submit" className={btn.action}>추가</button>
                    </div>
                  </form>
                </div>
              )}

              {/* 이체 내역 */}
              <p className="text-xs font-semibold text-gray-400 px-1">이체 내역</p>
              {settlements.length === 0 ? (
                <EmptyState icon="🎉" title="정산할 내용이 없어요" />
              ) : (
                settlements.map((s, i) => (
                  <div key={i} className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-800">{s.from}</span>
                    <span className="text-gray-300 text-sm">→</span>
                    <span className="text-sm font-medium text-indigo-600">{s.to}</span>
                    <span className="ml-auto font-bold text-gray-800">{s.amount.toLocaleString()}원</span>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
