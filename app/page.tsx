'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { getSession } from '@/lib/session'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    const session = getSession()
    if (session) {
      router.replace('/main')
    }
  }, [router])

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center bg-white px-6 py-8">

      <section className="flex w-full flex-col items-center text-center">
        <div className="relative">
          <h1 className="bg-gradient-to-r from-emerald-700 via-lime-500 to-green-400 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent drop-shadow-[0_4px_12px_rgba(34,197,94,0.25)] md:text-6xl">
            Clean Plate
          </h1>

          <div className="absolute -bottom-2 left-1/2 h-3 w-32 -translate-x-1/2 rounded-full bg-gradient-to-r from-emerald-200 via-lime-300 to-green-200 blur-md" />
        </div>

        <div className="mt-10 flex w-full justify-center">
          <div className="flex h-[320px] w-[320px] items-center justify-center rounded-full bg-gradient-to-b from-green-50 to-emerald-100 md:h-[260px] md:w-[260px]">
            <Image
              src="/illustrations/eating.png"
              alt="Ilustrasi aplikasi Clean Plate"
              width={260}
              height={260}
              className="h-auto w-[240px] object-contain md:w-[280px]"
              priority
            />
          </div>
        </div>

        <div className="mt-8 w-full text-left">
          <h2 className="text-xl font-bold text-slate-800">
            Finish What You Take
          </h2>

          <p className="mt-3 text-base leading-5 text-slate-500 text-justify">
            Track leftovers, reduce waste, and build better eating habits with simple, interactive feedback.
          </p>
        </div>
      </section>

      <div className="mt-10 w-full pb-2">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => router.push('/auth')}
          className="w-full rounded-full bg-gradient-to-r from-emerald-500 to-lime-500 px-6 py-4 text-lg font-semibold text-white shadow-[0_12px_30px_rgba(34,197,94,0.28)] transition hover:from-emerald-600 hover:to-lime-600"
        >
          Start
        </motion.button>
      </div>
    </main>
  )
}