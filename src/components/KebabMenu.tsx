import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

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
  const [pos, setPos] = useState({ top: 0, right: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (
        btnRef.current?.contains(e.target as Node) ||
        menuRef.current?.contains(e.target as Node)
      ) return
      setOpen(false)
    }
    function handleScroll() { setOpen(false) }
    document.addEventListener('mousedown', handleOutside)
    if (open) window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [open])

  function handleToggle() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const menuHeight = items.length * 42 + 8
      const top = window.innerHeight - rect.bottom < menuHeight
        ? rect.top - menuHeight
        : rect.bottom + 4
      setPos({ top, right: window.innerWidth - rect.right })
    }
    setOpen(v => !v)
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        aria-label="더보기 메뉴"
        aria-expanded={open}
        aria-haspopup="true"
        className="flex flex-col gap-[3px] items-center justify-center w-7 h-7 rounded-lg hover:bg-gray-100 transition flex-shrink-0"
      >
        <span className="block w-[3px] h-[3px] bg-gray-400 rounded-full" />
        <span className="block w-[3px] h-[3px] bg-gray-400 rounded-full" />
        <span className="block w-[3px] h-[3px] bg-gray-400 rounded-full" />
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 9999 }}
          className="bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden min-w-[90px]"
        >
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
        </div>,
        document.body
      )}
    </>
  )
}
