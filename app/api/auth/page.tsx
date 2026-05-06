'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { setSession } from '@/lib/session'

type Mode = 'login' | 'signup'

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [userId, setUserId] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isLoginValid = useMemo(() => {
    return userId.trim() !== '' && password.trim() !== ''
  }, [userId, password])

  const isSignupValid = useMemo(() => {
    return (
      userId.trim() !== '' &&
      displayName.trim() !== '' &&
      password.trim() !== '' &&
      confirmPassword.trim() !== ''
    )
  }, [userId, displayName, password, confirmPassword])

  async function handleSubmit() {
    try {
      setLoading(true)
      setError('')

      const endpoint =
        mode === 'login' ? '/api/auth/login' : '/api/auth/signup'

      const payload =
        mode === 'login'
          ? { userId, password }
          : { userId, displayName, password, confirmPassword }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Terjadi kesalahan.')
        return
      }

      const user = data.user

      setSession({
        id: user.id,
        userId: user.userId ?? user.user_id,
        displayName: user.displayName ?? user.display_name,
      })

      router.push('/main')
    } catch {
      setError('Terjadi kesalahan saat memproses permintaan.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 py-8 md:max-w-lg">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold">Masuk ke Clean Plate</h1>
        <p className="mt-2 text-sm text-slate-600">
          Login atau buat akun baru untuk melihat riwayat dan hasil scan piringmu.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
        <button
          onClick={() => {
            setMode('login')
            setError('')
          }}
          className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
            mode === 'login'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500'
          }`}
        >
          Login
        </button>
        <button
          onClick={() => {
            setMode('signup')
            setError('')
          }}
          className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
            mode === 'signup'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500'
          }`}
        >
          Sign Up
        </button>
      </div>

      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">User ID</label>
            <input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Masukkan user id"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-lime-500"
            />
          </div>

          {mode === 'signup' && (
            <div>
              <label className="mb-2 block text-sm font-medium">Display Name</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Masukkan nama tampilan"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-lime-500"
              />
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-lime-500"
            />
          </div>

          {mode === 'signup' && (
            <div>
              <label className="mb-2 block text-sm font-medium">Konfirmasi Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-lime-500"
              />
            </div>
          )}
        </div>

        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={
            loading || (mode === 'login' ? !isLoginValid : !isSignupValid)
          }
          className="mt-8 w-full rounded-2xl px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300 enabled:bg-lime-500 enabled:hover:bg-lime-600"
        >
          {loading
            ? 'Memproses...'
            : mode === 'login'
              ? 'Login'
              : 'Sign Up'}
        </button>
      </section>
    </main>
  )
}