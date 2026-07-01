import { useEffect } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Alert,
  CircularProgress,
  Typography,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import { AuthLayout } from '../components/AuthLayout';
import { useVerifyEmail } from '../queries';
import { ROUTES } from '@/routes/index';

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error
  ) {
    const axiosError = error as {
      response?: { data?: { message?: string; error?: string } };
    };
    return (
      axiosError.response?.data?.message ??
      axiosError.response?.data?.error ??
      'Email verification failed. The link may have expired.'
    );
  }
  return 'Email verification failed. The link may have expired.';
}

export default function VerifyEmailPage() {
  const { token } = useParams<{ token: string }>();
  const verifyEmailMutation = useVerifyEmail();

  // Auto-verify on mount.
  useEffect(() => {
    if (token && !verifyEmailMutation.isSuccess && !verifyEmailMutation.isPending) {
      verifyEmailMutation.mutate({ token });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const renderContent = () => {
    if (!token) {
      return (
        <>
          <ErrorOutlineIcon sx={{ fontSize: 56, color: 'error.main', mb: 2 }} />
          <Alert severity="error">
            No verification token found. Please use the link from your email.
          </Alert>
        </>
      );
    }

    if (verifyEmailMutation.isPending) {
      return (
        <>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            Verifying your email address…
          </Typography>
        </>
      );
    }

    if (verifyEmailMutation.isError) {
      return (
        <>
          <ErrorOutlineIcon sx={{ fontSize: 56, color: 'error.main', mb: 2 }} />
          <Alert severity="error" sx={{ mb: 3 }}>
            {extractErrorMessage(verifyEmailMutation.error)}
          </Alert>
          <Button
            variant="outlined"
            component={RouterLink}
            to={ROUTES.LOGIN}
            fullWidth
          >
            Back to sign in
          </Button>
        </>
      );
    }

    if (verifyEmailMutation.isSuccess) {
      return (
        <>
          <CheckCircleOutlineIcon
            sx={{ fontSize: 56, color: 'success.main', mb: 2 }}
          />
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            Email verified!
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: 'center', mb: 3 }}
          >
            Your email address has been successfully verified. You can now sign
            in.
          </Typography>
          <Button
            variant="contained"
            component={RouterLink}
            to={ROUTES.LOGIN}
            fullWidth
          >
            Go to sign in
          </Button>
        </>
      );
    }

    return null;
  };

  return (
    <Box data-testid="page-verify-email">
      <AuthLayout title="Email verification">
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            py: 2,
            gap: 1,
          }}
        >
          {renderContent()}
        </Box>
      </AuthLayout>
    </Box>
  );
}
