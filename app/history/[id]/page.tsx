'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  Sparkles,
  RotateCcw,
  Clock3,
  MessageSquareText,
  UtensilsCrossed,
} from 'lucide-react'
import type { RecordItem } from '@/lib/types'
import { getSession } from '@/lib/session'
import WalkthroughOverlay from '@/components/ui/WalkthroughOverlay'
import {
  finishWalkthrough,
  getWalkthroughState,
  setWalkthroughStep,
  type WalkthroughStepId,
} from '@/lib/walkthrough'

function DetailChip({
  label,
  tone = 'default',
}: {
  label: string
  tone?: 'default' | 'green' | 'amber'
}) {
  const styles = {
    default: 'bg-slate-100 text-slate-700',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
  }

  return (
    <span
      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${styles[tone]}`}
    >
      {label}
    </span>
  )
}

export default function HistoryDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [data, setData] = useState<RecordItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [userId, setUserId] = useState<string | null>(null)
  const [walkthroughActive, setWalkthroughActive] = useState(false)
  const [currentStep, setCurrentStep] = useState<WalkthroughStepId | null>(null)
  const [overlayReadyTick, setOverlayReadyTick] = useState(0)

  const imageRef = useRef<HTMLDivElement | null>(null)
  const statusRef = useRef<HTMLDivElement | null>(null)
  const leftoversRef = useRef<HTMLDivElement | null>(null)
  const messageRef = useRef<HTMLDivElement | null>(null)
  const timeRef = useRef<HTMLDivElement | null>(null)

  const recordId = useMemo(() => {
    const rawId = params?.id
    if (Array.isArray(rawId)) return rawId[0]
    return rawId ?? ''
  }, [params])

  useEffect(() => {
    const session = getSession()

    if (!session) {
      router.replace('/')
      return
    }

    setUserId(session.id)

    const state = getWalkthroughState(session.id)
    setWalkthroughActive(state.active)
    setCurrentStep(state.currentStep)

    if (!recordId) {
      setError('ID riwayat tidak valid')
      setLoading(false)
      return
    }

    async function loadDetail() {
      try {
        setLoading(true)
        setError('')

        const res = await fetch(`/api/records/${recordId}`)
        const result = await res.json()

        if (!res.ok) {
          setError(result.error || 'Gagal memuat detail riwayat')
          return
        }

        setData(result.record)
      } catch (err) {
        console.error(err)
        setError('Terjadi kesalahan saat memuat detail riwayat')
      } finally {
        setLoading(false)
      }
    }

    loadDetail()
  }, [recordId, router])

  const leftovers = [
    data?.leftover_rice ? 'Nasi' : null,
    data?.leftover_vegetable ? 'Sayuran' : null,
    data?.leftover_side_dish ? 'Lauk' : null,
  ].filter(Boolean) as string[]

  const detailSteps = useMemo(() => {
    const steps: WalkthroughStepId[] = ['detail-image', 'detail-status']

    if (!data?.is_clean_plate && leftovers.length > 0) {
      steps.push('detail-leftovers')
    }

    if (data?.ai_message) {
      steps.push('detail-message')
    }

    steps.push('detail-time')
    return steps
  }, [data, leftovers.length])

  useEffect(() => {
    if (!walkthroughActive || !currentStep) return

    const targetMap: Partial<Record<WalkthroughStepId, HTMLElement | null>> = {
      'detail-image': imageRef.current,
      'detail-status': statusRef.current,
      'detail-leftovers': leftoversRef.current,
      'detail-message': messageRef.current,
      'detail-time': timeRef.current,
    }

    const el = targetMap[currentStep]
    if (el) {
      el.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }, [walkthroughActive, currentStep, data])

  function refreshWalkthrough() {
    if (!userId) return
    const state = getWalkthroughState(userId)
    setWalkthroughActive(state.active)
    setCurrentStep(state.currentStep)
  }

  function handleNext() {
    if (!userId || !currentStep) return

    const index = detailSteps.indexOf(currentStep)
    if (index === -1) return

    if (index === detailSteps.length - 1) {
      finishWalkthrough(userId)
      refreshWalkthrough()
      return
    }

    setWalkthroughStep(userId, detailSteps[index + 1])
    refreshWalkthrough()
  }

  function handleBack() {
    if (!userId || !currentStep) return

    const index = detailSteps.indexOf(currentStep)
    if (index <= 0) return

    setWalkthroughStep(userId, detailSteps[index - 1])
    refreshWalkthrough()
  }

  const walkthroughConfig = useMemo(() => {
    if (!currentStep) return null

    if (currentStep === 'detail-image') {
      return {
        stepLabel: 'Detail Step 1',
        title: 'Ini adalah foto hasil scan',
        description:
          'Bagian ini menampilkan gambar piring yang kamu upload sebelumnya.',
        target: imageRef.current,
      }
    }

    if (currentStep === 'detail-status') {
      return {
        stepLabel: 'Detail Step 2',
        title: 'Ini adalah status hasil analisis',
        description:
          'Status ini menunjukkan apakah piring bersih atau masih ada sisa makanan.',
        target: statusRef.current,
      }
    }

    if (currentStep === 'detail-leftovers') {
      return {
        stepLabel: 'Detail Step 3',
        title: 'Ini adalah klasifikasi sisa makanan',
        description:
          'Bagian ini menjelaskan jenis sisa makanan yang terdeteksi, seperti nasi, sayuran, atau lauk.',
        target: leftoversRef.current,
      }
    }

    if (currentStep === 'detail-message') {
      return {
        stepLabel: 'Detail Step 4',
        title: 'Ini adalah pesan dari AI',
        description:
          'Pesan ini berisi feedback singkat dari hasil analisis gambar piringmu.',
        target: messageRef.current,
      }
    }

    if (currentStep === 'detail-time') {
      return {
        stepLabel: 'Detail Step 5',
        title: 'Ini adalah waktu submit',
        description:
          'Bagian ini menunjukkan kapan hasil scan tersebut disimpan.',
        target: timeRef.current,
      }
    }

    return null
  }, [currentStep])

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(187,247,208,0.42),_transparent_30%),linear-gradient(to_bottom,_#f7fdf8,_#ffffff)] pb-8">
      <div className="mx-auto w-full max-w-md px-4 py-5">
        <section className="relative overflow-hidden rounded-[32px] border border-white/70 bg-white/85 p-4 shadow-[0_20px_60px_rgba(16,24,40,0.08)] backdrop-blur">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-emerald-100/60 via-lime-100/50 to-green-100/60 blur-2xl" />

          <div className="relative">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-50 to-lime-50 text-emerald-700 shadow-sm">
                <UtensilsCrossed className="size-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Detail Riwayat</h1>
                <p className="text-xs text-slate-400">
                  Hasil scan piring yang sudah tersimpan
                </p>
              </div>
            </div>

            {loading ? (
              <div className="rounded-3xl border border-slate-100 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                Memuat detail riwayat...
              </div>
            ) : error ? (
              <div className="rounded-3xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-600">
                {error}
              </div>
            ) : data ? (
              <div className="space-y-5">
                <div
                  ref={imageRef}
                  className="overflow-hidden rounded-[28px] bg-slate-100 shadow-sm"
                >
                  <img
                    src={data.image_url}
                    alt="Riwayat piring"
                    className="h-72 w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src =
                        'https://placehold.co/800x600?text=No+Image'
                    }}
                  />
                </div>

                <div
                  ref={statusRef}
                  className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-slate-500">Status Hasil</p>
                      <h2 className="mt-1 text-xl font-bold text-slate-900">
                        {data.is_clean_plate ? 'Piring Bersih' : 'Ayo Coba Lagi'}
                      </h2>
                    </div>

                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                        data.is_clean_plate
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {data.is_clean_plate ? (
                        <Sparkles className="size-5" />
                      ) : (
                        <RotateCcw className="size-5" />
                      )}
                    </div>
                  </div>

                  <div className="mt-4">
                    {data.is_clean_plate ? (
                      <div className="rounded-2xl bg-emerald-50 px-4 py-4 text-emerald-700">
                        <p className="font-semibold">Mantap! Piring bersih 🎉</p>
                        {data.ai_message && (
                          <p className="mt-2 text-sm leading-6">{data.ai_message}</p>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-2xl bg-amber-50 px-4 py-4 text-amber-700">
                        <p className="font-semibold">Masih ada sisa makanan</p>
                        {data.ai_message && (
                          <p className="mt-2 text-sm leading-6">{data.ai_message}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {!data.is_clean_plate && (
                  <div
                    ref={leftoversRef}
                    className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm"
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                        <UtensilsCrossed className="size-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                          Klasifikasi Sisa Makanan
                        </h3>
                        <p className="text-xs text-slate-400">
                          Jenis makanan yang masih tersisa
                        </p>
                      </div>
                    </div>

                    {leftovers.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {leftovers.map((item) => (
                          <DetailChip key={item} label={item} tone="amber" />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">
                        Tidak ada detail klasifikasi tersisa.
                      </p>
                    )}
                  </div>
                )}

                {data.ai_message && (
                  <div
                    ref={messageRef}
                    className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm"
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                        <MessageSquareText className="size-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                          Pesan AI
                        </h3>
                        <p className="text-xs text-slate-400">
                          Feedback dari hasil analisis
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
                      {data.ai_message}
                    </div>
                  </div>
                )}

                <div
                  ref={timeRef}
                  className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                      <Clock3 className="size-4" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Waktu Submit</p>
                      <p className="text-sm font-medium text-slate-700">
                        {new Date(data.created_at).toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-slate-100 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                Data riwayat tidak ditemukan.
              </div>
            )}
          </div>
        </section>

        <button
          onClick={() => router.push('/main')}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-4 text-base font-semibold text-white shadow-[0_14px_40px_rgba(15,23,42,0.18)] transition hover:bg-slate-800"
        >
          <ArrowLeft className="size-5" />
          Kembali
        </button>
      </div>

      {walkthroughActive && walkthroughConfig && (
        <WalkthroughOverlay
          open
          stepLabel={walkthroughConfig.stepLabel}
          title={walkthroughConfig.title}
          description={walkthroughConfig.description}
          targetElement={walkthroughConfig.target}
          onClose={() => {
            if (userId) finishWalkthrough(userId)
            refreshWalkthrough()
          }}
          onNext={handleNext}
          onBack={handleBack}
          showNext
          showBack={detailSteps.indexOf(currentStep ?? 'detail-image') > 0}
          nextLabel={
            detailSteps.indexOf(currentStep ?? 'detail-image') === detailSteps.length - 1
              ? 'Finish'
              : 'Next'
          }
          blockTargetClick={false}
        />
      )}
    </main>
  )
}