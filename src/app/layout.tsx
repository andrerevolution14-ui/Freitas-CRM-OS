import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  title: 'Freitas OS — Gestão de Obras',
  description: 'Sistema integrado de gestão de obras, CRM e subempreiteiros para a Freitas Renovações.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt" suppressHydrationWarning className="overflow-x-hidden w-full max-w-full">
      <body className={`${inter.variable} font-sans antialiased overflow-x-hidden w-full max-w-full bg-[#07090e] text-slate-100`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
