import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getDdayLabel, getAvatarColor } from '../lib/utils'
import { useUndoDelete } from '../lib/useUndoDelete'
import { ChevronDown, ChevronUp, Pencil } from 'lucide-react'
import { btn, card, input as inputCls, badge } from '../lib/design'
import KebabMenu from '../components/KebabMenu'
import EmptyState from '../components/EmptyState'
import Spinner from '../components/Spinner'
import Toast, { useToast } from '../components/Toast'

interface Trip {
  id: string
  name: string
  destination: string
  start_date: string
  end_date: string
  budget: number | null
  created_at: string | null
  created_by: string | null
}

type FormState = { name: string; destination: string; start_date: string; end_date: string; budget: string }

const DESTINATIONS = [
  { region: '🇯🇵 일본', places: ['오사카', '도쿄', '교토', '후쿠오카', '삿포로', '오키나와', '나고야', '나라', '미야코지마'] },
  { region: '🌏 동남아', places: ['방콕', '발리', '다낭', '세부', '싱가포르', '푸켓', '하노이', '호치민', '쿠알라룸푸르', '치앙마이'] },
  { region: '🇨🇳 중화권', places: ['홍콩', '마카오', '상하이', '베이징', '타이베이'] },
  { region: '🌍 유럽·중동', places: ['파리', '로마', '바르셀로나', '런던', '프라하', '암스테르담', '두바이', '이스탄불'] },
  { region: '🌎 미주·오세아니아', places: ['하와이', '괌', '사이판', '뉴욕', 'LA', '시드니', '뉴질랜드'] },
  { region: '🇰🇷 국내', places: ['제주도', '부산', '강릉', '경주', '여수', '전주'] },
]

function DestinationInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="여행지 선택 또는 직접 입력"
        required
        className={inputCls}
      />
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-2xl shadow-xl border border-gray-100 max-h-72 overflow-y-auto">
          {DESTINATIONS.map(group => (
            <div key={group.region}>
              <p className="px-4 pt-2.5 pb-1 text-xs font-semibold text-gray-400">{group.region}</p>
              <div className="flex flex-wrap gap-1.5 px-3 pb-2.5">
                {group.places.map(place => (
                  <button key={place} type="button"
                    onMouseDown={() => { onChange(place); setOpen(false) }}
                    className={btn.chip}>
                    {place}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface TripFormProps {
  form: FormState
  setForm: (f: FormState) => void
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  title: string
  submitLabel: string
  submitting?: boolean
}

function TripForm({ form, setForm, onSubmit, onCancel, title, submitLabel, submitting = false }: TripFormProps) {
  return (
    <div className={`${card.base} p-6`}>
      <h2 className="font-bold text-gray-800 mb-4">{title}</h2>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          placeholder="여행 이름 (예: 오사카 여행)"
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          required
          className={inputCls}
        />
        <DestinationInput value={form.destination} onChange={v => setForm({ ...form, destination: v })} />
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-gray-500 mb-1 block">출발일</label>
            <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} required className={inputCls} />
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-500 mb-1 block">종료일</label>
            <input type="date" value={form.end_date} min={form.start_date} onChange={e => setForm({ ...form, end_date: e.target.value })} required className={inputCls} />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {[10, 50, 100, 200, 300, 500].map(wan => (
              <button key={wan} type="button"
                onClick={() => setForm({ ...form, budget: String((Number(form.budget) || 0) + wan * 10000) })}
                className={btn.chip}>
                {wan}만
              </button>
            ))}
          </div>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              placeholder="총 예산 (선택)"
              value={form.budget ? Number(form.budget).toLocaleString('ko-KR') : ''}
              onChange={e => {
                const raw = e.target.value.replace(/,/g, '')
                if (raw === '' || /^\d+$/.test(raw)) setForm({ ...form, budget: raw })
              }}
              className={inputCls}
            />
            {form.budget && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400">원</span>}
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onCancel} className={btn.secondary}>취소</button>
          <button type="submit" disabled={submitting} className={btn.action}>{submitLabel}</button>
        </div>
      </form>
    </div>
  )
}

const emptyForm: FormState = { name: '', destination: '', start_date: '', end_date: '', budget: '' }

function getDuration(trip: { start_date: string; end_date: string }): string {
  const start = new Date(trip.start_date + 'T00:00:00')
  const end = new Date(trip.end_date + 'T00:00:00')
  const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
  return days === 1 ? '당일치기' : `${days - 1}박${days}일`
}

function getStatusPriority(trip: { start_date: string; end_date: string }): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const start = new Date(trip.start_date + 'T00:00:00')
  const end = new Date(trip.end_date + 'T00:00:00')
  if (today >= start && today <= end) return 0
  if (today < start) return 1
  return 2
}

function getStatus(trip: { start_date: string; end_date: string }): { label: string; variant: 'blue' | 'gray' | 'green' } {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const start = new Date(trip.start_date + 'T00:00:00')
  const end = new Date(trip.end_date + 'T00:00:00')
  if (today < start) return { label: '예정', variant: 'blue' }
  if (today > end) return { label: '완료', variant: 'gray' }
  return { label: '여행 중', variant: 'green' }
}

function formatDate(date: string) {
  return new Date(date + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
}

export default function TripsPage({ nickname, onNicknameChange }: { nickname: string; onNicknameChange: (n: string) => void }) {
  const navigate = useNavigate()
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [editingNickname, setEditingNickname] = useState(false)
  const [nicknameInput, setNicknameInput] = useState(nickname)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const { toast, showToast } = useToast()
  const deleteTripUndo = useUndoDelete('trips', setTrips, showToast, '여행을 삭제했어요',
    (prev, item) => [...prev, item].sort((a, b) => {
      const pa = getStatusPriority(a), pb = getStatusPriority(b)
      if (pa !== pb) return pa - pb
      if (pa === 2) return b.start_date.localeCompare(a.start_date)
      return a.start_date.localeCompare(b.start_date)
    })
  )

  const fetchTrips = useCallback(async () => {
    const { data: memberData, error } = await supabase
      .from('trip_members').select('trip_id').eq('name', nickname)
    if (error) { showToast('여행 목록을 불러오지 못했어요', 'error'); setLoading(false); return }
    const tripIds = (memberData?.map(m => m.trip_id) ?? []).filter((id): id is string => id !== null)
    if (tripIds.length === 0) { setTrips([]); setLoading(false); return }
    const { data, error: tripsError } = await supabase
      .from('trips').select('*').in('id', tripIds)
    if (tripsError) { showToast('여행 목록을 불러오지 못했어요', 'error'); setLoading(false); return }
    const sorted = (data ?? []).sort((a, b) => {
      const pa = getStatusPriority(a), pb = getStatusPriority(b)
      if (pa !== pb) return pa - pb
      if (pa === 2) return b.start_date.localeCompare(a.start_date)
      return a.start_date.localeCompare(b.start_date)
    })
    setTrips(sorted)
    setLoading(false)
  }, [nickname, showToast])

  useEffect(() => { fetchTrips() }, [fetchTrips])

  useEffect(() => {
    const channel = supabase
      .channel(`trips:user:${nickname}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips', filter: `created_by=eq.${nickname}` }, () => { fetchTrips() })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trip_members', filter: `name=eq.${nickname}` }, () => { fetchTrips() })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'trip_members', filter: `name=eq.${nickname}` }, () => { fetchTrips() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [nickname, fetchTrips])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function saveNickname() {
    const trimmed = nicknameInput.trim()
    if (!trimmed || trimmed === nickname) { setEditingNickname(false); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('profiles').update({ nickname: trimmed }).eq('id', user.id)
    if (error) { showToast('닉네임 변경에 실패했어요', 'error'); return }

    const { data: memberRows } = await supabase.from('trip_members').select('trip_id').eq('name', nickname)
    const tripIds = (memberRows?.map(m => m.trip_id) ?? []).filter((id): id is string => id !== null)

    const updates = [
      supabase.from('trip_members').update({ name: trimmed }).eq('name', nickname),
      ...(tripIds.length > 0 ? [
        supabase.from('trips').update({ created_by: trimmed }).eq('created_by', nickname).in('id', tripIds),
        supabase.from('schedules').update({ created_by: trimmed }).eq('created_by', nickname).in('trip_id', tripIds),
        supabase.from('checklists').update({ created_by: trimmed }).eq('created_by', nickname).in('trip_id', tripIds),
        supabase.from('expenses').update({ paid_by: trimmed }).eq('paid_by', nickname).in('trip_id', tripIds),
        supabase.from('guide_items').update({ created_by: trimmed }).eq('created_by', nickname).in('trip_id', tripIds),
      ] : []),
    ]

    const results = await Promise.all(updates)
    const hasError = results.some(r => r.error)
    if (hasError) {
      showToast('일부 데이터 업데이트에 실패했어요. 다시 시도해주세요.', 'error')
      return
    }

    // split_with 배열 내부의 닉네임도 교체 (배열 요소는 SDK로 직접 교체 불가라 fetch 후 업데이트)
    if (tripIds.length > 0) {
      const { data: splitExpenses } = await supabase
        .from('expenses')
        .select('id, split_with')
        .in('trip_id', tripIds)
        .contains('split_with', [nickname])
      if (splitExpenses && splitExpenses.length > 0) {
        await Promise.all(
          splitExpenses.map(exp =>
            supabase.from('expenses').update({
              split_with: (exp.split_with as string[]).map((n: string) => n === nickname ? trimmed : n),
            }).eq('id', exp.id)
          )
        )
      }
    }

    if (tripIds.length > 0) {
      const { data: remainderExpenses } = await supabase
        .from('expenses')
        .select('id, remainder_to')
        .in('trip_id', tripIds)
        .contains('remainder_to', [nickname])
      if (remainderExpenses && remainderExpenses.length > 0) {
        await Promise.all(
          remainderExpenses.map(exp =>
            supabase.from('expenses').update({
              remainder_to: (exp.remainder_to as string[]).map((n: string) => n === nickname ? trimmed : n),
            }).eq('id', exp.id)
          )
        )
      }
    }

    if (tripIds.length > 0) {
      const { data: settleExpenses } = await supabase
        .from('expenses')
        .select('id, title')
        .eq('category', '정산')
        .in('trip_id', tripIds)
      const toUpdate = settleExpenses?.filter(e => typeof e.title === 'string' && e.title.includes(nickname)) ?? []
      if (toUpdate.length > 0) {
        await Promise.all(
          toUpdate.map(e =>
            supabase.from('expenses').update({ title: (e.title as string).replaceAll(nickname, trimmed) }).eq('id', e.id)
          )
        )
      }
    }

    onNicknameChange(trimmed)
    setEditingNickname(false)
    showToast('닉네임을 변경했어요')
  }

  async function createTrip(e: React.FormEvent) {
    e.preventDefault()
    if (form.end_date < form.start_date) {
      showToast('종료일이 출발일보다 빠를 수 없어요', 'error')
      return
    }
    setSubmitting(true)
    const { data } = await supabase.from('trips').insert([{
      name: form.name, destination: form.destination,
      start_date: form.start_date, end_date: form.end_date,
      budget: Number(form.budget) || 0, created_by: nickname
    }]).select().single()
    if (data) {
      const { error: memberError } = await supabase.from('trip_members').insert([{ trip_id: data.id, name: nickname }])
      if (memberError) {
        await supabase.from('trips').delete().eq('id', data.id)
        showToast('여행 만들기에 실패했어요', 'error')
      } else {
        setTrips(prev => [data, ...prev])
        setShowForm(false)
        setForm(emptyForm)
        showToast('여행을 만들었어요')
      }
    } else {
      showToast('여행 만들기에 실패했어요', 'error')
    }
    setSubmitting(false)
  }

  async function updateTrip(e: React.FormEvent) {
    e.preventDefault()
    if (!editingTrip) return
    if (form.end_date < form.start_date) {
      showToast('종료일이 출발일보다 빠를 수 없어요', 'error')
      return
    }
    setSubmitting(true)
    const { data } = await supabase.from('trips').update({
      name: form.name, destination: form.destination,
      start_date: form.start_date, end_date: form.end_date,
      budget: Number(form.budget) || 0
    }).eq('id', editingTrip.id).select().single()
    if (data) {
      setTrips(prev => prev.map(t => t.id === data.id ? data : t))
      setEditingTrip(null)
      setForm(emptyForm)
      const { count } = await supabase.from('schedules')
        .delete({ count: 'exact' })
        .eq('trip_id', editingTrip.id)
        .or(`date.lt.${form.start_date},date.gt.${form.end_date}`)
      if (count && count > 0) {
        showToast(`여행을 수정했어요 (범위 밖 일정 ${count}개 삭제)`)
      } else {
        showToast('여행을 수정했어요')
      }
    } else {
      showToast('여행 수정에 실패했어요', 'error')
    }
    setSubmitting(false)
  }

  async function deleteTrip(id: string) {
    const item = trips.find(t => t.id === id)
    if (item) await deleteTripUndo(id, item)
  }

  function openEdit(trip: Trip) {
    setEditingTrip(trip)
    setForm({
      name: trip.name, destination: trip.destination,
      start_date: trip.start_date, end_date: trip.end_date,
      budget: (trip.budget ?? 0) > 0 ? String(trip.budget) : ''
    })
    setShowForm(false)
  }

  function cancelForm() {
    setShowForm(false)
    setEditingTrip(null)
    setForm(emptyForm)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">✈️ 우리들의 여행</h1>
        <div ref={userMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setShowUserMenu(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-gray-50 transition"
          >
            <div className={`w-7 h-7 rounded-full ${getAvatarColor(nickname)} flex items-center justify-center text-white text-xs font-bold`}>
              {nickname.slice(0, 1)}
            </div>
            <span className="text-sm text-gray-700 font-medium">{nickname}</span>
            {showUserMenu ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-11 z-20 bg-white rounded-xl shadow-lg border border-gray-100 w-36 overflow-hidden">
              <button
                type="button"
                onClick={() => { setNicknameInput(nickname); setEditingNickname(true); setShowUserMenu(false) }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition flex items-center gap-2"
              >
                <Pencil size={13} />
                닉네임 수정
              </button>
              <button
                type="button"
                onClick={() => supabase.auth.signOut()}
                className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-50 transition"
              >
                로그아웃
              </button>
            </div>
          )}
        </div>
      </header>

      {editingNickname && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setEditingNickname(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-72 mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 mb-4">닉네임 수정</h3>
            <input
              value={nicknameInput}
              onChange={e => setNicknameInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveNickname(); if (e.key === 'Escape') setEditingNickname(false) }}
              autoFocus
              placeholder="새 닉네임"
              className={`${inputCls} mb-3`}
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditingNickname(false)} className={btn.secondary}>취소</button>
              <button type="button" onClick={saveNickname} className={btn.action}>저장</button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {!showForm && !editingTrip && (
          <button
            type="button"
            onClick={() => { setShowForm(true); setEditingTrip(null); setForm(emptyForm) }}
            className={btn.primary}
          >
            + 새 여행 만들기
          </button>
        )}

        {showForm && (
          <TripForm form={form} setForm={setForm} onSubmit={createTrip} onCancel={cancelForm} title="새 여행" submitLabel="만들기" submitting={submitting} />
        )}
        {editingTrip && (
          <TripForm form={form} setForm={setForm} onSubmit={updateTrip} onCancel={cancelForm} title="여행 수정" submitLabel="저장" submitting={submitting} />
        )}

        {loading ? (
          <Spinner />
        ) : trips.length === 0 ? (
          <EmptyState icon="🗺️" title="아직 여행이 없어요" subtitle="새 여행을 만들어보세요" />
        ) : (
          trips.map(trip => {
            const status = getStatus(trip)
            const dday = getDdayLabel(trip.start_date, trip.end_date, '완료')
            return (
              <div
                key={trip.id}
                className={`${card.base} p-5 hover:shadow-md transition cursor-pointer`}
                onClick={() => navigate(`/trip/${trip.id}`)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap flex-1">
                    <h3 className="font-bold text-gray-800">{trip.name}</h3>
                    <span className={badge[status.variant]}>{status.label}</span>
                  </div>
                  <div className="flex items-center gap-2 ml-2 shrink-0" onClick={e => e.stopPropagation()}>
                    <span className="text-indigo-500 text-sm font-bold">{dday}</span>
                    {trip.created_by === nickname && (
                      <KebabMenu items={[
                        { label: '수정', onClick: () => openEdit(trip) },
                        { label: '삭제', onClick: () => deleteTrip(trip.id), danger: true },
                      ]} />
                    )}
                  </div>
                </div>
                <p className="text-indigo-500 text-sm">📍 {trip.destination}</p>
                <p className="text-gray-400 text-xs mt-1">{formatDate(trip.start_date)} ~ {formatDate(trip.end_date)} · {getDuration(trip)}</p>
                {(trip.budget ?? 0) > 0 && <p className="text-gray-400 text-xs mt-0.5">💰 예산 {trip.budget!.toLocaleString()}원</p>}
              </div>
            )
          })
        )}
      </main>
      {toast && <Toast message={toast.message} type={toast.type} action={toast.action} />}
    </div>
  )
}
