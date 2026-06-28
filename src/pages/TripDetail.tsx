import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getDdayLabel, getAvatarColor, getInitial } from '../lib/utils'
import { badge, bottomTab } from '../lib/design'
import { Calendar, Wallet, CheckSquare, ShoppingBag, Map, ChevronLeft } from 'lucide-react'
import ScheduleTab from './ScheduleTab'
import ExpenseTab from './ExpenseTab'
import ChecklistTab from './ChecklistTab'
import ShoppingTab from './ShoppingTab'
import GuideTab from './GuideTab'
import Spinner from '../components/Spinner'

interface Trip {
  id: string
  name: string
  destination: string
  start_date: string
  end_date: string
  budget: number | null
}

type Tab = '일정' | '경비' | '체크' | '쇼핑' | '가이드'

const TABS: { id: Tab; icon: React.ComponentType<{ size?: number; className?: string }>; label: string }[] = [
  { id: '일정', icon: Calendar, label: '일정' },
  { id: '경비', icon: Wallet, label: '경비' },
  { id: '체크', icon: CheckSquare, label: '체크' },
  { id: '쇼핑', icon: ShoppingBag, label: '쇼핑' },
  { id: '가이드', icon: Map, label: '가이드' },
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
      type="button"
      onClick={invite}
      aria-label={copied ? "초대 링크 복사됨" : "여행에 친구 초대하기"}
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
  const [mountedTabs, setMountedTabs] = useState<Set<Tab>>(new Set<Tab>(['일정']))
  const [userName, setUserName] = useState('')
  const [members, setMembers] = useState<string[]>([])
  const [membersLoaded, setMembersLoaded] = useState(false)
  const [expenseNavState, setExpenseNavState] = useState<{ category?: string; title?: string } | undefined>()

  useEffect(() => {
    if (!id) return
    const tripChannel = supabase
      .channel(`trip:${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trips', filter: `id=eq.${id}` }, ({ new: row }) => {
        setTrip(row as Trip)
      })
      .subscribe()
    return () => { supabase.removeChannel(tripChannel) }
  }, [id])

  useEffect(() => {
    if (!id) return
    const membersChannel = supabase
      .channel(`trip_members:${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trip_members', filter: `trip_id=eq.${id}` }, ({ new: row }) => {
        setMembers(prev => prev.includes(row.name as string) ? prev : [...prev, row.name as string])
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'trip_members', filter: `trip_id=eq.${id}` }, ({ old: row }) => {
        setMembers(prev => prev.filter(m => m !== (row as { name: string }).name))
      })
      .subscribe()
    return () => { supabase.removeChannel(membersChannel) }
  }, [id])

  useEffect(() => {
    if (!id) return
    supabase.from('trips').select('*').eq('id', id).single().then(({ data, error }) => {
      if (error || !data) { setNotFound(true); return }
      setTrip(data)
    })
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { navigate('/'); return }
      const { data: profile } = await supabase.from('profiles').select('nickname').eq('id', user.id).single()
      if (!profile?.nickname) {
        sessionStorage.setItem('post_nickname_redirect', `/trip/${id}`)
        navigate('/')
        return
      }
      const name = profile.nickname
      setUserName(name)
      const { data: existing } = await supabase.from('trip_members').select('id').eq('trip_id', id).eq('name', name).maybeSingle()
      if (!existing) {
        await supabase.from('trip_members').insert([{ trip_id: id, name }])
      }
      const { data: allMembers } = await supabase.from('trip_members').select('name').eq('trip_id', id)
      setMembers(allMembers?.map(m => m.name) ?? [name])
      setMembersLoaded(true)
    })
  }, [id])

  if (notFound) return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-3">
      <p className="text-gray-400">여행을 찾을 수 없어요</p>
      <button type="button" onClick={() => navigate('/')} className="text-indigo-500 text-sm">← 목록으로 돌아가기</button>
    </main>
  )

  if (!trip) return (
    <main className="min-h-screen flex items-center justify-center">
      <Spinner />
    </main>
  )

  const ddayLabel = getDdayLabel(trip.start_date, trip.end_date)
  const todayForDay = new Date(); todayForDay.setHours(0, 0, 0, 0)
  const tripStartDate = new Date(trip.start_date + 'T00:00:00')
  const tripEndDate = new Date(trip.end_date + 'T00:00:00')
  const isInTrip = todayForDay >= tripStartDate && todayForDay <= tripEndDate
  const dayInTrip = isInTrip ? Math.floor((todayForDay.getTime() - tripStartDate.getTime()) / 86400000) + 1 : null

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 pt-4 pb-3">
        <div className="flex items-start gap-2 mb-2.5">
          <button type="button" onClick={() => navigate('/')} className="flex-shrink-0 mt-0.5 text-gray-400 hover:text-gray-600 transition">
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-lg font-bold text-gray-800 flex-1 min-w-0">{trip.name}</h1>
          <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
            {(dayInTrip != null || ddayLabel != null) && (
              <span className="text-xs font-bold text-indigo-500">
                {dayInTrip != null ? `${dayInTrip}일차` : ddayLabel}
              </span>
            )}
            <span className={badge.indigo}>
              {trip.destination}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {members.map(m => (
            <div key={m} className="flex items-center gap-1.5">
              <div
                title={m}
                className={`w-7 h-7 rounded-full ${getAvatarColor(m)} flex items-center justify-center text-white text-xs font-bold ${m === userName ? 'ring-2 ring-offset-1 ring-indigo-400' : ''}`}
              >
                {getInitial(m)}
              </div>
              <span className="text-xs text-gray-500">{m}</span>
            </div>
          ))}
          <InviteButton tripId={trip.id} />
        </div>
      </header>

      <div role="tablist" className="flex border-b border-gray-100 bg-white">
        {TABS.map(tab => (
          <button
            type="button"
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => { setActiveTab(tab.id); setMountedTabs(prev => new Set([...prev, tab.id])) }}
            className={bottomTab(activeTab === tab.id)}
          >
            <tab.icon size={16} />
            <span className="text-[11px] font-medium">{tab.label}</span>
          </button>
        ))}
      </div>

      <main className="max-w-lg mx-auto p-4">
        {(!userName || !membersLoaded) ? (
          <Spinner />
        ) : (
          <>
            {mountedTabs.has('일정') && <div className={activeTab !== '일정' ? 'hidden' : ''}><ScheduleTab tripId={trip.id} userName={userName} startDate={trip.start_date} endDate={trip.end_date} destination={trip.destination} isActive={activeTab === '일정'} /></div>}
            {mountedTabs.has('경비') && <div className={activeTab !== '경비' ? 'hidden' : ''}><ExpenseTab tripId={trip.id} userName={userName} budget={trip.budget ?? 0} members={members} isActive={activeTab === '경비'} destination={trip.destination} navState={expenseNavState} onNavStateConsumed={() => setExpenseNavState(undefined)} /></div>}
            {mountedTabs.has('체크') && <div className={activeTab !== '체크' ? 'hidden' : ''}><ChecklistTab tripId={trip.id} userName={userName} isActive={activeTab === '체크'} /></div>}
            {mountedTabs.has('쇼핑') && <div className={activeTab !== '쇼핑' ? 'hidden' : ''}><ShoppingTab tripId={trip.id} userName={userName} destination={trip.destination} isActive={activeTab === '쇼핑'} onNavigateToExpense={(itemName) => { setExpenseNavState({ category: '쇼핑', title: itemName }); setActiveTab('경비'); setMountedTabs(prev => new Set([...prev, '경비'])) }} /></div>}
            {mountedTabs.has('가이드') && <div className={activeTab !== '가이드' ? 'hidden' : ''}><GuideTab destination={trip.destination} isActive={activeTab === '가이드'} tripId={trip.id} userName={userName} startDate={trip.start_date} endDate={trip.end_date} onNavigateToSchedule={() => { setActiveTab('일정'); setMountedTabs(prev => new Set([...prev, '일정'])) }} onNavigateToExpense={(category) => { setExpenseNavState({ category }); setActiveTab('경비'); setMountedTabs(prev => new Set([...prev, '경비'])) }} /></div>}
          </>
        )}
      </main>
    </div>
  )
}
