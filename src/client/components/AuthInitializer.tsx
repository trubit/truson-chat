import { useEffect } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/services/api';

function FullPageSpinner() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <CircularProgress />
    </Box>
  );
}

interface Props {
  children: React.ReactNode;
}

export function AuthInitializer({ children }: Props) {
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const setInitialized = useAuthStore((s) => s.setInitialized);

  useEffect(() => {
    const { isAuthenticated, logout } = useAuthStore.getState();

    if (!isAuthenticated) {
      setInitialized(true);
      return;
    }

    // Validate the persisted session against the server.
    // The Axios interceptor will attempt a token refresh on 401 before this
    // catch fires; if refresh also fails it calls logout() automatically.
    api
      .get('/auth/me')
      .then(() => setInitialized(true))
      .catch(() => {
        logout();
        setInitialized(true);
      });
  }, []); // intentionally empty — run once on mount only

  if (!isInitialized) {
    return <FullPageSpinner />;
  }

  return <>{children}</>;
}
