console.log('[SW] firebase-messaging-sw.js 로드됨')

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js')

console.log('[SW] Firebase 스크립트 로드 완료')

firebase.initializeApp({
  apiKey: 'AIzaSyBQAX01QHZdYx21Nr3O64MPBmqQjhxQgbc',
  authDomain: 'nocuts-project.firebaseapp.com',
  projectId: 'nocuts-project',
  storageBucket: 'nocuts-project.firebasestorage.app',
  messagingSenderId: '296484753414',
  appId: '1:296484753414:web:414f1662cc03e13cf1b387',
})

console.log('[SW] Firebase 초기화 완료')

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  console.log('[SW] 백그라운드 메시지 수신:', JSON.stringify(payload))

  const title = payload.notification?.title || '새 알림'
  const body = payload.notification?.body || ''

  self.registration.showNotification(title, {
    body,
    icon: '/icon-192x192.png',
    tag: payload.data?.schedule_id || 'default',
  })

  console.log('[SW] showNotification 호출 완료:', title, body)
})

self.addEventListener('install', (event) => {
  console.log('[SW] install 이벤트')
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('[SW] activate 이벤트')
  event.waitUntil(clients.claim())
})

self.addEventListener('push', (event) => {
  console.log('[SW] push 이벤트 수신 (raw):', event.data?.text())
})
