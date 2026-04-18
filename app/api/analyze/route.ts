import { NextRequest, NextResponse } from 'next/server'
import { mockAnalyze } from '@/lib/mock-ai'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { imageBase64 } = body

    if (!imageBase64) {
      return NextResponse.json(
        { error: 'imageBase64 wajib diisi' },
        { status: 400 }
      )
    }

    await new Promise((resolve) => setTimeout(resolve, 1500))

    const result = mockAnalyze()

    return NextResponse.json({
      result,
    })
  } catch (error) {
    console.error('Mock analyze error:', error)
    return NextResponse.json(
      { error: 'Mock AI gagal' },
      { status: 500 }
    )
  }
}