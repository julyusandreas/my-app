export type SessionUser = {
  id: string
  userId: string
  displayName: string
}

const SESSION_KEY = 'cleanplate_session'

export function setSession(user: SessionUser) {
  if (typeof window === 'undefined') return
  localStorage.setItem(SESSION_KEY, JSON.stringify(user))
}

export function getSession(): SessionUser | null {
  if (typeof window === 'undefined') return null

  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as SessionUser
  } catch {
    return null
  }
}

export function clearSession() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(SESSION_KEY)
}