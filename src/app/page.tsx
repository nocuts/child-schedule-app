'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Schedule } from '@/types/schedule'

function formatDateTime(isoString: string) {
  const date = new Date(isoString)
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isPast(isoString: string) {
  return new Date(isoString) < new Date()
}

export default function HomePage() {
  const [childName, setChildName] = useState('')
  const [title, setTitle] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [notifying, setNotifying] = useState(false)
  const [notifyResult, setNotifyResult] = useState('')

  const fetchSchedules = useCallback(async () => {
    setFetching(true)
    try {
      const res = await fetch('/api/schedules')
      const data = await res.json()
      if (res.ok) setSchedules(data)
    } finally {
      setFetching(false)
    }
  }, [])

  useEffect(() => {
    fetchSchedules()
  }, [fetchSchedules])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    setLoading(true)

    try {
      const res = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_name: childName, title, scheduled_at: new Date(scheduledAt).toISOString() }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '등록에 실패했습니다.')
        return
      }

      setSuccessMsg(`"${title}" 일정이 등록되었습니다.`)
      setChildName('')
      setTitle('')
      setScheduledAt('')
      fetchSchedules()
    } catch {
      setError('서버 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function handleNotifyNow() {
    setNotifying(true)
    setNotifyResult('')
    try {
      const res = await fetch('/api/notify', { method: 'POST' })
      const data = await res.json()
      setNotifyResult(data.message || '완료')
      if (data.sent > 0) fetchSchedules()
    } catch {
      setNotifyResult('오류가 발생했습니다.')
    } finally {
      setNotifying(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('이 일정을 삭제하시겠습니까?')) return

    const res = await fetch(`/api/schedules/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setSchedules((prev) => prev.filter((s) => s.id !== id))
    }
  }

  const minDateTime = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)

  return (
    <main className="min-h-screen py-10 px-4">
      <div className="max-w-xl mx-auto space-y-8">

        {/* 헤더 */}
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold text-gray-800">📋 자녀 일정 알리미</h1>
          <p className="text-gray-500 text-sm">자녀의 할 일을 등록하면 지정 시간에 알림을 보냅니다.</p>
        </div>

        {/* 자녀 기기 등록 배너 */}
        <Link
          href="/child"
          className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 hover:bg-blue-100 transition group"
        >
          <div>
            <p className="font-semibold text-blue-700 text-sm">자녀 기기에서 알림 등록하기</p>
            <p className="text-blue-500 text-xs mt-0.5">자녀 기기에서 이 링크를 열어 알림을 허용해주세요.</p>
          </div>
          <span className="text-blue-400 text-lg group-hover:translate-x-1 transition-transform">→</span>
        </Link>

        {/* 등록 폼 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-700">새 일정 등록</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-600">자녀 이름</label>
              <input
                type="text"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                placeholder="예: 김민준"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-600">할 일 제목</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 수학 숙제하기"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-600">알림 날짜 / 시간</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                min={minDateTime}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-lg">{error}</p>
            )}
            {successMsg && (
              <p className="text-sm text-green-600 bg-green-50 px-4 py-2 rounded-lg">✅ {successMsg}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? '등록 중...' : '일정 등록하기'}
            </button>
          </form>
        </div>

        {/* 일정 목록 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-700">
                등록된 일정
              {!fetching && (
                <span className="ml-2 text-sm font-normal text-gray-400">({schedules.length}건)</span>
              )}
            </h2>
            <button
              onClick={handleNotifyNow}
              disabled={notifying}
              className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium transition disabled:opacity-50"
            >
              {notifying ? '확인 중...' : '🔔 지금 발송 확인'}
            </button>
          </div>
          {notifyResult && (
            <p className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">{notifyResult}</p>
          )}

          {fetching ? (
            <div className="text-center py-10 text-gray-400 text-sm">불러오는 중...</div>
          ) : schedules.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border border-gray-100 text-gray-400 text-sm">
              등록된 일정이 없습니다.
            </div>
          ) : (
            <ul className="space-y-3">
              {schedules.map((s) => {
                const past = isPast(s.scheduled_at)
                return (
                  <li
                    key={s.id}
                    className={`bg-white rounded-2xl border shadow-sm px-5 py-4 flex items-start justify-between gap-4 transition ${
                      past ? 'border-gray-100 opacity-60' : 'border-gray-100'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium bg-blue-100 text-blue-600 px-2.5 py-0.5 rounded-full">
                          {s.child_name}
                        </span>
                        {s.notification_sent ? (
                          <span className="text-xs font-medium bg-green-100 text-green-600 px-2.5 py-0.5 rounded-full">
                            ✓ 알림 전송됨
                          </span>
                        ) : past ? (
                          <span className="text-xs font-medium bg-gray-100 text-gray-400 px-2.5 py-0.5 rounded-full">
                            지난 일정
                          </span>
                        ) : (
                          <span className="text-xs font-medium bg-orange-100 text-orange-500 px-2.5 py-0.5 rounded-full">
                            대기 중
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-gray-800 truncate">{s.title}</p>
                      <p className="text-sm text-gray-400">{formatDateTime(s.scheduled_at)}</p>
                    </div>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="text-gray-300 hover:text-red-400 transition text-xl leading-none mt-0.5 flex-shrink-0"
                      aria-label="삭제"
                    >
                      ✕
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </main>
  )
}
