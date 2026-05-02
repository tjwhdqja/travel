import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface CheckItem {
  id: string
  text: string
  checked: boolean
  created_by: string | null
}

const PRESETS = ['여권', '항공권 출력', '숙소 예약 확인', '환전', '여행자 보험', '충전기', '상비약', '세면도구', '카메라', '수영복']

interface Props {
  tripId: string
  userName: string
}

export default function ChecklistTab({ tripId, userName }: Props) {
  const [items, setItems] = useState<CheckItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newText, setNewText] = useState('')
  const [showPresets, setShowPresets] = useState(false)

  useEffect(() => { fetchItems() }, [tripId])

  useEffect(() => {
    const channel = supabase
      .channel(`checklists:${tripId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'checklists', filter: `trip_id=eq.${tripId}` }, ({ new: row }) => {
        setItems(prev => prev.some(i => i.id === row.id) ? prev : [...prev, row as CheckItem])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'checklists', filter: `trip_id=eq.${tripId}` }, ({ new: row }) => {
        setItems(prev => prev.map(i => i.id === row.id ? row as CheckItem : i))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'checklists', filter: `trip_id=eq.${tripId}` }, ({ old: row }) => {
        setItems(prev => prev.filter(i => i.id !== row.id))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [tripId])

  async function fetchItems() {
    const { data } = await supabase.from('checklists').select('*').eq('trip_id', tripId).order('created_at')
    setItems(data ?? [])
    setLoading(false)
  }

  async function addItem(text: string) {
    if (!text.trim()) return
    const { data } = await supabase.from('checklists')
      .insert([{ trip_id: tripId, text: text.trim(), checked: false, created_by: userName }])
      .select().single()
    if (data) setItems(prev => [...prev, data])
    setNewText('')
  }

  async function toggleItem(item: CheckItem) {
    const { data } = await supabase.from('checklists').update({ checked: !item.checked }).eq('id', item.id).select().single()
    if (data) setItems(prev => prev.map(i => i.id === item.id ? data : i))
  }

  async function deleteItem(id: string) {
    await supabase.from('checklists').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const checkedCount = items.filter(i => i.checked).length
  const remaining = items.filter(i => !i.checked)
  const checked = items.filter(i => i.checked)
  const addablePresets = PRESETS.filter(p => !items.some(i => i.text === p))

  return (
    <div className="space-y-4">
      <form onSubmit={e => { e.preventDefault(); addItem(newText) }} className="flex gap-2">
        <input
          placeholder="준비물 추가"
          value={newText}
          onChange={e => setNewText(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
        />
        <button type="submit" className="px-4 py-2.5 bg-indigo-500 text-white rounded-xl text-sm font-semibold hover:bg-indigo-600">추가</button>
      </form>

      <button
        onClick={() => setShowPresets(v => !v)}
        className="w-full py-2.5 rounded-xl border border-dashed border-indigo-300 text-indigo-500 text-sm hover:bg-indigo-50 transition"
      >
        {showPresets ? '▲ 추천 준비물 닫기' : '✨ 추천 준비물 보기'}
      </button>

      {showPresets && addablePresets.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="flex flex-wrap gap-2">
            {addablePresets.map(p => (
              <button
                key={p}
                onClick={() => addItem(p)}
                className="px-3 py-1.5 bg-indigo-50 text-indigo-600 text-sm rounded-full hover:bg-indigo-100 transition"
              >
                + {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-center text-gray-400 py-8">불러오는 중...</p>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">✅</div>
          <p>준비물을 추가해보세요</p>
        </div>
      ) : (
        <>
          {items.length > 0 && (
            <div className="flex items-center justify-between px-1">
              <span className="text-sm text-gray-500">{checkedCount}/{items.length} 완료</span>
              <div className="flex-1 mx-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-400 rounded-full transition-all" style={{ width: `${items.length ? (checkedCount / items.length) * 100 : 0}%` }} />
              </div>
            </div>
          )}

          <div className="space-y-2">
            {remaining.map(item => (
              <div key={item.id} className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center gap-3">
                <button onClick={() => toggleItem(item)} className="w-5 h-5 rounded-full border-2 border-gray-300 hover:border-indigo-400 flex-shrink-0 transition" />
                <span className="flex-1 text-sm text-gray-800">{item.text}</span>
                <button onClick={() => deleteItem(item.id)} className="text-gray-300 hover:text-red-400 text-xs">삭제</button>
              </div>
            ))}
          </div>

          {checked.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-400 px-1">완료 {checked.length}개</p>
              {checked.map(item => (
                <div key={item.id} className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center gap-3 opacity-50">
                  <button onClick={() => toggleItem(item)} className="w-5 h-5 rounded-full bg-indigo-400 flex-shrink-0 flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </button>
                  <span className="flex-1 text-sm text-gray-400 line-through">{item.text}</span>
                  <button onClick={() => deleteItem(item.id)} className="text-gray-300 hover:text-red-400 text-xs">삭제</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
