import './globals.css';
import Providers from './providers';

export const metadata = {
  title: 'OPASS CONNECT — Ofori Panin Senior High School Alumni',
  description: 'One School. One Network. One Legacy. The official OPASS alumni platform.',
  icons: { icon: '/opass-crest.jpeg', apple: '/opass-crest.jpeg' },
};

const themeScript = `(function(){try{var t=localStorage.getItem('opass-theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
