// 공용 className 상수 — 변경 시 이 파일 하나만 수정
export const input = 'w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm'
export const textarea = 'w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm resize-none'
export const select = 'px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm bg-white'

export const btn = {
  primary: 'w-full py-3 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 disabled:opacity-60 transition',
  action: 'flex-1 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 disabled:opacity-60 transition',
  secondary: 'flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition',
  danger: 'px-2 py-1.5 text-gray-400 hover:text-red-400 active:text-red-500 transition text-xs',
  submit: 'px-4 py-2.5 bg-indigo-500 text-white rounded-xl text-sm font-semibold hover:bg-indigo-600 transition',
  // 상단 토글 버튼
  toggle: (active: boolean) =>
    `px-4 py-3 rounded-xl font-medium text-sm transition border ${
      active
        ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
        : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-200 hover:text-indigo-500'
    }`,
  // 세그먼트 컨트롤 (탭 전환)
  segment: (active: boolean) =>
    `flex-1 py-2 rounded-lg text-sm font-medium transition ${active ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400'}`,
  // 소형 인라인 필터 (전원/나만 등)
  mini: (active: boolean) =>
    `text-xs font-bold px-2 py-1 rounded-md transition ${active ? 'text-indigo-600 bg-indigo-100' : 'text-gray-500 bg-gray-100'}`,
  // 프리셋 추가 chip (soft)
  chip: 'px-3 py-1.5 bg-indigo-50 text-indigo-600 text-xs rounded-full hover:bg-indigo-100 transition',
  // 컨텍스트 액션 chip (solid)
  chipSolid: 'px-3 py-1.5 bg-indigo-500 text-white text-xs font-semibold rounded-full hover:bg-indigo-600 transition',
  // 카드 내 소형 쌍 버튼
  inlineGhost: 'px-2.5 py-1.5 bg-gray-100 text-gray-600 text-xs rounded-xl hover:bg-gray-200 transition',
  inlineSolid: 'px-2.5 py-1.5 bg-indigo-500 text-white text-xs rounded-xl hover:bg-indigo-600 transition',
}

export const card = {
  base: 'bg-white rounded-2xl shadow-sm',
  item: 'bg-white rounded-xl shadow-sm',
  itemBase: 'rounded-xl shadow-sm',
  section: 'bg-white rounded-2xl shadow-sm p-4',
}
