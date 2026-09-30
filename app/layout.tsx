import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { HubEmbedFlag } from '@/components/shared/HubEmbedFlag'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })

export const metadata: Metadata = {
  title: 'Pipee | Pipeline Management',
  description: 'Pipee — Pipeline Management Tool by Krontiva',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`} suppressHydrationWarning>
      <body className="h-full bg-slate-50 text-gray-900 antialiased">
        <HubEmbedFlag />
        {children}
      </body>
    </html>
  )
}
