import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

export const dynamic = 'force-dynamic'

type GeminiJsonResult = {
  isCleanPlate: boolean
  leftoverTypes: string[]
  message: string
}

function cleanJsonText(text: string) {
  return text
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim()
}

function normalizeLeftoverTypes(types: unknown): string[] {
  if (!Array.isArray(types)) return []

  const allowed = new Set(['Rice', 'Vegetables', 'Protein Dishes'])

  return types
    .map((item) => String(item).trim())
    .filter((item) => allowed.has(item))
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY belum diisi di .env.local' },
        { status: 500 }
      )
    }

    const { imageBase64 } = await req.json()

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json(
        { error: 'imageBase64 wajib dikirim.' },
        { status: 400 }
      )
    }

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '')

    const ai = new GoogleGenAI({ apiKey })

    const prompt = `
Kamu adalah AI yang bertugas menganalisis sisa makanan pada piring setelah makan.

Tujuan:
Mendeteksi food waste secara realistis, hanya jika sisa makanan signifikan.

LANGKAH ANALISIS (WAJIB BERURUTAN):

1. Identifikasi apakah ada sesuatu yang tersisa di piring.
2. Tentukan apakah sisa tersebut SIGNIFIKAN atau TIDAK SIGNIFIKAN.
3. Hanya jika SIGNIFIKAN, lanjutkan ke klasifikasi jenis makanan.

DEFINISI PENTING:

Sisa SIGNIFIKAN (FOOD WASTE) jika:
- Masih terlihat jelas sebagai makanan
- Jumlahnya cukup terlihat (bukan hanya sedikit)
- Secara realistis bisa diambil dan dimakan kembali
- Contoh:
  - 1 sendok nasi
  - potongan ayam
  - sayur yang masih utuh

Sisa TIDAK SIGNIFIKAN (BUKAN FOOD WASTE) jika:
- Hanya berupa:
  - bumbu
  - saus
  - minyak
  - remah kecil
  - potongan sangat kecil (bawang, cabai, dll)
  - sisa tipis yang menempel
- Jumlahnya sangat sedikit
- Tidak realistis untuk dikonsumsi kembali

Bagian yang SELALU DIABAIKAN:
- tulang
- duri
- kulit keras
- biji
- cangkang
- benda non-makanan

PENENTUAN OUTPUT:

Jika TIDAK ADA sisa signifikan:
- isCleanPlate = true
- isFoodWaste = false
- leftoverTypes = []
- isEdible = false

Jika ADA sisa signifikan:
- isCleanPlate = false
- isFoodWaste = true
- leftoverTypes diisi sesuai jenis:
  - nasi
  - sayuran
  - lauk

Penilaian Edible:
- true → masih terlihat layak dimakan
- false → sangat kotor / hancur / tidak pantas

FORMAT OUTPUT WAJIB JSON:

{
  "isCleanPlate": boolean,
  "isFoodWaste": boolean,
  "leftoverTypes": ["nasi" | "sayuran" | "lauk"],
  "isEdible": boolean,
  "message": string,
  "reason": string
}

ATURAN TAMBAHAN (KRUSIAL):

- Jangan menganggap bumbu atau saus sebagai food waste
- Jangan menganggap potongan kecil sebagai food waste jika tidak signifikan
- Jika ragu antara signifikan atau tidak → anggap TIDAK SIGNIFIKAN
- Prioritaskan akurasi terhadap food waste nyata, bukan deteksi berlebihan

Gaya bahasa:
- Bahasa Inggris
- message singkat & ramah
- reason jelas & logis

ATURAN MESSAGE:
- Jika isFoodWaste = false:
  gunakan EXACT message:
  "Keep up this habit to help reduce food waste"

- Jika isFoodWaste = true:
  gunakan EXACT message:
  "Let's try to finish your meal next time"

- Jangan membuat variasi message.
- Gunakan message persis sesuai aturan.

CONTOH:

Kasus bumbu saja:
{
  "isCleanPlate": true,
  "isFoodWaste": false,
  "leftoverTypes": [],
  "isEdible": false,
  "message": "Piring sudah bersih.",
  "reason": "Sisa hanya berupa bumbu dan residu yang tidak signifikan"
}

Kasus sisa nasi:
{
  "isCleanPlate": false,
  "isFoodWaste": true,
  "leftoverTypes": ["nasi"],
  "isEdible": true,
  "message": "Masih ada sisa nasi, ayo dihabiskan ya!",
  "reason": "Masih terlihat sisa nasi yang cukup jelas"
}
`

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          text: prompt,
        },
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Data,
          },
        },
      ],
    })

    const rawText = response.text ?? ''
    const jsonText = cleanJsonText(rawText)

    let parsed: GeminiJsonResult

    try {
      parsed = JSON.parse(jsonText)
    } catch {
      return NextResponse.json(
        {
          error: 'Gemini tidak mengembalikan JSON yang valid.',
          raw: rawText,
        },
        { status: 500 }
      )
    }

    const leftoverTypes = normalizeLeftoverTypes(parsed.leftoverTypes)
    const isCleanPlate =
      Boolean(parsed.isCleanPlate) || leftoverTypes.length === 0

    const result: GeminiJsonResult = {
      isCleanPlate,
      leftoverTypes: isCleanPlate ? [] : leftoverTypes,
      message:
        typeof parsed.message === 'string' && parsed.message.trim()
          ? parsed.message.trim()
          : isCleanPlate
            ? 'Great job! No food waste detected.'
            : 'Food waste was detected. Try to take a suitable portion next time.',
    }

    return NextResponse.json({ result })
  } catch (error) {
    console.error('Gemini analyze error:', error)

    return NextResponse.json(
      { error: 'Terjadi kesalahan saat menganalisis gambar dengan Gemini.' },
      { status: 500 }
    )
  }
}