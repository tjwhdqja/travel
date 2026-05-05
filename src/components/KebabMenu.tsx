import { useState, useEffect, useRef } from 'react'

interface MenuItem {
  label: string
  onClick: () => void
  danger?: boolean
}

interface Props {
  items: MenuItem[]
}

export default function KebabMenu({ items }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex flex-col gap-[3px] items-center justify-center w-7 h-7 rounded-lg hover:bg-gray-100 transition"
      >
        <span className="block w-[3px] h-[3px] bg-gray-400 rounded-full" />
        <span className="block w-[3px] h-[3px] bg-gray-400 rounded-full" />
        <span className="block w-[3px] h-[3px] bg-gray-400 rounded-full" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-20 overflow-hidden min-w-[90px]">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => { item.onClick(); setOpen(false) }}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 ${item.danger ? 'text-red-400 hover:bg-red-50' : 'text-gray-700'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
