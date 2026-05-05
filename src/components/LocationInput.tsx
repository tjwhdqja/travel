import { useState, useEffect, useRef } from 'react'
import { input as inputCls } from '../lib/design'

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string

interface Props {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

export default function LocationInput({ value, onChange, placeholder = '장소 검색' }: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  async function fetchSuggestions(input: string) {
    if (input.length < 2) { setSuggestions([]); return }
    try {
      const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': MAPS_API_KEY },
        body: JSON.stringify({ input }),
      })
      const data = await res.json()
      const names: string[] = (data.suggestions ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((s: any) => s.placePrediction?.structuredFormat?.mainText?.text ?? '')
        .filter(Boolean).slice(0, 5)
      setSuggestions(names)
    } catch { setSuggestions([]) }
  }

  function handleChange(val: string) {
    onChange(val)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => fetchSuggestions(val), 350)
  }

  return (
    <div className="relative">
      <input
        value={value}
        onChange={e => handleChange(e.target.value)}
        onBlur={() => setTimeout(() => setSuggestions([]), 150)}
        placeholder={placeholder}
        className={inputCls}
      />
      {suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          {suggestions.map(name => (
            <button key={name} type="button"
              onMouseDown={e => { e.preventDefault(); onChange(name); setSuggestions([]) }}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 flex items-center gap-2"
            >
              <span className="text-gray-400">📍</span> {name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
