import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Whisper // Polymarket Intelligence',
  description: 'Real-time Twitter monitoring with AI analysis and Polymarket correlation',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background-light dark:bg-background-dark text-[#111418] dark:text-white font-display overflow-hidden flex flex-col h-screen">
        {children}
      </body>
    </html>
  )
}

