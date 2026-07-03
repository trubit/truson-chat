import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
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
  Divider,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlined';
import AlternateEmailIcon from '@mui/icons-material/AlternateEmail';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import { AuthLayout } from '../components/AuthLayout';
import { PasswordStrengthIndicator } from '../components/PasswordStrengthIndicator';
import { useRegister } from '../queries';
import { ROUTES } from '@/routes/index';

interface RegisterFormValues {
  username: string;
  email: string;
  displayName: string;
  password: string;
  confirmPassword: string;
  phone: string;
}

function extractErrorMessage(error: unknown): string {
  // Check Axios response body first — AxiosError extends Error so instanceof check must come after
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const axiosError = error as { response?: { data?: { message?: string; error?: string }; status?: number } };
    const msg = axiosError.response?.data?.message ?? axiosError.response?.data?.error;
    if (msg) return msg;
    if (axiosError.response?.status === 409) return 'Username or email is already taken.';
  }
  if (error instanceof Error) return error.message;
  return 'Registration failed. Please try again.';
}

const USERNAME_REGEX = /^[a-zA-Z0-9_.-]+$/;
const PASSWORD_COMPLEXITY =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).+$/;

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const registerMutation = useRegister();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    defaultValues: {
      username: '',
      email: '',
      displayName: '',
      password: '',
      confirmPassword: '',
      phone: '',
    },
  });

  const passwordValue = watch('password');

  const onSubmit = (data: RegisterFormValues) => {
    registerMutation.mutate({
      username: data.username,
      email: data.email,
      displayName: data.displayName,
      password: data.password,
      phone: data.phone || undefined,
    });
  };

  const isLoading = isSubmitting || registerMutation.isPending;

  return (
    <Box data-testid="page-register">
      <AuthLayout
        title="Create account ✨"
        subtitle="Join Truson-Chat — it's free and takes seconds"
      >
        {registerMutation.isError && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {extractErrorMessage(registerMutation.error)}
          </Alert>
        )}

        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
        >
          {/* Name row */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              id="register-display-name"
              label="Display name"
              autoComplete="name"
              autoFocus
              required
              fullWidth
              size="medium"
              error={Boolean(errors.displayName)}
              helperText={errors.displayName?.message}
              disabled={isLoading}
              slotProps={{
                htmlInput: { 'aria-label': 'Display name' },
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonOutlineIcon sx={{ fontSize: 20, color: 'text.disabled' }} />
                    </InputAdornment>
                  ),
                },
              }}
              {...register('displayName', {
                required: 'Display name is required',
                minLength: { value: 1, message: 'Cannot be empty' },
                maxLength: { value: 50, message: 'Max 50 characters' },
                setValueAs: (v: string) => v.trim(),
              })}
            />

            <TextField
              id="register-username"
              label="Username"
              autoComplete="username"
              required
              fullWidth
              size="medium"
              error={Boolean(errors.username)}
              helperText={errors.username?.message ?? ''}
              disabled={isLoading}
              slotProps={{
                htmlInput: { 'aria-label': 'Username' },
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <AlternateEmailIcon sx={{ fontSize: 20, color: 'text.disabled' }} />
                    </InputAdornment>
                  ),
                },
              }}
              {...register('username', {
                required: 'Username is required',
                minLength: { value: 3, message: 'Min 3 characters' },
                maxLength: { value: 30, message: 'Max 30 characters' },
                pattern: {
                  value: USERNAME_REGEX,
                  message: 'Letters, numbers, _ . - only',
                },
              })}
            />
          </Box>

          {/* Email */}
          <TextField
            id="register-email"
            label="Email address"
            type="email"
            autoComplete="email"
            required
            fullWidth
            size="medium"
            error={Boolean(errors.email)}
            helperText={errors.email?.message}
            disabled={isLoading}
            slotProps={{
              htmlInput: { 'aria-label': 'Email address' },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailOutlinedIcon sx={{ fontSize: 20, color: 'text.disabled' }} />
                  </InputAdornment>
                ),
              },
            }}
            {...register('email', {
              required: 'Email is required',
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Enter a valid email address',
              },
            })}
          />

          {/* Password */}
          <Box>
            <TextField
              id="register-password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              fullWidth
              size="medium"
              error={Boolean(errors.password)}
              helperText={errors.password?.message}
              disabled={isLoading}
              slotProps={{
                htmlInput: { 'aria-label': 'Password' },
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

          {/* Confirm password */}
          <TextField
            id="register-confirm-password"
            label="Confirm password"
            type={showConfirm ? 'text' : 'password'}
            autoComplete="new-password"
            required
            fullWidth
            size="medium"
            error={Boolean(errors.confirmPassword)}
            helperText={errors.confirmPassword?.message}
            disabled={isLoading}
            slotProps={{
              htmlInput: { 'aria-label': 'Confirm password' },
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
              required: 'Please confirm your password',
              validate: (value) => value === passwordValue || 'Passwords do not match',
            })}
          />

          {/* Phone (optional) */}
          <TextField
            id="register-phone"
            label="Phone number (optional)"
            type="tel"
            autoComplete="tel"
            fullWidth
            size="medium"
            error={Boolean(errors.phone)}
            helperText={errors.phone?.message}
            disabled={isLoading}
            slotProps={{
              htmlInput: { 'aria-label': 'Phone number' },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <PhoneOutlinedIcon sx={{ fontSize: 20, color: 'text.disabled' }} />
                  </InputAdornment>
                ),
              },
            }}
            {...register('phone', {
              pattern: {
                value: /^\+?[0-9\s\-()]{7,20}$/,
                message: 'Enter a valid phone number',
              },
            })}
          />

          {/* Submit button */}
          <Button
            type="submit"
            variant="contained"
            size="large"
            fullWidth
            disabled={isLoading}
            sx={{
              mt: 0.5,
              py: 1.5,
              fontSize: '0.9375rem',
              fontWeight: 700,
              letterSpacing: '0.02em',
              background: isLoading
                ? undefined
                : 'linear-gradient(135deg, #10C4A0 0%, #0D9E80 100%)',
              boxShadow: '0 4px 20px rgba(16,196,160,0.35)',
              '&:hover': {
                background: 'linear-gradient(135deg, #0D9E80 0%, #0A8068 100%)',
                boxShadow: '0 6px 28px rgba(16,196,160,0.45)',
                transform: 'translateY(-1px)',
              },
              '&:active': { transform: 'translateY(0)' },
            }}
            aria-label="Create account"
          >
            {isLoading ? (
              <CircularProgress size={22} color="inherit" />
            ) : (
              'Create account'
            )}
          </Button>

          <Typography
            variant="caption"
            color="text.disabled"
            sx={{ textAlign: 'center', mt: -1 }}
          >
            By creating an account you agree to our{' '}
            <Link href="#" underline="hover" color="text.secondary">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="#" underline="hover" color="text.secondary">
              Privacy Policy
            </Link>
          </Typography>
        </Box>

        {/* Divider */}
        <Divider sx={{ my: 3 }}>
          <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 600, letterSpacing: '0.08em' }}>
            OR
          </Typography>
        </Divider>

        {/* Login CTA */}
        <Box
          sx={{
            py: 2,
            px: 3,
            borderRadius: 3,
            bgcolor: 'action.hover',
            textAlign: 'center',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Already have an account?{' '}
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
