'use client'

import { useState, useEffect } from 'react'

type Status = 'idle' | 'loading' | 'success' | 'error' | 'denied'

async function setupForegroundHandler() {
  try {
    const { getMessaging, onMessage } = await import('firebase/messaging')
    const { app } = await import('@/lib/firebase-client')
    const messagingInstance = getMessaging(app)
    onMessage(messagingInstance, (payload) => {
      console.log('[FCM] 포그라운드 알림 수신:', payload)
      const title = payload.notification?.title || '새 알림'
      const body = payload.notification?.body || ''
      new Notification(title, { body, icon: '/icon-192x192.png' })
    })
    console.log('[FCM] 포그라운드 핸들러 등록 완료')
  } catch (e) {
    console.error('[FCM] 포그라운드 핸들러 등록 실패:', e)
  }
}

export default function ChildPage() {
  const [childName, setChildName] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')
  const [isSupported, setIsSupported] = useState<boolean | null>(null)

  useEffect(() => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator
    setIsSupported(supported)
    console.log('[FCM] 알림 지원 여부:', supported)
    console.log('[FCM] 현재 알림 권한 상태:', Notification.permission)

    if (supported && Notification.permission === 'granted') {
      console.log('[FCM] 기존 권한 허용됨 → 포그라운드 핸들러 설정')
      setupForegroundHandler()
    }
  }, [])

  async function handleRegister() {
    if (!childName.trim()) return
    setStatus('loading')
    setMessage('')

    try {
      // 1. 알림 권한 요청
      console.log('[FCM] 알림 권한 요청 중...')
      const permission = await Notification.requestPermission()
      console.log('[FCM] 알림 권한 결과:', permission)

      if (permission !== 'granted') {
        setStatus('denied')
        setMessage('알림 권한이 거부되었습니다. 브라우저 설정에서 알림을 허용해주세요.')
        return
      }

      // 2. 서비스 워커 등록
      console.log('[FCM] Service Worker 등록 시도...')
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
      console.log('[FCM] Service Worker 등록 완료:', registration)
      console.log('[FCM] SW 상태 - active:', registration.active?.state, '/ installing:', registration.installing?.state, '/ waiting:', registration.waiting?.state)

      // SW가 installing 상태이면 activated 될 때까지 대기
      if (!registration.active) {
        console.log('[FCM] SW 활성화 대기 중...')
        await new Promise<void>((resolve) => {
          const sw = registration.installing || registration.waiting
          if (!sw) { resolve(); return }
          sw.addEventListener('statechange', (e) => {
            const state = (e.target as ServiceWorker).state
            console.log('[FCM] SW 상태 변경:', state)
            if (state === 'activated') resolve()
          })
        })
        console.log('[FCM] SW 활성화 완료')
      }

      // 3. FCM 토큰 발급
      console.log('[FCM] FCM 토큰 요청 중...')
      const { getMessaging, getToken, onMessage } = await import('firebase/messaging')
      const { app } = await import('@/lib/firebase-client')
      const messagingInstance = getMessaging(app)

      const token = await getToken(messagingInstance, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: registration,
      })

      if (!token) {
        throw new Error('FCM 토큰을 가져올 수 없습니다. VAPID 키나 Firebase 설정을 확인하세요.')
      }
      console.log('[FCM] FCM 토큰:', token)

      // 4. 포그라운드 메시지 핸들러 등록
      onMessage(messagingInstance, (payload) => {
        console.log('[FCM] 포그라운드 알림 수신:', payload)
        const title = payload.notification?.title || '새 알림'
        const body = payload.notification?.body || ''
        new Notification(title, { body, icon: '/icon-192x192.png' })
      })
      console.log('[FCM] 포그라운드 핸들러 등록 완료')

      // 5. 토큰 서버 저장
      console.log('[FCM] 토큰 서버 저장 중...')
      const res = await fetch('/api/fcm-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_name: childName.trim(), token }),
      })

      const resData = await res.json()
      console.log('[FCM] 서버 저장 응답:', resData)

      if (!res.ok) {
        throw new Error(resData.error || '저장 실패')
      }

      setStatus('success')
      setMessage(`${childName.trim()}의 기기가 등록되었습니다! 이제 알림을 받을 수 있어요.`)
    } catch (err: unknown) {
      console.error('[FCM] 등록 오류:', err)
      setStatus('error')
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류'
      setMessage(`오류: ${errorMessage}`)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">

        <div className="text-center space-y-2">
          <div className="text-5xl">🔔</div>
          <h1 className="text-2xl font-bold text-gray-800">알림 등록</h1>
          <p className="text-gray-500 text-sm">
            이 기기에서 알림을 받으려면<br />이름을 입력하고 버튼을 눌러주세요.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          {isSupported === null ? (
            <div className="py-4" />
          ) : !isSupported ? (
            <p className="text-center text-sm text-red-500 py-4">
              이 브라우저는 푸시 알림을 지원하지 않습니다.
            </p>
          ) : status === 'success' ? (
            <div className="text-center space-y-3 py-2">
              <div className="text-4xl">✅</div>
              <p className="font-semibold text-green-600">{message}</p>
              <button
                onClick={() => { setStatus('idle'); setChildName(''); setMessage('') }}
                className="text-sm text-gray-400 underline"
              >
                다른 이름으로 등록
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-600">내 이름</label>
                <input
                  type="text"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  placeholder="예: 김민준"
                  disabled={status === 'loading'}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                />
              </div>

              {message && status === 'denied' && (
                <p className="text-sm text-orange-500 bg-orange-50 px-4 py-2 rounded-lg">{message}</p>
              )}
              {message && status === 'error' && (
                <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-lg">{message}</p>
              )}

              <button
                onClick={handleRegister}
                disabled={!childName.trim() || status === 'loading'}
                className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {status === 'loading' ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    등록 중...
                  </span>
                ) : '알림 받기'}
              </button>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-400">
          부모님이 일정을 등록하면 이 기기로 알림이 옵니다.
        </p>
      </div>
    </main>
  )
}
