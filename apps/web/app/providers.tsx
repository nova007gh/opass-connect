'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '../lib/auth';
import { ThemeProvider } from '../lib/theme';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  );
}
