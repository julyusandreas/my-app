'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Send } from 'lucide-react'
import { createBrowserSupabaseClient } from '@/lib/supabase-browser'
import type { AnalyzeResult } from '@/lib/types'
import { getSession } from '@/lib/session'
import WalkthroughOverlay from '@/components/ui/WalkthroughOverlay'
import {
  finishWalkthrough,
  getWalkthroughState,
  setWalkthroughStep,
  type WalkthroughStepId,
} from '@/lib/walkthrough'

type ExtendedAnalyzeResult = AnalyzeResult
type AnalysisStatus = 'checking' | 'clean' | 'waste'

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export default function UploadPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const previewRef = useRef<HTMLDivElement | null>(null)
  const captureButtonRef = useRef<HTMLButtonElement | null>(null)
  const sendButtonRef = useRef<HTMLButtonElement | null>(null)
  const resultModalRef = useRef<HTMLDivElement | null>(null)

  const [capturedImage, setCapturedImage] = useState('')
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showAnalyzing, setShowAnalyzing] = useState(false)
  const [analyzeProgress, setAnalyzeProgress] = useState(0)
  const [analyzeText, setAnalyzeText] = useState('Uploading photo...')
  const [analysisStatus, setAnalysisStatus] =
    useState<AnalysisStatus>('checking')
  const [result, setResult] = useState<ExtendedAnalyzeResult | null>(null)
  const [cameraError, setCameraError] = useState('')

  const [userId, setUserId] = useState<string | null>(null)
  const [walkthroughActive, setWalkthroughActive] = useState(false)
  const [currentStep, setCurrentStep] = useState<WalkthroughStepId | null>(null)
  const [overlayReadyTick, setOverlayReadyTick] = useState(0)

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  async function startCamera() {
    try {
      setCameraError('')

      if (!streamRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        })

        streamRef.current = stream
      }

      if (videoRef.current && streamRef.current) {
        videoRef.current.srcObject = streamRef.current
        await videoRef.current.play().catch(() => {})
      }
    } catch (error) {
      console.error('Gagal mengakses kamera:', error)
      setCameraError(
        'Gagal mengakses kamera. Pastikan izin kamera sudah diaktifkan.'
      )
    }
  }

  async function attachStreamToVideo() {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      await videoRef.current.play().catch(() => {})
      return
    }

    await startCamera()
  }

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

    startCamera()

    return () => {
      stopCamera()
    }
  }, [router])

  useEffect(() => {
    if (!capturedImage) {
      attachStreamToVideo()
    }
  }, [capturedImage])

  useEffect(() => {
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => {
        setOverlayReadyTick((prev) => prev + 1)
      })

      return () => cancelAnimationFrame(raf2)
    })

    return () => cancelAnimationFrame(raf1)
  }, [currentStep, capturedImage, showModal, showAnalyzing])

  useEffect(() => {
    if (!walkthroughActive || !currentStep) return

    const targetMap: Partial<Record<WalkthroughStepId, HTMLElement | null>> = {
      'upload-camera': previewRef.current,
      'upload-capture': captureButtonRef.current,
      'upload-send': sendButtonRef.current,
      'upload-result': resultModalRef.current,
    }

    const el = targetMap[currentStep]

    if (el) {
      el.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }, [walkthroughActive, currentStep, showModal, capturedImage, overlayReadyTick])

  function refreshWalkthroughState() {
    if (!userId) return

    const state = getWalkthroughState(userId)
    setWalkthroughActive(state.active)
    setCurrentStep(state.currentStep)
  }

  function captureImage() {
    const video = videoRef.current
    const canvas = canvasRef.current

    if (!video || !canvas) return
    if (!video.videoWidth || !video.videoHeight) return

    const MAX_WIDTH = 512

    let width = video.videoWidth
    let height = video.videoHeight

    if (width > MAX_WIDTH) {
      const ratio = MAX_WIDTH / width
      width = MAX_WIDTH
      height = Math.round(height * ratio)
    }

    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0, width, height)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
    setCapturedImage(dataUrl)

    if (userId && currentStep === 'upload-capture') {
      setWalkthroughStep(userId, 'upload-send')
      refreshWalkthroughState()
    }
  }

  function retake() {
    setCapturedImage('')
    setShowModal(false)
    setShowAnalyzing(false)
    setResult(null)
    setAnalyzeProgress(0)
    setAnalyzeText('Uploading photo...')
    setAnalysisStatus('checking')

    if (userId && walkthroughActive) {
      setWalkthroughStep(userId, 'upload-capture')
      refreshWalkthroughState()
    }
  }

  function handleCancel() {
    stopCamera()
    router.push('/main')
  }

  async function uploadImageToSupabase(dataUrl: string) {
    const supabase = createBrowserSupabaseClient()
    const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET!

    if (!bucket) {
      throw new Error('NEXT_PUBLIC_SUPABASE_BUCKET belum diisi di .env.local')
    }

    const fileName = `plate-${Date.now()}.jpg`
    const filePath = `uploads/${fileName}`
    const blob = await (await fetch(dataUrl)).blob()

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        upsert: false,
      })

    if (uploadError) {
      throw new Error(`Upload Storage gagal: ${uploadError.message}`)
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath)

    if (!data?.publicUrl) {
      throw new Error('Gagal mendapatkan public URL gambar')
    }

    return {
      publicUrl: data.publicUrl,
      path: filePath,
    }
  }

  async function sendToAI() {
    if (!capturedImage) return

    setShowModal(false)
    setShowAnalyzing(true)
    setLoading(true)
    setAnalyzeProgress(0)
    setAnalyzeText('Uploading photo...')
    setAnalysisStatus('checking')

    const progressTimer = window.setInterval(() => {
      setAnalyzeProgress((prev) => {
        if (prev >= 90) return prev
        return prev + 10
      })
    }, 250)

    try {
      const analyzePromise = fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: capturedImage,
        }),
      })

      await wait(550)
      setAnalyzeText('Analyzing your meal...')

      await wait(550)
      setAnalyzeText('Detecting leftover food...')

      await wait(550)
      setAnalyzeText('Classifying food types...')

      const [res] = await Promise.all([analyzePromise, wait(2200)])
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Gagal menganalisis gambar')
      }

      const aiResult = data.result as ExtendedAnalyzeResult

      setAnalyzeProgress(100)
      setAnalysisStatus(aiResult.isCleanPlate ? 'clean' : 'waste')
      setAnalyzeText(
        aiResult.isCleanPlate ? 'No Food Waste' : 'Food Waste Detected'
      )

      await wait(1200)

      setResult(aiResult)
      setShowAnalyzing(false)
      setShowModal(true)

      if (userId && currentStep === 'upload-send') {
        setWalkthroughStep(userId, 'upload-result')
        refreshWalkthroughState()
      }
    } catch (error) {
      console.error(error)
      alert(
        error instanceof Error
          ? error.message
          : 'Terjadi kesalahan saat analisis gambar'
      )

      setShowAnalyzing(false)
      setShowModal(false)
    } finally {
      window.clearInterval(progressTimer)
      setLoading(false)
    }
  }

  async function saveResult(options?: { fromTour?: boolean }) {
    const session = getSession()
    if (!session || !result || !capturedImage) return

    const fromTour = options?.fromTour === true

    if (walkthroughActive && currentStep === 'upload-result' && !fromTour) {
      return
    }

    try {
      setLoading(true)

      const uploaded = await uploadImageToSupabase(capturedImage)

      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.id,
          imageUrl: uploaded.publicUrl,
          imagePath: uploaded.path,
          isCleanPlate: result.isCleanPlate,
          leftoverTypes: result.leftoverTypes,
          aiMessage: result.message,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan record ke database')
      }

      const savedRecordId =
        data?.record?.id ?? data?.data?.id ?? data?.id ?? null

      if (session.id && walkthroughActive && savedRecordId) {
        setWalkthroughStep(session.id, 'main-history-open', {
          focusRecordId: savedRecordId,
        })
      }

      stopCamera()
      router.push('/main')
    } catch (error) {
      console.error('Save result error:', error)
      alert(error instanceof Error ? error.message : 'Gagal menyimpan hasil')
    } finally {
      setLoading(false)
    }
  }

  async function saveResultFromTour() {
    await saveResult({ fromTour: true })
  }

  function handleWalkthroughNext() {
    if (!userId || !currentStep) return

    if (currentStep === 'upload-camera') {
      setWalkthroughStep(userId, 'upload-capture')
      refreshWalkthroughState()
    }
  }

  function handleWalkthroughBack() {
    if (!userId || !currentStep) return

    if (currentStep === 'upload-capture') {
      setWalkthroughStep(userId, 'upload-camera')
    } else if (currentStep === 'upload-send') {
      setWalkthroughStep(userId, 'upload-capture')
    } else if (currentStep === 'upload-result') {
      setWalkthroughStep(userId, 'upload-send')
    }

    refreshWalkthroughState()
  }

  const walkthroughConfig = useMemo(() => {
    if (!currentStep) return null

    if (currentStep === 'upload-camera') {
      return {
        stepLabel: 'Upload Step 1 of 4',
        title: 'This is your camera preview',
        description:
          'Aim your camera at your plate, then tap the Take Photo button when you are ready.',
        target: previewRef.current,
        showNext: true,
        showBack: false,
        nextLabel: 'Next',
        blockTargetClick: false,
        primaryActionLabel: undefined,
        onPrimaryAction: undefined,
      }
    }

    if (currentStep === 'upload-capture') {
      return {
        stepLabel: 'Upload Step 2 of 4',
        title: 'Tap here to take a photo',
        description:
          'Tap the button below to take a photo of your plate. The tutorial will continue automatically after the photo is taken.',
        target: captureButtonRef.current,
        showNext: false,
        showBack: true,
        nextLabel: 'Next',
        blockTargetClick: false,
        primaryActionLabel: 'Take Photo',
        onPrimaryAction: captureImage,
      }
    }

    if (currentStep === 'upload-send') {
      return {
        stepLabel: 'Upload Step 3 of 4',
        title: 'Submit your photo for analysis',
        description: 'Tap the Submit button below to process your image.',
        target: sendButtonRef.current,
        showNext: false,
        showBack: true,
        nextLabel: 'Next',
        blockTargetClick: false,
        primaryActionLabel: 'Submit',
        onPrimaryAction: sendToAI,
      }
    }

    if (currentStep === 'upload-result') {
      return {
        stepLabel: 'Upload Step 4 of 4',
        title: 'This is your analysis result',
        description: 'Tap Save to keep this result in your history.',
        target: resultModalRef.current,
        showNext: false,
        showBack: true,
        nextLabel: 'Next',
        blockTargetClick: true,
        primaryActionLabel: 'Save',
        onPrimaryAction: saveResultFromTour,
      }
    }

    return null
  }, [currentStep, result, capturedImage])

  const overlayTargetReady = useMemo(() => {
    if (!walkthroughActive || !currentStep) return false

    if (currentStep === 'upload-camera') return Boolean(previewRef.current)
    if (currentStep === 'upload-capture') return Boolean(captureButtonRef.current)
    if (currentStep === 'upload-send') return Boolean(sendButtonRef.current)
    if (currentStep === 'upload-result') {
      return Boolean(resultModalRef.current) && showModal && !showAnalyzing
    }

    return false
  }, [
    walkthroughActive,
    currentStep,
    capturedImage,
    showModal,
    showAnalyzing,
    overlayReadyTick,
  ])

  const analyzingTitle =
    analysisStatus === 'checking'
      ? 'Analyzing Plate'
      : analysisStatus === 'clean'
        ? 'No Food Waste'
        : 'Food Waste Detected'

  const analyzingRingColor =
    analysisStatus === 'checking'
      ? 'border-t-orange-400'
      : analysisStatus === 'clean'
        ? 'border-t-emerald-500'
        : 'border-t-amber-500'

  const analyzingIconBg =
    analysisStatus === 'checking'
      ? 'from-slate-50 to-slate-100 text-slate-700'
      : analysisStatus === 'clean'
        ? 'from-emerald-50 to-lime-100 text-emerald-700'
        : 'from-amber-50 to-orange-100 text-amber-700'

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-4 py-6">
      <section className="rounded-3xl bg-white p-4 shadow-sm">
        <div
          ref={previewRef}
          className="overflow-hidden rounded-3xl bg-slate-100"
        >
          {!capturedImage ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-auto w-full object-cover"
            />
          ) : (
            <img
              src={capturedImage}
              alt="Hasil kamera"
              className="h-auto w-full object-cover"
            />
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        {cameraError && (
          <p className="mt-4 text-sm text-red-500">{cameraError}</p>
        )}

        {!capturedImage ? (
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              ref={captureButtonRef}
              onClick={captureImage}
              className="flex items-center justify-center gap-2 rounded-2xl bg-lime-500 px-4 py-3 font-semibold text-white"
            >
              <Camera className="size-4" />
              Take Photo
            </button>

            <button
              onClick={handleCancel}
              className="rounded-2xl bg-slate-200 px-4 py-3 font-semibold text-slate-800"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              ref={sendButtonRef}
              onClick={sendToAI}
              disabled={loading || showAnalyzing}
              className="flex items-center justify-center gap-2 rounded-2xl bg-lime-500 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="size-4" />
              Submit
            </button>

            <button
              onClick={retake}
              disabled={loading || showAnalyzing}
              className="rounded-2xl bg-slate-200 px-4 py-3 font-semibold text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        )}
      </section>

      {showAnalyzing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-5 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[34px] bg-white px-6 py-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.25)]">
            <div className="relative mx-auto flex h-32 w-32 items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-slate-100" />

              <div
                className={`absolute inset-0 rounded-full border-8 border-emerald-100 ${analyzingRingColor} transition-all duration-300`}
                style={{
                  transform: `rotate(${analyzeProgress * 3.6}deg)`,
                }}
              />

              <div
                className={`relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br ${analyzingIconBg} shadow-inner`}
              >
                {analysisStatus === 'checking' ? (
                  <span className="text-5xl font-black text-slate-700">?</span>
                ) : analysisStatus === 'clean' ? (
                  <img
                    src="/illustrations/nofoodwaste.png"
                    alt="No Food Waste"
                    className="h-20 w-20 object-contain"
                  />
                ) : (
                  <img
                    src="/illustrations/foodwastedetected.png"
                    alt="Food Waste Detected"
                    className="h-20 w-20 object-contain"
                  />
                )}
              </div>
            </div>

            <p className="mt-5 text-5xl font-black tracking-tight text-slate-900">
              {analyzeProgress}
            </p>

            <h2 className="mt-3 text-xl font-bold text-slate-900">
              {analyzingTitle}
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              {analyzeText}
            </p>

            <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  analysisStatus === 'waste'
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                    : 'bg-gradient-to-r from-emerald-500 to-lime-500'
                }`}
                style={{ width: `${analyzeProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            ref={resultModalRef}
            className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl"
          >
            <div>
              <h2 className="text-xl font-bold">Result</h2>

              {result?.isCleanPlate ? (
                <p className="mt-4 rounded-2xl bg-emerald-50 p-4 text-emerald-700">
                  🌟 Great job! You finished your meal
                </p>
              ) : (
                <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-amber-700">
                  <p className="font-medium">
                    A bit of food remains 😅 Food left on your plate:
                  </p>

                  {result?.leftoverTypes?.length ? (
                    <ul className="mt-2 list-disc pl-5">
                      {result.leftoverTypes.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm">
                      Food waste was detected, but no specific food type was
                      classified.
                    </p>
                  )}
                </div>
              )}

              {result?.message && (
                <p className="mt-4 text-sm text-slate-600">{result.message}</p>
              )}

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  onClick={() => saveResult({ fromTour: false })}
                  disabled={
                    loading ||
                    (walkthroughActive && currentStep === 'upload-result')
                  }
                  className="rounded-2xl bg-lime-500 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Save
                </button>

                <button
                  onClick={() => setShowModal(false)}
                  disabled={
                    loading ||
                    (walkthroughActive && currentStep === 'upload-result')
                  }
                  className="rounded-2xl bg-slate-200 px-4 py-3 font-semibold text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {walkthroughActive && walkthroughConfig && overlayTargetReady && (
        <WalkthroughOverlay
          key={`${currentStep}-${overlayReadyTick}-${capturedImage ? 'captured' : 'preview'}-${showModal ? 'modal' : 'no-modal'}`}
          open
          stepLabel={walkthroughConfig.stepLabel}
          title={walkthroughConfig.title}
          description={walkthroughConfig.description}
          targetElement={walkthroughConfig.target}
          onClose={() => {
            if (userId) finishWalkthrough(userId)
            refreshWalkthroughState()
          }}
          onNext={handleWalkthroughNext}
          onBack={handleWalkthroughBack}
          showNext={walkthroughConfig.showNext}
          showBack={walkthroughConfig.showBack}
          nextLabel={walkthroughConfig.nextLabel}
          blockTargetClick={walkthroughConfig.blockTargetClick}
          primaryActionLabel={walkthroughConfig.primaryActionLabel}
          onPrimaryAction={walkthroughConfig.onPrimaryAction}
        />
      )}
    </main>
  )
}