'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  History,
  Upload,
  LogOut,
  ChevronRight,
  Info,
  RefreshCcw,
} from 'lucide-react'
import type { DashboardResponse, RecordItem } from '@/lib/types'
import { clearSession, getSession, type SessionUser } from '@/lib/session'
import WalkthroughOverlay from '@/components/ui/WalkthroughOverlay'
import {
  finishWalkthrough,
  getWalkthroughState,
  resetWalkthrough,
  setWalkthroughStep,
  startWalkthrough,
  type WalkthroughStepId,
} from '@/lib/walkthrough'

type DebugInfo = {
  requestedUserId: string
  totalRecords: number
}

function getLeftoverLabels(item: RecordItem): string[] {
  const labels: string[] = []

  if (item.leftover_rice) labels.push('Rice')
  if (item.leftover_vegetable) labels.push('Vegetables')
  if (item.leftover_side_dish) labels.push('Protein Dishes')

  return labels
}

function getDailyProgress(history: RecordItem[]) {
  const sorted = [...history].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  const uniqueDays = new Map<string, RecordItem>()

  for (const item of sorted) {
    const key = new Date(item.created_at).toISOString().slice(0, 10)

    if (!uniqueDays.has(key)) {
      uniqueDays.set(key, item)
    }
  }

  const days = Array.from(uniqueDays.values()).slice(0, 5)

  return Array.from({ length: 5 }, (_, index) => ({
    day: index + 1,
    record: days[index] ?? null,
  }))
}

function StatCard({
  icon,
  label,
  value,
  tone = 'green',
}: {
  icon: React.ReactNode
  label: string
  value: number
  tone?: 'green' | 'emerald' | 'lime' | 'amber'
}) {
  const toneMap = {
    green:
      'bg-gradient-to-br from-emerald-50 to-lime-50 border-emerald-100 text-emerald-700',
    emerald:
      'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-100 text-emerald-700',
    lime: 'bg-gradient-to-br from-lime-50 to-green-50 border-lime-100 text-lime-700',
    amber:
      'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100 text-amber-700',
  }

  return (
    <div className={`rounded-3xl border p-4 shadow-sm ${toneMap[tone]}`}>
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
        {icon}
      </div>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  )
}

function ProgressStep({
  day,
  record,
  isLast,
}: {
  day: number
  record: RecordItem | null
  isLast: boolean
}) {
  const isDone = Boolean(record)
  const isClean = record?.is_clean_plate === true
  const isWaste = record && !record.is_clean_plate

  return (
    <div className="flex flex-1 items-start">
      <div className="flex min-w-[58px] flex-col items-center">
        <div
          className={`relative flex h-14 w-14 items-center justify-center rounded-full border-2 bg-white shadow-sm transition ${
            isClean
              ? 'border-emerald-400 shadow-emerald-100'
              : isWaste
                ? 'border-amber-300 shadow-amber-100'
                : 'border-slate-300'
          }`}
        >
          {!isDone && (
            <span className="text-lg font-bold text-slate-400">{day}</span>
          )}

          {isClean && (
            <img
              src="/illustrations/nofoodwaste.png"
              alt="No Food Waste"
              className="h-11 w-11 object-contain"
            />
          )}

          {isWaste && (
            <img
              src="/illustrations/foodwastedetected.png"
              alt="Food Waste Detected"
              className="h-11 w-11 object-contain"
            />
          )}

          {isClean && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white shadow">
              ✓
            </span>
          )}
        </div>

        <p
          className={`mt-2 text-xs font-semibold ${
            isClean
              ? 'text-emerald-600'
              : isWaste
                ? 'text-amber-600'
                : 'text-slate-500'
          }`}
        >
          Day {day}
        </p>
      </div>

      {!isLast && (
        <div
          className={`mt-7 flex-1 border-t-2 border-dashed ${
            isDone ? 'border-emerald-300' : 'border-slate-300'
          }`}
        />
      )}
    </div>
  )
}

function HistoryCard({
  item,
  onClick,
  cardRef,
  highlighted = false,
}: {
  item: RecordItem
  onClick: () => void
  cardRef?: React.Ref<HTMLButtonElement>
  highlighted?: boolean
}) {
  const leftovers = getLeftoverLabels(item)

  return (
    <button
      ref={cardRef}
      onClick={onClick}
      className={`flex w-full items-center gap-4 rounded-[28px] border bg-white p-3.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 ${
        highlighted
          ? 'border-emerald-300 ring-4 ring-emerald-200 shadow-[0_0_0_4px_rgba(16,185,129,0.10)]'
          : 'border-slate-100'
      }`}
    >
      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-slate-100 shadow-sm">
        <img
          src={item.image_url}
          alt="Riwayat piring"
          className="h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.src = 'https://placehold.co/240x240?text=No+Image'
          }}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                item.is_clean_plate
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-700'
              }`}
            >
              {item.is_clean_plate ? 'Clean Plates' : 'Food Left Behind'}
            </span>
          </div>

          <ChevronRight className="mt-1 size-4 shrink-0 text-slate-400" />
        </div>

        {!item.is_clean_plate && leftovers.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {leftovers.map((label) => (
              <span
                key={label}
                className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-600"
              >
                {label}
              </span>
            ))}
          </div>
        )}

        {item.ai_message && (
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">
            {item.ai_message}
          </p>
        )}

        <p className="mt-3 text-xs text-slate-400">
          {new Date(item.created_at).toLocaleString('id-ID')}
        </p>
      </div>
    </button>
  )
}

export default function MainPage() {
  const router = useRouter()
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null)
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [debug, setDebug] = useState<DebugInfo | null>(null)

  const [showIntroPopup, setShowIntroPopup] = useState(false)
  const [walkthroughActive, setWalkthroughActive] = useState(false)
  const [currentStep, setCurrentStep] = useState<WalkthroughStepId | null>(null)
  const [focusRecordId, setFocusRecordId] = useState<string | null>(null)
  const [overlayReadyTick, setOverlayReadyTick] = useState(0)
  const [historyTourReady, setHistoryTourReady] = useState(false)

  const statsRef = useRef<HTMLDivElement | null>(null)
  const progressRef = useRef<HTMLElement | null>(null)
  const historyRef = useRef<HTMLElement | null>(null)
  const uploadButtonRef = useRef<HTMLButtonElement | null>(null)
  const historyCardRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const hasHistory = (dashboard?.history?.length ?? 0) > 0

  const progressDays = useMemo(() => {
    return getDailyProgress(dashboard?.history ?? [])
  }, [dashboard])

  useEffect(() => {
    const session = getSession()

    if (!session) {
      router.replace('/')
      return
    }

    const currentSession: SessionUser = session
    setUser(currentSession)

    async function loadDashboard(sessionUser: SessionUser) {
      try {
        setLoading(true)
        setError('')

        const res = await fetch(`/api/dashboard/${sessionUser.id}`)
        const data = await res.json()

        if (!res.ok) {
          setError(data.error || 'Gagal memuat dashboard')
          return
        }

        setDashboard(data)
        setDebug(data.debug ?? null)
      } catch (err) {
        console.error(err)
        setError('Terjadi kesalahan saat memuat data')
      } finally {
        setLoading(false)
      }
    }

    loadDashboard(currentSession)

    const state = getWalkthroughState(currentSession.id)
    setWalkthroughActive(state.active)
    setCurrentStep(state.currentStep)
    setFocusRecordId(state.focusRecordId ?? null)

    if (!state.seen && !state.active) {
      setShowIntroPopup(true)
    }
  }, [router])

  const focusedHistoryItem =
    dashboard?.history?.find((item) => item.id === focusRecordId) ??
    dashboard?.history?.[0] ??
    null

  const focusedHistoryTarget = focusedHistoryItem
    ? historyCardRefs.current[focusedHistoryItem.id] ?? null
    : null

  useEffect(() => {
    setHistoryTourReady(false)

    if (!walkthroughActive) return
    if (currentStep !== 'main-history-open') return
    if (loading) return
    if (!focusedHistoryTarget) return

    const timeoutId = window.setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setHistoryTourReady(true)
        })
      })
    }, 220)

    return () => window.clearTimeout(timeoutId)
  }, [walkthroughActive, currentStep, loading, focusedHistoryTarget, dashboard])

  useEffect(() => {
    if (!walkthroughActive || !currentStep) return

    const targetMap: Partial<Record<WalkthroughStepId, HTMLElement | null>> = {
      'main-stats': statsRef.current,
      'main-progress': progressRef.current,
      'main-history': historyRef.current,
      'main-upload': uploadButtonRef.current,
      'main-history-open': hasHistory
        ? focusedHistoryTarget
        : uploadButtonRef.current,
    }

    const el = targetMap[currentStep]
    if (el) {
      el.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }, [
    walkthroughActive,
    currentStep,
    dashboard,
    hasHistory,
    focusedHistoryTarget,
    overlayReadyTick,
    historyTourReady,
  ])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const raf1 = requestAnimationFrame(() => {
        const raf2 = requestAnimationFrame(() => {
          setOverlayReadyTick((prev) => prev + 1)
        })

        return () => cancelAnimationFrame(raf2)
      })

      return () => cancelAnimationFrame(raf1)
    }, 180)

    return () => window.clearTimeout(timeoutId)
  }, [currentStep, dashboard, focusRecordId])

  function refreshWalkthroughState() {
    if (!user) return
    const state = getWalkthroughState(user.id)
    setWalkthroughActive(state.active)
    setCurrentStep(state.currentStep)
    setFocusRecordId(state.focusRecordId ?? null)
  }

  function handleLogout() {
    clearSession()
    router.replace('/')
  }

  function handleStartWalkthrough() {
    if (!user) return
    startWalkthrough(user.id)
    refreshWalkthroughState()
    setShowIntroPopup(false)
  }

  function handleFinishWalkthrough() {
    if (!user) return
    finishWalkthrough(user.id)
    refreshWalkthroughState()
    setShowIntroPopup(false)
  }

  function handleReplayWalkthrough() {
    if (!user) return
    resetWalkthrough(user.id)
    setShowIntroPopup(true)
    setWalkthroughActive(false)
    setCurrentStep(null)
    setFocusRecordId(null)
  }

  function handleOpenFocusedHistoryFromTour() {
    if (!user) return

    if (!hasHistory) {
      setWalkthroughStep(user.id, 'main-upload')
      refreshWalkthroughState()
      return
    }

    const targetHistory =
      dashboard?.history?.find((item) => item.id === focusRecordId) ??
      dashboard?.history?.[0]

    if (!targetHistory) {
      setWalkthroughStep(user.id, 'main-upload')
      refreshWalkthroughState()
      return
    }

    setWalkthroughStep(user.id, 'detail-image', {
      focusRecordId: targetHistory.id,
    })
    router.push(`/history/${targetHistory.id}`)
  }

  function handleMainNext() {
    if (!user || !currentStep) return

    if (currentStep === 'main-stats') {
      setWalkthroughStep(user.id, 'main-progress')
      refreshWalkthroughState()
      return
    }

    if (currentStep === 'main-progress') {
      setWalkthroughStep(user.id, 'main-history')
      refreshWalkthroughState()
      return
    }

    if (currentStep === 'main-history') {
      setWalkthroughStep(user.id, 'main-upload')
      refreshWalkthroughState()
      return
    }

    if (currentStep === 'main-upload') {
      setWalkthroughStep(user.id, 'upload-camera')
      router.push('/upload')
      return
    }

    if (currentStep === 'main-history-open') {
      handleOpenFocusedHistoryFromTour()
      return
    }
  }

  function handleMainBack() {
    if (!user || !currentStep) return

    if (currentStep === 'main-progress') {
      setWalkthroughStep(user.id, 'main-stats')
    } else if (currentStep === 'main-history') {
      setWalkthroughStep(user.id, 'main-progress')
    } else if (currentStep === 'main-upload') {
      setWalkthroughStep(user.id, 'main-history')
    } else if (currentStep === 'main-history-open') {
      if (hasHistory) {
        setWalkthroughStep(user.id, 'main-upload')
      } else {
        setWalkthroughStep(user.id, 'main-history')
      }
    }

    refreshWalkthroughState()
  }

  const walkthroughConfig = useMemo(() => {
    if (!currentStep) return null

    if (currentStep === 'main-stats') {
      return {
        stepLabel: 'Step 1 of 5',
        title: 'Your Food Waste Summary',
        description:
          'The recap section shows the amount of leftover food in each category, helping you understand which types are most often left on your plate.',
        target: statsRef.current,
        showNext: true,
        showBack: false,
        nextLabel: 'Next',
        primaryActionLabel: undefined,
        onPrimaryAction: undefined,
      }
    }

    if (currentStep === 'main-progress') {
      return {
        stepLabel: 'Step 2 of 5',
        title: 'Track your 5-day progress',
        description:
          'This section shows your daily scan progress. Each day displays a clean plate icon if no food waste is detected, or a food waste icon if leftovers are found.',
        target: progressRef.current,
        showNext: true,
        showBack: true,
        nextLabel: 'Next',
        primaryActionLabel: undefined,
        onPrimaryAction: undefined,
      }
    }

    if (currentStep === 'main-history') {
      return {
        stepLabel: 'Step 3 of 5',
        title: 'Your scan results are saved in History',
        description: 'You can view a list of all your saved scan results here.',
        target: historyRef.current,
        showNext: true,
        showBack: true,
        nextLabel: 'Next',
        primaryActionLabel: undefined,
        onPrimaryAction: undefined,
      }
    }

    if (currentStep === 'main-upload') {
      return {
        stepLabel: 'Step 4 of 5',
        title: 'Tap here to start scanning',
        description: 'Tap the Scan Plate button to go to the photo capture screen.',
        target: uploadButtonRef.current,
        showNext: true,
        showBack: true,
        nextLabel: 'Go to Upload',
        primaryActionLabel: undefined,
        onPrimaryAction: undefined,
      }
    }

    if (currentStep === 'main-history-open') {
      if (!hasHistory) {
        return {
          stepLabel: 'Step 5 of 5',
          title: 'Belum ada riwayat untuk dibuka',
          description:
            'Akun ini belum punya hasil scan yang tersimpan. Buat scan pertama dulu lewat tombol Scan Plate, lalu riwayat akan muncul di sini.',
          target: uploadButtonRef.current,
          showNext: true,
          showBack: true,
          nextLabel: 'Buat Scan Dulu',
          primaryActionLabel: undefined,
          onPrimaryAction: undefined,
        }
      }

      return {
        stepLabel: 'Step 5 of 5',
        title: 'Your latest saved result',
        description:
          'The highlighted card shows your most recent scan. Tap below to view its details.',
        target: focusedHistoryTarget,
        showNext: false,
        showBack: true,
        nextLabel: 'Open Detail',
        primaryActionLabel: 'View Details',
        onPrimaryAction: handleOpenFocusedHistoryFromTour,
      }
    }

    return null
  }, [currentStep, hasHistory, focusedHistoryTarget, dashboard])

  const overlayTargetReady = useMemo(() => {
    if (!walkthroughActive || !currentStep) return false

    if (currentStep === 'main-stats') return Boolean(statsRef.current)
    if (currentStep === 'main-progress') return Boolean(progressRef.current)
    if (currentStep === 'main-history') return Boolean(historyRef.current)
    if (currentStep === 'main-upload') return Boolean(uploadButtonRef.current)

    if (currentStep === 'main-history-open') {
      if (!hasHistory) return Boolean(uploadButtonRef.current)
      return Boolean(focusedHistoryTarget) && historyTourReady && !loading
    }

    return false
  }, [
    walkthroughActive,
    currentStep,
    hasHistory,
    focusedHistoryTarget,
    overlayReadyTick,
    historyTourReady,
    loading,
  ])

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(187,247,208,0.42),_transparent_30%),linear-gradient(to_bottom,_#f7fdf8,_#ffffff)] pb-28">
      <div className="mx-auto w-full max-w-md px-4 py-5">
        <section className="relative overflow-hidden rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-[0_20px_60px_rgba(16,24,40,0.08)] backdrop-blur">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-emerald-100/60 via-lime-100/50 to-green-100/60 blur-2xl" />

          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="mt-4 text-sm text-slate-500">Hello,</p>
              <h1 className="truncate text-2xl font-bold tracking-tight text-slate-900">
                {user?.displayName || 'Pengguna'}
              </h1>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={handleReplayWalkthrough}
                className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100"
              >
                <RefreshCcw className="size-4" />
                View Tour Again
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 shadow-sm transition hover:bg-red-100 hover:text-red-700 active:scale-[0.97]"
              >
                <LogOut className="size-4" />
                Logout
              </button>
            </div>
          </div>
        </section>

        {error && (
          <section className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 shadow-sm">
            {error}
          </section>
        )}

        <section ref={statsRef} className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Food Waste Recap</h2>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <StatCard
              icon={
                <img
                  src="/illustrations/rice.png"
                  alt="Rice"
                  className="h-10 w-10"
                />
              }
              label="Rice"
              value={dashboard?.riceCount ?? 0}
              tone="green"
            />

            <StatCard
              icon={
                <img
                  src="/illustrations/vegetables.png"
                  alt="Vegetables"
                  className="h-10 w-10"
                />
              }
              label="Vegetables"
              value={dashboard?.vegetableCount ?? 0}
              tone="lime"
            />

            <StatCard
              icon={
                <img
                  src="/illustrations/proteindishes.png"
                  alt="Protein"
                  className="h-10 w-10"
                />
              }
              label="Protein Dishes"
              value={dashboard?.sideDishCount ?? 0}
              tone="emerald"
            />
          </div>
        </section>

        <section ref={progressRef} className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Your Progress</h2>
          </div>

          <div className="rounded-[30px] border border-white/70 bg-white/90 p-5 shadow-sm">
            <div className="overflow-x-auto pb-1">
              <div className="flex min-w-[420px] items-start justify-between">
                {progressDays.map((item, index) => (
                  <ProgressStep
                    key={item.day}
                    day={item.day}
                    record={item.record}
                    isLast={index === progressDays.length - 1}
                  />
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-3xl border border-emerald-100 bg-emerald-50/70 px-4 py-4">
              <p className="font-semibold text-slate-900">
                Complete your daily scans
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Scan your plate every day to track your progress!
              </p>
            </div>
          </div>
        </section>

        <section
          ref={historyRef}
          className="mt-6 rounded-[30px] border border-white/70 bg-white/85 p-4 shadow-[0_18px_50px_rgba(16,24,40,0.06)] backdrop-blur"
        >
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-50 to-lime-50 text-emerald-700 shadow-sm">
              <History className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">History</h2>
              <p className="text-xs text-slate-400">Your saved scan history</p>
            </div>
          </div>

          <div className="space-y-3.5">
            {loading ? (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                Memuat data...
              </div>
            ) : dashboard?.history?.length ? (
              dashboard.history.map((item) => (
                <HistoryCard
                  key={item.id}
                  item={item}
                  highlighted={
                    walkthroughActive &&
                    currentStep === 'main-history-open' &&
                    focusedHistoryItem?.id === item.id
                  }
                  cardRef={(el) => {
                    historyCardRefs.current[item.id] = el
                  }}
                  onClick={() => {
                    if (user && currentStep === 'main-history-open') {
                      setWalkthroughStep(user.id, 'detail-image', {
                        focusRecordId: item.id,
                      })
                    }
                    router.push(`/history/${item.id}`)
                  }}
                />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                Belum ada riwayat.
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md px-4 pb-5">
        <button
          ref={uploadButtonRef}
          onClick={() => router.push('/upload')}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-lime-500 px-6 py-4 text-base font-semibold text-white shadow-[0_14px_40px_rgba(34,197,94,0.28)] transition hover:from-emerald-600 hover:to-lime-600"
        >
          <Upload className="size-5" />
          Scan Plate
        </button>
      </div>

      {showIntroPopup && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-900/55 px-5">
          <div className="w-full max-w-sm rounded-[28px] border border-white/70 bg-white p-5 shadow-[0_20px_60px_rgba(16,24,40,0.18)]">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-50 to-lime-50 text-emerald-700">
              <Info className="size-5" />
            </div>

            <h3 className="text-xl font-bold text-slate-900">
              Welcome to CleanPlate
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              This app helps you track leftover food on your plate, save your scan results, and monitor your progress over time.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                onClick={handleFinishWalkthrough}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
              >
                I Understand
              </button>
              <button
                onClick={handleStartWalkthrough}
                className="rounded-2xl bg-gradient-to-r from-emerald-500 to-lime-500 px-4 py-3 text-sm font-semibold text-white"
              >
                Let&apos;s Go
              </button>
            </div>
          </div>
        </div>
      )}

      {walkthroughActive && walkthroughConfig && overlayTargetReady && (
        <WalkthroughOverlay
          key={`${currentStep}-${focusRecordId ?? 'none'}-${overlayReadyTick}-${historyTourReady ? 'ready' : 'not-ready'}`}
          open
          stepLabel={walkthroughConfig.stepLabel}
          title={walkthroughConfig.title}
          description={walkthroughConfig.description}
          targetElement={walkthroughConfig.target}
          onClose={handleFinishWalkthrough}
          onNext={handleMainNext}
          onBack={handleMainBack}
          showNext={walkthroughConfig.showNext}
          showBack={walkthroughConfig.showBack}
          nextLabel={walkthroughConfig.nextLabel}
          blockTargetClick={false}
          primaryActionLabel={walkthroughConfig.primaryActionLabel}
          onPrimaryAction={walkthroughConfig.onPrimaryAction}
          preferredPlacement={
            currentStep === 'main-history-open' ? 'bottom' : 'auto'
          }
        />
      )}
    </main>
  )
}