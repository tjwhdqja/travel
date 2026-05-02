import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

interface Props {
  tripId: string
}

export default function NoteTab({ tripId }: Props) {
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    supabase.from('notes').select('content').eq('trip_id', tripId).maybeSingle().then(({ data }) => {
      if (data) setContent(data.content ?? '')
    })
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [tripId])

  function handleChange(val: string) {
    setContent(val)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => saveNote(val), 1000)
  }

  async function saveNote(val: string) {
    setSaving(true)
    await supabase.from('notes').upsert({ trip_id: tripId, content: val, updated_at: new Date().toISOString() }, { onConflict: 'trip_id' })
    setSaving(false)
    setSavedAt(new Date())
  }

  function formatSaved(date: Date) {
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-sm font-medium text-gray-700">공용 메모장</p>
        <p className="text-xs text-gray-400">
          {saving ? '저장 중...' : savedAt ? `${formatSaved(savedAt)} 저장됨` : '자동 저장'}
        </p>
      </div>
      <textarea
        value={content}
        onChange={e => handleChange(e.target.value)}
        placeholder="여행 관련 메모를 자유롭게 적어보세요.&#10;&#10;예) 숙소 체크인 시간, 현지 유심 구매 장소, 맛집 리스트..."
        className="w-full h-96 px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm text-gray-800 resize-none bg-white shadow-sm leading-relaxed"
      />
    </div>
  )
}
