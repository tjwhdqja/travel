import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface VoteOption {
  id: string
  vote_id: string
  text: string
  voters: string[]
}

interface Vote {
  id: string
  title: string
  created_at: string
  options: VoteOption[]
}

interface Props {
  tripId: string
  userName: string
}

export default function VoteTab({ tripId, userName }: Props) {
  const [votes, setVotes] = useState<Vote[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [options, setOptions] = useState(['', ''])

  useEffect(() => {
    fetchVotes()
  }, [tripId])

  async function fetchVotes() {
    const { data: voteData } = await supabase
      .from('votes')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false })

    if (!voteData) return setLoading(false)

    const withOptions = await Promise.all(
      voteData.map(async v => {
        const { data: opts } = await supabase
          .from('vote_options')
          .select('*')
          .eq('vote_id', v.id)
        return { ...v, options: opts ?? [] }
      })
    )
    setVotes(withOptions)
    setLoading(false)
  }

  async function createVote(e: React.FormEvent) {
    e.preventDefault()
    const validOptions = options.filter(o => o.trim())
    if (validOptions.length < 2) return alert('선택지를 2개 이상 입력해주세요')

    const { data: vote } = await supabase
      .from('votes')
      .insert([{ trip_id: tripId, title }])
      .select()
      .single()

    if (!vote) return

    const { data: opts } = await supabase
      .from('vote_options')
      .insert(validOptions.map(text => ({ vote_id: vote.id, text, voters: [] })))
      .select()

    setVotes(prev => [{ ...vote, options: opts ?? [] }, ...prev])
    setShowForm(false)
    setTitle('')
    setOptions(['', ''])
  }

  async function castVote(voteId: string, optionId: string) {
    const vote = votes.find(v => v.id === voteId)
    if (!vote) return

    const alreadyVotedOption = vote.options.find(o => o.voters.includes(userName))

    if (alreadyVotedOption?.id === optionId) {
      const updated = alreadyVotedOption.voters.filter(v => v !== userName)
      await supabase.from('vote_options').update({ voters: updated }).eq('id', optionId)
      updateLocalVote(voteId, optionId, updated)
      return
    }

    if (alreadyVotedOption) {
      const removed = alreadyVotedOption.voters.filter(v => v !== userName)
      await supabase.from('vote_options').update({ voters: removed }).eq('id', alreadyVotedOption.id)
      updateLocalVote(voteId, alreadyVotedOption.id, removed)
    }

    const option = vote.options.find(o => o.id === optionId)
    if (!option) return
    const added = [...option.voters, userName]
    await supabase.from('vote_options').update({ voters: added }).eq('id', optionId)
    updateLocalVote(voteId, optionId, added)
  }

  function updateLocalVote(voteId: string, optionId: string, voters: string[]) {
    setVotes(prev => prev.map(v =>
      v.id !== voteId ? v : {
        ...v,
        options: v.options.map(o => o.id === optionId ? { ...o, voters } : o)
      }
    ))
  }

  async function deleteVote(voteId: string) {
    await supabase.from('votes').delete().eq('id', voteId)
    setVotes(prev => prev.filter(v => v.id !== voteId))
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowForm(true)}
        className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 rounded-xl transition"
      >
        + 투표 만들기
      </button>

      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="font-bold text-gray-800 mb-4">새 투표</h3>
          <form onSubmit={createVote} className="space-y-3">
            <input
              placeholder="투표 제목 (예: 첫날 저녁 뭐 먹을까?)"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
            />
            <div className="space-y-2">
              <label className="text-xs text-gray-500">선택지</label>
              {options.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    placeholder={`선택지 ${i + 1}`}
                    value={opt}
                    onChange={e => {
                      const next = [...options]
                      next[i] = e.target.value
                      setOptions(next)
                    }}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setOptions(options.filter((_, j) => j !== i))}
                      className="text-gray-300 hover:text-red-400 px-2"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setOptions([...options, ''])}
                className="text-indigo-500 text-sm hover:text-indigo-600"
              >
                + 선택지 추가
              </button>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600">취소</button>
              <button type="submit" className="flex-1 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-semibold">만들기</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p className="text-center text-gray-400 py-8">불러오는 중...</p>
      ) : votes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">🗳</div>
          <p>아직 투표가 없어요</p>
          <p className="text-sm mt-1">투표를 만들어보세요!</p>
        </div>
      ) : (
        votes.map(vote => {
          const totalVotes = vote.options.reduce((sum, o) => sum + o.voters.length, 0)
          const myVote = vote.options.find(o => o.voters.includes(userName))
          const maxVotes = Math.max(...vote.options.map(o => o.voters.length))

          return (
            <div key={vote.id} className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-bold text-gray-800 text-sm flex-1">{vote.title}</h3>
                <button onClick={() => deleteVote(vote.id)} className="text-gray-300 hover:text-red-400 text-xs ml-2">삭제</button>
              </div>
              <div className="space-y-2">
                {vote.options.map(opt => {
                  const isMyVote = opt.voters.includes(userName)
                  const pct = totalVotes === 0 ? 0 : Math.round((opt.voters.length / totalVotes) * 100)
                  const isWinning = opt.voters.length === maxVotes && maxVotes > 0

                  return (
                    <button
                      key={opt.id}
                      onClick={() => castVote(vote.id, opt.id)}
                      className={`w-full text-left rounded-xl overflow-hidden border transition ${
                        isMyVote ? 'border-indigo-400' : 'border-gray-100 hover:border-indigo-200'
                      }`}
                    >
                      <div className="relative px-4 py-3">
                        <div
                          className={`absolute inset-0 ${isWinning ? 'bg-indigo-50' : 'bg-gray-50'}`}
                          style={{ width: `${pct}%` }}
                        />
                        <div className="relative flex items-center justify-between">
                          <span className={`text-sm font-medium ${isMyVote ? 'text-indigo-600' : 'text-gray-700'}`}>
                            {isMyVote && '✓ '}{opt.text}
                          </span>
                          <span className="text-xs text-gray-400">{opt.voters.length}표 ({pct}%)</span>
                        </div>
                        {opt.voters.length > 0 && (
                          <p className="relative text-xs text-gray-400 mt-0.5">{opt.voters.join(', ')}</p>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-gray-400 mt-3">총 {totalVotes}표{myVote ? ` · ${myVote.text} 선택` : ' · 아직 투표 안 함'}</p>
            </div>
          )
        })
      )}
    </div>
  )
}
