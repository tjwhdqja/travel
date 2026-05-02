import { useState, useEffect, Fragment } from 'react'
import { supabase } from '../lib/supabase'
import HamburgerMenu from '../components/HamburgerMenu'
import PillButton from '../components/PillButton'
import LocationInput from '../components/LocationInput'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string

interface Schedule {
  id: string
  trip_id: string
  date: string
  time: string | null
  title: string
  location: string | null
  note: string | null
  created_by: string | null
  participants: string[]
  category: string
  sort_order: number
}

type FormState = {
  date: string
  time: string
  title: string
  location: string
  note: string
  participants: string[]
  category: string
}

const CATEGORIES = [
  { id: '교통', emoji: '✈️' },
  { id: '식사', emoji: '🍽' },
  { id: '숙박', emoji: '🏨' },
  { id: '관광', emoji: '🎡' },
  { id: '쇼핑', emoji: '🛍' },
  { id: '기타', emoji: '📌' },
]

function getCategoryEmoji(category: string) {
  return CATEGORIES.find(c => c.id === category)?.emoji ?? '📌'
}

interface FormProps {
  form: FormState
  setForm: (f: FormState) => void
  members: string[]
  startDate: string
  endDate: string
  onSubmit: (e: React.FormEvent) => void
  submitLabel: string
  onCancel: () => void
}

function RouteConnector({ from, to }: { from: string | null; to: string | null }) {
  return (
    <div className="flex items-center gap-2 pl-5 my-0.5">
      <div className="w-0.5 h-5 bg-gray-200 ml-1.5" />
      {from && to && (
        <a
          href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}&travelmode=transit`}
          target="_blank" rel="noopener noreferrer"
          className="text-xs text-gray-400 hover:text-indigo-400 transition-colors"
        >
          🗺️ 경로
        </a>
      )}
    </div>
  )
}

interface NearbyPlace { name: string; address: string; rating: number | null; ratingCount: number | null }

function NearbyRecommendations({ onAdd }: { onAdd: (name: string) => void }) {
  const [loading, setLoading] = useState(false)
  const [places, setPlaces] = useState<NearbyPlace[]>([])
  const [label, setLabel] = useState('')
  const [error, setError] = useState('')

  function getTypeByTime(): { type: string; label: string } {
    const h = new Date().getHours()
    if (h >= 6 && h < 10) return { type: 'cafe', label: '☕ 카페 추천' }
    if (h >= 10 && h < 12) return { type: 'tourist_attraction', label: '🎡 관광지 추천' }
    if (h >= 12 && h < 14) return { type: 'restaurant', label: '🍽 점심 식당 추천' }
    if (h >= 14 && h < 18) return { type: 'tourist_attraction', label: '🎡 관광지 추천' }
    if (h >= 18 && h < 21) return { type: 'restaurant', label: '🍽 저녁 식당 추천' }
    return { type: 'convenience_store', label: '🏪 편의점 추천' }
  }

  async function fetchNearby() {
    setLoading(true); setError('')
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      )
      const { type, label: l } = getTypeByTime()
      setLabel(l)
      const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': MAPS_API_KEY,
          'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.rating,places.userRatingCount',
        },
        body: JSON.stringify({
          includedTypes: [type], maxResultCount: 8,
          locationRestriction: { circle: { center: { latitude: pos.coords.latitude, longitude: pos.coords.longitude }, radius: 500 } },
        }),
      })
      const data = await res.json()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setPlaces((data.places ?? []).map((p: any) => ({
        name: p.displayName?.text ?? '', address: p.formattedAddress ?? '',
        rating: p.rating ?? null, ratingCount: p.userRatingCount ?? null,
      })))
    } catch (e: unknown) {
      setError((e as GeolocationPositionError)?.code === 1 ? '위치 권한을 허용해주세요' : '주변 장소를 불러오지 못했습니다')
    } finally { setLoading(false) }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-sm text-gray-800">📍 주변 추천 장소</p>
        {label && <span className="text-xs text-indigo-500">{label}</span>}
      </div>
      {places.length === 0 ? (
        <button onClick={fetchNearby} disabled={loading}
          className="w-full py-2.5 rounded-xl bg-indigo-50 text-indigo-600 text-sm hover:bg-indigo-100 disabled:opacity-60 transition">
          {loading ? '📡 위치 확인 중...' : '현재 위치 기반 추천 보기'}
        </button>
      ) : (
        <>
          <div className="divide-y divide-gray-50">
            {places.map((p, i) => (
              <div key={i} className="flex items-start gap-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{p.name}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{p.address}</p>
                  {p.rating && <p className="text-xs text-amber-500 mt-0.5">⭐ {p.rating.toFixed(1)} ({p.ratingCount?.toLocaleString()}개)</p>}
                </div>
                <div className="flex gap-1.5 flex-shrink-0 mt-0.5">
                  <a href={`https://maps.google.com/?q=${encodeURIComponent(p.name)}`} target="_blank" rel="noopener noreferrer"
                    className="px-2.5 py-1.5 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-gray-200">지도</a>
                  <button onClick={() => onAdd(p.name)}
                    className="px-2.5 py-1.5 bg-indigo-500 text-white text-xs rounded-lg hover:bg-indigo-600">+ 추가</button>
                </div>
              </div>
            ))}
          </div>
          <button onClick={fetchNearby} disabled={loading} className="text-xs text-gray-400 hover:text-indigo-400 w-full text-center">
            {loading ? '불러오는 중...' : '새로고침'}
          </button>
        </>
      )}
      {error && <p className="text-xs text-red-400 text-center">{error}</p>}
    </div>
  )
}

interface AISchedule { time: string; title: string; location: string; category: string; note: string }
interface AIDay { day: number; date: string; schedules: AISchedule[] }

interface AIGeneratorProps {
  destination: string
  startDate: string
  endDate: string
  onAddAll: (items: AIDay[]) => void
}

function AIScheduleGenerator({ destination, startDate, endDate, onAddAll }: AIGeneratorProps) {
  const [style, setStyle] = useState('관광 위주')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AIDay[] | null>(null)
  const [error, setError] = useState('')

  const days = Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1
  const STYLES = ['관광 위주', '맛집 투어', '휴양/힐링', '쇼핑 위주', '액티비티']

  async function generate() {
    if (!destination.trim()) return
    setLoading(true); setError(''); setResult(null)
    const prompt = `${destination} ${days}박${days - 1}일 여행 일정을 짜줘. 스타일: ${style}.
시작일: ${startDate}, 종료일: ${endDate}.
아래 JSON 배열 형식으로만 답해 (설명 없이):
[{"day":1,"date":"${startDate}","schedules":[{"time":"09:00","title":"일정명","location":"장소명","category":"교통|식사|숙박|관광|쇼핑|기타","note":"간단한 설명"}]}]
하루에 4~6개 일정. category는 반드시 교통/식사/숙박/관광/쇼핑/기타 중 하나.`

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      )
      const data = await res.json()
      const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (!jsonMatch) throw new Error('파싱 실패')
      setResult(JSON.parse(jsonMatch[0]) as AIDay[])
    } catch {
      setError('일정 생성에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
      <p className="font-semibold text-sm text-gray-800">✨ AI 일정 생성</p>

      {!result ? (
        <>
          <p className="text-xs text-gray-400">📍 {destination} · {days}일</p>
          <div className="flex flex-wrap gap-2">
            {STYLES.map(s => (
              <PillButton key={s} label={s} selected={style === s} onClick={() => setStyle(s)} />
            ))}
          </div>
          <button
            onClick={generate} disabled={loading}
            className="w-full py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 disabled:opacity-60 transition"
          >
            {loading ? '🤖 생성 중...' : `${days}일 일정 생성`}
          </button>
          {error && <p className="text-xs text-red-400 text-center">{error}</p>}
        </>
      ) : (
        <>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {result.map(day => (
              <div key={day.day}>
                <p className="text-xs font-bold text-indigo-500 mb-1">Day {day.day} · {day.date}</p>
                {day.schedules.map((s, i) => (
                  <div key={i} className="flex items-start gap-2 py-1.5 border-b border-gray-50 last:border-0">
                    <span className="text-xs text-gray-400 w-10 flex-shrink-0 pt-0.5">{s.time}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800">{s.title}</p>
                      {s.location && <p className="text-xs text-gray-400">📍 {s.location}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setResult(null)}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
              다시 생성
            </button>
            <button onClick={() => onAddAll(result)}
              className="flex-1 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600">
              전체 일정에 추가
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function ScheduleForm({ form, setForm, members, startDate, endDate, onSubmit, submitLabel, onCancel }: FormProps) {
  function toggleParticipant(name: string) {
    const next = form.participants.includes(name)
      ? form.participants.filter(n => n !== name)
      : [...form.participants, name]
    setForm({ ...form, participants: next })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="text-xs text-gray-500 mb-2 block">카테고리</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => (
            <PillButton key={cat.id} label={`${cat.emoji} ${cat.id}`}
              selected={form.category === cat.id}
              onClick={() => setForm({ ...form, category: cat.id })}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-gray-500 mb-1 block">날짜</label>
          <input type="date" value={form.date} min={startDate} max={endDate}
            onChange={e => setForm({ ...form, date: e.target.value })} required
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-gray-500 mb-1 block">시간 (선택)</label>
          <input type="time" value={form.time}
            onChange={e => setForm({ ...form, time: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
          />
        </div>
      </div>
      <input placeholder="일정 제목 (예: 도톤보리 관광)" value={form.title}
        onChange={e => setForm({ ...form, title: e.target.value })} required
        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
      />
      <LocationInput value={form.location} onChange={v => setForm({ ...form, location: v })} />
      <textarea placeholder="메모 (선택)" value={form.note}
        onChange={e => setForm({ ...form, note: e.target.value })} rows={2}
        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm resize-none"
      />
      {members.length > 0 && (
        <div>
          <label className="text-xs text-gray-500 mb-2 block">참여 인원 (선택)</label>
          <div className="flex flex-wrap gap-2">
            {members.map(m => (
              <PillButton key={m} label={m} selected={form.participants.includes(m)}
                onClick={() => toggleParticipant(m)}
              />
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">취소</button>
        <button type="submit" className="flex-1 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600">{submitLabel}</button>
      </div>
    </form>
  )
}

interface SortableItemProps {
  item: Schedule
  editingId: string | null
  form: FormState
  setForm: (f: FormState) => void
  members: string[]
  startDate: string
  endDate: string
  onStartEdit: (item: Schedule) => void
  onDelete: (id: string) => void
  onUpdate: (e: React.FormEvent) => void
  onCancelEdit: () => void
}

function SortableScheduleItem({ item, editingId, form, setForm, members, startDate, endDate, onStartEdit, onDelete, onUpdate, onCancelEdit }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  if (editingId === item.id) {
    return (
      <div ref={setNodeRef} style={style} className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-3 text-sm">일정 수정</h3>
        <ScheduleForm form={form} setForm={setForm} members={members}
          startDate={startDate} endDate={endDate}
          onSubmit={onUpdate} submitLabel="저장" onCancel={onCancelEdit}
        />
      </div>
    )
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-2">
      <div className="flex flex-col items-center w-12 flex-shrink-0 pt-2">
        <span className="text-[11px] text-gray-400 font-medium leading-none tabular-nums">
          {item.time ? item.time.slice(0, 5) : ''}
        </span>
        <div className="w-3 h-3 rounded-full bg-indigo-400 mt-1 ring-2 ring-white shadow-sm flex-shrink-0" />
      </div>
      <div className="flex-1 bg-white rounded-xl px-3 py-2.5 shadow-sm flex items-start gap-2 min-w-0">
        <span className="text-lg leading-none mt-0.5 flex-shrink-0">{getCategoryEmoji(item.category)}</span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-800 text-sm">{item.title}</p>
          {item.location && (
            <a href={`https://maps.google.com/?q=${encodeURIComponent(item.location)}`} target="_blank" rel="noopener noreferrer"
              className="text-xs text-gray-400 mt-0.5 flex items-center gap-1 hover:text-indigo-400 transition-colors">
              📍 {item.location}
            </a>
          )}
          {item.note && <p className="text-xs text-gray-400 mt-0.5">{item.note}</p>}
          {item.participants?.length > 0 && (
            <p className="text-xs text-indigo-400 mt-0.5">👥 {item.participants.join(', ')}</p>
          )}
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button {...attributes} {...listeners}
            className="cursor-grab active:cursor-grabbing grid grid-cols-2 gap-[3px] p-1.5 rounded hover:bg-gray-100">
            {[...Array(6)].map((_, i) => <span key={i} className="block w-[3px] h-[3px] rounded-full bg-gray-300" />)}
          </button>
          <HamburgerMenu items={[
            { label: '수정', onClick: () => onStartEdit(item) },
            { label: '삭제', onClick: () => onDelete(item.id), danger: true },
          ]} />
        </div>
      </div>
    </div>
  )
}

interface Props {
  tripId: string
  userName: string
  startDate: string
  endDate: string
  destination: string
}

const emptyForm = (date: string): FormState => ({
  date, time: '', title: '', location: '', note: '', participants: [], category: '기타'
})

function getAllDates(start: string, end: string): string[] {
  const dates: string[] = []
  const cur = new Date(start + 'T00:00:00')
  const last = new Date(end + 'T00:00:00')
  while (cur <= last) {
    const y = cur.getFullYear()
    const m = String(cur.getMonth() + 1).padStart(2, '0')
    const d = String(cur.getDate()).padStart(2, '0')
    dates.push(`${y}-${m}-${d}`)
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

export default function ScheduleTab({ tripId, userName, startDate, endDate, destination }: Props) {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [members, setMembers] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showNearby, setShowNearby] = useState(false)
  const [showAI, setShowAI] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm(startDate))

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  useEffect(() => {
    if (userName) fetchAll()
  }, [tripId, userName])

  useEffect(() => {
    const channel = supabase
      .channel(`schedules:${tripId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'schedules', filter: `trip_id=eq.${tripId}` }, ({ new: row }) => {
        setSchedules(prev => prev.some(s => s.id === row.id) ? prev : sorted([...prev, row as Schedule]))
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'schedules', filter: `trip_id=eq.${tripId}` }, ({ new: row }) => {
        setSchedules(prev => sorted(prev.map(s => s.id === row.id ? row as Schedule : s)))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'schedules', filter: `trip_id=eq.${tripId}` }, ({ old: row }) => {
        setSchedules(prev => prev.filter(s => s.id !== row.id))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [tripId])

  async function fetchAll() {
    const [{ data: scheduleData }, { data: memberData }] = await Promise.all([
      supabase.from('schedules').select('*').eq('trip_id', tripId).order('date').order('sort_order').order('time'),
      supabase.from('trip_members').select('name').eq('trip_id', tripId)
    ])
    setSchedules(scheduleData ?? [])
    setMembers(memberData?.map(m => m.name) ?? [])
    setLoading(false)
  }

  function sorted(list: Schedule[]) {
    return [...list].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      if (a.sort_order !== b.sort_order) return (a.sort_order ?? 0) - (b.sort_order ?? 0)
      return (a.time ?? '').localeCompare(b.time ?? '')
    })
  }

  async function handleDragEnd(event: DragEndEvent, date: string) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const dayItems = schedules.filter(s => s.date === date)
    const oldIndex = dayItems.findIndex(s => s.id === active.id)
    const newIndex = dayItems.findIndex(s => s.id === over.id)
    const reordered = arrayMove(dayItems, oldIndex, newIndex).map((s, idx) => ({ ...s, sort_order: idx }))

    setSchedules(prev => sorted([...prev.filter(s => s.date !== date), ...reordered]))
    await Promise.all(reordered.map(s => supabase.from('schedules').update({ sort_order: s.sort_order }).eq('id', s.id)))
  }

  async function addSchedule(e: React.FormEvent) {
    e.preventDefault()
    const sort_order = schedules.filter(s => s.date === form.date).length
    const { data } = await supabase
      .from('schedules')
      .insert([{ ...form, trip_id: tripId, created_by: userName, sort_order }])
      .select().single()
    if (data) {
      setSchedules(prev => sorted([...prev, data]))
      setShowForm(false)
      setForm(emptyForm(startDate))
    }
  }

  async function updateSchedule(e: React.FormEvent) {
    e.preventDefault()
    const { data } = await supabase
      .from('schedules')
      .update({ date: form.date, time: form.time || null, title: form.title, location: form.location || null, note: form.note || null, participants: form.participants, category: form.category })
      .eq('id', editingId).select().single()
    if (data) {
      setSchedules(prev => sorted(prev.map(s => s.id === editingId ? data : s)))
      setEditingId(null)
    }
  }

  function startEdit(item: Schedule) {
    setEditingId(item.id)
    setShowForm(false)
    setForm({ date: item.date, time: item.time ?? '', title: item.title, location: item.location ?? '', note: item.note ?? '', participants: item.participants ?? [], category: item.category ?? '기타' })
  }

  async function addAllFromAI(days: AIDay[]) {
    const inserts = days.flatMap(day =>
      day.schedules.map((s, idx) => ({
        trip_id: tripId, created_by: userName,
        date: day.date, time: s.time || null,
        title: s.title, location: s.location || null,
        note: s.note || null, category: s.category || '기타',
        participants: [], sort_order: idx,
      }))
    )
    const { data } = await supabase.from('schedules').insert(inserts).select()
    if (data) {
      setSchedules(prev => sorted([...prev, ...data]))
      setShowAI(false)
    }
  }

  function addFromNearby(name: string) {
    setShowNearby(false)
    setShowForm(true)
    setEditingId(null)
    setForm({ ...emptyForm(startDate), location: name })
  }

  async function deleteSchedule(id: string) {
    await supabase.from('schedules').delete().eq('id', id)
    setSchedules(prev => prev.filter(s => s.id !== id))
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
  }

  function getDayNumber(dateStr: string) {
    const start = new Date(startDate + 'T00:00:00')
    const cur = new Date(dateStr + 'T00:00:00')
    return Math.round((cur.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  }

  const grouped = schedules.reduce<Record<string, Schedule[]>>((acc, s) => {
    if (!acc[s.date]) acc[s.date] = []
    acc[s.date].push(s)
    return acc
  }, {})

  const allDates = getAllDates(startDate, endDate)

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => { setShowForm(true); setShowNearby(false); setShowAI(false); setEditingId(null); setForm(emptyForm(startDate)) }}
          className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 rounded-xl transition"
        >
          + 일정 추가
        </button>
        <button
          onClick={() => { setShowAI(v => !v); setShowNearby(false); setShowForm(false) }}
          className={`px-4 py-3 rounded-xl font-medium text-sm transition border ${showAI ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-200 hover:text-indigo-500'}`}
        >
          ✨ AI
        </button>
        <button
          onClick={() => { setShowNearby(v => !v); setShowForm(false); setShowAI(false) }}
          className={`px-4 py-3 rounded-xl font-medium text-sm transition border ${showNearby ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-200 hover:text-indigo-500'}`}
        >
          📍 주변
        </button>
      </div>

      {showAI && <AIScheduleGenerator destination={destination} startDate={startDate} endDate={endDate} onAddAll={addAllFromAI} />}
      {showNearby && <NearbyRecommendations onAdd={addFromNearby} />}

      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="font-bold text-gray-800 mb-4">새 일정</h3>
          <ScheduleForm form={form} setForm={setForm} members={members}
            startDate={startDate} endDate={endDate}
            onSubmit={addSchedule} submitLabel="추가" onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {loading ? (
        <p className="text-center text-gray-400 py-8">불러오는 중...</p>
      ) : (
        <div className="space-y-4">
          {allDates.map(date => {
            const items = grouped[date] ?? []
            return (
              <div key={date}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-indigo-100 text-indigo-600 text-xs font-bold px-2.5 py-1 rounded-full">
                    Day {getDayNumber(date)}
                  </span>
                  <span className="text-sm text-gray-500">{formatDate(date)}</span>
                </div>

                {items.length === 0 ? (
                  <div className="border border-dashed border-gray-200 rounded-xl px-4 py-3 text-center">
                    <p className="text-xs text-gray-300">일정 없음</p>
                  </div>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={e => handleDragEnd(e, date)}>
                    <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                      <div>
                        {items.map((item, index) => (
                          <Fragment key={item.id}>
                            <SortableScheduleItem
                              item={item} editingId={editingId}
                              form={form} setForm={setForm} members={members}
                              startDate={startDate} endDate={endDate}
                              onStartEdit={startEdit} onDelete={deleteSchedule}
                              onUpdate={updateSchedule} onCancelEdit={() => setEditingId(null)}
                            />
                            {index < items.length - 1 && (
                              <RouteConnector from={item.location} to={items[index + 1].location} />
                            )}
                          </Fragment>
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
