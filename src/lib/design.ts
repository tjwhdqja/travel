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

// 내부 탭 버튼 (페이지 내 섹션 전환용)
export const innerTab = (active: boolean) =>
  `flex-shrink-0 flex items-center gap-1 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
    active ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'
  }`

// 정산 상태 dot (settlement list)
export const settleDot = {
  pending: 'w-2 h-2 rounded-full bg-amber-400 shrink-0',
  done: 'w-2 h-2 rounded-full bg-emerald-400 shrink-0',
}

// 상태·레이블 pill 배지
export const badge = {
  indigo: 'text-xs font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full',
  day: 'text-xs font-bold text-indigo-600 bg-indigo-100 px-2.5 py-1 rounded-full tabular-nums',
  blue: 'text-xs font-medium text-blue-600 bg-blue-100 px-2.5 py-1 rounded-full',
  green: 'text-xs font-medium text-green-600 bg-green-100 px-2.5 py-1 rounded-full',
  gray: 'text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full',
}

// 하단 앱 탭 바 버튼 (아이콘+텍스트+뱃지 구조)
export const bottomTab = (active: boolean) =>
  `flex-1 py-2.5 flex flex-col items-center gap-0.5 transition ${
    active ? 'text-indigo-500 border-b-2 border-indigo-500' : 'text-gray-400'
  }`

// 경고·주의 배너 (amber)
export const warning = {
  banner: 'flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2',
  text: 'text-xs text-amber-800',
  btn: 'text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 shrink-0 ml-2 hover:bg-amber-200 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed',
}
