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

TUJUAN:
Mendeteksi food waste secara realistis, hanya jika terdapat sisa makanan yang signifikan.

LANGKAH ANALISIS (WAJIB BERURUTAN):
1. Identifikasi apakah ada sesuatu yang tersisa di piring.
2. Tentukan apakah sisa tersebut SIGNIFIKAN atau TIDAK SIGNIFIKAN.
3. Hanya jika SIGNIFIKAN, lakukan klasifikasi jenis makanan.

DEFINISI PENTING:

Food waste = sisa makanan yang:
- Masih terlihat jelas sebagai makanan
- Jumlahnya cukup terlihat (bukan hanya sedikit)
- Secara realistis bisa diambil dan dimakan kembali

Bukan food waste jika:
- Hanya berupa bumbu, saus, minyak, atau residu tipis
- Hanya berupa remah kecil atau potongan sangat kecil (misalnya bawang, cabai)
- Jumlahnya sangat sedikit dan tidak realistis untuk dikonsumsi kembali
- Hanya tersisa bagian yang tidak dimakan (tulang, duri, kulit keras, biji, cangkang)

Sisa SIGNIFIKAN jika:
- Masih jelas bentuk makanannya
- Jumlahnya cukup terlihat
- Bisa diambil dengan mudah
- Contoh: 1 sendok nasi, potongan lauk, sayur yang masih utuh

Sisa TIDAK SIGNIFIKAN jika:
- Hanya berupa sisa kecil, bumbu, atau residu
- Tidak berbentuk makanan utuh
- Sulit atau tidak realistis untuk dimakan kembali

PENILAIAN BERDASARKAN PROPORSI:
- Jika sisa makanan kurang dari sekitar 10% dari area piring → anggap TIDAK SIGNIFIKAN
- Jika sisa hanya terkumpul kecil di satu sisi → kemungkinan TIDAK SIGNIFIKAN

KETAHANAN TERHADAP PENCAHAYAAN:
- Jangan mengandalkan tingkat kecerahan, bayangan, atau kontras dalam menilai jumlah sisa makanan
- Pencahayaan dapat membuat sisa terlihat lebih jelas atau lebih samar, tetapi tidak mengubah jumlah sebenarnya
- Fokus pada ukuran dan jumlah nyata, bukan seberapa jelas terlihat
- Jika perbedaan pencahayaan membuat sisa terlihat lebih jelas tetapi jumlahnya kecil, tetap anggap TIDAK SIGNIFIKAN

ATURAN KEPUTUSAN:
- Jika ragu apakah sisa signifikan atau tidak → anggap TIDAK SIGNIFIKAN
- Hindari false positive (menganggap ada food waste padahal tidak)
- Prioritaskan hanya mendeteksi food waste yang jelas dan nyata

KLASIFIKASI JENIS (hanya jika signifikan):
- nasi
- sayuran
- lauk

PENENTUAN OUTPUT:

Jika TIDAK ADA sisa signifikan:
- isCleanPlate = true
- isFoodWaste = false
- leftoverTypes = []
- isEdible = false

Jika ADA sisa signifikan:
- isCleanPlate = false
- isFoodWaste = true
- leftoverTypes diisi sesuai jenis
- isEdible:
  - true jika masih terlihat layak dimakan
  - false jika sangat kotor / hancur / tidak pantas

FORMAT OUTPUT (WAJIB JSON VALID TANPA MARKDOWN):

{
  "isCleanPlate": boolean,
  "isFoodWaste": boolean,
  "leftoverTypes": ["nasi" | "sayuran" | "lauk"],
  "isEdible": boolean,
  "message": string,
  "reason": string
}

ATURAN TAMBAHAN:
- Jangan buat kategori selain nasi, sayuran, lauk
- Gunakan bahasa Indonesia
- message harus singkat, ramah, dan natural
- reason harus menjelaskan keputusan secara singkat dan logis

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
  "reason": "Masih terlihat sisa nasi dalam jumlah yang cukup"
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