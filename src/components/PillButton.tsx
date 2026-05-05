interface Props {
  label: string
  selected: boolean
  onClick: () => void
}

export default function PillButton({ label, selected, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
        selected ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600'
      }`}
    >
      {label}
    </button>
  )
}
