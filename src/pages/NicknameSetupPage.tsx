import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface Props {
  userId: string
  onComplete: (nickname: string) => void
}

export default function NicknameSetupPage({ userId, onComplete }: Props) {
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nickname.trim()) return
    setLoading(true)

    const { error } = await supabase
      .from('profiles')
      .insert([{ id: userId, nickname: nickname.trim() }])

    if (!error) {
      onComplete(nickname.trim())
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">👋</div>
          <h1 className="text-2xl font-bold text-gray-800">처음 오셨군요!</h1>
          <p className="text-gray-500 text-sm mt-1">앱에서 사용할 닉네임을 입력해주세요</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            placeholder="닉네임 입력 (예: 종범)"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            required
            maxLength={10}
            autoFocus
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-800 text-center text-lg"
          />
          <button
            type="submit"
            disabled={loading || !nickname.trim()}
            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
          >
            {loading ? '저장 중...' : '시작하기'}
          </button>
        </form>
      </div>
    </div>
  )
}
