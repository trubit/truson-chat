import { useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  TextField,
  Button,
  Alert,
  CircularProgress,
  Box,
  Typography,
  InputAdornment,
  IconButton,
  Link,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { AuthLayout } from '../components/AuthLayout';
import { PasswordStrengthIndicator } from '../components/PasswordStrengthIndicator';
import { useResetPassword } from '../queries';
import { ROUTES } from '@/routes/index';

interface ResetPasswordFormValues {
  password: string;
  confirmPassword: string;
}

const PASSWORD_COMPLEXITY =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).+$/;

function extractErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const axiosError = error as { response?: { data?: { message?: string; error?: string } } };
    const msg = axiosError.response?.data?.message ?? axiosError.response?.data?.error;
    if (msg) return msg;
  }
  if (error instanceof Error) return error.message;
  return 'Failed to reset password. The link may have expired.';
}

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const resetPasswordMutation = useResetPassword();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    defaultValues: { password: '', confirmPassword: '' },
  });

  const passwordValue = watch('password');

  const onSubmit = (data: ResetPasswordFormValues) => {
    if (!token) return;
    resetPasswordMutation.mutate({ token, password: data.password });
  };

  if (!token) {
    return (
      <Box data-testid="page-reset-password">
        <AuthLayout title="Invalid link">
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            This password reset link is invalid or missing. Please request a new one.
          </Alert>
          <Button
            component={RouterLink}
            to={ROUTES.FORGOT_PASSWORD}
            variant="contained"
            fullWidth
            sx={{
              py: 1.5,
              fontWeight: 700,
              background: 'linear-gradient(135deg, #6c63ff 0%, #5a52d5 100%)',
            }}
          >
            Request new link
          </Button>
        </AuthLayout>
      </Box>
    );
  }

  const isLoading = isSubmitting || resetPasswordMutation.isPending;

  return (
    <Box data-testid="page-reset-password">
      <AuthLayout
        title="Set new password 🔒"
        subtitle="Choose a strong password for your account"
      >
        {resetPasswordMutation.isError && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {extractErrorMessage(resetPasswordMutation.error)}
          </Alert>
        )}

        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
        >
          <Box>
            <TextField
              id="reset-password"
              label="New password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              autoFocus
              required
              fullWidth
              size="medium"
              error={Boolean(errors.password)}
              helperText={errors.password?.message}
              disabled={isLoading}
              slotProps={{
                htmlInput: { 'aria-label': 'New password' },
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon sx={{ fontSize: 20, color: 'text.disabled' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword((v) => !v)}
                        edge="end"
                        tabIndex={-1}
                        size="small"
                      >
                        {showPassword ? (
                          <VisibilityOffIcon sx={{ fontSize: 20 }} />
                        ) : (
                          <VisibilityIcon sx={{ fontSize: 20 }} />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'At least 8 characters' },
                maxLength: { value: 128, message: 'Max 128 characters' },
                validate: (value) =>
                  PASSWORD_COMPLEXITY.test(value) ||
                  'Must include uppercase, lowercase, number and special character',
              })}
            />
            <PasswordStrengthIndicator password={passwordValue} />
          </Box>

          <TextField
            id="reset-confirm-password"
            label="Confirm new password"
            type={showConfirm ? 'text' : 'password'}
            autoComplete="new-password"
            required
            fullWidth
            size="medium"
            error={Boolean(errors.confirmPassword)}
            helperText={errors.confirmPassword?.message}
            disabled={isLoading}
            slotProps={{
              htmlInput: { 'aria-label': 'Confirm new password' },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlinedIcon sx={{ fontSize: 20, color: 'text.disabled' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                      onClick={() => setShowConfirm((v) => !v)}
                      edge="end"
                      tabIndex={-1}
                      size="small"
                    >
                      {showConfirm ? (
                        <VisibilityOffIcon sx={{ fontSize: 20 }} />
                      ) : (
                        <VisibilityIcon sx={{ fontSize: 20 }} />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
            {...register('confirmPassword', {
              required: 'Please confirm your new password',
              validate: (value) => value === passwordValue || 'Passwords do not match',
            })}
          />

          <Button
            type="submit"
            variant="contained"
            size="large"
            fullWidth
            disabled={isLoading}
            sx={{
              mt: 0.5,
              py: 1.5,
              fontWeight: 700,
              background: isLoading
                ? undefined
                : 'linear-gradient(135deg, #6c63ff 0%, #5a52d5 100%)',
              boxShadow: '0 4px 20px rgba(108,99,255,0.35)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a52d5 0%, #4a42c5 100%)',
                boxShadow: '0 6px 28px rgba(108,99,255,0.45)',
                transform: 'translateY(-1px)',
              },
            }}
          >
            {isLoading ? (
              <CircularProgress size={22} color="inherit" />
            ) : (
              'Reset password'
            )}
          </Button>
        </Box>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Remember your password?{' '}
            <Link
              component={RouterLink}
              to={ROUTES.LOGIN}
              underline="hover"
              sx={{ fontWeight: 700, color: 'primary.main' }}
            >
              Sign in
            </Link>
          </Typography>
        </Box>
      </AuthLayout>
    </Box>
  );
}
