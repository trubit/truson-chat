import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import {
  TextField,
  Button,
  Alert,
  CircularProgress,
  Box,
  Typography,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import { AuthLayout } from '../components/AuthLayout';
import { useSendPhoneOtp, useVerifyPhone } from '../queries';
import { useAuthStore } from '@/store/authStore';

interface PhoneFormValues {
  phone: string;
}

interface OtpFormValues {
  otp: string;
}

function extractErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const axiosError = error as { response?: { data?: { message?: string; error?: string } } };
    const msg = axiosError.response?.data?.message ?? axiosError.response?.data?.error;
    if (msg) return msg;
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}

const RESEND_COOLDOWN = 60; // seconds

export default function VerifyPhonePage() {
  const user = useAuthStore((s) => s.user);
  const existingPhone = user?.phone ?? '';

  const [sentToPhone, setSentToPhone] = useState<string | null>(
    existingPhone || null,
  );
  const [resendCountdown, setResendCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sendOtpMutation = useSendPhoneOtp();
  const verifyPhoneMutation = useVerifyPhone();

  const phoneForm = useForm<PhoneFormValues>({
    defaultValues: { phone: existingPhone },
  });

  const otpForm = useForm<OtpFormValues>({
    defaultValues: { otp: '' },
  });

  // Start countdown after OTP sent.
  const startCountdown = () => {
    setResendCountdown(RESEND_COOLDOWN);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const onSendOtp = (data: PhoneFormValues) => {
    sendOtpMutation.mutate(
      { phone: data.phone },
      {
        onSuccess: () => {
          setSentToPhone(data.phone);
          startCountdown();
        },
      },
    );
  };

  const onVerify = (data: OtpFormValues) => {
    if (!sentToPhone) return;
    verifyPhoneMutation.mutate({ phone: sentToPhone, otp: data.otp });
  };

  const handlePhoneSubmit = phoneForm.handleSubmit(onSendOtp);
  const handleOtpSubmit = otpForm.handleSubmit(onVerify);

  const handleResend = () => {
    if (!sentToPhone) return;
    sendOtpMutation.mutate(
      { phone: sentToPhone },
      { onSuccess: startCountdown },
    );
  };

  if (verifyPhoneMutation.isSuccess) {
    return (
      <Box data-testid="page-verify-phone">
        <AuthLayout title="Phone verified">
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              py: 2,
              gap: 2,
            }}
          >
            <CheckCircleOutlineIcon
              sx={{ fontSize: 56, color: 'success.main' }}
            />
            <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center' }}>
              Your phone number has been successfully verified.
            </Typography>
          </Box>
        </AuthLayout>
      </Box>
    );
  }

  return (
    <Box data-testid="page-verify-phone">
      <AuthLayout
        title="Verify your phone"
        subtitle="We'll send a 6-digit code to your phone number"
      >
        {/* Step 1: Phone number (skip if already known) */}
        {!sentToPhone && (
          <Box
            component="form"
            onSubmit={handlePhoneSubmit}
            noValidate
            sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
          >
            {sendOtpMutation.isError && (
              <Alert severity="error">
                {extractErrorMessage(sendOtpMutation.error)}
              </Alert>
            )}

            <TextField
              id="verify-phone-number"
              label="Phone number"
              type="tel"
              autoComplete="tel"
              autoFocus
              required
              fullWidth
              error={Boolean(phoneForm.formState.errors.phone)}
              helperText={phoneForm.formState.errors.phone?.message}
              disabled={sendOtpMutation.isPending}
              slotProps={{ htmlInput: { 'aria-label': 'Phone number' } }}
              {...phoneForm.register('phone', {
                required: 'Phone number is required',
                pattern: {
                  value: /^\+?[0-9\s\-()]{7,20}$/,
                  message: 'Enter a valid phone number',
                },
              })}
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={sendOtpMutation.isPending}
            >
              {sendOtpMutation.isPending ? (
                <CircularProgress size={22} color="inherit" />
              ) : (
                'Send code'
              )}
            </Button>
          </Box>
        )}

        {/* Step 2: OTP entry */}
        {sentToPhone && (
          <Box
            component="form"
            onSubmit={handleOtpSubmit}
            noValidate
            sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
          >
            {verifyPhoneMutation.isError && (
              <Alert severity="error">
                {extractErrorMessage(verifyPhoneMutation.error)}
              </Alert>
            )}
            {sendOtpMutation.isSuccess && (
              <Alert severity="info">
                Code sent to {sentToPhone}. It expires in 10 minutes.
              </Alert>
            )}

            <TextField
              id="verify-otp"
              label="6-digit code"
              type="text"
              autoComplete="one-time-code"
              autoFocus
              required
              fullWidth
              slotProps={{
                htmlInput: {
                  maxLength: 6,
                  'aria-label': '6-digit verification code',
                  inputMode: 'numeric' as const,
                  pattern: '[0-9]*',
                },
              }}
              error={Boolean(otpForm.formState.errors.otp)}
              helperText={otpForm.formState.errors.otp?.message}
              disabled={verifyPhoneMutation.isPending}
              {...otpForm.register('otp', {
                required: 'Verification code is required',
                pattern: {
                  value: /^[0-9]{6}$/,
                  message: 'Enter the 6-digit code',
                },
              })}
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={verifyPhoneMutation.isPending}
            >
              {verifyPhoneMutation.isPending ? (
                <CircularProgress size={22} color="inherit" />
              ) : (
                'Verify code'
              )}
            </Button>

            {/* Resend option */}
            <Box sx={{ textAlign: 'center' }}>
              {resendCountdown > 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Resend code in {resendCountdown}s
                </Typography>
              ) : (
                <Button
                  variant="text"
                  size="small"
                  onClick={handleResend}
                  disabled={sendOtpMutation.isPending}
                >
                  {sendOtpMutation.isPending ? 'Sending…' : 'Resend code'}
                </Button>
              )}
            </Box>

            <Button
              variant="text"
              size="small"
              onClick={() => setSentToPhone(null)}
            >
              Use a different number
            </Button>
          </Box>
        )}
      </AuthLayout>
    </Box>
  );
}
