import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'MD Price Tracker',
  description: 'Track prices of your favorite products',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16', type: 'image/x-icon' },
      { url: '/icon.png', sizes: '32x32', type: 'image/png' }
    ]
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="16x16" />
        <link rel="icon" href="/icon.png" sizes="32x32" type="image/png" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
