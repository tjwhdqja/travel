import { useState, useEffect, useRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import PillButton from '../components/PillButton'
import KebabMenu from '../components/KebabMenu'
import EmptyState from '../components/EmptyState'
import Spinner from '../components/Spinner'
import { btn, card, input as inputCls, select as selectCls } from '../lib/design'
import Toast, { useToast } from '../components/Toast'

interface Expense {
  id: string
  title: string
  amount: number
  paid_by: string
  split_with: string[]
  category: string
  currency: string
  payment_method: string
  date: string | null
  created_at: string
}

interface Props {
  tripId: string
  userName: string
  budget?: number
  members: string[]
  isActive?: boolean
  destination?: string
}

type FormState = {
  title: string
  amount: string
  paid_by: string
  split_with: string[]
  category: string
  currency: string
  payment_method: string
  date: string
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

const DESTINATION_CURRENCY: Record<string, string> = {
  '오사카': 'JPY', '도쿄': 'JPY', '교토': 'JPY', '후쿠오카': 'JPY', '삿포로': 'JPY',
  '오키나와': 'JPY', '나고야': 'JPY', '나라': 'JPY', '미야코지마': 'JPY',
  '방콕': 'THB', '푸켓': 'THB', '치앙마이': 'THB',
  '상하이': 'CNY', '베이징': 'CNY',
  '파리': 'EUR', '로마': 'EUR', '바르셀로나': 'EUR', '암스테르담': 'EUR',
  '하와이': 'USD', '괌': 'USD', '사이판': 'USD', '뉴욕': 'USD', 'LA': 'USD',
}

function getCategoryEmoji(cat: string) {
  return CATEGORIES.find(c => c.id === cat)?.emoji ?? '💳'
}

function isPersonal(exp: Expense) {
  return exp.split_with.length === 1 && exp.split_with[0] === exp.paid_by && exp.category !== '정산'
}

function calcKRW(amount: number, currency: string, rates: Record<string, number>): number {
  if (currency === 'KRW') return amount
  if (!rates['KRW'] || !rates[currency]) return amount
  return Math.round(amount * rates['KRW'] / rates[currency])
}

interface FormProps {
  form: FormState
  setForm: (f: FormState) => void
  members: string[]
  rates: Record<string, number>
  onSubmit: (e: React.FormEvent) => void
  submitLabel: string
  onCancel: () => void
  submitting?: boolean
}

function ExpenseForm({ form, setForm, members, rates, onSubmit, submitLabel, onCancel, submitting = false }: FormProps) {
  function toggleSplit(name: string) {
    setForm({
      ...form,
      split_with: form.split_with.includes(name)
        ? form.split_with.filter(n => n !== name)
        : [...form.split_with, name],
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="text-xs text-gray-500 mb-2 block">카테고리</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.filter(c => c.id !== '정산').map(cat => (
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
        className={inputCls}
      />

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-gray-500 mb-1 block">날짜</label>
          <input
            type="date"
            value={form.date}
            onChange={e => setForm({ ...form, date: e.target.value })}
            required
            className={inputCls}
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-gray-500 mb-1 block">결제 수단</label>
          <div className="flex gap-2 mt-0.5">
            {(['카드', '현금'] as const).map(m => (
              <PillButton key={m} label={m === '카드' ? '💳 카드' : '💵 현금'}
                selected={form.payment_method === m}
                onClick={() => setForm({ ...form, payment_method: m })}
              />
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500 mb-1 block">금액</label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="금액"
            value={form.amount}
            onChange={e => setForm({ ...form, amount: e.target.value })}
            required
            min="1"
            className={`${inputCls} flex-1`}
          />
          <select
            value={form.currency}
            onChange={e => setForm({ ...form, currency: e.target.value })}
            className={`shrink-0 ${selectCls}`}
          >
            {CURRENCIES.map(cur => <option key={cur} value={cur}>{cur}</option>)}
          </select>
        </div>
        {form.currency !== 'KRW' && form.amount && rates['KRW'] && rates[form.currency] && (
          <p className="text-xs text-gray-400 mt-1.5">
            ≈ {calcKRW(Number(form.amount), form.currency, rates).toLocaleString()}원
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
        <div className="flex items-center mb-2">
          <label className="text-xs text-gray-500">나눌 사람</label>
          <div className="ml-auto flex gap-1.5">
            {(() => {
              const isAll = members.length > 0 && members.every(m => form.split_with.includes(m))
              const isMine = form.split_with.length === 1 && form.split_with[0] === form.paid_by
              return (
                <>
                  <button type="button"
                    onClick={() => setForm({ ...form, split_with: [...members] })}
                    className={btn.mini(isAll)}
                  >전원</button>
                  <button type="button"
                    onClick={() => setForm({ ...form, split_with: [form.paid_by] })}
                    className={btn.mini(isMine)}
                  >나만</button>
                </>
              )
            })()}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {members.map(m => (
            <PillButton key={m} label={m}
              selected={form.split_with.includes(m)}
              onClick={() => toggleSplit(m)}
            />
          ))}
        </div>
        {form.split_with.length > 0 && form.amount && (form.currency === 'KRW' || rates['KRW']) && (
          <p className="text-xs text-indigo-400 font-medium mt-1.5 bg-indigo-50 rounded-lg px-2.5 py-1.5">
            {form.split_with.length}명 분담 · 1인당 {Math.round(calcKRW(Number(form.amount), form.currency, rates) / form.split_with.length).toLocaleString()}원
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className={btn.secondary}>취소</button>
        <button type="submit" disabled={submitting} className={btn.action}>{submitLabel}</button>
      </div>
    </form>
  )
}

interface ItemProps {
  exp: Expense
  editingId: string | null
  form: FormState
  setForm: (f: FormState) => void
  members: string[]
  rates: Record<string, number>
  onStartEdit: (exp: Expense) => void
  onDelete: (id: string) => void
  onUpdate: (e: React.FormEvent) => void
  onCancelEdit: () => void
  submitting?: boolean
}

function ExpenseItem({ exp, editingId, form, setForm, members, rates, onStartEdit, onDelete, onUpdate, onCancelEdit, submitting = false }: ItemProps) {
  if (editingId === exp.id) {
    return (
      <div className={`${card.base} p-5`}>
        <h3 className="font-bold text-gray-800 mb-4">지출 수정</h3>
        <ExpenseForm form={form} setForm={setForm} members={members} rates={rates}
          onSubmit={onUpdate} submitLabel="저장" onCancel={onCancelEdit} submitting={submitting}
        />
      </div>
    )
  }

  const krw = calcKRW(exp.amount, exp.currency, rates)
  const personal = isPersonal(exp)

  return (
    <div className={`flex items-start gap-2 ${personal ? 'opacity-60' : ''}`}>
      <div className="w-5 flex-shrink-0 flex justify-center pt-3">
        <div className={`w-2.5 h-2.5 rounded-full ring-2 ring-white shadow-sm ${personal ? 'bg-gray-300' : 'bg-indigo-400'}`} />
      </div>
      <div className={`flex-1 ${card.itemBase} px-3 py-2.5 flex items-center gap-2 min-w-0 ${exp.category === '정산' ? 'bg-indigo-50' : 'bg-white'}`}>
        <span className="text-lg leading-none flex-shrink-0">{getCategoryEmoji(exp.category)}</span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-800 text-sm flex items-center gap-1.5">
            {exp.title}
            {personal && <span className="text-xs font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">개인</span>}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {personal ? (
              <>{exp.paid_by} 결제 · 정산 미포함</>
            ) : (
              <>
                <span className="text-indigo-500 font-semibold">{exp.paid_by}</span> 결제
                {exp.split_with.length === members.length ? ' · 전원 분담' : ''}
                {exp.payment_method && (
                  <span className="ml-1 text-gray-300">· {exp.payment_method === '카드' ? '💳' : '💵'}</span>
                )}
              </>
            )}
          </p>
          {!personal && exp.split_with.length < members.length && (
            <div className="flex gap-1 mt-1 flex-nowrap overflow-hidden">
              {exp.split_with.slice(0, 3).map(name => (
                <span key={name} className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full whitespace-nowrap">{name}</span>
              ))}
              {exp.split_with.length > 3 && (
                <span className="text-[10px] font-semibold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full whitespace-nowrap">+{exp.split_with.length - 3}명</span>
              )}
            </div>
          )}
        </div>
        <div className="text-right shrink-0 max-w-[40%]">
          <p className={`font-semibold text-sm break-all ${personal ? 'text-gray-400' : 'text-gray-800'}`}>
            {exp.amount.toLocaleString()} {exp.currency}
          </p>
          {exp.currency !== 'KRW' && rates['KRW'] && (
            <p className="text-xs text-gray-400">≈ {krw.toLocaleString()}원</p>
          )}
          {!personal && (exp.currency === 'KRW' || rates['KRW']) && (
            <p className="text-xs text-gray-400">
              1인 {Math.round(krw / exp.split_with.length).toLocaleString()}원
            </p>
          )}
        </div>
        <KebabMenu items={[
          { label: '수정', onClick: () => onStartEdit(exp) },
          { label: '삭제', onClick: () => onDelete(exp.id), danger: true },
        ]} />
      </div>
    </div>
  )
}

const emptyForm = (userName: string, members: string[], currency = 'KRW'): FormState => ({
  title: '', amount: '', paid_by: userName,
  split_with: [...members], category: '식비', currency, payment_method: '카드',
  date: new Date().toISOString().split('T')[0],
})

export default function ExpenseTab({ tripId, userName, budget = 0, members, isActive = true, destination }: Props) {
  const defaultCurrency = DESTINATION_CURRENCY[destination ?? ''] ?? 'KRW'
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [rates, setRates] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<'list' | 'settlement'>('list')
  const [showMemberStats, setShowMemberStats] = useState(false)
  const [showPreSettle, setShowPreSettle] = useState(false)
  const [preFrom, setPreFrom] = useState(userName)
  const [preTo, setPreTo] = useState('')
  const [preAmount, setPreAmount] = useState('')
  const [form, setForm] = useState<FormState>(emptyForm(userName, members, defaultCurrency))
  const [ratesUpdatedAt, setRatesUpdatedAt] = useState<Date | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const { toast, showToast } = useToast()
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingDeleteRef = useRef<{ id: string; item: Expense } | null>(null)
  const completeSubmittingRef = useRef(false)

  useEffect(() => {
    if (!isActive) { setShowForm(false); setEditingId(null); setShowMemberStats(false); setShowPreSettle(false) }
  }, [isActive])

  useEffect(() => {
    if (userName) fetchAll()
  }, [tripId, userName])

  useEffect(() => {
    const channel = supabase
      .channel(`expenses:${tripId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'expenses', filter: `trip_id=eq.${tripId}` }, ({ new: row }) => {
        setExpenses(prev => prev.some(e => e.id === row.id) ? prev : [row as Expense, ...prev])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'expenses', filter: `trip_id=eq.${tripId}` }, ({ new: row }) => {
        setExpenses(prev => prev.map(e => e.id === row.id ? row as Expense : e))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'expenses', filter: `trip_id=eq.${tripId}` }, ({ old: row }) => {
        setExpenses(prev => prev.filter(e => e.id !== row.id))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [tripId])

  function fetchRates() {
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(r => r.json())
      .then(data => { setRates(data.rates ?? {}); setRatesUpdatedAt(new Date()) })
      .catch(() => {})
  }

  useEffect(() => { fetchRates() }, [])

  function toKRW(amount: number, currency: string) {
    return calcKRW(amount, currency, rates)
  }

  async function fetchAll() {
    const { data: exp, error } = await supabase.from('expenses').select('*').eq('trip_id', tripId).order('created_at', { ascending: false })
    if (error) showToast('지출 내역을 불러오지 못했어요', 'error')
    setExpenses(exp ?? [])
    setLoading(false)
  }

  async function addExpense(e: React.FormEvent) {
    e.preventDefault()
    if (form.split_with.length === 0) { showToast('정산할 사람을 선택해주세요', 'error'); return }
    if (!form.amount || Number(form.amount) <= 0) { showToast('금액은 1 이상이어야 해요', 'error'); return }
    setSubmitting(true)
    const { data } = await supabase
      .from('expenses')
      .insert([{
        trip_id: tripId, title: form.title, amount: Number(form.amount),
        paid_by: form.paid_by, split_with: form.split_with,
        category: form.category, currency: form.currency,
        payment_method: form.payment_method, date: form.date,
      }])
      .select().single()
    if (data) {
      setExpenses(prev => [data, ...prev])
      setShowForm(false)
      setForm(emptyForm(userName, members, defaultCurrency))
      showToast('지출을 추가했어요')
    } else {
      showToast('지출 추가에 실패했어요', 'error')
    }
    setSubmitting(false)
  }

  async function updateExpense(e: React.FormEvent) {
    e.preventDefault()
    if (!editingId) return
    if (form.split_with.length === 0) { showToast('정산할 사람을 선택해주세요', 'error'); return }
    if (!form.amount || Number(form.amount) <= 0) { showToast('금액은 1 이상이어야 해요', 'error'); return }
    setSubmitting(true)
    const { data } = await supabase
      .from('expenses')
      .update({
        title: form.title, amount: Number(form.amount),
        paid_by: form.paid_by, split_with: form.split_with,
        category: form.category, currency: form.currency,
        payment_method: form.payment_method, date: form.date,
      })
      .eq('id', editingId)
      .select().single()
    if (data) {
      setExpenses(prev => prev.map(ex => ex.id === data.id ? data : ex))
      setEditingId(null)
      showToast('지출을 수정했어요')
    } else {
      showToast('지출 수정에 실패했어요', 'error')
    }
    setSubmitting(false)
  }

  function startEdit(exp: Expense) {
    setEditingId(exp.id)
    setShowForm(false)
    setForm({
      title: exp.title, amount: String(exp.amount),
      paid_by: exp.paid_by, split_with: exp.split_with,
      category: exp.category, currency: exp.currency,
      payment_method: exp.payment_method,
      date: exp.date ?? new Date().toISOString().split('T')[0],
    })
  }

  async function deleteExpense(id: string) {
    const item = expenses.find(e => e.id === id)
    if (!item) return
    if (pendingDeleteRef.current) {
      clearTimeout(undoTimerRef.current!)
      await supabase.from('expenses').delete().eq('id', pendingDeleteRef.current.id)
    }
    setExpenses(prev => prev.filter(e => e.id !== id))
    const timer = setTimeout(async () => {
      await supabase.from('expenses').delete().eq('id', id)
      pendingDeleteRef.current = null
    }, 3000)
    undoTimerRef.current = timer
    pendingDeleteRef.current = { id, item }
    showToast('지출을 삭제했어요', 'success', {
      label: '실행 취소',
      onClick: () => {
        clearTimeout(timer)
        setExpenses(prev => [item, ...prev])
        pendingDeleteRef.current = null
      },
    })
  }

  async function addPreSettlement(e: React.FormEvent) {
    e.preventDefault()
    if (!preTo || preFrom === preTo) { showToast('보낸 사람과 받은 사람이 달라야 합니다', 'error'); return }
    if (!preAmount || Number(preAmount) <= 0) { showToast('금액은 1 이상이어야 해요', 'error'); return }
    setSubmitting(true)
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
      showToast('송금을 기록했어요')
    } else {
      showToast('기록에 실패했어요', 'error')
    }
    setSubmitting(false)
  }

  async function completeSettlement(from: string, to: string, amount: number) {
    if (completeSubmittingRef.current) return
    completeSubmittingRef.current = true
    const { data } = await supabase
      .from('expenses')
      .insert([{
        trip_id: tripId,
        title: `${from} → ${to} 선 정산`,
        amount,
        paid_by: from,
        split_with: [to],
        category: '정산',
        currency: 'KRW',
        payment_method: '송금',
      }])
      .select().single()
    if (data) { setExpenses(prev => [data, ...prev]); showToast('송금을 기록했어요') }
    else { showToast('기록에 실패했어요', 'error') }
    completeSubmittingRef.current = false
  }

  function calcBalances() {
    const paid: Record<string, number> = {}
    const owed: Record<string, number> = {}
    members.forEach(m => { paid[m] = 0; owed[m] = 0 })
    expenses.forEach(exp => {
      if (isPersonal(exp)) return
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

  function getExpenseDate(exp: Expense) {
    return exp.date ?? exp.created_at.split('T')[0]
  }

  function formatDateHeader(dateStr: string) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
  }

  const groupedExpenses = (() => {
    const sorted = [...expenses].filter(e => e.category !== '정산').sort((a, b) => getExpenseDate(b).localeCompare(getExpenseDate(a)))
    const groups: { date: string; items: Expense[] }[] = []
    sorted.forEach(exp => {
      const date = getExpenseDate(exp)
      const last = groups[groups.length - 1]
      if (last?.date === date) last.items.push(exp)
      else groups.push({ date, items: [exp] })
    })
    return groups
  })()

  const totalKRW = expenses.filter(e => e.category !== '정산').reduce((sum, e) => sum + toKRW(e.amount, e.currency), 0)
  const remaining = budget > 0 ? budget - totalKRW : null
  const budgetPct = budget > 0 ? Math.min((totalKRW / budget) * 100, 100) : 0
  const balances = calcBalances()
  const settlements = calcSettlement()
  const personalExpenses = expenses.filter(isPersonal)
  const personalTotal = Math.round(personalExpenses.reduce((sum, e) => sum + toKRW(e.amount, e.currency), 0))
  const hasForeignCurrency = expenses.some(e => e.currency !== 'KRW')

  return (
    <div className="space-y-4">
      {!showForm && !editingId && (
        <button
          type="button"
          onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm(userName, members, defaultCurrency)) }}
          className={btn.primary}
        >
          + 지출 추가
        </button>
      )}

      {showForm && (
        <div className={`${card.base} p-5`}>
          <h3 className="font-bold text-gray-800 mb-4">지출 추가</h3>
          <ExpenseForm
            form={form} setForm={setForm} members={members} rates={rates}
            onSubmit={addExpense} submitLabel="추가" submitting={submitting}
            onCancel={() => { setShowForm(false); setForm(emptyForm(userName, members, defaultCurrency)) }}
          />
        </div>
      )}

      <div className="flex bg-gray-100 rounded-xl p-1">
        <button type="button" onClick={() => { setActiveView('list'); setShowForm(false); setEditingId(null) }} className={btn.segment(activeView === 'list')}>지출 목록</button>
        <button type="button" onClick={() => { setActiveView('settlement'); setShowForm(false); setEditingId(null) }} className={btn.segment(activeView === 'settlement')}>정산</button>
      </div>

      {loading ? (
        <Spinner />
      ) : activeView === 'list' ? (
        <>
          {budget > 0 && (
            <div className={`${card.section} space-y-2`}>
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

          {hasForeignCurrency && (
            <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              <span className="text-xs text-amber-800">
                💱 환율 마지막 갱신: {ratesUpdatedAt ? `${Math.round((Date.now() - ratesUpdatedAt.getTime()) / 60000)}분 전` : '미갱신'}
              </span>
              <button type="button" onClick={fetchRates} className="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 shrink-0 ml-2">
                🔄 갱신
              </button>
            </div>
          )}

          {expenses.length === 0 ? (
            <EmptyState icon="💰" title="아직 지출이 없어요" subtitle="+ 지출 추가를 눌러보세요" />
          ) : (
            <>
              {members.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowMemberStats(v => !v)}
                    className={`w-full flex items-center justify-between ${btn.toggle(showMemberStats)}`}
                  >
                    <span>사용자별 현황</span>
                    <ChevronDown size={16} className={`transition-transform ${showMemberStats ? 'rotate-180' : ''}`} />
                  </button>
                  {showMemberStats && (
                <div className={`${card.item} overflow-hidden`}>
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
                </>
              )}

              {groupedExpenses.map(({ date, items }) => {
                const dayTotal = items.reduce((sum, e) => sum + toKRW(e.amount, e.currency), 0)
                return (
                  <div key={date}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-gray-500">{formatDateHeader(date)}</span>
                      <span className="ml-auto text-sm font-bold text-gray-700">{Math.round(dayTotal).toLocaleString()}원</span>
                    </div>
                    <div className="space-y-2">
                      {items.map(exp => (
                        <ExpenseItem
                          key={exp.id}
                          exp={exp}
                          editingId={editingId}
                          form={form}
                          setForm={setForm}
                          members={members}
                          rates={rates}
                          onStartEdit={startEdit}
                          onDelete={deleteExpense}
                          onUpdate={updateExpense}
                          onCancelEdit={() => setEditingId(null)}
                          submitting={submitting}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </>
      ) : (
        <div className="space-y-3">
          {members.length === 0 ? (
            <EmptyState icon="👥" title="멤버가 없어요" subtitle="친구를 초대하면 정산이 가능해요" />
          ) : (
            <>
              {personalExpenses.length > 0 && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  <span className="text-xs text-amber-800">ℹ️ 개인 지출 {personalExpenses.length}건 ({personalTotal.toLocaleString()}원)은 정산에서 제외됐어요</span>
                </div>
              )}
              <div className={`${card.base} overflow-hidden`}>
                <div className="px-4 py-3 border-b border-gray-50">
                  <p className="text-sm font-semibold text-gray-700">잔액 요약</p>
                </div>
                {balances.map(b => (
                  <div key={b.name} className="flex items-center px-4 py-3 border-b border-gray-50 last:border-0 gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold shrink-0">
                      {b.name.slice(0, 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{b.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {Math.round(b.paid).toLocaleString()}원 냈고, {Math.round(b.owed).toLocaleString()}원 썼어요
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {b.net > 0 ? (
                        <>
                          <p className="text-xs text-emerald-500 font-medium">받을 금액</p>
                          <p className="text-sm font-bold text-emerald-500">+{Math.round(b.net).toLocaleString()}원</p>
                        </>
                      ) : b.net < 0 ? (
                        <>
                          <p className="text-xs text-red-400 font-medium">낼 금액</p>
                          <p className="text-sm font-bold text-red-400">{Math.round(b.net).toLocaleString()}원</p>
                        </>
                      ) : (
                        <p className="text-sm text-gray-400">정산 완료</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className={`${card.base} overflow-hidden`}>
                <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700">송금 기록</p>
                  <button type="button" onClick={() => setShowPreSettle(v => !v)} className={btn.chip}>
                    + 기록 추가
                  </button>
                </div>
                {showPreSettle && (
                  <div className="p-4 border-b border-gray-50">
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
                        min="1"
                        className={inputCls}
                      />
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setShowPreSettle(false)} className={btn.secondary}>취소</button>
                        <button type="submit" disabled={submitting} className={btn.action}>추가</button>
                      </div>
                    </form>
                  </div>
                )}
                {/* 미완료 이체 (앱 계산) — 회색 배경 */}
                {settlements.map(s => (
                  <div key={`${s.from}-${s.to}`} className="flex items-center px-4 py-3 border-b border-gray-50 gap-2 bg-gray-50">
                    <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                    <span className="text-sm font-semibold text-gray-400">{s.from}</span>
                    <span className="text-gray-300 text-xs">→</span>
                    <span className="text-sm font-semibold text-indigo-300">{s.to}</span>
                    <span className="ml-auto text-sm font-bold text-gray-500">{s.amount.toLocaleString()}원</span>
                    <button
                      type="button"
                      onClick={() => completeSettlement(s.from, s.to, s.amount)}
                      className={`${btn.chipSolid} shrink-0`}
                    >
                      송금함
                    </button>
                  </div>
                ))}
                {/* 완료된 송금 기록 — 흰 배경 dimmed */}
                {expenses.filter(e => e.category === '정산').map(exp => {
                  const dateStr = new Date(exp.created_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
                  return (
                    <div key={exp.id} className="flex items-center px-4 py-3 border-b border-gray-50 last:border-0 gap-2 opacity-50">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                      <span className="text-sm font-semibold text-gray-500">{exp.paid_by}</span>
                      <span className="text-gray-300 text-xs">→</span>
                      <span className="text-sm font-semibold text-indigo-400">{exp.split_with[0]}</span>
                      <span className="ml-auto text-sm font-bold text-gray-400 line-through">{exp.amount.toLocaleString()}원</span>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-md shrink-0">{dateStr}</span>
                      <button type="button" onClick={() => deleteExpense(exp.id)} className={btn.danger}>삭제</button>
                    </div>
                  )
                })}
                {settlements.length === 0 && expenses.filter(e => e.category === '정산').length === 0 && !showPreSettle && (
                  <p className="px-4 py-4 text-sm text-gray-400 text-center">🎉 정산할 내용이 없어요</p>
                )}
              </div>
            </>
          )}
        </div>
      )}
      {toast && <Toast message={toast.message} type={toast.type} action={toast.action} />}
    </div>
  )
}
