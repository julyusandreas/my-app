import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

type LeftoverType = 'Rice' | 'Vegetables' | 'Protein Dishes'

function normalizeLeftoverTypes(leftoverTypes: unknown): LeftoverType[] {
  if (!Array.isArray(leftoverTypes)) return []

  const mapper: Record<string, LeftoverType> = {
    rice: 'Rice',
    nasi: 'Rice',

    vegetable: 'Vegetables',
    vegetables: 'Vegetables',
    sayur: 'Vegetables',
    sayuran: 'Vegetables',

    protein: 'Protein Dishes',
    'protein dish': 'Protein Dishes',
    'protein dishes': 'Protein Dishes',
    lauk: 'Protein Dishes',
    'lauk pauk': 'Protein Dishes',
    chicken: 'Protein Dishes',
    fish: 'Protein Dishes',
    meat: 'Protein Dishes',
    egg: 'Protein Dishes',
    tofu: 'Protein Dishes',
    tempeh: 'Protein Dishes',
  }

  const result: LeftoverType[] = []

  for (const item of leftoverTypes) {
    const key = String(item).trim().toLowerCase().replace(/[_-]/g, ' ')
    const mapped = mapper[key]

    if (mapped && !result.includes(mapped)) {
      result.push(mapped)
    }
  }

  return result
}

export async function POST(req: NextRequest) {
  try {
    const {
      userId,
      imageUrl,
      imagePath,
      isCleanPlate,
      leftoverTypes,
      aiMessage,
    } = await req.json()

    if (!userId || !imageUrl || !imagePath) {
      return NextResponse.json({ error: 'Data belum lengkap' }, { status: 400 })
    }

    const normalizedLeftoverTypes = normalizeLeftoverTypes(leftoverTypes)

    const leftoverRice = normalizedLeftoverTypes.includes('Rice')
    const leftoverVegetable = normalizedLeftoverTypes.includes('Vegetables')
    const leftoverSideDish = normalizedLeftoverTypes.includes('Protein Dishes')

    const supabase = createAdminSupabaseClient()

    const { data, error } = await supabase
      .from('scan_records')
      .insert({
        user_id: userId,
        image_url: imageUrl,
        image_path: imagePath,
        is_clean_plate: Boolean(isCleanPlate),
        leftover_rice: leftoverRice,
        leftover_vegetable: leftoverVegetable,
        leftover_side_dish: leftoverSideDish,
        ai_message: aiMessage ?? null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ record: data })
  } catch (error) {
    console.error('Create record error:', error)

    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}