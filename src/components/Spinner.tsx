export default function Spinner() {
  return (
    <div role="status" aria-label="로딩 중" className="py-10 flex justify-center">
      <div className="w-5 h-5 rounded-full border-2 border-gray-200 border-t-indigo-400 animate-spin" aria-hidden="true" />
      <span className="sr-only">로딩 중...</span>
    </div>
  )
}
