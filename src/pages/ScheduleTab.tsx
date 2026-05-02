import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

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
}

type FormState = {
  date: string
  time: string
  title: string
  location: string
  note: string
  participants: string[]
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
              <button
                key={m}
                type="button"
                onClick={() => toggleParticipant(m)}
                className={`px-3 py-1.5 rounded-full text-sm transition ${
                  form.participants.includes(m)
                    ? 'bg-indigo-100 text-indigo-600'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
        >
          취소
        </button>
        <button
          type="submit"
          className="flex-1 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600"
        >
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
  date, time: '', title: '', location: '', note: '', participants: []
})

export default function ScheduleTab({ tripId, userName, startDate, endDate }: Props) {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [members, setMembers] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm(startDate))

  useEffect(() => {
    fetchAll()
  }, [tripId])

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
      .select()
      .single()
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
        date: form.date,
        time: form.time || null,
        title: form.title,
        location: form.location || null,
        note: form.note || null,
        participants: form.participants
      })
      .eq('id', editingId)
      .select()
      .single()
    if (data) {
      setSchedules(prev => sorted(prev.map(s => s.id === editingId ? data : s)))
      setEditingId(null)
    }
  }

  function startEdit(item: Schedule) {
    setEditingId(item.id)
    setShowForm(false)
    setForm({
      date: item.date,
      time: item.time ?? '',
      title: item.title,
      location: item.location ?? '',
      note: item.note ?? '',
      participants: item.participants ?? []
    })
  }

  async function deleteSchedule(id: string) {
    await supabase.from('schedules').delete().eq('id', id)
    setSchedules(prev => prev.filter(s => s.id !== id))
  }

  const grouped = schedules.reduce<Record<string, Schedule[]>>((acc, s) => {
    if (!acc[s.date]) acc[s.date] = []
    acc[s.date].push(s)
    return acc
  }, {})

  function formatDate(dateStr: string) {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
  }

  function getDayNumber(dateStr: string) {
    const start = new Date(startDate + 'T00:00:00')
    const cur = new Date(dateStr + 'T00:00:00')
    const diff = Math.round((cur.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    return diff + 1
  }

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
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">🗓</div>
          <p>아직 일정이 없어요</p>
          <p className="text-sm mt-1">일정을 추가해보세요!</p>
        </div>
      ) : (
        Object.entries(grouped).map(([date, items]) => (
          <div key={date}>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-indigo-100 text-indigo-600 text-xs font-bold px-2.5 py-1 rounded-full">
                Day {getDayNumber(date)}
              </span>
              <span className="text-sm text-gray-500">{formatDate(date)}</span>
            </div>
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
                      <div className="text-center min-w-[44px]">
                        {item.time ? (
                          <span className="text-xs font-medium text-indigo-500">{item.time.slice(0, 5)}</span>
                        ) : (
                          <span className="text-xs text-gray-300">미정</span>
                        )}
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
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => startEdit(item)} className="text-gray-300 hover:text-indigo-400 text-xs transition">수정</button>
                        <button onClick={() => deleteSchedule(item.id)} className="text-gray-300 hover:text-red-400 text-xs transition">삭제</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
