import { Instrument_Serif, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import PingTracker from './components/PingTracker';
import PageTransition from './components/ui/PageTransition';

const instrumentSerif = Instrument_Serif({
  variable: '--font-instrument-serif',
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  display: 'swap',
});

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const jbMono = JetBrains_Mono({
  variable: '--font-jb-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
});

export const metadata = {
  title: 'Migrova — visas, relocation, and legal guidance',
  description: 'General information about visas, relocation, and finding immigration legal help — built for immigrant families. Information, not legal advice.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${instrumentSerif.variable} ${inter.variable} ${jbMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-paper-bg text-paper-ink">
        <PageTransition />
        <PingTracker />
        {children}
      </body>
    </html>
  );
}
