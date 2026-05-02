import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

export async function GET() {
  try {
    const supabase = createAdminSupabaseClient()

    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, gender')

    if (usersError) {
      return NextResponse.json({ error: usersError.message }, { status: 500 })
    }

    const { data: recordsData, error: recordsError } = await supabase
      .from('scan_records')
      .select(
        'id, user_id, is_clean_plate, leftover_rice, leftover_vegetable, leftover_side_dish, created_at'
      )

    if (recordsError) {
      return NextResponse.json({ error: recordsError.message }, { status: 500 })
    }

    const users = usersData ?? []
    const records = recordsData ?? []

    const totalUsers = users.length
    const male = users.filter((u) => u.gender === 'male').length
    const female = users.filter((u) => u.gender === 'female').length

    const totalScans = records.length
    const clean = records.filter((r) => r.is_clean_plate).length
    const waste = records.filter((r) => !r.is_clean_plate).length

    const rice = records.filter((r) => r.leftover_rice).length
    const vegetable = records.filter((r) => r.leftover_vegetable).length
    const sideDish = records.filter((r) => r.leftover_side_dish).length

    const wasteRate =
      totalScans > 0 ? Math.round((waste / totalScans) * 100) : 0

    const cleanRate =
      totalScans > 0 ? Math.round((clean / totalScans) * 100) : 0

    const avgScanPerUser =
      totalUsers > 0 ? Number((totalScans / totalUsers).toFixed(1)) : 0

    const dominantWaste = [
      { name: 'Rice', value: rice },
      { name: 'Vegetables', value: vegetable },
      { name: 'Protein Dishes', value: sideDish },
    ].sort((a, b) => b.value - a.value)[0]

    return NextResponse.json({
      totalUsers,
      male,
      female,
      totalScans,
      clean,
      waste,
      rice,
      vegetable,
      sideDish,
      wasteRate,
      cleanRate,
      avgScanPerUser,
      dominantWaste,
    })
  } catch {
    return NextResponse.json(
      { error: 'Gagal memuat dashboard public.' },
      { status: 500 }
    )
  }
}