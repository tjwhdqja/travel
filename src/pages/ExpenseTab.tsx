import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import PillButton from '../components/PillButton'

interface Expense {
  id: string
  title: string
  amount: number
  paid_by: string
  split_with: string[]
  category: string
  currency: string
  created_at: string
}

interface Props {
  tripId: string
  userName: string
  budget?: number
}

const CATEGORIES = [
  { id: '식비', emoji: '🍽' },
  { id: '교통', emoji: '🚌' },
  { id: '숙박', emoji: '🏨' },
  { id: '관광', emoji: '🎡' },
  { id: '쇼핑', emoji: '🛍' },
  { id: '기타', emoji: '💳' },
]

const CURRENCIES = ['KRW', 'JPY', 'USD', 'EUR', 'CNY', 'THB']

export default function ExpenseTab({ tripId, userName, budget = 0 }: Props) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [members, setMembers] = useState<string[]>([])
  const [allProfiles, setAllProfiles] = useState<string[]>([])
  const [rates, setRates] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [activeView, setActiveView] = useState<'list' | 'settlement'>('list')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [form, setForm] = useState({
    title: '', amount: '', paid_by: userName,
    split_with: [] as string[], category: '식비', currency: 'KRW'
  })

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (userName) fetchAll()
  }, [tripId, userName])

  useEffect(() => {
    fetch('https://api.frankfurter.app/latest?base=KRW&symbols=JPY,USD,EUR,CNY,THB')
      .then(r => r.json())
      .then(data => setRates(data.rates ?? {}))
      .catch(() => {})
  }, [])

  function toKRW(amount: number, currency: string): number {
    if (currency === 'KRW' || !rates[currency]) return amount
    return Math.round(amount / rates[currency])
  }

  async function fetchAll() {
    const [{ data: exp }, { data: mem }, { data: profiles }] = await Promise.all([
      supabase.from('expenses').select('*').eq('trip_id', tripId).order('created_at', { ascending: false }),
      supabase.from('trip_members').select('name').eq('trip_id', tripId),
      supabase.from('profiles').select('nickname')
    ])
    setExpenses(exp ?? [])
    const names = mem?.map(m => m.name) ?? []
    setMembers(names)
    setAllProfiles(profiles?.map(p => p.nickname) ?? [])
    if (names.length > 0 && form.split_with.length === 0) {
      setForm(f => ({ ...f, split_with: names }))
    }
    setLoading(false)
  }

  async function addMember(nickname: string) {
    if (!nickname || members.includes(nickname)) return
    await supabase.from('trip_members').insert([{ trip_id: tripId, name: nickname }])
    setMembers(prev => [...prev, nickname])
  }

  async function removeMember(name: string) {
    await supabase.from('trip_members').delete().eq('trip_id', tripId).eq('name', name)
    setMembers(prev => prev.filter(m => m !== name))
  }

  async function addExpense(e: React.FormEvent) {
    e.preventDefault()
    if (form.split_with.length === 0) return alert('정산할 사람을 선택해주세요')
    const { data } = await supabase
      .from('expenses')
      .insert([{
        trip_id: tripId, title: form.title, amount: Number(form.amount),
        paid_by: form.paid_by, split_with: form.split_with,
        category: form.category, currency: form.currency
      }])
      .select().single()
    if (data) {
      setExpenses(prev => [data, ...prev])
      setShowForm(false)
      setForm({ title: '', amount: '', paid_by: userName, split_with: members, category: '식비', currency: 'KRW' })
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

  function calcSettlement() {
    const balance: Record<string, number> = {}
    members.forEach(m => (balance[m] = 0))
    expenses.forEach(exp => {
      const krw = toKRW(exp.amount, exp.currency)
      const share = krw / exp.split_with.length
      if (balance[exp.paid_by] !== undefined) balance[exp.paid_by] += krw
      exp.split_with.forEach(person => {
        if (balance[person] !== undefined) balance[person] -= share
      })
    })
    const creditors = Object.entries(balance).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
    const debtors = Object.entries(balance).filter(([, v]) => v < 0).sort((a, b) => a[1] - b[1])
    const result: { from: string; to: string; amount: number }[] = []
    const c = creditors.map(([name, amt]) => ({ name, amt }))
    const d = debtors.map(([name, amt]) => ({ name, amt: -amt }))
    let i = 0, j = 0
    while (i < c.length && j < d.length) {
      const transfer = Math.min(c[i].amt, d[j].amt)
      if (transfer > 0) result.push({ from: d[j].name, to: c[i].name, amount: Math.round(transfer) })
      c[i].amt -= transfer
      d[j].amt -= transfer
      if (c[i].amt < 1) i++
      if (d[j].amt < 1) j++
    }
    return result
  }

  const totalKRW = expenses.reduce((sum, e) => sum + toKRW(e.amount, e.currency), 0)
  const settlements = calcSettlement()
  const remaining = budget > 0 ? budget - totalKRW : null
  const budgetPct = budget > 0 ? Math.min((totalKRW / budget) * 100, 100) : 0

  function getCategoryEmoji(cat: string) {
    return CATEGORIES.find(c => c.id === cat)?.emoji ?? '💳'
  }

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

      <div className="flex gap-2">
        <button
          onClick={() => { setShowForm(true); setForm({ title: '', amount: '', paid_by: userName, split_with: members, category: '식비', currency: 'KRW' }) }}
          className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 rounded-xl transition text-sm"
        >
          + 지출 추가
        </button>
        <button
          onClick={() => setShowMembers(!showMembers)}
          className="px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
        >
          👥 멤버
        </button>
      </div>

      {showMembers && (
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="font-bold text-gray-800 mb-3">여행 멤버</h3>
          <div className="flex flex-wrap gap-2 mb-3">
            {members.length === 0 && <p className="text-sm text-gray-400">아직 멤버가 없어요</p>}
            {members.map(m => (
              <span key={m} className="flex items-center gap-1 bg-indigo-50 text-indigo-600 text-sm px-3 py-1 rounded-full">
                {m}
                <button onClick={() => removeMember(m)} className="text-indigo-300 hover:text-red-400 ml-1">✕</button>
              </span>
            ))}
          </div>
          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setShowDropdown(v => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-500 transition"
            >
              <span>멤버 추가하기</span>
              <span className="text-gray-400">{showDropdown ? '▲' : '▼'}</span>
            </button>
            {showDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                {allProfiles.filter(p => !members.includes(p)).length === 0 ? (
                  <p className="px-4 py-3 text-sm text-gray-400">추가할 수 있는 멤버가 없어요</p>
                ) : (
                  allProfiles.filter(p => !members.includes(p)).map(p => (
                    <button key={p} type="button"
                      onClick={() => { addMember(p); setShowDropdown(false) }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition"
                    >
                      {p}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="font-bold text-gray-800 mb-4">지출 추가</h3>
          <form onSubmit={addExpense} className="space-y-3">
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
              {form.currency !== 'KRW' && form.amount && rates[form.currency] && (
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
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600">취소</button>
              <button type="submit" className="flex-1 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-semibold">추가</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex bg-gray-100 rounded-xl p-1">
        <button onClick={() => setActiveView('list')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${activeView === 'list' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400'}`}>지출 목록</button>
        <button onClick={() => setActiveView('settlement')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${activeView === 'settlement' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400'}`}>정산</button>
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-8">불러오는 중...</p>
      ) : activeView === 'list' ? (
        <>
          {expenses.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-5xl mb-3">💰</div>
              <p>아직 지출이 없어요</p>
            </div>
          ) : (
            <>
              <div className="bg-indigo-50 rounded-xl px-4 py-3 flex justify-between items-center">
                <span className="text-sm text-indigo-600">총 지출</span>
                <span className="font-bold text-indigo-600">{totalKRW.toLocaleString()}원</span>
              </div>
              {expenses.map(exp => (
                <div key={exp.id} className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
                  <span className="text-2xl">{getCategoryEmoji(exp.category)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm">{exp.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{exp.paid_by} 결제 · {exp.split_with.join(', ')} 분담</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-gray-800 text-sm">
                      {exp.amount.toLocaleString()} {exp.currency}
                    </p>
                    {exp.currency !== 'KRW' && (
                      <p className="text-xs text-gray-400">≈ {toKRW(exp.amount, exp.currency).toLocaleString()}원</p>
                    )}
                    <p className="text-xs text-gray-400">
                      1인 {Math.round(toKRW(exp.amount, exp.currency) / exp.split_with.length).toLocaleString()}원
                    </p>
                  </div>
                  <button onClick={() => deleteExpense(exp.id)} className="text-gray-300 hover:text-red-400 text-xs ml-1">삭제</button>
                </div>
              ))}
            </>
          )}
        </>
      ) : (
        <div className="space-y-3">
          {settlements.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-5xl mb-3">🎉</div>
              <p>정산할 내용이 없어요</p>
            </div>
          ) : (
            settlements.map((s, i) => (
              <div key={i} className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
                <span className="text-sm font-medium text-gray-800">{s.from}</span>
                <span className="text-gray-400 text-sm">→</span>
                <span className="text-sm font-medium text-indigo-600">{s.to}</span>
                <span className="ml-auto font-bold text-gray-800">{s.amount.toLocaleString()}원</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
