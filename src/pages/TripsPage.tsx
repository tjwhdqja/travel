import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ChevronDown, ChevronUp, Pencil } from 'lucide-react'
import { btn } from '../lib/design'
import HamburgerMenu from '../components/HamburgerMenu'

interface Trip {
  id: string
  name: string
  destination: string
  start_date: string
  end_date: string
  budget: number
  created_at: string
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
        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
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
                    className="px-3 py-1.5 text-sm rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition">
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
}

function TripForm({ form, setForm, onSubmit, onCancel, title, submitLabel }: TripFormProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <h2 className="font-bold text-gray-800 mb-4">{title}</h2>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          placeholder="여행 이름 (예: 오사카 여행)"
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          required
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
        />
        <DestinationInput value={form.destination} onChange={v => setForm({ ...form, destination: v })} />
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-gray-500 mb-1 block">출발일</label>
            <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} required className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm" />
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-500 mb-1 block">귀국일</label>
            <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} required className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {[10, 50, 100, 200, 300, 500].map(wan => (
              <button key={wan} type="button"
                onClick={() => setForm({ ...form, budget: String(wan * 10000) })}
                className="px-3 py-1.5 text-xs rounded-full bg-gray-100 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition">
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
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
            />
            {form.budget && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400">원</span>}
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onCancel} className={btn.secondary}>취소</button>
          <button type="submit" className={btn.action}>{submitLabel}</button>
        </div>
      </form>
    </div>
  )
}

const emptyForm: FormState = { name: '', destination: '', start_date: '', end_date: '', budget: '' }

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
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => { fetchTrips() }, [])

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
    await supabase.from('profiles').update({ nickname: trimmed }).eq('id', user.id)
    onNicknameChange(trimmed)
    setEditingNickname(false)
  }

  async function fetchTrips() {
    const { data: memberData } = await supabase
      .from('trip_members').select('trip_id').eq('name', nickname)
    const tripIds = memberData?.map(m => m.trip_id) ?? []
    if (tripIds.length === 0) { setTrips([]); setLoading(false); return }
    const { data } = await supabase
      .from('trips').select('*').in('id', tripIds).order('created_at', { ascending: false })
    setTrips(data ?? [])
    setLoading(false)
  }

  async function createTrip(e: React.FormEvent) {
    e.preventDefault()
    const { data } = await supabase.from('trips').insert([{
      name: form.name, destination: form.destination,
      start_date: form.start_date, end_date: form.end_date,
      budget: Number(form.budget) || 0, created_by: nickname
    }]).select().single()
    if (data) {
      await supabase.from('trip_members').insert([{ trip_id: data.id, name: nickname }])
      setTrips([data, ...trips])
      setShowForm(false)
      setForm(emptyForm)
    }
  }

  async function updateTrip(e: React.FormEvent) {
    e.preventDefault()
    if (!editingTrip) return
    const { data } = await supabase.from('trips').update({
      name: form.name, destination: form.destination,
      start_date: form.start_date, end_date: form.end_date,
      budget: Number(form.budget) || 0
    }).eq('id', editingTrip.id).select().single()
    if (data) {
      setTrips(prev => prev.map(t => t.id === data.id ? data : t))
      setEditingTrip(null)
      setForm(emptyForm)
    }
  }

  async function deleteTrip(id: string) {
    if (!confirm('여행을 삭제하면 모든 데이터가 사라져요. 정말 삭제할까요?')) return
    await supabase.from('trips').delete().eq('id', id)
    setTrips(prev => prev.filter(t => t.id !== id))
  }

  function openEdit(trip: Trip) {
    setEditingTrip(trip)
    setForm({
      name: trip.name, destination: trip.destination,
      start_date: trip.start_date, end_date: trip.end_date,
      budget: trip.budget > 0 ? String(trip.budget) : ''
    })
    setShowForm(false)

  }

  function cancelForm() {
    setShowForm(false)
    setEditingTrip(null)
    setForm(emptyForm)
  }

  function getStatus(trip: Trip): { label: string; color: string } {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = new Date(trip.start_date)
    const end = new Date(trip.end_date)
    if (today < start) return { label: '예정', color: 'bg-blue-100 text-blue-600' }
    if (today > end) return { label: '완료', color: 'bg-gray-100 text-gray-500' }
    return { label: '여행중', color: 'bg-green-100 text-green-600' }
  }

  function getDday(trip: Trip): string {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = new Date(trip.start_date)
    const end = new Date(trip.end_date)
    if (today > end) return '완료'
    if (today >= start) return 'D-day'
    const diff = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return `D-${diff}`
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">✈️ 우리들의 여행</h1>
        <div ref={userMenuRef} className="relative">
          <button
            onClick={() => setShowUserMenu(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-gray-50 transition"
          >
            <div className="w-7 h-7 rounded-full bg-indigo-400 flex items-center justify-center text-white text-xs font-bold">
              {nickname.slice(0, 1)}
            </div>
            <span className="text-sm text-gray-700 font-medium">{nickname}</span>
            {showUserMenu ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-11 z-20 bg-white rounded-xl shadow-lg border border-gray-100 w-36 overflow-hidden">
              <button
                onClick={() => { setNicknameInput(nickname); setEditingNickname(true); setShowUserMenu(false) }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition flex items-center gap-2"
              >
                <Pencil size={13} />
                닉네임 수정
              </button>
              <button
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
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30" onClick={() => setEditingNickname(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-72 mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 mb-4">닉네임 수정</h3>
            <input
              value={nicknameInput}
              onChange={e => setNicknameInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveNickname(); if (e.key === 'Escape') setEditingNickname(false) }}
              autoFocus
              placeholder="새 닉네임"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm mb-3"
            />
            <div className="flex gap-2">
              <button onClick={() => setEditingNickname(false)} className={btn.secondary}>취소</button>
              <button onClick={saveNickname} className={btn.action}>저장</button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-lg mx-auto p-4 space-y-4">
        <button
          onClick={() => { setShowForm(true); setEditingTrip(null); setForm(emptyForm) }}
          className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 rounded-xl transition"
        >
          + 새 여행 만들기
        </button>

        {showForm && (
          <TripForm form={form} setForm={setForm} onSubmit={createTrip} onCancel={cancelForm} title="새 여행" submitLabel="만들기" />
        )}
        {editingTrip && (
          <TripForm form={form} setForm={setForm} onSubmit={updateTrip} onCancel={cancelForm} title="여행 수정" submitLabel="저장" />
        )}

        {loading ? (
          <p className="text-center text-gray-400 py-8">불러오는 중...</p>
        ) : trips.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-3">🗺️</div>
            <p>아직 여행이 없어요</p>
            <p className="text-sm mt-1">새 여행을 만들어보세요!</p>
          </div>
        ) : (
          trips.map(trip => {
            const status = getStatus(trip)
            const dday = getDday(trip)
            return (
              <div
                key={trip.id}
                className="bg-white rounded-2xl shadow-sm p-5 hover:shadow-md transition cursor-pointer"
                onClick={() => navigate(`/trip/${trip.id}`)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap flex-1">
                    <h3 className="font-bold text-gray-800">{trip.name}</h3>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
                  </div>
                  <div className="flex items-center gap-2 ml-2 shrink-0" onClick={e => e.stopPropagation()}>
                    <span className="text-indigo-500 text-sm font-bold">{dday}</span>
                    {trip.created_by === nickname && (
                      <HamburgerMenu items={[
                        { label: '수정', onClick: () => openEdit(trip) },
                        { label: '삭제', onClick: () => deleteTrip(trip.id), danger: true },
                      ]} />
                    )}
                  </div>
                </div>
                <p className="text-indigo-500 text-sm">📍 {trip.destination}</p>
                <p className="text-gray-400 text-xs mt-1">{formatDate(trip.start_date)} ~ {formatDate(trip.end_date)}</p>
                {trip.budget > 0 && <p className="text-gray-400 text-xs mt-0.5">💰 예산 {trip.budget.toLocaleString()}원</p>}
              </div>
            )
          })
        )}
      </main>
    </div>
  )
}
