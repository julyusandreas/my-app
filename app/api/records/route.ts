import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

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

    const supabase = createAdminSupabaseClient()

    const { data, error } = await supabase
      .from('scan_records')
      .insert({
        user_id: userId,
        image_url: imageUrl,
        image_path: imagePath,
        is_clean_plate: isCleanPlate,
        leftover_rice: leftoverTypes?.includes('nasi') ?? false,
        leftover_vegetable: leftoverTypes?.includes('vegetables') ?? false,
        leftover_side_dish: leftoverTypes?.includes('lauk') ?? false,
        ai_message: aiMessage ?? null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ record: data })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}