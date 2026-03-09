import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '자녀 일정 알리미',
  description: '자녀의 할 일과 일정을 등록하고 푸시 알림을 보내세요.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  )
}
