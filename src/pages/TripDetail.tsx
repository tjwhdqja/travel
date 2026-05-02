import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ScheduleTab from './ScheduleTab'
import ExpenseTab from './ExpenseTab'
import ChecklistTab from './ChecklistTab'
import NoteTab from './NoteTab'

interface Trip {
  id: string
  name: string
  destination: string
  start_date: string
  end_date: string
  budget: number
}

type Tab = '일정' | '경비' | '체크' | '메모'

const TABS: { id: Tab; label: string }[] = [
  { id: '일정', label: '🗓 일정' },
  { id: '경비', label: '💰 경비' },
  { id: '체크', label: '✅ 체크' },
  { id: '메모', label: '📝 메모' },
]

export default function TripDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('일정')
  const [userName, setUserName] = useState('')

  useEffect(() => {
    supabase.from('trips').select('*').eq('id', id).single().then(({ data }) => setTrip(data))
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('nickname').eq('id', user.id).single()
      const name = profile?.nickname ?? user.email?.split('@')[0] ?? '사용자'
      setUserName(name)
      const { data: existing } = await supabase.from('trip_members').select('id').eq('trip_id', id).eq('name', name).single()
      if (!existing) await supabase.from('trip_members').insert([{ trip_id: id, name }])
    })
  }, [id])

  if (!trip) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">불러오는 중...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-4">
        <button onClick={() => navigate('/')} className="text-indigo-500 text-sm mb-2">← 뒤로</button>
        <h1 className="text-xl font-bold text-gray-800">{trip.name}</h1>
        <p className="text-sm text-gray-400">📍 {trip.destination}</p>
      </header>

      <div className="flex border-b border-gray-100 bg-white">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 text-sm font-medium transition ${
              activeTab === tab.id ? 'text-indigo-500 border-b-2 border-indigo-500' : 'text-gray-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <main className="max-w-lg mx-auto p-4">
        {activeTab === '일정' && <ScheduleTab tripId={trip.id} userName={userName} startDate={trip.start_date} endDate={trip.end_date} />}
        {activeTab === '경비' && <ExpenseTab tripId={trip.id} userName={userName} budget={trip.budget} />}
        {activeTab === '체크' && <ChecklistTab tripId={trip.id} userName={userName} />}
        {activeTab === '메모' && <NoteTab tripId={trip.id} />}
      </main>
    </div>
  )
}
