import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  try {
    const { id, displayName } = await req.json()

    if (!id || !displayName) {
      return NextResponse.json(
        { error: 'ID dan display name wajib diisi' },
        { status: 400 }
      )
    }

    const supabase = createAdminSupabaseClient()

    // cek apakah user sudah ada
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      return NextResponse.json(
        { error: fetchError.message },
        { status: 500 }
      )
    }

    // ✅ CASE 1: user sudah ada
    if (existingUser) {
      if (existingUser.display_name === displayName) {
        // ✅ LOGIN (boleh masuk)
        return NextResponse.json({
          user: existingUser,
          message: 'Login berhasil',
        })
      } else {
        // ❌ ID dipakai orang lain
        return NextResponse.json(
          { error: 'ID sudah digunakan. Gunakan ID lain.' },
          { status: 409 }
        )
      }
    }

    // ✅ CASE 2: user belum ada → buat baru
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        id,
        display_name: displayName,
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      user: newUser,
      message: 'User berhasil dibuat',
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}