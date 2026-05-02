import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import HamburgerMenu from '../components/HamburgerMenu'
import PillButton from '../components/PillButton'

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
            <PillButton
              key={cat.id}
              label={`${cat.emoji} ${cat.id}`}
              selected={form.category === cat.id}
              onClick={() => setForm({ ...form, category: cat.id })}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-gray-500 mb-1 block">날짜</label>
          <input
            type="date"
            value={form.date}
            min={startDate}
            max={endDate}
            onChange={e => setForm({ ...form, date: e.target.value })}
            required
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-gray-500 mb-1 block">시간 (선택)</label>
          <input
            type="time"
            value={form.time}
            onChange={e => setForm({ ...form, time: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
          />
        </div>
      </div>
      <input
        placeholder="일정 제목 (예: 도톤보리 관광)"
        value={form.title}
        onChange={e => setForm({ ...form, title: e.target.value })}
        required
        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
      />
      <input
        placeholder="장소 (선택)"
        value={form.location}
        onChange={e => setForm({ ...form, location: e.target.value })}
        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
      />
      <textarea
        placeholder="메모 (선택)"
        value={form.note}
        onChange={e => setForm({ ...form, note: e.target.value })}
        rows={2}
        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm resize-none"
      />
      {members.length > 0 && (
        <div>
          <label className="text-xs text-gray-500 mb-2 block">참여 인원 (선택)</label>
          <div className="flex flex-wrap gap-2">
            {members.map(m => (
              <PillButton
                key={m}
                label={m}
                selected={form.participants.includes(m)}
                onClick={() => toggleParticipant(m)}
              />
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
          취소
        </button>
        <button type="submit" className="flex-1 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600">
          {submitLabel}
        </button>
      </div>
    </form>
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

  useEffect(() => {
    if (userName) fetchAll()
  }, [tripId, userName])

  async function fetchAll() {
    const [{ data: scheduleData }, { data: memberData }] = await Promise.all([
      supabase.from('schedules').select('*').eq('trip_id', tripId).order('date').order('time'),
      supabase.from('trip_members').select('name').eq('trip_id', tripId)
    ])
    setSchedules(scheduleData ?? [])
    setMembers(memberData?.map(m => m.name) ?? [])
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
    const { data } = await supabase
      .from('schedules')
      .insert([{ ...form, trip_id: tripId, created_by: userName }])
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
      .update({
        date: form.date, time: form.time || null,
        title: form.title, location: form.location || null,
        note: form.note || null, participants: form.participants,
        category: form.category
      })
      .eq('id', editingId).select().single()
    if (data) {
      setSchedules(prev => sorted(prev.map(s => s.id === editingId ? data : s)))
      setEditingId(null)
    }
  }

  function startEdit(item: Schedule) {
    setEditingId(item.id)
    setShowForm(false)
    setForm({
      date: item.date, time: item.time ?? '',
      title: item.title, location: item.location ?? '',
      note: item.note ?? '', participants: item.participants ?? [],
      category: item.category ?? '기타'
    })
  }

  async function deleteSchedule(id: string) {
    await supabase.from('schedules').delete().eq('id', id)
    setSchedules(prev => prev.filter(s => s.id !== id))
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
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
          <ScheduleForm
            form={form} setForm={setForm} members={members}
            startDate={startDate} endDate={endDate}
            onSubmit={addSchedule} submitLabel="추가"
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {loading ? (
        <p className="text-center text-gray-400 py-8">불러오는 중...</p>
      ) : (
        <div className="space-y-4">
          {allDates.map(date => {
            const items = grouped[date] ?? []
            const dayNum = getDayNumber(date)
            return (
              <div key={date}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-indigo-100 text-indigo-600 text-xs font-bold px-2.5 py-1 rounded-full">
                    Day {dayNum}
                  </span>
                  <span className="text-sm text-gray-500">{formatDate(date)}</span>
                </div>

                {items.length === 0 ? (
                  <div className="border border-dashed border-gray-200 rounded-xl px-4 py-3 text-center">
                    <p className="text-xs text-gray-300">일정 없음</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {items.map(item => (
                      <div key={item.id}>
                        {editingId === item.id ? (
                          <div className="bg-white rounded-xl p-4 shadow-sm">
                            <h3 className="font-bold text-gray-800 mb-3 text-sm">일정 수정</h3>
                            <ScheduleForm
                              form={form} setForm={setForm} members={members}
                              startDate={startDate} endDate={endDate}
                              onSubmit={updateSchedule} submitLabel="저장"
                              onCancel={() => setEditingId(null)}
                            />
                          </div>
                        ) : (
                          <div className="bg-white rounded-xl p-4 shadow-sm flex items-start gap-3">
                            <div className="flex flex-col items-center min-w-[36px]">
                              <span className="text-xl">{getCategoryEmoji(item.category)}</span>
                              <span className="text-xs font-medium text-indigo-500 mt-0.5">
                                {item.time ? item.time.slice(0, 5) : <span className="text-gray-300">미정</span>}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-800 text-sm">{item.title}</p>
                              {item.location && <p className="text-xs text-gray-400 mt-0.5">📍 {item.location}</p>}
                              {item.note && <p className="text-xs text-gray-400 mt-0.5">{item.note}</p>}
                              {item.participants?.length > 0 && (
                                <p className="text-xs text-indigo-400 mt-0.5">👥 {item.participants.join(', ')}</p>
                              )}
                              {item.created_by && <p className="text-xs text-gray-300 mt-1">{item.created_by}</p>}
                            </div>
                            <HamburgerMenu items={[
                              { label: '수정', onClick: () => startEdit(item) },
                              { label: '삭제', onClick: () => deleteSchedule(item.id), danger: true },
                            ]} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
