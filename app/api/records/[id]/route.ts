import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    if (!id) {
      return NextResponse.json(
        { error: 'id riwayat wajib diisi' },
        { status: 400 }
      )
    }

    const supabase = createAdminSupabaseClient()

    const { data, error } = await supabase
      .from('scan_records')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Detail record query error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Data riwayat tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json({ record: data })
  } catch (error) {
    console.error('Detail record route error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}