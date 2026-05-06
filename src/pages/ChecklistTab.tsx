import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import EmptyState from '../components/EmptyState'
import Spinner from '../components/Spinner'
import Toast, { useToast } from '../components/Toast'
import { btn, card, input as inputCls } from '../lib/design'

interface CheckItem {
  id: string
  text: string
  checked: boolean
  created_by: string | null
}

const PRESET_GROUPS = [
  {
    label: '📋 서류·예약',
    items: ['여권', '비자', '항공권 출력', '숙소 예약 확인', '여행자 보험', '국제운전면허증', 'ESTA/ETA 신청', '여행 일정표 출력'],
  },
  {
    label: '💴 금융',
    items: ['환전', '해외 결제 카드', '트래블월렛/트래블로그', '비상금', '카드 해외 결제 신청'],
  },
  {
    label: '👕 의류·가방',
    items: ['의류 (일수만큼)', '속옷·양말', '잠옷', '수영복', '운동화', '샌들', '모자', '선글라스', '우산·우비', '가방 자물쇠'],
  },
  {
    label: '🔌 전자기기',
    items: ['스마트폰 충전기', '보조배터리', '카메라', '카메라 충전기', '멀티 어댑터', '이어폰', '노트북'],
  },
  {
    label: '🧴 세면·위생',
    items: ['세면도구', '샴푸·컨디셔너', '칫솔·치약', '선크림', '수건', '화장품', '면도기', '생리대'],
  },
  {
    label: '💊 의약품',
    items: ['상비약', '소화제', '진통제', '지사제', '멀미약', '모기 기피제', '밴드·파스'],
  },
  {
    label: '🎒 기타',
    items: ['여행용 목베개', '수면 안대·귀마개', '비닐백', '짐표', '간식', '물통'],
  },
]


interface Props {
  tripId: string
  userName: string
}

export default function ChecklistTab({ tripId, userName }: Props) {
  const [items, setItems] = useState<CheckItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newText, setNewText] = useState('')
  const [showPresets, setShowPresets] = useState(false)
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const { toast, showToast } = useToast()
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingDeleteRef = useRef<{ id: string; item: CheckItem } | null>(null)

  useEffect(() => { fetchItems() }, [tripId])

  useEffect(() => {
    if (items.filter(i => i.checked).length === 0) setConfirmDeleteAll(false)
  }, [items])

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
    const { data, error } = await supabase.from('checklists').select('*').eq('trip_id', tripId).eq('type', 'packing').order('created_at')
    if (error) showToast('체크리스트를 불러오지 못했어요', 'error')
    setItems(data ?? [])
    setLoading(false)
  }

  async function deleteAllChecked() {
    const ids = items.filter(i => i.checked).map(i => i.id)
    if (ids.length === 0) return
    const { error } = await supabase.from('checklists').delete().in('id', ids)
    if (error) { showToast('삭제에 실패했어요', 'error'); return }
    setItems(prev => prev.filter(i => !i.checked))
    showToast(`${ids.length}개를 삭제했어요`)
  }

  async function addItem(text: string) {
    if (!text.trim()) return
    const { data } = await supabase.from('checklists')
      .insert([{ trip_id: tripId, text: text.trim(), checked: false, created_by: userName, type: 'packing' }])
      .select().single()
    if (data) { setItems(prev => [...prev, data]); showToast('준비물을 추가했어요'); setNewText('') }
    else { showToast('추가에 실패했어요', 'error') }
  }

  async function toggleItem(item: CheckItem) {
    const { data } = await supabase.from('checklists').update({ checked: !item.checked }).eq('id', item.id).select().single()
    if (data) setItems(prev => prev.map(i => i.id === item.id ? data : i))
  }

  async function saveEdit(id: string) {
    if (!editingText.trim()) return
    const { data } = await supabase.from('checklists').update({ text: editingText.trim() }).eq('id', id).select().single()
    if (data) { setItems(prev => prev.map(i => i.id === id ? data : i)); setEditingId(null) }
    else { showToast('수정에 실패했어요', 'error') }
  }

  async function deleteItem(id: string) {
    const item = items.find(i => i.id === id)
    if (!item) return
    if (pendingDeleteRef.current) {
      clearTimeout(undoTimerRef.current!)
      await supabase.from('checklists').delete().eq('id', pendingDeleteRef.current.id)
    }
    setItems(prev => prev.filter(i => i.id !== id))
    const timer = setTimeout(async () => {
      await supabase.from('checklists').delete().eq('id', id)
      pendingDeleteRef.current = null
    }, 3000)
    undoTimerRef.current = timer
    pendingDeleteRef.current = { id, item }
    showToast('삭제했어요', 'success', {
      label: '실행 취소',
      onClick: () => {
        clearTimeout(timer)
        setItems(prev => [...prev, item])
        pendingDeleteRef.current = null
      },
    })
  }

  const checkedCount = items.filter(i => i.checked).length
  const remaining = items.filter(i => !i.checked)
  const checked = items.filter(i => i.checked)
  return (
    <div className="space-y-4">
      <form onSubmit={e => { e.preventDefault(); addItem(newText) }} className="flex gap-2">
        <input
          placeholder="준비물 추가"
          value={newText}
          onChange={e => setNewText(e.target.value)}
          className={`flex-1 ${inputCls}`}
        />
        <button type="submit" className={btn.submit}>추가</button>
      </form>

      <button
        type="button"
        onClick={() => setShowPresets(v => !v)}
        className={`w-full ${btn.toggle(showPresets)}`}
      >
        ✨ 추천 준비물 {showPresets ? '닫기' : '보기'}
      </button>

      {showPresets && (
        <div className={`${card.section} space-y-4`}>
          {PRESET_GROUPS.map(group => {
            const available = group.items.filter(p => !items.some(i => i.text === p))
            if (available.length === 0) return null
            return (
              <div key={group.label}>
                <p className="text-xs font-semibold text-gray-400 mb-2">{group.label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {available.map(p => (
                    <button type="button" key={p} onClick={() => addItem(p)} className={btn.chip}>
                      + {p}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState icon="✅" title="준비물을 추가해보세요" subtitle="또는 추천 준비물 보기를 눌러보세요" />
      ) : (
        <>
          <div className="flex items-center justify-between px-1">
            <span className="text-sm text-gray-500">{checkedCount}/{items.length} 완료</span>
            <div className="flex-1 mx-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-400 rounded-full transition-all" style={{ width: `${(checkedCount / items.length) * 100}%` }} />
            </div>
          </div>

          <div className="space-y-2">
            {remaining.map(item => {
              if (editingId === item.id) {
                return (
                  <div key={item.id} className={`${card.item} px-4 py-3`}>
                    <form onSubmit={e => { e.preventDefault(); saveEdit(item.id) }} className="flex gap-2 items-center">
                      <input autoFocus value={editingText} onChange={e => setEditingText(e.target.value)} className={`flex-1 ${inputCls}`} />
                      <button type="submit" className={btn.inlineSolid}>저장</button>
                      <button type="button" onClick={() => setEditingId(null)} className={btn.inlineGhost}>취소</button>
                    </form>
                  </div>
                )
              }
              return (
                <div key={item.id} className={`${card.item} px-4 py-3 flex items-center gap-3`}>
                  <button type="button" onClick={() => toggleItem(item)} className="w-5 h-5 rounded-full border-2 border-gray-300 hover:border-indigo-400 flex-shrink-0 transition" />
                  <span className="flex-1 text-sm text-gray-800">{item.text}</span>
                  <button type="button" onClick={() => { setEditingId(item.id); setEditingText(item.text) }} className={btn.inlineGhost}>수정</button>
                  <button type="button" onClick={() => deleteItem(item.id)} className={btn.danger}>삭제</button>
                </div>
              )
            })}
          </div>

          {checked.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <p className="text-xs text-gray-400">완료 {checked.length}개</p>
                {confirmDeleteAll ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">삭제할까요?</span>
                    <button type="button" onClick={() => { deleteAllChecked(); setConfirmDeleteAll(false) }} className="text-xs text-red-400 hover:text-red-500 transition font-medium">확인</button>
                    <button type="button" onClick={() => setConfirmDeleteAll(false)} className="text-xs text-gray-400 hover:text-gray-500 transition">취소</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setConfirmDeleteAll(true)} className="text-xs text-red-400 hover:text-red-500 transition">전체 삭제</button>
                )}
              </div>
              {checked.map(item => (
                <div key={item.id} className={`${card.item} px-4 py-3 flex items-center gap-3 opacity-50`}>
                  <button type="button" onClick={() => toggleItem(item)} className="w-5 h-5 rounded-full bg-indigo-400 flex-shrink-0 flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </button>
                  <span className="flex-1 text-sm text-gray-400 line-through">{item.text}</span>
                  <button type="button" onClick={() => deleteItem(item.id)} className={btn.danger}>삭제</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {toast && <Toast message={toast.message} type={toast.type} action={toast.action} />}
    </div>
  )
}
