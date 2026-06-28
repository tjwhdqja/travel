interface Props {
  checkedCount: number
  totalCount: number
  completeMessage: string
}

export default function CheckProgress({ checkedCount, totalCount, completeMessage }: Props) {
  if (totalCount === 0) return null

  return (
    <>
      <div className="flex items-center justify-between px-1">
        <span className="text-sm text-gray-500">{checkedCount}/{totalCount} 완료</span>
        <div
          role="progressbar"
          aria-valuenow={checkedCount}
          aria-valuemin={0}
          aria-valuemax={totalCount}
          aria-label="진행률"
          className="flex-1 mx-3 h-1.5 bg-gray-100 rounded-full overflow-hidden"
        >
          <div
            className={`h-full rounded-full transition-all ${checkedCount === totalCount ? 'bg-emerald-400' : 'bg-indigo-400'}`}
            style={{ width: `${(checkedCount / totalCount) * 100}%` }}
            aria-hidden="true"
          />
        </div>
      </div>
      {checkedCount === totalCount && (
        <div className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-50 rounded-xl">
          <span className="text-emerald-600 font-semibold text-sm">{completeMessage}</span>
        </div>
      )}
    </>
  )
}
