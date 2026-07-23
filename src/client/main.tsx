import './storeMigration'; // must be first — migrates localStorage keys before stores hydrate
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import { AppProviders } from './providers';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';

const root = document.getElementById('root');
if (!root) {
  throw new Error('Root element #root not found. Check your index.html.');
}

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <AppProviders>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 500,
              boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            },
            success: {
              iconTheme: { primary: '#198754', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: '#dc3545', secondary: '#fff' },
            },
          }}
        />
      </AppProviders>
    </ErrorBoundary>
  </StrictMode>,
);
