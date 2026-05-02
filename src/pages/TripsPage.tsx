import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

interface Trip {
  id: string
  name: string
  destination: string
  start_date: string
  end_date: string
  budget: number
  created_at: string
}

export default function TripsPage({ nickname }: { nickname: string }) {
  const navigate = useNavigate()
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', destination: '', start_date: '', end_date: '', budget: '' })
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => { fetchTrips() }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function fetchTrips() {
    const { data } = await supabase.from('trips').select('*').order('created_at', { ascending: false })
    setTrips(data ?? [])
    setLoading(false)
  }

  async function createTrip(e: React.FormEvent) {
    e.preventDefault()
    const { data } = await supabase.from('trips').insert([{
      name: form.name,
      destination: form.destination,
      start_date: form.start_date,
      end_date: form.end_date,
      budget: Number(form.budget) || 0
    }]).select().single()
    if (data) {
      setTrips([data, ...trips])
      setShowForm(false)
      setForm({ name: '', destination: '', start_date: '', end_date: '', budget: '' })
    }
  }

  async function updateTrip(e: React.FormEvent) {
    e.preventDefault()
    if (!editingTrip) return
    const { data } = await supabase.from('trips').update({
      name: form.name,
      destination: form.destination,
      start_date: form.start_date,
      end_date: form.end_date,
      budget: Number(form.budget) || 0
    }).eq('id', editingTrip.id).select().single()
    if (data) {
      setTrips(prev => prev.map(t => t.id === data.id ? data : t))
      setEditingTrip(null)
      setForm({ name: '', destination: '', start_date: '', end_date: '', budget: '' })
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
      name: trip.name,
      destination: trip.destination,
      start_date: trip.start_date,
      end_date: trip.end_date,
      budget: trip.budget > 0 ? String(trip.budget) : ''
    })
    setShowForm(false)
    setOpenMenu(null)
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

  const TripForm = ({ onSubmit, title, submitLabel }: { onSubmit: (e: React.FormEvent) => void; title: string; submitLabel: string }) => (
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
        <input
          placeholder="여행지 (예: 일본 오사카)"
          value={form.destination}
          onChange={e => setForm({ ...form, destination: e.target.value })}
          required
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
        />
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
        <input
          type="number"
          placeholder="총 예산 (원, 선택)"
          value={form.budget}
          onChange={e => setForm({ ...form, budget: e.target.value })}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
        />
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => { setShowForm(false); setEditingTrip(null); setForm({ name: '', destination: '', start_date: '', end_date: '', budget: '' }) }}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
          >
            취소
          </button>
          <button type="submit" className="flex-1 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600">{submitLabel}</button>
        </div>
      </form>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">✈️ 우리들의 여행</h1>
          <p className="text-xs text-gray-400">{nickname}님 안녕하세요</p>
        </div>
        <button onClick={() => supabase.auth.signOut()} className="text-sm text-gray-400 hover:text-gray-600">
          로그아웃
        </button>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4">
        <button
          onClick={() => { setShowForm(true); setEditingTrip(null); setForm({ name: '', destination: '', start_date: '', end_date: '', budget: '' }) }}
          className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 rounded-xl transition"
        >
          + 새 여행 만들기
        </button>

        {showForm && <TripForm onSubmit={createTrip} title="새 여행" submitLabel="만들기" />}
        {editingTrip && <TripForm onSubmit={updateTrip} title="여행 수정" submitLabel="저장" />}

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
              <div key={trip.id} className="bg-white rounded-2xl shadow-sm p-5 hover:shadow-md transition">
                <div className="flex items-start justify-between mb-2">
                  <div
                    className="flex items-center gap-2 flex-wrap flex-1 cursor-pointer"
                    onClick={() => navigate(`/trip/${trip.id}`)}
                  >
                    <h3 className="font-bold text-gray-800">{trip.name}</h3>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
                  </div>
                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    <span className="text-indigo-500 text-sm font-bold">{dday}</span>
                    <div ref={openMenu === trip.id ? menuRef : null} className="relative">
                      <button
                        onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === trip.id ? null : trip.id) }}
                        className="flex flex-col gap-[3px] items-center justify-center w-7 h-7 rounded-lg hover:bg-gray-100 transition"
                      >
                        <span className="block w-4 h-[2px] bg-gray-400 rounded" />
                        <span className="block w-4 h-[2px] bg-gray-400 rounded" />
                        <span className="block w-4 h-[2px] bg-gray-400 rounded" />
                      </button>
                      {openMenu === trip.id && (
                        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-20 overflow-hidden min-w-[90px]">
                          <button
                            onClick={e => { e.stopPropagation(); openEdit(trip) }}
                            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            수정
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); setOpenMenu(null); deleteTrip(trip.id) }}
                            className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-50"
                          >
                            삭제
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div
                  className="cursor-pointer"
                  onClick={() => navigate(`/trip/${trip.id}`)}
                >
                  <p className="text-indigo-500 text-sm">📍 {trip.destination}</p>
                  <p className="text-gray-400 text-xs mt-1">{formatDate(trip.start_date)} ~ {formatDate(trip.end_date)}</p>
                  {trip.budget > 0 && (
                    <p className="text-gray-400 text-xs mt-0.5">💰 예산 {trip.budget.toLocaleString()}원</p>
                  )}
                </div>
              </div>
            )
          })
        )}
      </main>
    </div>
  )
}
