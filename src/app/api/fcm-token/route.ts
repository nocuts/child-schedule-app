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
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
