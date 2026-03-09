import admin from 'firebase-admin'

// Next.js 핫 리로드 시 중복 초기화 방지
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // 환경변수에서 줄바꿈 이스케이프 처리
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

export const firebaseAdmin = admin
export const messaging = admin.messaging()
