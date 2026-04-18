'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Drumstick,
  History,
  Salad,
  Soup,
  Sparkles,
  Upload,
  RotateCcw,
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

  if (item.leftover_rice) labels.push('Nasi')
  if (item.leftover_vegetable) labels.push('Sayuran')
  if (item.leftover_side_dish) labels.push('Lauk')

  return labels
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

function HistoryCard({
  item,
  onClick,
  cardRef,
}: {
  item: RecordItem
  onClick: () => void
  cardRef?: React.Ref<HTMLButtonElement>
}) {
  const leftovers = getLeftoverLabels(item)

  return (
    <button
      ref={cardRef}
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-[28px] border border-slate-100 bg-white p-3.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50"
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
              {item.is_clean_plate ? 'Piring Bersih' : 'Ayo Coba Lagi'}
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

  const statsRef = useRef<HTMLDivElement | null>(null)
  const historyRef = useRef<HTMLElement | null>(null)
  const uploadButtonRef = useRef<HTMLButtonElement | null>(null)
  const firstHistoryCardRef = useRef<HTMLButtonElement | null>(null)

  const hasHistory = (dashboard?.history?.length ?? 0) > 0

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

    if (!state.seen && !state.active) {
      setShowIntroPopup(true)
    }
  }, [router])

  useEffect(() => {
    if (!walkthroughActive || !currentStep) return

    const targetMap: Partial<Record<WalkthroughStepId, HTMLElement | null>> = {
      'main-stats': statsRef.current,
      'main-history': historyRef.current,
      'main-upload': uploadButtonRef.current,
      'main-history-open': hasHistory ? firstHistoryCardRef.current : uploadButtonRef.current,
    }

    const el = targetMap[currentStep]
    if (el) {
      el.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }, [walkthroughActive, currentStep, dashboard, hasHistory])

  function refreshWalkthroughState() {
    if (!user) return
    const state = getWalkthroughState(user.id)
    setWalkthroughActive(state.active)
    setCurrentStep(state.currentStep)
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
  }

  function handleMainNext() {
  if (!user || !currentStep) return

  if (currentStep === 'main-stats') {
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
    handleOpenFirstHistoryFromTour()
    return
  }
}

function handleOpenFirstHistoryFromTour() {
  if (!user) return

  if (!hasHistory) {
    setWalkthroughStep(user.id, 'main-upload')
    refreshWalkthroughState()
    return
  }

  const firstHistory = dashboard?.history?.[0]
  if (!firstHistory) {
    setWalkthroughStep(user.id, 'main-upload')
    refreshWalkthroughState()
    return
  }

  setWalkthroughStep(user.id, 'detail-image')
  router.push(`/history/${firstHistory.id}`)
}

  function handleMainBack() {
    if (!user || !currentStep) return

    if (currentStep === 'main-history') {
      setWalkthroughStep(user.id, 'main-stats')
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
        stepLabel: 'Step 1 of 4',
        title: 'Progress kamu tercatat di dashboard',
        description:
          'Bagian rekap dan pencapaian membantu kamu melihat pola sisa makanan dan progres penggunaan aplikasi.',
        target: statsRef.current,
        showNext: true,
        showBack: false,
        nextLabel: 'Next',
      }
    }

    if (currentStep === 'main-history') {
      return {
        stepLabel: 'Step 2 of 4',
        title: 'Semua hasil scan masuk ke riwayat',
        description:
          'Di sini kamu bisa melihat daftar hasil scan yang pernah kamu simpan.',
        target: historyRef.current,
        showNext: true,
        showBack: true,
        nextLabel: 'Next',
      }
    }

    if (currentStep === 'main-upload') {
      return {
        stepLabel: 'Step 3 of 4',
        title: 'Mulai scan dari tombol ini',
        description:
          'Tekan tombol Scan Plate untuk masuk ke halaman pengambilan gambar.',
        target: uploadButtonRef.current,
        showNext: true,
        showBack: true,
        nextLabel: 'Go to Upload',
      }
    }

    if (currentStep === 'main-history-open') {
  if (!hasHistory) {
    return {
      stepLabel: 'Step 4 of 4',
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
    stepLabel: 'Step 4 of 4',
    title: 'Buka kartu history yang sedang disorot',
    description:
      'Kartu history yang sedang disorot ini bisa dibuka untuk melihat detail hasil scan. Tekan tombol di bawah untuk langsung masuk ke halaman detail.',
    target: firstHistoryCardRef.current,
    showNext: false,
    showBack: true,
    nextLabel: 'Open Detail',
    primaryActionLabel: 'Buka Detail History',
    onPrimaryAction: handleOpenFirstHistoryFromTour,
  }
}

    return null
  }, [currentStep, hasHistory])

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(187,247,208,0.42),_transparent_30%),linear-gradient(to_bottom,_#f7fdf8,_#ffffff)] pb-28">
      <div className="mx-auto w-full max-w-md px-4 py-5">
        <section className="relative overflow-hidden rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-[0_20px_60px_rgba(16,24,40,0.08)] backdrop-blur">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-emerald-100/60 via-lime-100/50 to-green-100/60 blur-2xl" />

          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="mt-4 text-sm text-slate-500">Halo,</p>
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
                Tour Lagi
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
            <h2 className="text-lg font-bold text-slate-900">Rekap Sisa Makan</h2>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <StatCard
              icon={<Soup className="size-5" />}
              label="Nasi"
              value={dashboard?.riceCount ?? 0}
              tone="green"
            />
            <StatCard
              icon={<Salad className="size-5" />}
              label="Sayuran"
              value={dashboard?.vegetableCount ?? 0}
              tone="lime"
            />
            <StatCard
              icon={<Drumstick className="size-5" />}
              label="Lauk"
              value={dashboard?.sideDishCount ?? 0}
              tone="emerald"
            />
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Pencapaianku</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={<Sparkles className="size-5" />}
              label="Piring Bersih"
              value={dashboard?.cleanPlateCount ?? 0}
              tone="emerald"
            />
            <StatCard
              icon={<RotateCcw className="size-5" />}
              label="Ayo Coba Lagi"
              value={dashboard?.tryAgainCount ?? 0}
              tone="amber"
            />
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
              <h2 className="text-lg font-bold text-slate-900">Riwayat</h2>
              <p className="text-xs text-slate-400">
                Hasil scan piring yang sudah tersimpan
              </p>
            </div>
          </div>

          <div className="space-y-3.5">
            {loading ? (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                Memuat data...
              </div>
            ) : dashboard?.history?.length ? (
              dashboard.history.map((item, index) => (
                <HistoryCard
                  key={item.id}
                  item={item}
                  cardRef={index === 0 ? firstHistoryCardRef : undefined}
                  onClick={() => {
                    if (user && currentStep === 'main-history-open' && index === 0) {
                      setWalkthroughStep(user.id, 'detail-image')
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
              Welcome to Clean Plate
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Aplikasi ini membantu kamu memantau sisa makanan di piring,
              menyimpan hasil scan, dan melihat progres pengurangan food waste.
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

      {walkthroughActive && walkthroughConfig && (
        <WalkthroughOverlay
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
          />
      )}
    </main>
  )
}