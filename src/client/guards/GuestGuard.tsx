import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { ROUTES } from '@/routes/index';

export function GuestGuard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to={ROUTES.CHAT} replace />;
  }

  return <Outlet />;
}
