import type { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryProvider } from './QueryProvider';
import { AppThemeProvider } from './ThemeProvider';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryProvider>
      <AppThemeProvider>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </AppThemeProvider>
    </QueryProvider>
  );
}
