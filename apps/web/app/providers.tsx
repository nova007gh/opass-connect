'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '../lib/auth';
import { ThemeProvider } from '../lib/theme';
import { CallProvider } from '../components/CallProvider';
import FloatingCallWidget from '../components/FloatingCallWidget';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CallProvider>
          {children}
          <FloatingCallWidget />
        </CallProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
