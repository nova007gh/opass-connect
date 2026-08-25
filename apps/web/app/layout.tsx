import './globals.css';
import Providers from './providers';

export const metadata = {
  title: 'OPASS CONNECT — Ofori Panin Senior High School Alumni',
  description: 'One School. One Network. One Legacy. The official OPASS alumni platform.',
  icons: { icon: '/opass-crest.jpeg', apple: '/opass-crest.jpeg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
