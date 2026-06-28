import { useState, useEffect, useRef } from 'react'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Supabase에 실제 요청을 던져 연결 여부를 확인한다.
// 응답이 오면(상태코드 무관) 온라인, 네트워크 오류·타임아웃이면 오프라인.
// 캐시버스터 쿼리 + no-store로 서비스워커 캐시에 속지 않게 한다.
async function checkOnline(): Promise<boolean> {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 5000)
    await fetch(`${supabaseUrl}/rest/v1/trips?select=id&limit=1&_=${Date.now()}`, {
      method: 'HEAD',
      headers: { apikey: supabaseAnonKey },
      cache: 'no-store',
      signal: ctrl.signal,
    })
    clearTimeout(timer)
    return true
  } catch {
    return false
  }
}

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false)
  const verifying = useRef(false)

  useEffect(() => {
    let cancelled = false

    // navigator.onLine은 신뢰도가 낮으므로 실제 요청으로 최종 판정한다.
    const verify = async () => {
      if (verifying.current) return
      verifying.current = true
      const online = await checkOnline()
      verifying.current = false
      if (!cancelled) setOffline(!online)
    }

    // 브라우저가 명확히 온라인이라고 하면 즉시 해제, 그 외에는 실제 확인.
    const refresh = () => {
      if (navigator.onLine) verify()
      else setOffline(true)
    }

    verify()

    window.addEventListener('online', verify)
    window.addEventListener('offline', refresh)
    window.addEventListener('focus', refresh)
    // 배너가 떠 있는 동안 자동 복구를 위해 주기적으로 재확인.
    const interval = setInterval(() => { if (offline) verify() }, 15000)

    return () => {
      cancelled = true
      window.removeEventListener('online', verify)
      window.removeEventListener('offline', refresh)
      window.removeEventListener('focus', refresh)
      clearInterval(interval)
    }
  }, [offline])

  if (!offline) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 bg-gray-800 text-white text-xs font-medium py-2 px-4">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
      오프라인 상태예요 · 마지막으로 불러온 데이터를 보여드려요
    </div>
  )
}
