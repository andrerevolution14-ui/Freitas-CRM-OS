import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#eaedf2' },
    { media: '(prefers-color-scheme: light)', color: '#eaedf2' },
  ],
}

export const metadata: Metadata = {
  title: {
    default: 'Freitas OS — Gestão de Obras',
    template: '%s | Freitas OS',
  },
  description: 'Sistema integrado de gestão de obras, CRM e subempreiteiros para a Freitas Renovações.',
  applicationName: 'Freitas OS',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Freitas OS',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt" suppressHydrationWarning data-scroll-behavior="smooth" className="overflow-x-hidden w-full max-w-full bg-[#eaedf2]">
      <body className={`${inter.variable} font-sans antialiased overflow-x-hidden w-full max-w-full bg-[#eaedf2] text-slate-900 select-none md:select-auto`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
