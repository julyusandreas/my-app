export type WalkthroughStepId =
  | 'main-stats'
  | 'main-history'
  | 'main-upload'
  | 'main-history-open'
  | 'upload-camera'
  | 'upload-capture'
  | 'upload-send'
  | 'upload-result'
  | 'detail-image'
  | 'detail-status'
  | 'detail-leftovers'
  | 'detail-message'
  | 'detail-time'

type WalkthroughState = {
  active: boolean
  seen: boolean
  currentStep: WalkthroughStepId | null
  focusRecordId?: string | null
}

const PREFIX = 'cleanplate_walkthrough_state_'

function getKey(userId: string) {
  return `${PREFIX}${userId}`
}

export function getWalkthroughState(userId: string): WalkthroughState {
  if (typeof window === 'undefined') {
    return {
      active: false,
      seen: true,
      currentStep: null,
      focusRecordId: null,
    }
  }

  const raw = localStorage.getItem(getKey(userId))

  if (!raw) {
    return {
      active: false,
      seen: false,
      currentStep: null,
      focusRecordId: null,
    }
  }

  try {
    return JSON.parse(raw) as WalkthroughState
  } catch {
    return {
      active: false,
      seen: false,
      currentStep: null,
      focusRecordId: null,
    }
  }
}

export function startWalkthrough(userId: string) {
  if (typeof window === 'undefined') return

  const state: WalkthroughState = {
    active: true,
    seen: false,
    currentStep: 'main-stats',
    focusRecordId: null,
  }

  localStorage.setItem(getKey(userId), JSON.stringify(state))
}

export function setWalkthroughStep(
  userId: string,
  step: WalkthroughStepId,
  extras?: { focusRecordId?: string | null }
) {
  if (typeof window === 'undefined') return

  const current = getWalkthroughState(userId)

  const next: WalkthroughState = {
    active: true,
    seen: false,
    currentStep: step,
    focusRecordId:
      extras?.focusRecordId !== undefined
        ? extras.focusRecordId
        : current.focusRecordId ?? null,
  }

  localStorage.setItem(getKey(userId), JSON.stringify({ ...current, ...next }))
}

export function finishWalkthrough(userId: string) {
  if (typeof window === 'undefined') return

  const next: WalkthroughState = {
    active: false,
    seen: true,
    currentStep: null,
    focusRecordId: null,
  }

  localStorage.setItem(getKey(userId), JSON.stringify(next))
}

export function resetWalkthrough(userId: string) {
  if (typeof window === 'undefined') return
  localStorage.removeItem(getKey(userId))
}