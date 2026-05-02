import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import HamburgerMenu from '../components/HamburgerMenu'
import PillButton from '../components/PillButton'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string

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

function LocationInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  async function fetchSuggestions(input: string) {
    if (input.length < 2) { setSuggestions([]); return }
    try {
      const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': MAPS_API_KEY },
        body: JSON.stringify({ input }),
      })
      const data = await res.json()
      const names: string[] = (data.suggestions ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((s: any) => s.placePrediction?.structuredFormat?.mainText?.text ?? '')
        .filter(Boolean).slice(0, 5)
      setSuggestions(names)
    } catch { setSuggestions([]) }
  }

  function handleChange(val: string) {
    onChange(val)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => fetchSuggestions(val), 350)
  }

  return (
    <div className="relative">
      <input
        value={value}
        onChange={e => handleChange(e.target.value)}
        onBlur={() => setTimeout(() => setSuggestions([]), 150)}
        placeholder="장소 검색"
        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
      />
      {suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          {suggestions.map((name, i) => (
            <button key={i} type="button"
              onMouseDown={e => { e.preventDefault(); onChange(name); setSuggestions([]) }}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 flex items-center gap-2"
            >
              <span className="text-gray-400">📍</span> {name}
            </button>
          ))}
        </div>
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
    <div ref={setNodeRef} style={style} className="bg-white rounded-xl p-4 shadow-sm flex items-start gap-3">
      <button
        {...attributes} {...listeners}
        className="flex-shrink-0 cursor-grab active:cursor-grabbing mt-1 grid grid-cols-2 gap-[3px] p-1 rounded hover:bg-gray-100"
      >
        {[...Array(6)].map((_, i) => (
          <span key={i} className="block w-[3px] h-[3px] rounded-full bg-gray-300" />
        ))}
      </button>
      <div className="flex flex-col items-center min-w-[36px]">
        <span className="text-xl">{getCategoryEmoji(item.category)}</span>
        <span className="text-xs font-medium text-indigo-500 mt-0.5">
          {item.time ? item.time.slice(0, 5) : <span className="text-gray-300">미정</span>}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-800 text-sm">{item.title}</p>
        {item.location && (
          <a href={`https://maps.google.com/?q=${encodeURIComponent(item.location)}`} target="_blank" rel="noopener noreferrer"
            className="text-xs text-gray-400 mt-0.5 flex items-center gap-1 hover:text-indigo-400 transition-colors"
          >
            📍 {item.location}
          </a>
        )}
        {item.note && <p className="text-xs text-gray-400 mt-0.5">{item.note}</p>}
        {item.participants?.length > 0 && (
          <p className="text-xs text-indigo-400 mt-0.5">👥 {item.participants.join(', ')}</p>
        )}
        {item.created_by && <p className="text-xs text-gray-300 mt-1">{item.created_by}</p>}
      </div>
      <HamburgerMenu items={[
        { label: '수정', onClick: () => onStartEdit(item) },
        { label: '삭제', onClick: () => onDelete(item.id), danger: true },
      ]} />
    </div>
  )
}

interface Props {
  tripId: string
  userName: string
  startDate: string
  endDate: string
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

export default function ScheduleTab({ tripId, userName, startDate, endDate }: Props) {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [members, setMembers] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
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
      <button
        onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm(startDate)) }}
        className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 rounded-xl transition"
      >
        + 일정 추가
      </button>

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
                      <div className="space-y-2">
                        {items.map(item => (
                          <SortableScheduleItem
                            key={item.id} item={item} editingId={editingId}
                            form={form} setForm={setForm} members={members}
                            startDate={startDate} endDate={endDate}
                            onStartEdit={startEdit} onDelete={deleteSchedule}
                            onUpdate={updateSchedule} onCancelEdit={() => setEditingId(null)}
                          />
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
