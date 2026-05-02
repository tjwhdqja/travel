import { useState, useEffect, useRef } from 'react'
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

function getInitial(name: string) {
  return name.slice(0, 1).toUpperCase()
}

const AVATAR_COLORS = [
  'bg-indigo-400', 'bg-pink-400', 'bg-emerald-400',
  'bg-amber-400', 'bg-violet-400', 'bg-sky-400',
]

export default function TripDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('일정')
  const [userName, setUserName] = useState('')
  const [members, setMembers] = useState<string[]>([])
  const [allProfiles, setAllProfiles] = useState<string[]>([])
  const [showAddMember, setShowAddMember] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.from('trips').select('*').eq('id', id).single().then(({ data, error }) => {
      if (error || !data) { setNotFound(true); return }
      setTrip(data)
    })
    supabase.from('trip_members').select('name').eq('trip_id', id).then(({ data }) => {
      setMembers(data?.map(m => m.name) ?? [])
    })
    supabase.from('profiles').select('nickname').then(({ data }) => {
      setAllProfiles(data?.map(p => p.nickname).filter(Boolean) ?? [])
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

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowAddMember(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function addMember(name: string) {
    if (!name || members.includes(name)) return
    await supabase.from('trip_members').insert([{ trip_id: id, name }])
    setMembers(prev => [...prev, name])
    setShowAddMember(false)
  }

  async function removeMember(name: string) {
    if (name === userName) return
    await supabase.from('trip_members').delete().eq('trip_id', id).eq('name', name)
    setMembers(prev => prev.filter(m => m !== name))
  }

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

  const addableProfiles = allProfiles.filter(p => !members.includes(p))

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 pt-4 pb-3">
        <button onClick={() => navigate('/')} className="text-indigo-500 text-sm mb-2">← 뒤로</button>
        <h1 className="text-xl font-bold text-gray-800">{trip.name}</h1>
        <p className="text-sm text-gray-400 mb-3">📍 {trip.destination}</p>

        <div className="flex items-center gap-2 flex-wrap">
          {members.map((m, i) => (
            <button
              key={m}
              onClick={() => removeMember(m)}
              title={m === userName ? '나' : `${m} 제거`}
              className="flex items-center gap-1.5 group"
            >
              <div className={`w-7 h-7 rounded-full ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-white text-xs font-bold`}>
                {getInitial(m)}
              </div>
              <span className="text-xs text-gray-500 group-hover:text-red-400 transition-colors">
                {m}
              </span>
            </button>
          ))}

          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setShowAddMember(v => !v)}
              className="w-7 h-7 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors"
            >
              +
            </button>
            {showAddMember && (
              <div className="absolute left-0 top-9 z-20 bg-white rounded-xl shadow-lg border border-gray-100 min-w-[140px] overflow-hidden">
                {addableProfiles.length === 0 ? (
                  <p className="px-4 py-3 text-xs text-gray-400">추가할 멤버 없음</p>
                ) : (
                  addableProfiles.map(p => (
                    <button key={p} type="button"
                      onClick={() => addMember(p)}
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
        {activeTab === '메모' && <NoteTab tripId={trip.id} />}
      </main>
    </div>
  )
}
