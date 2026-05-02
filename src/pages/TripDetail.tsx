import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

interface Trip {
  id: string
  name: string
  destination: string
  start_date: string
  end_date: string
}

type Tab = '일정' | '경비' | '투표' | '사진'

export default function TripDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('일정')

  useEffect(() => {
    supabase.from('trips').select('*').eq('id', id).single().then(({ data }) => {
      setTrip(data)
    })
  }, [id])

  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">불러오는 중...</p>
      </div>
    )
  }

  const tabs: Tab[] = ['일정', '경비', '투표', '사진']

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-4">
        <button onClick={() => navigate('/')} className="text-indigo-500 text-sm mb-2">← 뒤로</button>
        <h1 className="text-xl font-bold text-gray-800">{trip.name}</h1>
        <p className="text-sm text-gray-400">📍 {trip.destination}</p>
      </header>

      <div className="flex border-b border-gray-100 bg-white">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-medium transition ${
              activeTab === tab
                ? 'text-indigo-500 border-b-2 border-indigo-500'
                : 'text-gray-400'
            }`}
          >
            {tab === '일정' && '🗓 일정'}
            {tab === '경비' && '💰 경비'}
            {tab === '투표' && '🗳 투표'}
            {tab === '사진' && '📷 사진'}
          </button>
        ))}
      </div>

      <main className="max-w-lg mx-auto p-4">
        {activeTab === '일정' && <div className="text-center text-gray-400 py-16">일정 기능 준비 중</div>}
        {activeTab === '경비' && <div className="text-center text-gray-400 py-16">경비 기능 준비 중</div>}
        {activeTab === '투표' && <div className="text-center text-gray-400 py-16">투표 기능 준비 중</div>}
        {activeTab === '사진' && <div className="text-center text-gray-400 py-16">사진 기능 준비 중</div>}
      </main>
    </div>
  )
}
