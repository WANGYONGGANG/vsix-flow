import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '主力资金流向',
  description: 'A股主力资金流向可视化',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="dark" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
