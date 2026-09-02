import './globals.css';
import Providers from './providers';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'OPASS CONNECT — Ofori Panin Senior High School Alumni',
  description: 'One School. One Network. One Legacy. The official OPASS alumni platform.',
  applicationName: 'OPASS CONNECT',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'OPASS CONNECT',
  },
  formatDetection: {
    telephone: false,
  },
  icons: { icon: '/opass-crest.jpeg', apple: '/opass-crest.jpeg', shortcut: '/opass-crest.jpeg' },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0B2D6B',
};

const themeScript = `(function(){try{var t=localStorage.getItem('opass-theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head suppressHydrationWarning>
        <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
