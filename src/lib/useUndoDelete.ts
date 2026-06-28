import { useRef, useCallback } from 'react'
import { supabase } from './supabase'

const UNDO_DELAY_MS = 3000

type ShowToast = (
  msg: string,
  type?: 'success' | 'error',
  action?: { label: string; onClick: () => void }
) => void

/**
 * 삭제 + 실행 취소 패턴을 추상화한 훅.
 * - 삭제 즉시 UI에서 제거 (optimistic)
 * - 3초 후 DB 실제 삭제
 * - 토스트 "실행 취소" 클릭 시 복원
 * - 연속 삭제 시 이전 pending 항목 즉시 커밋
 */
export function useUndoDelete<T extends { id: string }>(
  table: string,
  setItems: React.Dispatch<React.SetStateAction<T[]>>,
  showToast: ShowToast,
  toastMessage: string,
  restoreItems: (prev: T[], item: T) => T[]
) {
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef<{ id: string; item: T } | null>(null)
  // 최신 restoreItems를 이벤트 핸들러에서 읽기 위해 ref 사용
  const restoreRef = useRef(restoreItems)
  restoreRef.current = restoreItems

  const commitDelete = useCallback(async (id: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from(table as any) as any).delete().eq('id', id)
  }, [table])

  return useCallback(async (id: string, item: T) => {
    if (pendingRef.current) {
      clearTimeout(undoTimerRef.current!)
      await commitDelete(pendingRef.current.id)
    }

    setItems(prev => prev.filter(i => i.id !== id))

    const timer = setTimeout(async () => {
      await commitDelete(id)
      pendingRef.current = null
    }, UNDO_DELAY_MS)

    undoTimerRef.current = timer
    pendingRef.current = { id, item }

    showToast(toastMessage, 'success', {
      label: '실행 취소',
      onClick: () => {
        clearTimeout(timer)
        setItems(prev => {
          if (prev.some(i => i.id === item.id)) return prev
          return restoreRef.current(prev, item)
        })
        pendingRef.current = null
      },
    })
  }, [commitDelete, setItems, showToast, toastMessage])
}

/** created_at 오름차순 복원 (ShoppingTab, ChecklistTab, GuideTab 공용) */
export function sortByCreatedAt<T extends { created_at?: string | null }>(prev: T[], item: T): T[] {
  return [...prev, item].sort(
    (a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime()
  )
}
