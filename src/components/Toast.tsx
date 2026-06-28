import { useState, useRef, useCallback } from 'react'

type ToastType = 'success' | 'error'

interface ToastAction {
  label: string
  onClick: () => void
}

interface ToastState {
  message: string
  type: ToastType
  action?: ToastAction
}

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((message: string, type: ToastType = 'success', action?: ToastAction) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast({ message, type, action })
    timerRef.current = setTimeout(() => setToast(null), action ? 3000 : 2500)
  }, [])

  return { toast, showToast }
}

interface Props {
  message: string
  type?: ToastType
  action?: ToastAction
}

export default function Toast({ message, type = 'success', action }: Props) {
  return (
    <div role="alert" aria-live="assertive" className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl shadow-lg text-sm font-semibold text-white flex items-center gap-3 whitespace-nowrap ${
      type === 'success' ? 'bg-indigo-500' : 'bg-red-400'
    }`}>
      {message}
      {action && (
        <button type="button" onClick={action.onClick} className="underline text-white/80 hover:text-white transition whitespace-nowrap shrink-0">
          {action.label}
        </button>
      )}
    </div>
  )
}
