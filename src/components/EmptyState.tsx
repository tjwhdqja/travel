import type { ReactNode } from 'react'

interface Props {
  icon: ReactNode
  title: string
  subtitle?: string
}

export default function EmptyState({ icon, title, subtitle }: Props) {
  return (
    <div className="flex flex-col items-center py-16">
      <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center text-3xl mb-3">
        {icon}
      </div>
      <p className="text-sm font-medium text-gray-400">{title}</p>
      {subtitle && <p className="text-xs text-gray-300 mt-1">{subtitle}</p>}
    </div>
  )
}
