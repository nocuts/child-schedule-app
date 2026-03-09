import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function POST(request: Request) {
  const body = await request.json()
  const { child_name, token } = body

  if (!child_name || !token) {
    return NextResponse.json({ error: '자녀 이름과 토큰이 필요합니다.' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('fcm_tokens')
    .insert({ child_name, token })

  if (error) {
    // 23505: unique_violation - 이미 등록된 토큰
    if (error.code === '23505') {
      return NextResponse.json({ success: true, message: '이미 등록되었습니다.' })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: '등록되었습니다.' })
}
