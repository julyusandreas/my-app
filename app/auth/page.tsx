'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Eye,
  EyeOff,
  LockKeyhole,
  User,
  UserRound,
  Sparkles,
  Check,
} from 'lucide-react'
import { getSession, setSession } from '@/lib/session'

type Mode = 'login' | 'signup'

function validatePassword(password: string) {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  }
}

function RequirementItem({
  label,
  valid,
}: {
  label: string
  valid: boolean
}) {
  return (
    <div
      className={`flex items-center gap-2 text-xs transition-colors ${
        valid ? 'text-emerald-600' : 'text-slate-400'
      }`}
    >
      <span
        className={`flex h-4 w-4 items-center justify-center rounded-full border transition-all ${
          valid
            ? 'border-emerald-500 bg-emerald-500 text-white'
            : 'border-slate-300 bg-white text-transparent'
        }`}
      >
        <Check className="size-3" />
      </span>
      <span>{label}</span>
    </div>
  )
}

export default function AuthPage() {
  const router = useRouter()

  const [mode, setMode] = useState<Mode>('login')
  const [userId, setUserId] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const session = getSession()
    if (session) {
      router.replace('/main')
    }
  }, [router])

  const passwordChecks = useMemo(() => validatePassword(password), [password])

  const isPasswordValid = useMemo(() => {
    return (
      passwordChecks.minLength &&
      passwordChecks.hasUppercase &&
      passwordChecks.hasLowercase &&
      passwordChecks.hasNumber
    )
  }, [passwordChecks])

  const isConfirmPasswordValid = useMemo(() => {
    return confirmPassword.length > 0 && password === confirmPassword
  }, [password, confirmPassword])

  const shouldShowPasswordGuide = mode === 'signup' && password.length > 0

  const isLoginValid = useMemo(() => {
    return userId.trim() !== '' && password.trim() !== ''
  }, [userId, password])

  const isSignupValid = useMemo(() => {
    return (
      userId.trim() !== '' &&
      displayName.trim() !== '' &&
      password.trim() !== '' &&
      confirmPassword.trim() !== '' &&
      isPasswordValid &&
      isConfirmPasswordValid
    )
  }, [
    userId,
    displayName,
    password,
    confirmPassword,
    isPasswordValid,
    isConfirmPasswordValid,
  ])

  async function handleSubmit() {
    try {
      setLoading(true)
      setError('')

      if (mode === 'signup') {
        if (!isPasswordValid) {
          setError(
            'Password belum memenuhi syarat. Minimal 8 karakter, huruf besar, huruf kecil, dan angka.'
          )
          return
        }

        if (!isConfirmPasswordValid) {
          setError('Retype password belum cocok.')
          return
        }
      }

      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/signup'

      const payload =
        mode === 'login'
          ? {
              userId: userId.trim(),
              password,
            }
          : {
              userId: userId.trim(),
              displayName: displayName.trim(),
              password,
              confirmPassword,
            }

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
    } catch (err) {
      console.error(err)
      setError('Terjadi kesalahan saat memproses permintaan.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(187,247,208,0.55),_transparent_35%),linear-gradient(to_bottom,_#f7fdf8,_#ffffff)]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-8">
        <section className="relative overflow-hidden rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-[0_20px_60px_rgba(16,24,40,0.08)] backdrop-blur md:p-6">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-emerald-100/60 via-lime-100/50 to-green-100/60 blur-2xl" />

          <div className="relative">
            <div className="mb-6">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                {mode === 'login' ? 'Welcome back' : 'Create your account'}
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {mode === 'login'
                  ? 'Log in to see your progress, milestones, and scan history.'
                  : 'Create a new account to start tracking your food waste habits.'}
              </p>
            </div>

            <div className="mb-6 rounded-2xl bg-slate-100 p-1.5">
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => {
                    setMode('login')
                    setError('')
                  }}
                  className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    mode === 'login'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Login
                </button>

                <button
                  onClick={() => {
                    setMode('signup')
                    setError('')
                  }}
                  className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    mode === 'signup'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Sign Up
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Username
                </label>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-100">
                  <User className="size-5 text-slate-400" />
                  <input
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="Enter your username"
                    className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              {mode === 'signup' && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Display Name
                  </label>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-100">
                    <UserRound className="size-5 text-slate-400" />
                    <input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Enter your display name"
                      className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Password
                </label>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-100">
                  <LockKeyhole className="size-5 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="text-slate-400 transition hover:text-slate-600"
                  >
                    {showPassword ? (
                      <EyeOff className="size-5" />
                    ) : (
                      <Eye className="size-5" />
                    )}
                  </button>
                </div>

                <AnimatePresence initial={false}>
                  {shouldShowPasswordGuide && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -8, height: 0 }}
                      transition={{ duration: 0.28, ease: 'easeOut' }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 space-y-2 rounded-2xl bg-slate-50 px-4 py-3">
                        <RequirementItem
                          label="Minimal 8 karakter"
                          valid={passwordChecks.minLength}
                        />
                        <RequirementItem
                          label="Mengandung huruf besar"
                          valid={passwordChecks.hasUppercase}
                        />
                        <RequirementItem
                          label="Mengandung huruf kecil"
                          valid={passwordChecks.hasLowercase}
                        />
                        <RequirementItem
                          label="Mengandung angka"
                          valid={passwordChecks.hasNumber}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {mode === 'signup' && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Retype Password
                  </label>
                  <div
                    className={`flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 shadow-sm transition focus-within:ring-4 ${
                      confirmPassword.length === 0
                        ? 'border-slate-200 focus-within:border-emerald-400 focus-within:ring-emerald-100'
                        : isConfirmPasswordValid
                          ? 'border-emerald-300 focus-within:border-emerald-400 focus-within:ring-emerald-100'
                          : 'border-red-300 focus-within:border-red-400 focus-within:ring-red-100'
                    }`}
                  >
                    <LockKeyhole className="size-5 text-slate-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your password"
                      className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword((prev) => !prev)
                      }
                      className="text-slate-400 transition hover:text-slate-600"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="size-5" />
                      ) : (
                        <Eye className="size-5" />
                      )}
                    </button>
                  </div>

                  <AnimatePresence initial={false}>
                    {confirmPassword.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -6, height: 0 }}
                        transition={{ duration: 0.24, ease: 'easeOut' }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3">
                          <RequirementItem
                            label="Password dan retype password sama"
                            valid={isConfirmPasswordValid}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={
                loading || (mode === 'login' ? !isLoginValid : !isSignupValid)
              }
              className="mt-6 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-lime-500 px-4 py-3.5 text-base font-semibold text-white shadow-[0_12px_30px_rgba(34,197,94,0.22)] transition hover:from-emerald-600 hover:to-lime-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? 'Memproses...'
                : mode === 'login'
                  ? 'Login'
                  : 'Sign Up'}
            </button>

            <p className="mt-5 text-center text-xs leading-5 text-slate-400">
              {mode === 'login'
                ? 'Log in to continue your food waste reduction progress.'
                : 'Create an account to save your history and track your progress anytime.'}
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}