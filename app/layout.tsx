import type { Metadata } from 'next'
import { Playfair_Display, DM_Sans, Cormorant_Garamond } from 'next/font/google'
import Providers from '@/components/Providers'
import ScrollProgress from '@/components/ScrollProgress'
import AgentAssistButton from '@/components/AgentAssistButton'
import './globals.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['700', '900'],
  variable: '--font-playfair',
})

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
})

export const metadata: Metadata = {
  title: 'The Maga — Premium Collectibles & Patriot Merchandise',
  description: 'Authentic limited-edition patriot collectibles. Verified, premium quality, and ready to own.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Anti-flash: set theme before React hydrates */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('kr-theme');var d=t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.setAttribute('data-theme',d?'dark':'light');}catch(e){}})();` }} />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
          crossOrigin="anonymous"
        />
      </head>
      <body className={`${dmSans.variable} ${playfair.variable} ${cormorant.variable}`}>
        {/* Ambient background blobs — fixed layer behind all content */}
        <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none', overflow: 'hidden' }}>
          <div className="bg-blob-1" />
          <div className="bg-blob-2" />
          <div className="bg-blob-3" />
        </div>
        <ScrollProgress />
        <Providers>
          {children}
          <AgentAssistButton />
        </Providers>
      </body>
    </html>
  )
}
