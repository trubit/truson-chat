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
  Link,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import { AuthLayout } from '../components/AuthLayout';
import { useForgotPassword } from '../queries';
import { ROUTES } from '@/routes/index';

interface ForgotPasswordFormValues {
  email: string;
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const axiosError = error as { response?: { data?: { message?: string; error?: string } } };
    return (
      axiosError.response?.data?.message ??
      axiosError.response?.data?.error ??
      'Something went wrong. Please try again.'
    );
  }
  return 'Something went wrong. Please try again.';
}

export default function ForgotPasswordPage() {
  const forgotPasswordMutation = useForgotPassword();

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    defaultValues: { email: '' },
  });

  const onSubmit = (data: ForgotPasswordFormValues) => {
    forgotPasswordMutation.mutate({ email: data.email });
  };

  const isLoading = isSubmitting || forgotPasswordMutation.isPending;

  if (forgotPasswordMutation.isSuccess) {
    return (
      <Box data-testid="page-forgot-password">
        <AuthLayout
          title="Check your inbox 📬"
          subtitle={`We sent a reset link to ${getValues('email')}`}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              py: 2,
            }}
          >
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: 'success.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 0 16px rgba(25,135,84,0.1)',
              }}
            >
              <CheckCircleOutlineIcon sx={{ fontSize: 40, color: '#fff' }} />
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', lineHeight: 1.8 }}>
              If an account exists for that email, you will receive a password reset
              link shortly. Check your spam folder if you don&apos;t see it.
            </Typography>

            <Button
              component={RouterLink}
              to={ROUTES.LOGIN}
              variant="contained"
              startIcon={<ArrowBackIcon />}
              fullWidth
              sx={{
                py: 1.5,
                fontWeight: 700,
                background: 'linear-gradient(135deg, #6c63ff 0%, #5a52d5 100%)',
                boxShadow: '0 4px 20px rgba(108,99,255,0.35)',
              }}
            >
              Back to sign in
            </Button>
          </Box>
        </AuthLayout>
      </Box>
    );
  }

  return (
    <Box data-testid="page-forgot-password">
      <AuthLayout
        title="Forgot password? 🔐"
        subtitle="Enter your email and we'll send you a reset link"
      >
        {forgotPasswordMutation.isError && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {extractErrorMessage(forgotPasswordMutation.error)}
          </Alert>
        )}

        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
        >
          <TextField
            id="forgot-email"
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

          <Button
            type="submit"
            variant="contained"
            size="large"
            fullWidth
            disabled={isLoading}
            sx={{
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
              'Send reset link'
            )}
          </Button>

          <Button
            component={RouterLink}
            to={ROUTES.LOGIN}
            variant="text"
            startIcon={<ArrowBackIcon />}
            fullWidth
            sx={{ color: 'text.secondary', fontWeight: 600 }}
          >
            Back to sign in
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
