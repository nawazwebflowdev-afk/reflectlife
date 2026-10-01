// /components/AuthSignUp.jsx
import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

import { tr } from "@/i18n/tr";
export default function AuthSignUp() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSignUp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error

      // You can auto-create the user's profile row here
      const user = data.user
      if (user) {
        await supabase.from('profiles').insert({
          id: user.id,
          full_name: fullName,
          email: email,
        })
      }

      alert(tr("a.217028511b"))
    } catch (err) {
      console.error('Signup failed:', err)
      setErrorMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSignUp} className="flex flex-col gap-3">
      <input
        type="text"
        placeholder={tr("a.64346b483c")}
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        required
      />
      <input
        type="email"
        placeholder={tr("a.c94d3175a6")}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder={tr("a.8be3c943b1")}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button disabled={loading} type="submit">
        {loading ? tr("a.27b8a2d710") : tr("a.eff4fd865f")}
      </button>
      {errorMsg && <p style={{ color: 'red' }}>{errorMsg}</p>}
    </form>
  )
}
