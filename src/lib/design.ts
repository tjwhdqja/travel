// 공용 className 상수 — 변경 시 이 파일 하나만 수정
export const input = 'w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm'
export const textarea = 'w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm resize-none'

export const btn = {
  primary: 'w-full py-3 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 disabled:opacity-60 transition',
  action: 'flex-1 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 transition',
  secondary: 'flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition',
  danger: 'p-2 text-gray-300 hover:text-red-400 transition',
  // 상단 토글 버튼
  toggle: (active: boolean) =>
    `px-4 py-3 rounded-xl font-medium text-sm transition border ${
      active
        ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
        : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-200 hover:text-indigo-500'
    }`,
  // AI 전용 토글 (violet)
  ai: (active: boolean) =>
    `px-4 py-3 rounded-xl font-medium text-sm transition border ${
      active
        ? 'bg-violet-50 border-violet-200 text-violet-600'
        : 'bg-white border-gray-200 text-gray-600 hover:border-violet-200 hover:text-violet-500'
    }`,
}

export const card = {
  base: 'bg-white rounded-2xl shadow-sm',
  item: 'bg-white rounded-xl shadow-sm',
  section: 'bg-white rounded-2xl shadow-sm p-4',
}
