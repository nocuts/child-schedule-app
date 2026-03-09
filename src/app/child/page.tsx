'use client'

import { useState, useEffect } from 'react'

type Status = 'idle' | 'loading' | 'success' | 'error' | 'denied'

export default function ChildPage() {
  const [childName, setChildName] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')
  const [isSupported, setIsSupported] = useState<boolean | null>(null)

  useEffect(() => {
    setIsSupported('Notification' in window && 'serviceWorker' in navigator)
  }, [])

  async function handleRegister() {
    if (!childName.trim()) return

    setStatus('loading')
    setMessage('')

    try {
      // 1. 알림 권한 요청
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus('denied')
        setMessage('알림 권한이 거부되었습니다. 브라우저 설정에서 알림을 허용해주세요.')
        return
      }

      // 2. 서비스 워커 등록
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
      await navigator.serviceWorker.ready

      // 3. FCM 토큰 발급 (동적 import - SSR 방지)
      const { getMessaging, getToken } = await import('firebase/messaging')
      const { app } = await import('@/lib/firebase-client')
      const messagingInstance = getMessaging(app)

      const token = await getToken(messagingInstance, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: registration,
      })

      if (!token) {
        throw new Error('FCM 토큰을 가져올 수 없습니다.')
      }

      // 4. 토큰을 서버에 저장
      const res = await fetch('/api/fcm-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_name: childName.trim(), token }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '저장 실패')
      }

      setStatus('success')
      setMessage(`${childName.trim()}의 기기가 등록되었습니다! 이제 알림을 받을 수 있어요.`)
    } catch (err: unknown) {
      setStatus('error')
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류'
      setMessage(`오류: ${errorMessage}`)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">

        {/* 헤더 */}
        <div className="text-center space-y-2">
          <div className="text-5xl">🔔</div>
          <h1 className="text-2xl font-bold text-gray-800">알림 등록</h1>
          <p className="text-gray-500 text-sm">
            이 기기에서 알림을 받으려면<br />이름을 입력하고 버튼을 눌러주세요.
          </p>
        </div>

        {/* 카드 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          {isSupported === null ? (
            // 서버/클라이언트 hydration 전 빈 상태
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
                onClick={() => {
                  setStatus('idle')
                  setChildName('')
                  setMessage('')
                }}
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
