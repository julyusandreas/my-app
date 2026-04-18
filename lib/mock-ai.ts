import type { AnalyzeResult } from '@/lib/types'

const FOOD_TYPES = ['nasi', 'sayuran', 'lauk'] as const

export function mockAnalyze(): AnalyzeResult {
  const random = Math.random()

  if (random > 0.5) {
    return {
      isCleanPlate: true,
      leftoverTypes: [],
      message: 'Mantap! Piring kamu sudah bersih 🎉',
    }
  }

  const shuffled = [...FOOD_TYPES].sort(() => 0.5 - Math.random())
  const count = Math.floor(Math.random() * 3) + 1
  const leftovers = shuffled.slice(0, count)

  return {
    isCleanPlate: false,
    leftoverTypes: [...leftovers],
    message: 'Masih ada sisa makanan, ayo dihabiskan ya!',
  }
}