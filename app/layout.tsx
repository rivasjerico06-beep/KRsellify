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
  title: 'KRSELLIFY — Premium Collectibles & Rare Finds',
  description: 'Handpicked limited-edition pieces. Authentic, verified, and ready to own.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
          crossOrigin="anonymous"
        />
      </head>
      <body className={`${dmSans.variable} ${playfair.variable} ${cormorant.variable}`}>
        <ScrollProgress />
        <Providers>
          {children}
          <AgentAssistButton />
        </Providers>
      </body>
    </html>
  )
}
