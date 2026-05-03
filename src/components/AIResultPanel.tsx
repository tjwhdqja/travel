import type { ReactNode } from 'react'

interface Props {
  loading: boolean
  result: ReactNode | null
  error?: string
  onRetry: () => void
  onAdd: () => void
  addLabel?: string
}

export default function AIResultPanel({ loading, result, error, onRetry, onAdd, addLabel = '전체 추가' }: Props) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
        <p className="text-sm text-gray-400">🤖 생성 중...</p>
      </div>
    )
  }

  if (!result) return null

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
      <div className="max-h-96 overflow-y-auto">
        {result}
      </div>
      {error && <p className="text-xs text-red-400 text-center">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onRetry}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
        >
          다시 생성
        </button>
        <button
          onClick={onAdd}
          className="flex-1 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600"
        >
          {addLabel}
        </button>
      </div>
    </div>
  )
}
