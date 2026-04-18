import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  try {
    const { userId, displayName, password, confirmPassword } = await req.json()

    if (!userId || !displayName || !password || !confirmPassword) {
      return NextResponse.json(
        { error: 'Semua field wajib diisi.' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password minimal 6 karakter.' },
        { status: 400 }
      )
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Konfirmasi password tidak cocok.' },
        { status: 400 }
      )
    }

    const normalizedUserId = String(userId).trim().toLowerCase()
    const normalizedDisplayName = String(displayName).trim()

    const supabase = createAdminSupabaseClient()

    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('user_id', normalizedUserId)
      .maybeSingle()

    if (checkError) {
      return NextResponse.json(
        { error: checkError.message },
        { status: 500 }
      )
    }

    if (existingUser) {
      return NextResponse.json(
        { error: 'User ID sudah digunakan. Gunakan User ID lain.' },
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        user_id: normalizedUserId,
        display_name: normalizedDisplayName,
        password_hash: passwordHash,
      })
      .select('id, user_id, display_name, created_at')
      .single()

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      user: newUser,
      message: 'Sign up berhasil.',
    })
  } catch {
    return NextResponse.json(
      { error: 'Terjadi kesalahan server.' },
      { status: 500 }
    )
  }
}