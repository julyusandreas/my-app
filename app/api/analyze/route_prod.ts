import { NextRequest, NextResponse } from 'next/server'
import { analyzePlateWithGemini } from '@/lib/gemini'

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

    const rawBase64 = String(imageBase64).includes(',')
      ? String(imageBase64).split(',')[1]
      : String(imageBase64)

    const result = await analyzePlateWithGemini(rawBase64)

    return NextResponse.json({ result })
  } catch (error) {
    console.error('Analyze route error:', error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Gagal menganalisis gambar dengan Gemini',
      },
      { status: 500 }
    )
  }
}