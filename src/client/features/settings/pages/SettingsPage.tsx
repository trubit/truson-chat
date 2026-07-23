import { useState, type SyntheticEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Paper,
  Button,
  Alert,
  CircularProgress,
  TextField,
  Divider,
  Switch,
  FormControlLabel,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import NotificationsIcon from '@mui/icons-material/Notifications';
import LockIcon from '@mui/icons-material/Lock';
import SecurityIcon from '@mui/icons-material/Security';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { ROUTES } from '@/routes/index';
import { useChangePassword } from '@/features/auth/queries';
import { useGetPreferences, useUpdatePreferences } from '@/features/profile/queries';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/store/authStore';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `settings-tab-${index}`,
    'aria-controls': `settings-tabpanel-${index}`,
  };
}

// ---------------------------------------------------------------------------
// Change Password sub-section
// ---------------------------------------------------------------------------

interface ChangePasswordValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

function ChangePasswordSection() {
  const changePassword = useChangePassword();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const newPasswordValue = watch('newPassword');

  const onSubmit = (data: ChangePasswordValues) => {
    changePassword.mutate(
      { currentPassword: data.currentPassword, newPassword: data.newPassword },
      { onSuccess: () => reset() },
    );
  };

  const handleFormSubmit = handleSubmit(onSubmit);
  const isLoading = isSubmitting || changePassword.isPending;

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
        Change password
      </Typography>
      {changePassword.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {changePassword.error instanceof Error
            ? changePassword.error.message
            : 'Failed to change password.'}
        </Alert>
      )}
      {changePassword.isSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Password changed successfully.
        </Alert>
      )}
      <Box
        component="form"
        onSubmit={handleFormSubmit}
        noValidate
        sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 420 }}
      >
        <TextField
          label="Current password"
          type="password"
          required
          fullWidth
          error={Boolean(errors.currentPassword)}
          helperText={errors.currentPassword?.message}
          disabled={isLoading}
          slotProps={{ htmlInput: { 'aria-label': 'Current password' } }}
          {...register('currentPassword', {
            required: 'Current password is required',
          })}
        />
        <TextField
          label="New password"
          type="password"
          required
          fullWidth
          error={Boolean(errors.newPassword)}
          helperText={errors.newPassword?.message}
          disabled={isLoading}
          slotProps={{ htmlInput: { 'aria-label': 'New password' } }}
          {...register('newPassword', {
            required: 'New password is required',
            minLength: { value: 8, message: 'Minimum 8 characters' },
            maxLength: { value: 128, message: 'Maximum 128 characters' },
          })}
        />
        <TextField
          label="Confirm new password"
          type="password"
          required
          fullWidth
          error={Boolean(errors.confirmPassword)}
          helperText={errors.confirmPassword?.message}
          disabled={isLoading}
          slotProps={{ htmlInput: { 'aria-label': 'Confirm new password' } }}
          {...register('confirmPassword', {
            required: 'Please confirm your new password',
            validate: (v) => v === newPasswordValue || 'Passwords do not match',
          })}
        />
        <Button
          type="submit"
          variant="contained"
          disabled={isLoading}
          sx={{ alignSelf: 'flex-start', minWidth: 160 }}
        >
          {isLoading ? <CircularProgress size={20} color="inherit" /> : 'Change password'}
        </Button>
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Notifications sub-section
// ---------------------------------------------------------------------------

function NotificationsSection() {
  const { data: preferences, isLoading } = useGetPreferences();
  const updatePreferences = useUpdatePreferences();

  const notifs = preferences?.notifications ?? {};

  const handleToggle = (key: string, value: boolean) => {
    updatePreferences.mutate({
      notifications: { ...notifs, [key]: value },
    });
  };

  const items: Array<{ key: string; label: string; description: string }> = [
    {
      key: 'messages',
      label: 'New messages',
      description: 'Get notified when you receive a message',
    },
    { key: 'mentions', label: 'Mentions', description: 'Get notified when someone mentions you' },
    { key: 'calls', label: 'Calls', description: 'Get notified for incoming calls' },
    {
      key: 'systemUpdates',
      label: 'System updates',
      description: 'Important updates about your account',
    },
  ];

  if (isLoading) {
    return <CircularProgress />;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
        Notification preferences
      </Typography>
      {items.map(({ key, label, description }) => (
        <Box
          key={key}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            py: 1,
          }}
        >
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {label}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {description}
            </Typography>
          </Box>
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(notifs[key])}
                onChange={(e) => handleToggle(key, e.target.checked)}
                disabled={updatePreferences.isPending}
                size="small"
                aria-label={label}
              />
            }
            label=""
            sx={{ mr: 0 }}
          />
        </Box>
      ))}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Main SettingsPage
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (_: SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const tabs = [
    { label: 'Profile', icon: <PersonIcon /> },
    { label: 'Notifications', icon: <NotificationsIcon /> },
    { label: 'Privacy', icon: <LockIcon /> },
    { label: 'Security', icon: <SecurityIcon /> },
    { label: 'Account', icon: <AccountCircleIcon /> },
  ];

  return (
    <Box data-testid="page-settings" sx={{ maxWidth: 800, mx: 'auto', p: { xs: 1, sm: 2 } }}>
      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ p: { xs: 2, sm: 3 }, pb: 0 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
            Settings
          </Typography>
        </Box>

        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="Settings sections"
          sx={{ px: { xs: 2, sm: 3 }, borderBottom: 1, borderColor: 'divider' }}
        >
          {tabs.map((tab, idx) => (
            <Tab
              key={tab.label}
              label={tab.label}
              icon={tab.icon}
              iconPosition="start"
              {...a11yProps(idx)}
              sx={{ minHeight: 48, textTransform: 'none', fontWeight: 500 }}
            />
          ))}
        </Tabs>

        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          {/* Profile tab */}
          <TabPanel value={activeTab} index={0}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Manage your public profile information, avatar, and cover image.
            </Typography>
            <Button variant="contained" onClick={() => navigate('/settings/profile')}>
              Edit profile
            </Button>
          </TabPanel>

          {/* Notifications tab */}
          <TabPanel value={activeTab} index={1}>
            <NotificationsSection />
          </TabPanel>

          {/* Privacy tab */}
          <TabPanel value={activeTab} index={2}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Control who can see your information and how you appear to others.
            </Typography>
            <Button variant="contained" onClick={() => navigate(ROUTES.SETTINGS_PRIVACY)}>
              Manage privacy settings
            </Button>
          </TabPanel>

          {/* Security tab */}
          <TabPanel value={activeTab} index={3}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              View active sessions, trusted devices, and recent security events.
            </Typography>
            <Button variant="contained" onClick={() => navigate(ROUTES.SETTINGS_SECURITY)}>
              View security center
            </Button>
            <Divider sx={{ my: 3 }} />
            <ChangePasswordSection />
          </TabPanel>

          {/* Account tab */}
          <TabPanel value={activeTab} index={4}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
              Account actions
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 400 }}>
              <Button
                variant="outlined"
                color="error"
                onClick={() => {
                  logout();
                  navigate(ROUTES.LOGIN, { replace: true });
                }}
              >
                Sign out of this device
              </Button>
              <Typography variant="caption" color="text.secondary">
                To permanently delete your account, please contact support.
              </Typography>
            </Box>
          </TabPanel>
        </Box>
      </Paper>
    </Box>
  );
}
