import { GoogleGenAI } from '@google/genai'
import type { AnalyzeResult } from '@/lib/types'

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
})

export async function analyzePlateWithGemini(
  base64Data: string,
  mimeType = 'image/jpeg'
): Promise<AnalyzeResult> {
  const prompt = `
Kamu adalah AI untuk analisis sisa makanan pada piring.

Tugas:
1. Tentukan apakah piring bersih atau masih ada sisa makanan.
2. Jika masih ada sisa makanan, klasifikasikan HANYA ke kategori berikut:
   - nasi
   - sayuran
   - lauk
3. Jawab hanya dalam JSON valid tanpa markdown.

Format wajib:
{
  "isCleanPlate": boolean,
  "leftoverTypes": ["nasi" | "sayuran" | "lauk"],
  "message": string
}

Aturan:
- Jika piring bersih, leftoverTypes harus []
- Jangan buat kategori lain
- Jika tidak yakin, berikan estimasi terbaik berdasarkan visual gambar
- message harus singkat dan ramah dalam bahasa Indonesia
`.trim()

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
  })

  const text = response.text?.trim() ?? ''
  const cleaned = text.replace(/```json|```/g, '').trim()

  const parsed = JSON.parse(cleaned)

  return {
    isCleanPlate: Boolean(parsed.isCleanPlate),
    leftoverTypes: Array.isArray(parsed.leftoverTypes)
      ? parsed.leftoverTypes
      : [],
    message: String(parsed.message ?? ''),
  }
}