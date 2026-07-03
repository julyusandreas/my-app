import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

export const dynamic = 'force-dynamic'

type LeftoverType = 'nasi' | 'sayuran' | 'lauk'

type RawGeminiResult = {
  isCleanPlate?: unknown
  isFoodWaste?: unknown
  leftoverTypes?: unknown
  isEdible?: unknown
  message?: unknown
  reason?: unknown
}

type AnalyzeResult = {
  isCleanPlate: boolean
  isFoodWaste: boolean
  leftoverTypes: LeftoverType[]
  isEdible: boolean
  message: string
  reason: string
}

function cleanJsonText(text: string) {
  const cleaned = text
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim()

  const firstBrace = cleaned.indexOf('{')
  const lastBrace = cleaned.lastIndexOf('}')

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return cleaned.slice(firstBrace, lastBrace + 1)
  }

  return cleaned
}

function toBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value

  if (typeof value === 'string') {
    const lower = value.trim().toLowerCase()
    if (lower === 'true') return true
    if (lower === 'false') return false
  }

  return undefined
}

function normalizeLeftoverTypes(types: unknown): LeftoverType[] {
  if (!Array.isArray(types)) return []

  const mapper: Record<string, LeftoverType> = {
    nasi: 'nasi',
    rice: 'nasi',

    sayur: 'sayuran',
    sayuran: 'sayuran',
    vegetable: 'sayuran',
    vegetables: 'sayuran',
    veggies: 'sayuran',

    lauk: 'lauk',
    'lauk pauk': 'lauk',
    protein: 'lauk',
    'protein dish': 'lauk',
    'protein dishes': 'lauk',
    'side dish': 'lauk',
    'side dishes': 'lauk',
    chicken: 'lauk',
    fish: 'lauk',
    meat: 'lauk',
    egg: 'lauk',
    tofu: 'lauk',
    tempeh: 'lauk',
  }

  const normalized: LeftoverType[] = []

  for (const item of types) {
    const parts = String(item)
      .split(/[;,/]/)
      .map((part) =>
        part
          .trim()
          .toLowerCase()
          .replace(/[_-]/g, ' ')
      )

    for (const part of parts) {
      const mapped = mapper[part]

      if (mapped && !normalized.includes(mapped)) {
        normalized.push(mapped)
      }
    }
  }

  return normalized
}

function parseImageBase64(imageBase64: string) {
  const match = imageBase64.match(
    /^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/
  )

  if (match) {
    return {
      mimeType: match[1],
      base64Data: match[2].replace(/\s/g, ''),
    }
  }

  return {
    mimeType: 'image/jpeg',
    base64Data: imageBase64.replace(/\s/g, ''),
  }
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

    const { mimeType, base64Data } = parseImageBase64(imageBase64)

    const ai = new GoogleGenAI({ apiKey })

    const prompt = `
Kamu adalah AI yang bertugas menganalisis sisa makanan pada piring setelah makan.

TUJUAN:
Mendeteksi food waste secara realistis, hanya jika terdapat sisa makanan yang signifikan.

LANGKAH ANALISIS WAJIB:
1. Identifikasi apakah ada sesuatu yang tersisa di piring.
2. Tentukan apakah sisa tersebut SIGNIFIKAN atau TIDAK SIGNIFIKAN.
3. Hanya jika SIGNIFIKAN, lakukan klasifikasi jenis makanan.

DEFINISI FOOD WASTE:
Food waste adalah sisa makanan yang:
- Masih terlihat jelas sebagai makanan
- Jumlahnya cukup terlihat
- Secara realistis bisa diambil dan dimakan kembali

SISA SIGNIFIKAN berarti FOOD WASTE.
Contoh sisa signifikan:
- Nasi dalam jumlah yang bisa diambil dengan sendok
- Sayuran yang masih terlihat jelas
- Potongan lauk yang masih terlihat jelas
- Tumpukan makanan yang masih bisa dimakan meskipun berada di satu sisi piring

SISA TIDAK SIGNIFIKAN berarti BUKAN FOOD WASTE.
Contoh sisa tidak signifikan:
- Bumbu
- Saus
- Minyak
- Residu tipis
- Remah kecil
- Beberapa butir nasi yang menempel
- Potongan sangat kecil seperti bawang atau cabai dalam jumlah sangat sedikit
- Sisa yang tidak realistis untuk dikonsumsi kembali

BAGIAN YANG SELALU DIABAIKAN:
- Tulang
- Duri
- Kulit keras
- Biji
- Cangkang
- Tisu atau benda non-makanan

ATURAN KHUSUS YANG SANGAT PENTING:
- Jika masih terlihat nasi, sayuran, atau lauk dalam jumlah yang bisa diambil dengan sendok/garpu, maka isFoodWaste = true.
- Jangan menganggap piring bersih jika masih ada nasi, sayuran, atau lauk yang terlihat jelas.
- Jangan hanya melihat luas area piring. Walaupun sisa makanan terkumpul di satu sisi, jika jumlahnya masih bisa dimakan, maka tetap food waste.
- Jika hanya ada bumbu, saus, minyak, atau residu tipis, maka isFoodWaste = false.
- Jika ragu antara signifikan atau tidak signifikan, pilih TIDAK SIGNIFIKAN.
- Hindari false positive, tetapi jangan mengabaikan sisa makanan yang jelas terlihat.

KETAHANAN TERHADAP PENCAHAYAAN:
- Jangan mengandalkan kecerahan, bayangan, atau kontras dalam menentukan jumlah sisa makanan.
- Fokus pada bentuk, jumlah, dan apakah sisa tersebut realistis untuk dimakan kembali.
- Pencahayaan dapat membuat sisa terlihat lebih jelas atau lebih samar, tetapi tidak mengubah jumlah sebenarnya.

KLASIFIKASI JENIS:
Jika isFoodWaste = true, isi leftoverTypes hanya dengan kategori berikut:
- nasi
- sayuran
- lauk

PENENTUAN OUTPUT:
Jika TIDAK ADA food waste:
- isCleanPlate = true
- isFoodWaste = false
- leftoverTypes = []
- isEdible = false

Jika ADA food waste:
- isCleanPlate = false
- isFoodWaste = true
- leftoverTypes diisi sesuai jenis makanan yang tersisa
- isEdible = true jika sisa terlihat masih layak dimakan secara visual
- isEdible = false jika sisa terlihat sangat kotor, hancur, atau tidak pantas dimakan

ATURAN MESSAGE:
- Jika isFoodWaste = false, gunakan EXACT message:
"Keep up this habit to help reduce food waste"

- Jika isFoodWaste = true, gunakan EXACT message:
"Let's try to finish your meal next time"

FORMAT OUTPUT WAJIB JSON VALID TANPA MARKDOWN:

{
  "isCleanPlate": boolean,
  "isFoodWaste": boolean,
  "leftoverTypes": ["nasi" | "sayuran" | "lauk"],
  "isEdible": boolean,
  "message": string,
  "reason": string
}

CONTOH 1 - hanya bumbu/residu:
{
  "isCleanPlate": true,
  "isFoodWaste": false,
  "leftoverTypes": [],
  "isEdible": false,
  "message": "Keep up this habit to help reduce food waste",
  "reason": "Sisa hanya berupa bumbu atau residu tipis yang tidak signifikan."
}

CONTOH 2 - masih ada nasi, sayuran, dan lauk:
{
  "isCleanPlate": false,
  "isFoodWaste": true,
  "leftoverTypes": ["nasi", "sayuran", "lauk"],
  "isEdible": true,
  "message": "Let's try to finish your meal next time",
  "reason": "Masih terlihat sisa nasi, sayuran, dan lauk dalam jumlah yang signifikan."
}
`

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
      config: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    })

    const rawText = response.text ?? ''
    const jsonText = cleanJsonText(rawText)

    let parsed: RawGeminiResult

    try {
      parsed = JSON.parse(jsonText) as RawGeminiResult
    } catch {
      return NextResponse.json(
        {
          error: 'Gemini tidak mengembalikan JSON yang valid.',
          raw: rawText,
        },
        { status: 500 }
      )
    }

    const normalizedLeftoverTypes = normalizeLeftoverTypes(parsed.leftoverTypes)

    const parsedIsFoodWaste = toBoolean(parsed.isFoodWaste)
    const parsedIsCleanPlate = toBoolean(parsed.isCleanPlate)
    const parsedIsEdible = toBoolean(parsed.isEdible)

    let isFoodWaste: boolean

    if (normalizedLeftoverTypes.length > 0) {
      isFoodWaste = true
    } else if (parsedIsFoodWaste !== undefined) {
      isFoodWaste = parsedIsFoodWaste
    } else if (parsedIsCleanPlate !== undefined) {
      isFoodWaste = !parsedIsCleanPlate
    } else {
      isFoodWaste = false
    }

    const isCleanPlate = !isFoodWaste
    const leftoverTypes = isFoodWaste ? normalizedLeftoverTypes : []

    const result: AnalyzeResult = {
      isCleanPlate,
      isFoodWaste,
      leftoverTypes,
      isEdible: isFoodWaste ? parsedIsEdible ?? true : false,
      message: isFoodWaste
        ? "Let's try to finish your meal next time"
        : 'Keep up this habit to help reduce food waste',
      reason:
        typeof parsed.reason === 'string' && parsed.reason.trim()
          ? parsed.reason.trim()
          : isFoodWaste
            ? 'Masih terdapat sisa makanan yang signifikan pada piring.'
            : 'Tidak terdapat sisa makanan signifikan pada piring.',
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