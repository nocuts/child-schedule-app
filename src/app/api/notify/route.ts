import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { messaging } from '@/lib/firebase-admin'

// Vercel Cron(GET) 및 수동 트리거(POST) 모두 지원
export async function GET(request: Request) {
  return handleNotify(request)
}

export async function POST(request: Request) {
  return handleNotify(request)
}

async function handleNotify(request: Request) {
  // Vercel Cron 인증 확인 (CRON_SECRET이 설정된 경우)
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    const isVercelCron = authHeader === `Bearer ${cronSecret}`
    const isManual = request.method === 'POST' // 부모 페이지에서의 수동 트리거

    if (!isVercelCron && !isManual) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  // 발송 대상 일정 조회: 예약 시간이 지났고 아직 알림 미발송인 건
  const { data: schedules, error: scheduleError } = await supabaseAdmin
    .from('schedules')
    .select('*')
    .lte('scheduled_at', new Date().toISOString())
    .eq('notification_sent', false)

  if (scheduleError) {
    return NextResponse.json({ error: scheduleError.message }, { status: 500 })
  }

  if (!schedules || schedules.length === 0) {
    return NextResponse.json({ message: '발송할 알림이 없습니다.', sent: 0 })
  }

  let totalSent = 0
  const results: { schedule_id: string; sent: number; errors: string[] }[] = []

  for (const schedule of schedules) {
    // 해당 자녀의 FCM 토큰 조회
    const { data: tokenRows, error: tokenError } = await supabaseAdmin
      .from('fcm_tokens')
      .select('token')
      .eq('child_name', schedule.child_name)

    if (tokenError || !tokenRows || tokenRows.length === 0) {
      results.push({ schedule_id: schedule.id, sent: 0, errors: ['등록된 기기 없음'] })
      // 기기가 없어도 상태는 완료로 변경 (재발송 방지)
      await supabaseAdmin
        .from('schedules')
        .update({ notification_sent: true })
        .eq('id', schedule.id)
      continue
    }

    const tokens = tokenRows.map((r: { token: string }) => r.token)
    const errors: string[] = []

    // FCM 멀티캐스트 발송
    const sendResults = await messaging.sendEach(
      tokens.map((token) => ({
        token,
        notification: {
          title: `📌 ${schedule.child_name}의 할 일`,
          body: schedule.title,
        },
        data: {
          schedule_id: schedule.id,
        },
      }))
    )

    // 유효하지 않은 토큰 삭제
    const invalidTokens: string[] = []
    sendResults.responses.forEach((resp, idx) => {
      if (resp.success) {
        totalSent++
      } else {
        const code = resp.error?.code
        if (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token'
        ) {
          invalidTokens.push(tokens[idx])
        }
        errors.push(resp.error?.message || 'Unknown error')
      }
    })

    if (invalidTokens.length > 0) {
      await supabaseAdmin.from('fcm_tokens').delete().in('token', invalidTokens)
    }

    // 알림 발송 완료 상태로 업데이트
    await supabaseAdmin
      .from('schedules')
      .update({ notification_sent: true })
      .eq('id', schedule.id)

    results.push({ schedule_id: schedule.id, sent: sendResults.successCount, errors })
  }

  return NextResponse.json({
    message: `${totalSent}건 발송 완료`,
    sent: totalSent,
    processed: schedules.length,
    results,
  })
}
