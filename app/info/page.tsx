'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function InfoPage() {
    const router = useRouter()
    const [step, setStep] = useState(1)
    const [id, setId] = useState('')
    const [displayName, setDisplayName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const isValid = useMemo(() => id.trim() !== '' && displayName.trim() !== '', [id, displayName])

  async function handleRegister() {
    try {
      setLoading(true)
      setError('')

      const res = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id.trim(), displayName: displayName.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Gagal mendaftarkan pengguna')
        return
      }

      localStorage.setItem('cleanplate_user', JSON.stringify({
        id: data.user.id,
        displayName: data.user.display_name,
      }))

      router.push('/main')
    } catch {
      setError('Terjadi kesalahan saat menyimpan data pengguna')
    } finally {
      setLoading(false)
    }
  }
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 py-8 md:max-w-2xl">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold">Informasi Aplikasi</h1>
        <p className="mt-2 text-sm text-slate-600">Kenali aplikasi ini sebelum mulai menggunakan fitur scan.</p>
      </div>

      {step === 1 && (
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Apa itu Clean Plate?</h2>
          <p className="mt-4 leading-7 text-slate-600">
            Clean Plate adalah aplikasi yang membantu pengguna memantau kebiasaan menghabiskan makanan melalui foto piring setelah makan.
            Sistem akan menganalisis apakah makanan sudah habis atau masih tersisa. Jika masih ada sisa, aplikasi akan mengelompokkan
            sisa makanan ke dalam kategori nasi, sayuran, atau lauk. Tujuan aplikasi ini adalah meningkatkan kesadaran pengguna untuk
            mengurangi food waste dengan cara yang sederhana, interaktif, dan mudah digunakan.
          </p>

          <button
            onClick={() => setStep(2)}
            className="mt-8 w-full rounded-2xl bg-lime-500 px-4 py-3 font-semibold text-white hover:bg-lime-600"
          >
            Lanjut
          </button>
        </section>
      )}

      {step === 2 && (
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Masukkan Identitas</h2>

          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">ID Unik</label>
              <input
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder="Contoh: rebeka01"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-lime-500"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Display Name</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Masukkan nama tampilan"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-lime-500"
                required
              />
            </div>
          </div>

          {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

          <button
            onClick={handleRegister}
            disabled={!isValid || loading}
            className="mt-8 w-full rounded-2xl px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300 enabled:bg-lime-500 enabled:hover:bg-lime-600"
          >
            {loading ? 'Memproses...' : 'Lanjut'}
          </button>
        </section>
      )}
    </main>
  )
}