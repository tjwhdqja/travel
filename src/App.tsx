import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import type { Session } from '@supabase/supabase-js'
import LoginPage from './pages/LoginPage'
import NicknameSetupPage from './pages/NicknameSetupPage'
import TripsPage from './pages/TripsPage'
import Spinner from './components/Spinner'

export default function App() {
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(null)
  const [nickname, setNickname] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) loadNickname(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) loadNickname(session.user.id)
      else { setNickname(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadNickname(userId: string) {
    const { data } = await supabase.from('profiles').select('nickname').eq('id', userId).single()
    setNickname(data?.nickname ?? null)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (!session) return <LoginPage />
  if (!nickname) return (
    <NicknameSetupPage
      userId={session.user.id}
      onComplete={(n) => {
        setNickname(n)
        const redirect = sessionStorage.getItem('post_nickname_redirect')
        if (redirect) {
          sessionStorage.removeItem('post_nickname_redirect')
          navigate(redirect)
        }
      }}
    />
  )
  return <TripsPage nickname={nickname} onNicknameChange={setNickname} />
}
