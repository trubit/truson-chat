import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
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
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { AuthLayout } from '../components/AuthLayout';
import { useLogin } from '../queries';
import { ROUTES } from '@/routes/index';

interface LoginFormValues {
  email: string;
  password: string;
  rememberMe: boolean;
}

function extractErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const axiosError = error as { response?: { data?: { message?: string; error?: string } } };
    const msg = axiosError.response?.data?.message ?? axiosError.response?.data?.error;
    if (msg) return msg;
  }
  if (error instanceof Error) return error.message;
  return 'Login failed. Please try again.';
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const loginMutation = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const onSubmit = (data: LoginFormValues) => {
    loginMutation.mutate({
      email: data.email,
      password: data.password,
      rememberMe: data.rememberMe,
    });
  };

  const isLoading = isSubmitting || loginMutation.isPending;

  return (
    <Box data-testid="page-login">
      <AuthLayout title="Welcome back 👋" subtitle="Sign in to continue to Linkora">
        {loginMutation.isError && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {extractErrorMessage(loginMutation.error)}
          </Alert>
        )}

        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
        >
          <TextField
            id="login-email"
            label="Email address"
            type="email"
            autoComplete="email"
            autoFocus
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

          <TextField
            id="login-password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
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
            })}
          />

          {/* Remember me + forgot password */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mt: -0.5,
            }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  id="login-remember-me"
                  size="small"
                  sx={{ color: 'text.disabled' }}
                  {...register('rememberMe')}
                />
              }
              label={
                <Typography variant="body2" color="text.secondary">
                  Remember me
                </Typography>
              }
            />
            <Link
              component={RouterLink}
              to={ROUTES.FORGOT_PASSWORD}
              variant="body2"
              underline="hover"
              sx={{ fontWeight: 600, color: 'primary.main' }}
            >
              Forgot password?
            </Link>
          </Box>

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
            aria-label="Sign in"
          >
            {isLoading ? <CircularProgress size={22} color="inherit" /> : 'Sign in'}
          </Button>
        </Box>

        {/* Divider */}
        <Divider sx={{ my: 3 }}>
          <Typography
            variant="caption"
            color="text.disabled"
            sx={{ fontWeight: 600, letterSpacing: '0.08em' }}
          >
            OR
          </Typography>
        </Divider>

        {/* Register CTA */}
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
            Don&apos;t have an account?{' '}
            <Link
              component={RouterLink}
              to={ROUTES.REGISTER}
              underline="hover"
              sx={{ fontWeight: 700, color: 'primary.main' }}
            >
              Create one for free
            </Link>
          </Typography>
        </Box>
      </AuthLayout>
    </Box>
  );
}
