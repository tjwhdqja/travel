import { useState, useEffect, useRef, Fragment } from 'react'
import { supabase } from '../lib/supabase'
import KebabMenu from '../components/KebabMenu'
import PillButton from '../components/PillButton'
import LocationInput from '../components/LocationInput'
import AIResultPanel from '../components/AIResultPanel'
import { btn, card, input as inputCls, textarea as textareaCls } from '../lib/design'
import Spinner from '../components/Spinner'
import Toast, { useToast } from '../components/Toast'
const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY as string

interface Schedule {
  id: string
  trip_id: string
  date: string
  time: string | null
  title: string
  location: string | null
  note: string | null
  created_by: string | null
  participants?: string[]
  category: string
  sort_order: number
}

type FormState = {
  date: string
  time: string
  title: string
  location: string
  note: string
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

const AI_STYLES = ['관광 위주', '맛집 투어', '휴양/힐링', '쇼핑 위주', '액티비티']

function getCategoryEmoji(category: string) {
  return CATEGORIES.find(c => c.id === category)?.emoji ?? '📌'
}

interface FormProps {
  form: FormState
  setForm: (f: FormState) => void
  startDate: string
  endDate: string
  onSubmit: (e: React.FormEvent) => void
  submitLabel: string
  onCancel: () => void
  submitting?: boolean
}

function RouteConnector() {
  return (
    <div className="relative h-2">
      <div className="absolute left-[49px] top-0 bottom-0 w-0.5 bg-gray-200" />
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
      setPlaces((data.places ?? []).map((p: any) => ({
        name: p.displayName?.text ?? '', address: p.formattedAddress ?? '',
        rating: p.rating ?? null, ratingCount: p.userRatingCount ?? null,
      })))
    } catch (e: unknown) {
      setError((e as GeolocationPositionError)?.code === 1 ? '위치 권한을 허용해주세요' : '주변 장소를 불러오지 못했습니다')
    } finally { setLoading(false) }
  }

  return (
    <div className={`${card.section} space-y-3`}>
      <div className="flex items-center justify-between">
        <p className="font-semibold text-sm text-gray-800">📍 주변 추천 장소</p>
        {label && <span className="text-xs text-indigo-500">{label}</span>}
      </div>
      {places.length === 0 ? (
        <button type="button" onClick={fetchNearby} disabled={loading}
          className={`w-full ${btn.toggle(true)} disabled:opacity-60`}>
          {loading ? '📡 위치 확인 중...' : '현재 위치 기반 추천 보기'}
        </button>
      ) : (
        <>
          <div className="divide-y divide-gray-50">
            {places.map(p => (
              <div key={p.name} className="flex items-start gap-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{p.name}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{p.address}</p>
                  {p.rating && <p className="text-xs text-amber-500 mt-0.5">⭐ {p.rating.toFixed(1)} ({p.ratingCount?.toLocaleString()}개)</p>}
                </div>
                <div className="flex gap-1.5 flex-shrink-0 mt-0.5">
                  <a href={`https://maps.google.com/?q=${encodeURIComponent(p.name)}`} target="_blank" rel="noopener noreferrer"
                    className={btn.inlineGhost}>지도</a>
                  <button type="button" onClick={() => onAdd(p.name)} className={btn.inlineSolid}>+ 추가</button>
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={fetchNearby} disabled={loading} className="text-xs text-gray-400 hover:text-indigo-400 w-full text-center">
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


function ScheduleForm({ form, setForm, startDate, endDate, onSubmit, submitLabel, onCancel, submitting = false }: FormProps) {
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
            className={inputCls}
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-gray-500 mb-1 block">시간 (선택)</label>
          <input type="time" value={form.time}
            onChange={e => setForm({ ...form, time: e.target.value })}
            className={inputCls}
          />
        </div>
      </div>
      <input placeholder="일정 제목 (예: 도톤보리 관광)" value={form.title}
        onChange={e => setForm({ ...form, title: e.target.value })} required
        className={inputCls}
      />
      <LocationInput value={form.location} onChange={v => setForm({ ...form, location: v })} />
      <textarea placeholder="메모 (선택)" value={form.note}
        onChange={e => setForm({ ...form, note: e.target.value })} rows={2}
        className={textareaCls}
      />
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className={btn.secondary}>취소</button>
        <button type="submit" disabled={submitting} className={btn.action}>{submitLabel}</button>
      </div>
    </form>
  )
}

interface ItemProps {
  item: Schedule
  editingId: string | null
  form: FormState
  setForm: (f: FormState) => void
  startDate: string
  endDate: string
  onStartEdit: (item: Schedule) => void
  onDelete: (id: string) => void
  onUpdate: (e: React.FormEvent) => void
  onCancelEdit: () => void
  isFirst: boolean
  isLast: boolean
  nextLocation?: string | null
  submitting?: boolean
}

function ScheduleItem({ item, editingId, form, setForm, startDate, endDate, onStartEdit, onDelete, onUpdate, onCancelEdit, isFirst, isLast, nextLocation, submitting = false }: ItemProps) {
  if (editingId === item.id) {
    return (
      <div className={`${card.base} p-5`}>
        <h3 className="font-bold text-gray-800 mb-4">일정 수정</h3>
        <ScheduleForm form={form} setForm={setForm}
          startDate={startDate} endDate={endDate}
          onSubmit={onUpdate} submitLabel="저장" onCancel={onCancelEdit} submitting={submitting}
        />
      </div>
    )
  }

  return (
    <div className="flex items-stretch gap-2">
      <div className="relative flex flex-col items-end w-14 flex-shrink-0">
        {!isFirst && <div className="absolute top-0 right-[5px] w-0.5 h-[16px] bg-gray-200" />}
        <div className="flex items-center gap-1.5 pt-4">
          <span className="relative z-10 text-[11px] text-gray-400 font-medium leading-none tabular-nums">
            {item.time ? item.time.slice(0, 5) : ''}
          </span>
          <div className="relative z-10 w-3 h-3 rounded-full bg-indigo-400 ring-2 ring-white shadow-sm flex-shrink-0" />
        </div>
        {!isLast && (
          <div className="relative w-0.5 flex-1 bg-gray-200 mt-1 mr-[5px]">
            {item.location && nextLocation && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(item.location)}&destination=${encodeURIComponent(nextLocation)}&travelmode=transit`}
                target="_blank" rel="noopener noreferrer"
                className="absolute -translate-y-1/2 right-full mr-1.5 border border-dashed border-indigo-200 bg-white px-2 py-0.5 rounded-full text-[10px] text-indigo-400 hover:text-indigo-500 hover:border-indigo-300 hover:bg-indigo-50 transition-colors whitespace-nowrap z-20"
                style={{ top: 'calc(50% + 10px)' }}
              >
                🗺️ 경로
              </a>
            )}
          </div>
        )}
      </div>
      <div className={`flex-1 ${card.item} px-3 py-2.5 flex items-start gap-2 min-w-0`}>
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
        </div>
        <KebabMenu items={[
          { label: '수정', onClick: () => onStartEdit(item) },
          { label: '삭제', onClick: () => onDelete(item.id), danger: true },
        ]} />
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
  isActive?: boolean
}

const emptyForm = (date: string): FormState => ({
  date, time: '', title: '', location: '', note: '', category: '기타'
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

export default function ScheduleTab({ tripId, userName, startDate, endDate, destination, isActive = true }: Props) {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showNearby, setShowNearby] = useState(false)
  const [showAI, setShowAI] = useState(false)
  const [aiResult, setAiResult] = useState<AIDay[] | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [aiStyle, setAiStyle] = useState('관광 위주')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm(startDate))
  const [submitting, setSubmitting] = useState(false)
  const { toast, showToast } = useToast()
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingDeleteRef = useRef<{ id: string; item: Schedule } | null>(null)

  const days = Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1

  useEffect(() => {
    if (userName) fetchAll()
  }, [tripId, userName])

  useEffect(() => {
    if (!isActive) { setShowForm(false); setShowAI(false); setShowNearby(false); setEditingId(null) }
  }, [isActive])

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
    const { data: scheduleData, error } = await supabase.from('schedules').select('*').eq('trip_id', tripId).order('date').order('time')
    if (error) showToast('일정을 불러오지 못했어요', 'error')
    setSchedules(scheduleData ?? [])
    setLoading(false)
  }

  function sorted(list: Schedule[]) {
    return [...list].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return (a.time ?? '').localeCompare(b.time ?? '')
    })
  }

  async function addSchedule(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const sort_order = schedules.filter(s => s.date === form.date).length
    const { data } = await supabase
      .from('schedules')
      .insert([{ ...form, trip_id: tripId, created_by: userName, sort_order }])
      .select().single()
    if (data) {
      setSchedules(prev => sorted([...prev, data]))
      setShowForm(false)
      setForm(emptyForm(selectedDate ?? startDate))
      showToast('일정을 추가했어요')
    } else {
      showToast('일정 추가에 실패했어요', 'error')
    }
    setSubmitting(false)
  }

  async function updateSchedule(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const { data } = await supabase
      .from('schedules')
      .update({ date: form.date, time: form.time || null, title: form.title, location: form.location || null, note: form.note || null, category: form.category })
      .eq('id', editingId).select().single()
    if (data) {
      setSchedules(prev => sorted(prev.map(s => s.id === editingId ? data : s)))
      setEditingId(null)
      showToast('일정을 수정했어요')
    } else {
      showToast('일정 수정에 실패했어요', 'error')
    }
    setSubmitting(false)
  }

  function startEdit(item: Schedule) {
    setEditingId(item.id)
    setShowForm(false)
    setForm({ date: item.date, time: item.time ?? '', title: item.title, location: item.location ?? '', note: item.note ?? '', category: item.category ?? '기타' })
  }

  async function generateAI() {
    setAiLoading(true); setAiError(''); setAiResult(null)
    const prompt = `${destination} ${days === 1 ? '당일치기' : `${days - 1}박${days}일`} 여행 일정을 짜줘. 스타일: ${aiStyle}.
시작일: ${startDate}, 종료일: ${endDate}.
아래 JSON 배열 형식으로만 답해 (설명 없이):
[{"day":1,"date":"${startDate}","schedules":[{"time":"09:00","title":"일정명","location":"장소명","category":"교통|식사|숙박|관광|쇼핑|기타","note":"간단한 설명"}]}]
하루에 4~6개 일정. category는 반드시 교통/식사/숙박/관광/쇼핑/기타 중 하나.`
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], temperature: 0.7 }),
      })
      const data = await res.json()
      const text: string = data.choices?.[0]?.message?.content ?? ''
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (!jsonMatch) throw new Error('파싱 실패')
      setAiResult(JSON.parse(jsonMatch[0]) as AIDay[])
    } catch {
      setAiError('일정 생성에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setAiLoading(false)
    }
  }

  async function addAllFromAI(aiDays: AIDay[]) {
    const inserts = aiDays.flatMap(day =>
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
      setAiResult(null)
      showToast(`${data.length}개 일정을 추가했어요`)
    } else {
      showToast('일정 추가에 실패했어요', 'error')
    }
  }

  function addFromNearby(name: string) {
    setShowNearby(false)
    setShowForm(true)
    setEditingId(null)
    setForm({ ...emptyForm(selectedDate ?? startDate), location: name })
  }

  async function deleteSchedule(id: string) {
    const item = schedules.find(s => s.id === id)
    if (!item) return
    if (pendingDeleteRef.current) {
      clearTimeout(undoTimerRef.current!)
      await supabase.from('schedules').delete().eq('id', pendingDeleteRef.current.id)
    }
    setSchedules(prev => prev.filter(s => s.id !== id))
    const timer = setTimeout(async () => {
      await supabase.from('schedules').delete().eq('id', id)
      pendingDeleteRef.current = null
    }, 3000)
    undoTimerRef.current = timer
    pendingDeleteRef.current = { id, item }
    showToast('일정을 삭제했어요', 'success', {
      label: '실행 취소',
      onClick: () => {
        clearTimeout(timer)
        setSchedules(prev => sorted([...prev, item]))
        pendingDeleteRef.current = null
      },
    })
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
  const filteredDates = selectedDate ? [selectedDate] : allDates

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {!showForm && !editingId && (
          <button
            type="button"
            onClick={() => { setShowForm(true); setShowNearby(false); setShowAI(false); setEditingId(null); setForm(emptyForm(selectedDate ?? startDate)) }}
            className={btn.primary}
          >
            + 일정 추가
          </button>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setShowAI(v => !v); setShowNearby(false); setShowForm(false); setEditingId(null) }}
            className={`flex-1 ${btn.toggle(showAI)}`}
          >
            ✨ AI 생성
          </button>
          <button
            type="button"
            onClick={() => { setShowNearby(v => !v); setShowForm(false); setShowAI(false); setEditingId(null) }}
            className={`flex-1 ${btn.toggle(showNearby)}`}
          >
            📍 주변 추천
          </button>
        </div>
      </div>

      <div className="flex items-start w-full py-2 overflow-x-auto gap-1">
        <button
          type="button"
          onClick={() => setSelectedDate(null)}
          className="flex flex-col items-center gap-1 p-0 flex-shrink-0"
        >
          <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-bold transition ${
            selectedDate === null ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-white border-gray-200 text-gray-400 hover:border-indigo-300'
          }`}>
            전체
          </div>
          <span className={`text-[10px] font-medium ${selectedDate === null ? 'text-indigo-500' : 'text-gray-400'}`}>All</span>
        </button>
        {allDates.map((date) => {
          const dayNum = getDayNumber(date)
          const isSelected = selectedDate === date
          return (
            <Fragment key={date}>
              <div className="flex-1 h-px bg-gray-200 mt-[18px]" />
              <button type="button" onClick={() => setSelectedDate(prev => prev === date ? null : date)} className="flex flex-col items-center gap-1 p-0 flex-shrink-0">
                <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-bold transition ${
                  isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-white border-gray-200 text-gray-400 hover:border-indigo-300'
                }`}>
                  {dayNum}
                </div>
                <span className={`text-[10px] font-medium ${isSelected ? 'text-indigo-500' : 'text-gray-400'}`}>Day {dayNum}</span>
              </button>
            </Fragment>
          )
        })}
      </div>

      {showAI && (
        <AIResultPanel
          title="AI 일정 생성"
          subtitle={`${destination} · ${days === 1 ? '당일치기' : `${days - 1}박${days}일`}`}
          options={
            <div className="flex flex-wrap gap-2">
              {AI_STYLES.map(s => (
                <PillButton key={s} label={s} selected={aiStyle === s} onClick={() => setAiStyle(s)} />
              ))}
            </div>
          }
          generateLabel={`${days === 1 ? '당일치기' : `${days - 1}박${days}일`} 일정 생성`}
          onGenerate={generateAI}
          loading={aiLoading}
          result={aiResult && (
            <div className="space-y-3">
              {aiResult.map(day => (
                <div key={day.day}>
                  <p className="text-xs font-bold text-indigo-500 mb-1">Day {day.day} · {day.date}</p>
                  {day.schedules.map((s, i) => (
                    <div key={`${day.day}-${i}`} className="flex items-start gap-2 py-1.5 border-b border-gray-50 last:border-0">
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
          )}
          error={aiError}
          onRetry={() => { setAiResult(null) }}
          onAdd={() => addAllFromAI(aiResult!)}
          addLabel="전체 일정에 추가"
        />
      )}
      {showNearby && <NearbyRecommendations onAdd={addFromNearby} />}

      {showForm && (
        <div className={`${card.base} p-5`}>
          <h3 className="font-bold text-gray-800 mb-4">새 일정</h3>
          <ScheduleForm form={form} setForm={setForm}
            startDate={startDate} endDate={endDate}
            onSubmit={addSchedule} submitLabel="추가" onCancel={() => setShowForm(false)} submitting={submitting}
          />
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : (
        <div className="space-y-4">
          {filteredDates.map(date => {
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
                  <p className="text-xs text-gray-400 text-center py-3">아직 일정이 없어요</p>
                ) : (
                  <div>
                    {items.map((item, index) => (
                      <Fragment key={item.id}>
                        <ScheduleItem
                          item={item} editingId={editingId}
                          form={form} setForm={setForm}
                          startDate={startDate} endDate={endDate}
                          onStartEdit={startEdit} onDelete={deleteSchedule}
                          onUpdate={updateSchedule} onCancelEdit={() => setEditingId(null)}
                          isFirst={index === 0} isLast={index === items.length - 1}
                          nextLocation={index < items.length - 1 ? items[index + 1].location : undefined}
                          submitting={submitting}
                        />
                        {index < items.length - 1 && <RouteConnector />}
                      </Fragment>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      {toast && <Toast message={toast.message} type={toast.type} action={toast.action} />}
    </div>
  )
}
