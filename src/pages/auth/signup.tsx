// /components/AuthSignUp.jsx
import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

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

      alert('Check your email for the confirmation link!')
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
        placeholder="Full Name"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        required
      />
      <input
        type="email"
        placeholder="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button disabled={loading} type="submit">
        {loading ? 'Creating account...' : 'Create Account'}
      </button>
      {errorMsg && <p style={{ color: 'red' }}>{errorMsg}</p>}
    </form>
  )
}
