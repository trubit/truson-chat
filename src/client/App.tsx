import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { ROUTES } from './routes/index';
import { AuthGuard } from './guards/index';
import { GuestGuard } from './guards/index';
import { AdminGuard } from './guards/AdminGuard';
import { AuthInitializer } from './components/AuthInitializer';
import AppLayout from './components/AppLayout';
import AdminLayout from './components/AdminLayout';

// ---------------------------------------------------------------------------
// Lazy-loaded pages — auth
// ---------------------------------------------------------------------------

const LoginPage = lazy(() => import('./features/auth/pages/LoginPage'));
const RegisterPage = lazy(() => import('./features/auth/pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./features/auth/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./features/auth/pages/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('./features/auth/pages/VerifyEmailPage'));
const VerifyPhonePage = lazy(() => import('./features/auth/pages/VerifyPhonePage'));

// ---------------------------------------------------------------------------
// Lazy-loaded pages — profile / settings
// ---------------------------------------------------------------------------

const ProfilePage = lazy(() => import('./features/profile/pages/ProfilePage'));
const EditProfilePage = lazy(() => import('./features/profile/pages/EditProfilePage'));
const PrivacySettingsPage = lazy(() => import('./features/profile/pages/PrivacySettingsPage'));
const SettingsPage = lazy(() => import('./features/settings/pages/SettingsPage'));
const SecurityPage = lazy(() => import('./features/security/pages/SecurityPage'));

// ---------------------------------------------------------------------------
// Lazy-loaded pages — Phase 4 social
// ---------------------------------------------------------------------------

const ContactsPage = lazy(() => import('./features/contacts/pages/ContactsPage'));
const FriendsPage = lazy(() => import('./features/friends/pages/FriendsPage'));
const DiscoveryPage = lazy(() => import('./features/discovery/pages/DiscoveryPage'));
const BlockingPage = lazy(() => import('./features/blocking/pages/BlockingPage'));
const PrivacyPage = lazy(() => import('./features/privacy/pages/PrivacyPage'));

// ---------------------------------------------------------------------------
// Lazy-loaded pages — admin
// ---------------------------------------------------------------------------

const AdminDashboard = lazy(() => import('./features/admin/pages/AdminDashboard'));
const AdminUsers = lazy(() => import('./features/admin/pages/AdminUsers'));
const AdminSystem = lazy(() => import('./features/admin/pages/AdminSystem'));

// ---------------------------------------------------------------------------
// Chat (Phase 5 real-time messaging)
// ---------------------------------------------------------------------------

const ChatPage = lazy(() => import('./features/chat/pages/ChatPage'));
const GroupChatPage = lazy(() => import('./features/groups/pages/GroupChatPage'));

// ---------------------------------------------------------------------------
// Phase 7 — Groups & Communities
// ---------------------------------------------------------------------------

const GroupsPage = lazy(() => import('./features/groups/pages/GroupsPage'));
const CommunitiesPage = lazy(() => import('./features/groups/pages/CommunitiesPage'));

function NotFoundPage() {
  return (
    <div data-testid="page-not-found" style={{ padding: 32, textAlign: 'center' }}>
      <h2>404 — Page Not Found</h2>
      <p>The page you requested does not exist.</p>
    </div>
  );
}

function PageLoading() {
  return (
    <Box
      sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}
    >
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
          <Route path={ROUTES.ROOT} element={<Navigate to={ROUTES.CHAT} replace />} />

          {/* Guest-only routes */}
          <Route element={<GuestGuard />}>
            <Route path={ROUTES.LOGIN} element={<LoginPage />} />
            <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
            <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
          </Route>

          {/* Public routes */}
          <Route path={ROUTES.RESET_PASSWORD} element={<ResetPasswordPage />} />
          <Route path={ROUTES.VERIFY_EMAIL} element={<VerifyEmailPage />} />

          {/* Protected routes — wrapped in AppLayout (sidebar + outlet) */}
          <Route element={<AuthGuard />}>
            <Route element={<AppLayout />}>
              {/* Chat */}
              <Route path={ROUTES.CHAT} element={<ChatPage />} />
              <Route path={ROUTES.CHAT_CONVERSATION} element={<ChatPage />} />
              <Route path={ROUTES.CHAT_GROUP} element={<GroupChatPage />} />

              {/* Phase 7 — Groups & Communities */}
              <Route path={ROUTES.GROUPS} element={<GroupsPage />} />
              <Route path={ROUTES.GROUP} element={<GroupsPage />} />
              <Route path={ROUTES.COMMUNITIES} element={<CommunitiesPage />} />
              <Route path={ROUTES.COMMUNITY} element={<CommunitiesPage />} />

              {/* Phase 4 — social */}
              <Route path={ROUTES.CONTACTS} element={<ContactsPage />} />
              <Route path={ROUTES.FRIENDS} element={<FriendsPage />} />
              <Route path={ROUTES.DISCOVERY} element={<DiscoveryPage />} />
              <Route path={ROUTES.BLOCKING} element={<BlockingPage />} />
              <Route path={ROUTES.PRIVACY_SETTINGS} element={<PrivacyPage />} />

              {/* Profile & settings */}
              <Route path={ROUTES.PROFILE} element={<ProfilePage />} />
              <Route path={ROUTES.PROFILE_EDIT} element={<EditProfilePage />} />
              <Route path={ROUTES.SETTINGS_PRIVACY} element={<PrivacySettingsPage />} />
              <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
              <Route path={ROUTES.SETTINGS_SECURITY} element={<SecurityPage />} />
              <Route path={ROUTES.VERIFY_PHONE} element={<VerifyPhonePage />} />
            </Route>
          </Route>

          {/* Admin routes — requires admin role */}
          <Route element={<AdminGuard />}>
            <Route element={<AdminLayout />}>
              <Route path={ROUTES.ADMIN} element={<AdminDashboard />} />
              <Route path={ROUTES.ADMIN_USERS} element={<AdminUsers />} />
              <Route path={ROUTES.ADMIN_SYSTEM} element={<AdminSystem />} />
            </Route>
          </Route>

          {/* 404 */}
          <Route path={ROUTES.NOT_FOUND} element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AuthInitializer>
  );
}
