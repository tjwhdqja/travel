const AVATAR_COLORS = ['bg-indigo-400', 'bg-pink-400', 'bg-emerald-400', 'bg-amber-400', 'bg-violet-400', 'bg-sky-400']

export function getAvatarColor(name: string): string {
  let hash = 0
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xff
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

export function getInitial(name: string): string {
  return name.slice(0, 1).toUpperCase()
}

export function getAllDates(start: string, end: string): string[] {
  const dates: string[] = []
  const cur = new Date(start + 'T00:00:00')
  const last = new Date(end + 'T00:00:00')
  while (cur <= last) {
    const y = cur.getFullYear()
    const m = String(cur.getMonth() + 1).padStart(2, '0')
    const d = String(cur.getDate()).padStart(2, '0')
    dates.push(`${y}-${m}-${d}`)
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

export function getDdayLabel(startDate: string, endDate: string, pastLabel?: string): string | null {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(startDate + 'T00:00:00')
  const end = new Date(endDate + 'T00:00:00')
  if (today > end) return pastLabel ?? null
  if (today >= start) return 'D-Day'
  const diff = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return `D-${diff}`
}
