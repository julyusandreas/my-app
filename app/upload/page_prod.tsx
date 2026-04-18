'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase-browser'
import type { AnalyzeResult } from '@/lib/types'
import { getSession } from '@/lib/session'

type ExtendedAnalyzeResult = AnalyzeResult & {
  imageUrl: string
  imagePath: string
}

export default function UploadPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [capturedImage, setCapturedImage] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [result, setResult] = useState<ExtendedAnalyzeResult | null>(null)
  const [cameraError, setCameraError] = useState('')

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
      setCameraError('Gagal mengakses kamera.')
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

    startCamera()

    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [router])

  useEffect(() => {
    if (!capturedImage) {
      attachStreamToVideo()
    }
  }, [capturedImage])

  function captureImage() {
    const video = videoRef.current
    const canvas = canvasRef.current

    if (!video || !canvas) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
    setCapturedImage(dataUrl)
  }

  function retake() {
    setCapturedImage('')
    setShowModal(false)
    setResult(null)
  }

  function handleCancel() {
    router.push('/main')
  }

  async function uploadImageToSupabase(dataUrl: string) {
    const supabase = createBrowserSupabaseClient()
    const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET!
    const fileName = `plate-${Date.now()}.jpg`
    const filePath = `uploads/${fileName}`

    const blob = await (await fetch(dataUrl)).blob()

    const { error } = await supabase.storage.from(bucket).upload(filePath, blob, {
      contentType: 'image/jpeg',
      upsert: false,
    })

    if (error) throw error

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath)

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
      const uploaded = await uploadImageToSupabase(capturedImage)

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: capturedImage,
          imageUrl: uploaded.publicUrl,
          imagePath: uploaded.path,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Gagal analisis')
      }

      setResult({
        ...data.result,
        imageUrl: uploaded.publicUrl,
        imagePath: uploaded.path,
      })
    } catch (error) {
      console.error(error)
      alert('Terjadi kesalahan')
      setShowModal(false)
    } finally {
      setLoading(false)
    }
  }

  async function saveResult() {
    const session = getSession()
    if (!session || !result) return

    await fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: session.id,
        imageUrl: result.imageUrl,
        imagePath: result.imagePath,
        isCleanPlate: result.isCleanPlate,
        leftoverTypes: result.leftoverTypes,
        aiMessage: result.message,
      }),
    })

    router.push('/main')
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-4 py-6">
      <section className="rounded-3xl bg-white p-4 shadow-sm">
        <div className="overflow-hidden rounded-3xl bg-slate-100">
          {!capturedImage ? (
            <video ref={videoRef} autoPlay playsInline muted className="w-full" />
          ) : (
            <img src={capturedImage} className="w-full" />
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        {/* 🔥 BAGIAN YANG DIUBAH */}
        {!capturedImage ? (
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              onClick={captureImage}
              className="rounded-2xl bg-lime-500 px-4 py-3 font-semibold text-white"
            >
              Take Photo
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
              onClick={sendToAI}
              className="rounded-2xl bg-lime-500 px-4 py-3 font-semibold text-white"
            >
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
        <div className="fixed inset-0 flex items-center justify-center bg-black/40">
          <div className="rounded-3xl bg-white p-6">
            {loading ? (
              <p>Loading...</p>
            ) : (
              <>
                <p>{result?.message}</p>
                <button onClick={saveResult}>Simpan</button>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  )
}