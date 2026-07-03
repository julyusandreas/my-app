import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

export const dynamic = 'force-dynamic'

type LeftoverType = 'Rice' | 'Vegetables' | 'Protein Dishes'

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
    nasi: 'Rice',
    rice: 'Rice',

    sayur: 'Vegetables',
    sayuran: 'Vegetables',
    vegetable: 'Vegetables',
    vegetables: 'Vegetables',
    veggie: 'Vegetables',
    veggies: 'Vegetables',

    lauk: 'Protein Dishes',
    'lauk pauk': 'Protein Dishes',
    protein: 'Protein Dishes',
    'protein dish': 'Protein Dishes',
    'protein dishes': 'Protein Dishes',
    'side dish': 'Protein Dishes',
    'side dishes': 'Protein Dishes',
    chicken: 'Protein Dishes',
    fish: 'Protein Dishes',
    meat: 'Protein Dishes',
    egg: 'Protein Dishes',
    tofu: 'Protein Dishes',
    tempeh: 'Protein Dishes',
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
You are an AI that analyzes leftover food on a plate after a meal.

GOAL:
Detect food waste realistically, only when the leftover food is significant.

IMPORTANT ANALYSIS STEPS:
1. Identify whether anything remains on the plate.
2. Decide whether the remaining item is SIGNIFICANT or NOT SIGNIFICANT.
3. Only if it is SIGNIFICANT, classify the leftover food type.

FOOD WASTE DEFINITION:
Food waste means leftover food that:
- Is clearly visible as food
- Exists in a noticeable amount
- Can realistically be picked up and eaten again

SIGNIFICANT leftovers mean FOOD WASTE.
Examples of significant leftovers:
- Rice that can be picked up with a spoon
- Visible vegetables in a noticeable amount
- Visible protein/side dish pieces
- A pile of food on one side of the plate that can still realistically be eaten

NOT SIGNIFICANT leftovers mean NOT FOOD WASTE.
Examples of not significant leftovers:
- Seasoning
- Sauce
- Oil
- Thin residue
- Small crumbs
- A few grains of rice stuck to the plate
- Very small pieces of onion, chili, or garnish
- Anything too small or unrealistic to eat again

ALWAYS IGNORE:
- Bones
- Fish bones
- Hard skin
- Seeds
- Shells
- Tissue or non-food objects

VERY IMPORTANT RULES:
- If visible rice, vegetables, or protein dishes remain in an amount that can be picked up with a spoon or fork, then isFoodWaste = true.
- Do not classify the plate as clean if there is still visible rice, vegetables, or protein dishes in a significant amount.
- Do not only judge by the plate area. Even if the leftover food is gathered on one side, it is still food waste if it can realistically be eaten.
- If there is only seasoning, sauce, oil, or thin residue, then isFoodWaste = false.
- If unsure whether the leftover is significant or not, choose NOT SIGNIFICANT.
- Avoid false positives, but do not ignore clearly visible leftover food.

LIGHTING ROBUSTNESS:
- Do not rely only on brightness, shadows, or contrast.
- Focus on the shape, amount, and whether the leftover can realistically be eaten again.
- Lighting can make leftovers look clearer or less clear, but it does not change the actual amount.

CLASSIFICATION:
If isFoodWaste = true, leftoverTypes must only use these exact English labels:
- Rice
- Vegetables
- Protein Dishes

Do NOT use Indonesian labels such as "nasi", "sayuran", or "lauk" in the JSON output.

OUTPUT RULES:
If there is NO food waste:
- isCleanPlate = true
- isFoodWaste = false
- leftoverTypes = []
- isEdible = false

If there IS food waste:
- isCleanPlate = false
- isFoodWaste = true
- leftoverTypes must contain the correct categories
- isEdible = true if the leftover visually still looks edible
- isEdible = false if it looks very dirty, destroyed, or not suitable to eat

MESSAGE RULES:
If isFoodWaste = false, use this exact message:
"Keep up this habit to help reduce food waste"

If isFoodWaste = true, use this exact message:
"Let's try to finish your meal next time"

OUTPUT FORMAT:
Return only valid JSON without markdown.

{
  "isCleanPlate": boolean,
  "isFoodWaste": boolean,
  "leftoverTypes": ["Rice" | "Vegetables" | "Protein Dishes"],
  "isEdible": boolean,
  "message": string,
  "reason": string
}

EXAMPLE 1 - only seasoning/residue:
{
  "isCleanPlate": true,
  "isFoodWaste": false,
  "leftoverTypes": [],
  "isEdible": false,
  "message": "Keep up this habit to help reduce food waste",
  "reason": "Only insignificant seasoning or thin residue remains."
}

EXAMPLE 2 - visible rice, vegetables, and protein dishes:
{
  "isCleanPlate": false,
  "isFoodWaste": true,
  "leftoverTypes": ["Rice", "Vegetables", "Protein Dishes"],
  "isEdible": true,
  "message": "Let's try to finish your meal next time",
  "reason": "Significant leftovers of rice, vegetables, and protein dishes are still visible."
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
            ? 'Significant leftover food is still visible on the plate.'
            : 'No significant food waste is detected on the plate.',
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