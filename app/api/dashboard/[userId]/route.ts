import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await context.params

    if (!userId) {
      return NextResponse.json(
        { error: 'userId wajib diisi' },
        { status: 400 }
      )
    }

    const supabase = createAdminSupabaseClient()

    const { data, error } = await supabase
      .from('scan_records')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Dashboard query error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    const records = data ?? []

    return NextResponse.json({
      riceCount: records.filter((r) => r.leftover_rice).length,
      vegetableCount: records.filter((r) => r.leftover_vegetable).length,
      sideDishCount: records.filter((r) => r.leftover_side_dish).length,
      cleanPlateCount: records.filter((r) => r.is_clean_plate).length,
      tryAgainCount: records.filter((r) => !r.is_clean_plate).length,
      history: records,
      debug: {
        requestedUserId: userId,
        totalRecords: records.length,
      },
    })
  } catch (error) {
    console.error('Dashboard route error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}