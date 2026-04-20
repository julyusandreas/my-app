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

export default function UploadPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const previewRef = useRef<HTMLDivElement | null>(null)
  const captureButtonRef = useRef<HTMLButtonElement | null>(null)
  const sendButtonRef = useRef<HTMLButtonElement | null>(null)
  const resultModalRef = useRef<HTMLDivElement | null>(null)

  const [capturedImage, setCapturedImage] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
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
      setCameraError('Gagal mengakses kamera. Pastikan izin kamera sudah diaktifkan.')
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
  }, [currentStep, capturedImage, showModal])

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

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
    setCapturedImage(dataUrl)

    if (userId && currentStep === 'upload-capture') {
      setWalkthroughStep(userId, 'upload-send')
      refreshWalkthroughState()
    }
  }

  function retake() {
    setCapturedImage('')
    setShowModal(false)
    setResult(null)

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

    setShowModal(true)
    setLoading(true)

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: capturedImage,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Gagal menganalisis gambar')
      }

      setResult(data.result)

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
      setShowModal(false)
    } finally {
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
      data?.record?.id ??
      data?.data?.id ??
      data?.id ??
      null

    if (session.id && walkthroughActive && savedRecordId) {
      setWalkthroughStep(session.id, 'main-history-open', {
        focusRecordId: savedRecordId,
      })
    }

    stopCamera()
    router.push('/main')
  } catch (error) {
    console.error('Save result error:', error)
    alert(
      error instanceof Error
        ? error.message
        : 'Gagal menyimpan hasil'
    )
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
        title: 'Ini adalah area preview kamera',
        description:
          'Arahkan kamera ke piring makananmu. Setelah siap, lanjut ke tombol Ambil Gambar.',
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
        title: 'Tombol Ambil Gambar ada di sini',
        description:
          'Tekan tombol di bawah ini untuk langsung mengambil foto piringmu. Setelah foto berhasil diambil, tutorial akan lanjut otomatis.',
        target: captureButtonRef.current,
        showNext: false,
        showBack: true,
        nextLabel: 'Next',
        blockTargetClick: false,
        primaryActionLabel: 'Ambil Gambar',
        onPrimaryAction: captureImage,
      }
    }

    if (currentStep === 'upload-send') {
      return {
        stepLabel: 'Upload Step 3 of 4',
        title: 'Tombol Kirim untuk analisis',
        description:
          'Sekarang tekan tombol Kirim di bawah ini untuk memproses gambar.',
        target: sendButtonRef.current,
        showNext: false,
        showBack: true,
        nextLabel: 'Next',
        blockTargetClick: false,
        primaryActionLabel: 'Kirim',
        onPrimaryAction: sendToAI,
      }
    }

    if (currentStep === 'upload-result') {
      return {
        stepLabel: 'Upload Step 4 of 4',
        title: 'Ini adalah hasil analisis',
        description:
          'Sekarang tekan tombol Simpan di tutorial box ini agar hasil scan masuk ke riwayat.',
        target: resultModalRef.current,
        showNext: false,
        showBack: true,
        nextLabel: 'Next',
        blockTargetClick: true,
        primaryActionLabel: 'Simpan',
        onPrimaryAction: saveResultFromTour,
      }
    }

    return null
  }, [currentStep, result])

  const overlayTargetReady = useMemo(() => {
    if (!walkthroughActive || !currentStep) return false

    if (currentStep === 'upload-camera') return Boolean(previewRef.current)
    if (currentStep === 'upload-capture') return Boolean(captureButtonRef.current)
    if (currentStep === 'upload-send') return Boolean(sendButtonRef.current)
    if (currentStep === 'upload-result') return Boolean(resultModalRef.current)

    return false
  }, [walkthroughActive, currentStep, capturedImage, showModal, overlayReadyTick])

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
              Ambil Gambar
            </button>

            <button
              onClick={handleCancel}
              className="rounded-2xl bg-slate-200 px-4 py-3 font-semibold text-slate-800"
            >
              Batal
            </button>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              ref={sendButtonRef}
              onClick={sendToAI}
              className="flex items-center justify-center gap-2 rounded-2xl bg-lime-500 px-4 py-3 font-semibold text-white"
            >
              <Send className="size-4" />
              Kirim
            </button>

            <button
              onClick={retake}
              className="rounded-2xl bg-slate-200 px-4 py-3 font-semibold text-slate-800"
            >
              Batalkan
            </button>
          </div>
        )}
      </section>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            ref={resultModalRef}
            className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl"
          >
            {loading ? (
              <div className="text-center">
                <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-lime-500 border-t-transparent" />
                <p className="font-medium">Sedang memproses...</p>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-bold">Hasil Analisis</h2>

                {result?.isCleanPlate ? (
                  <p className="mt-4 rounded-2xl bg-emerald-50 p-4 text-emerald-700">
                    Piring bersih 🎉
                  </p>
                ) : (
                  <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-amber-700">
                    <p className="font-medium">Masih ada sisa makanan:</p>
                    <ul className="mt-2 list-disc pl-5">
                      {result?.leftoverTypes.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result?.message && (
                  <p className="mt-4 text-sm text-slate-600">{result.message}</p>
                )}

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => saveResult({ fromTour: false })}
                    disabled={walkthroughActive && currentStep === 'upload-result'}
                    className="rounded-2xl bg-lime-500 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Simpan
                  </button>

                  <button
                    onClick={() => setShowModal(false)}
                    disabled={walkthroughActive && currentStep === 'upload-result'}
                    className="rounded-2xl bg-slate-200 px-4 py-3 font-semibold text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}
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