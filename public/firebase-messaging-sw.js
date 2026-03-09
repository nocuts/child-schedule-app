// Firebase Messaging Service Worker
// 서비스 워커는 process.env에 접근할 수 없으므로 NEXT_PUBLIC_ 값을 직접 사용합니다.
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyBQAX01QHZdYx21Nr3O64MPBmqQjhxQgbc',
  authDomain: 'nocuts-project.firebaseapp.com',
  projectId: 'nocuts-project',
  storageBucket: 'nocuts-project.firebasestorage.app',
  messagingSenderId: '296484753414',
  appId: '1:296484753414:web:414f1662cc03e13cf1b387',
})

const messaging = firebase.messaging()

// 백그라운드 메시지 수신 처리
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || '새 알림'
  const body = payload.notification?.body || ''

  self.registration.showNotification(title, {
    body,
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: payload.data?.schedule_id || 'default',
  })
})
