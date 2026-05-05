import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { btn, input as inputCls } from '../lib/design'

interface Props {
  userId: string
  onComplete: (nickname: string) => void
}

export default function NicknameSetupPage({ userId, onComplete }: Props) {
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canSubmit = nickname.trim().length > 0 && !loading

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError('')
    const { error } = await supabase
      .from('profiles')
      .upsert([{ id: userId, nickname: nickname.trim() }])
    if (error) {
      setError('저장에 실패했어요. 다시 시도해주세요.')
    } else {
      onComplete(nickname.trim())
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">👋</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">처음 오셨군요!</h1>
          <p className="text-sm text-gray-400">여행 앱에서 사용할 닉네임을 정해주세요</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            placeholder="닉네임 입력"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            maxLength={10}
            autoFocus
            className={`${inputCls} text-center text-lg py-3`}
          />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={!canSubmit}
            className={btn.primary}
          >
            {loading ? '저장 중...' : '시작하기'}
          </button>
        </form>
      </div>
    </div>
  )
}
