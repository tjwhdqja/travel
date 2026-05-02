import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Session } from '@supabase/supabase-js'

interface Trip {
  id: string
  name: string
  destination: string
  start_date: string
  end_date: string
  created_at: string
}

export default function TripsPage({ session }: { session: Session }) {
  const navigate = useNavigate()
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', destination: '', start_date: '', end_date: '' })

  const userName = session.user.email?.split('@')[0] ?? '사용자'

  useEffect(() => {
    fetchTrips()
  }, [])

  async function fetchTrips() {
    const { data } = await supabase.from('trips').select('*').order('created_at', { ascending: false })
    setTrips(data ?? [])
    setLoading(false)
  }

  async function createTrip(e: React.FormEvent) {
    e.preventDefault()
    const { data } = await supabase.from('trips').insert([form]).select().single()
    if (data) {
      setTrips([data, ...trips])
      setShowForm(false)
      setForm({ name: '', destination: '', start_date: '', end_date: '' })
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">✈️ 우리들의 여행</h1>
          <p className="text-xs text-gray-400">{userName}님 안녕하세요</p>
        </div>
        <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-gray-600">
          로그아웃
        </button>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4">
        <button
          onClick={() => setShowForm(true)}
          className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 rounded-xl transition"
        >
          + 새 여행 만들기
        </button>

        {showForm && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="font-bold text-gray-800 mb-4">새 여행</h2>
            <form onSubmit={createTrip} className="space-y-3">
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
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={e => setForm({ ...form, start_date: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">귀국일</label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={e => setForm({ ...form, end_date: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600"
                >
                  만들기
                </button>
              </div>
            </form>
          </div>
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
          trips.map(trip => (
            <div
              key={trip.id}
              onClick={() => navigate(`/trip/${trip.id}`)}
              className="bg-white rounded-2xl shadow-sm p-5 cursor-pointer hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-gray-800">{trip.name}</h3>
                  <p className="text-indigo-500 text-sm mt-0.5">📍 {trip.destination}</p>
                </div>
                <span className="text-gray-300 text-xl">›</span>
              </div>
              <p className="text-gray-400 text-xs mt-2">
                {formatDate(trip.start_date)} ~ {formatDate(trip.end_date)}
              </p>
            </div>
          ))
        )}
      </main>
    </div>
  )
}
