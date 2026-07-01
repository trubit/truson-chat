import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, Button, CircularProgress } from '@mui/material';
import { ROUTES } from './routes/index';
import { AuthGuard } from './guards/index';
import { GuestGuard } from './guards/index';
import { AuthInitializer } from './components/AuthInitializer';
import { useLogout } from './features/auth/queries';

// ---------------------------------------------------------------------------
// Lazy-loaded pages
// ---------------------------------------------------------------------------

const LoginPage = lazy(
  () => import('./features/auth/pages/LoginPage'),
);
const RegisterPage = lazy(
  () => import('./features/auth/pages/RegisterPage'),
);
const ForgotPasswordPage = lazy(
  () => import('./features/auth/pages/ForgotPasswordPage'),
);
const ResetPasswordPage = lazy(
  () => import('./features/auth/pages/ResetPasswordPage'),
);
const VerifyEmailPage = lazy(
  () => import('./features/auth/pages/VerifyEmailPage'),
);
const VerifyPhonePage = lazy(
  () => import('./features/auth/pages/VerifyPhonePage'),
);
const ProfilePage = lazy(
  () => import('./features/profile/pages/ProfilePage'),
);
const EditProfilePage = lazy(
  () => import('./features/profile/pages/EditProfilePage'),
);
const PrivacySettingsPage = lazy(
  () => import('./features/profile/pages/PrivacySettingsPage'),
);
const SettingsPage = lazy(
  () => import('./features/settings/pages/SettingsPage'),
);
const SecurityPage = lazy(
  () => import('./features/security/pages/SecurityPage'),
);

// ---------------------------------------------------------------------------
// Placeholder pages for Phase 4 (chat)
// ---------------------------------------------------------------------------

function ChatLayout() {
  const logout = useLogout();
  return (
    <Box data-testid="page-chat" sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <span>Chat — Phase 4</span>
        <Button
          variant="outlined"
          size="small"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
        >
          {logout.isPending ? 'Logging out…' : 'Logout'}
        </Button>
      </Box>
    </Box>
  );
}

function NotFoundPage() {
  return (
    <div data-testid="page-not-found" style={{ padding: 32, textAlign: 'center' }}>
      <h2>404 — Page Not Found</h2>
      <p>The page you requested does not exist.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading fallback
// ---------------------------------------------------------------------------

function PageLoading() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <CircularProgress />
    </Box>
  );
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export default function App() {
  return (
    <AuthInitializer>
      <Suspense fallback={<PageLoading />}>
        <Routes>
        {/* Root redirect */}
        <Route
          path={ROUTES.ROOT}
          element={<Navigate to={ROUTES.CHAT} replace />}
        />

        {/* Guest-only routes (redirect authenticated users to chat) */}
        <Route element={<GuestGuard />}>
          <Route path={ROUTES.LOGIN} element={<LoginPage />} />
          <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
          <Route
            path={ROUTES.FORGOT_PASSWORD}
            element={<ForgotPasswordPage />}
          />
        </Route>

        {/* Public routes (accessible regardless of auth state) */}
        <Route
          path={ROUTES.RESET_PASSWORD}
          element={<ResetPasswordPage />}
        />
        <Route path={ROUTES.VERIFY_EMAIL} element={<VerifyEmailPage />} />

        {/* Protected routes */}
        <Route element={<AuthGuard />}>
          <Route path={ROUTES.CHAT} element={<ChatLayout />} />
          <Route path={ROUTES.CHAT_CONVERSATION} element={<ChatLayout />} />
          <Route path={ROUTES.PROFILE} element={<ProfilePage />} />
          <Route
            path={ROUTES.PROFILE_EDIT}
            element={<EditProfilePage />}
          />
          <Route
            path={ROUTES.SETTINGS_PRIVACY}
            element={<PrivacySettingsPage />}
          />
          <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
          <Route
            path={ROUTES.SETTINGS_SECURITY}
            element={<SecurityPage />}
          />
          <Route path={ROUTES.VERIFY_PHONE} element={<VerifyPhonePage />} />
        </Route>

        {/* 404 */}
        <Route path={ROUTES.NOT_FOUND} element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AuthInitializer>
  );
}
