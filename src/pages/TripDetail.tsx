import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ScheduleTab from './ScheduleTab'
import ExpenseTab from './ExpenseTab'
import ChecklistTab from './ChecklistTab'
import ShoppingTab from './ShoppingTab'

interface Trip {
  id: string
  name: string
  destination: string
  start_date: string
  end_date: string
  budget: number
}

type Tab = '일정' | '경비' | '체크' | '쇼핑'

const TABS: { id: Tab; label: string }[] = [
  { id: '일정', label: '🗓 일정' },
  { id: '경비', label: '💰 경비' },
  { id: '체크', label: '✅ 체크' },
  { id: '쇼핑', label: '🛍 쇼핑' },
]

function getInitial(name: string) {
  return name.slice(0, 1).toUpperCase()
}

const AVATAR_COLORS = [
  'bg-indigo-400', 'bg-pink-400', 'bg-emerald-400',
  'bg-amber-400', 'bg-violet-400', 'bg-sky-400',
]


function InviteButton({ tripId }: { tripId: string }) {
  const [copied, setCopied] = useState(false)

  function invite() {
    const url = `${window.location.origin}/trip/${tripId}`
    if (navigator.share) {
      navigator.share({ title: '여행에 초대합니다', url })
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
  }

  return (
    <button
      onClick={invite}
      title="친구 초대"
      className="w-7 h-7 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors relative"
    >
      {copied ? (
        <span className="text-[10px] text-indigo-500">✓</span>
      ) : (
        <span className="text-sm leading-none">+</span>
      )}
    </button>
  )
}

export default function TripDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('일정')
  const [userName, setUserName] = useState('')
  const [members, setMembers] = useState<string[]>([])

  useEffect(() => {
    supabase.from('trips').select('*').eq('id', id).single().then(({ data, error }) => {
      if (error || !data) { setNotFound(true); return }
      setTrip(data)
    })
    supabase.from('trip_members').select('name').eq('trip_id', id).then(({ data }) => {
      setMembers(data?.map(m => m.name) ?? [])
    })
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('nickname').eq('id', user.id).single()
      const name = profile?.nickname ?? user.email?.split('@')[0] ?? '사용자'
      setUserName(name)
      const { data: existing } = await supabase.from('trip_members').select('id').eq('trip_id', id).eq('name', name).maybeSingle()
      if (!existing) {
        await supabase.from('trip_members').insert([{ trip_id: id, name }])
        setMembers(prev => prev.includes(name) ? prev : [...prev, name])
      }
    })
  }, [id])

  if (notFound) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <p className="text-gray-400">여행을 찾을 수 없어요</p>
      <button onClick={() => navigate('/')} className="text-indigo-500 text-sm">← 목록으로</button>
    </div>
  )

  if (!trip) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">불러오는 중...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 pt-4 pb-3">
        <button onClick={() => navigate('/')} className="text-indigo-500 text-sm mb-2">← 뒤로</button>
        <h1 className="text-xl font-bold text-gray-800">{trip.name}</h1>
        <p className="text-sm text-gray-400 mb-3">📍 {trip.destination}</p>

        <div className="flex items-center gap-2 flex-wrap">
          {members.map((m, i) => (
            <div key={m} className="flex items-center gap-1.5">
              <div className={`w-7 h-7 rounded-full ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-white text-xs font-bold`}>
                {getInitial(m)}
              </div>
              <span className="text-xs text-gray-500">{m}</span>
            </div>
          ))}
          <InviteButton tripId={trip.id} />
        </div>
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
        {activeTab === '일정' && <ScheduleTab tripId={trip.id} userName={userName} startDate={trip.start_date} endDate={trip.end_date} destination={trip.destination} />}
        {activeTab === '경비' && <ExpenseTab tripId={trip.id} userName={userName} budget={trip.budget} members={members} />}
        {activeTab === '체크' && <ChecklistTab tripId={trip.id} userName={userName} />}
        {activeTab === '쇼핑' && <ShoppingTab tripId={trip.id} userName={userName} destination={trip.destination} />}
      </main>
    </div>
  )
}
