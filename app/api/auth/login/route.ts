import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  try {
    const { userId, password } = await req.json()

    if (!userId || !password) {
      return NextResponse.json(
        { error: 'User ID dan password wajib diisi.' },
        { status: 400 }
      )
    }

    const normalizedUserId = String(userId).trim().toLowerCase()

    const supabase = createAdminSupabaseClient()

    const { data: user, error } = await supabase
      .from('users')
      .select('id, user_id, display_name, password_hash')
      .eq('user_id', normalizedUserId)
      .maybeSingle()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User ID atau password salah.' },
        { status: 401 }
      )
    }

    const isMatch = await bcrypt.compare(password, user.password_hash)

    if (!isMatch) {
      return NextResponse.json(
        { error: 'User ID atau password salah.' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      user: {
        id: user.id,
        userId: user.user_id,
        displayName: user.display_name,
      },
      message: 'Login berhasil.',
    })
  } catch {
    return NextResponse.json(
      { error: 'Terjadi kesalahan server.' },
      { status: 500 }
    )
  }
}