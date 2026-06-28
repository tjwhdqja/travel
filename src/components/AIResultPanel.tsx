import type { ReactNode } from 'react'
import { Sparkles } from 'lucide-react'
import { btn, card } from '../lib/design'
import Spinner from './Spinner'

interface Props {
  title: string
  subtitle?: string
  options?: ReactNode
  generateLabel?: string
  onGenerate: () => void
  loading: boolean
  result: ReactNode | null
  error?: string
  onRetry: () => void
  onAdd: () => void
  addLabel?: string
}

export default function AIResultPanel({
  title, subtitle, options, generateLabel = 'AI 추천 받기', onGenerate,
  loading, result, error,
  onRetry, onAdd, addLabel = '전체 추가',
}: Props) {
  return (
    <div className={`${card.base} overflow-hidden`}>
      <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-gray-50">
        <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <Sparkles size={13} className="text-indigo-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800">{title}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>

      <div className="px-4 pb-4 pt-3 space-y-3">
        {!loading && !result && (
          <>
            {options && <div>{options}</div>}
            <button
              type="button"
              onClick={onGenerate}
              className={`w-full ${btn.action}`}
            >
              {generateLabel}
            </button>
            {error && <p className="text-xs text-red-400 text-center">{error}</p>}
          </>
        )}

        {loading && (
          <div className="py-4 flex justify-center">
            <Spinner />
          </div>
        )}

        {!loading && result && (
          <>
            <div className="max-h-96 overflow-y-auto">
              {result}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onRetry}
                className={btn.secondary}
              >
                다시 생성
              </button>
              <button
                type="button"
                onClick={onAdd}
                className={btn.action}
              >
                {addLabel}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
