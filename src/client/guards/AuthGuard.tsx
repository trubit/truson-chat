import { Navigate, Outlet } from 'react-router-dom';
import { Box, Typography, IconButton, CircularProgress, Collapse } from '@mui/material';
import MarkEmailUnreadOutlinedIcon from '@mui/icons-material/MarkEmailUnreadOutlined';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useAuthStore } from '@/store/authStore';
import { ROUTES } from '@/routes/index';
import { useResendVerification } from '@/features/auth/queries';
import { useState } from 'react';

function VerificationBanner() {
  const [dismissed, setDismissed] = useState(false);
  const resendVerification = useResendVerification();

  return (
    <Collapse in={!dismissed} unmountOnExit>
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1300,
          '@keyframes slideDown': {
            from: { opacity: 0, transform: 'translateY(-100%)' },
            to:   { opacity: 1, transform: 'translateY(0)' },
          },
          animation: 'slideDown 0.35s cubic-bezier(.22,.68,0,1.2) both',
          background: 'linear-gradient(135deg, #1a1200 0%, #2a1e00 40%, #1f1500 100%)',
          borderBottom: '1px solid rgba(255,191,0,0.15)',
          boxShadow: '0 4px 32px rgba(0,0,0,0.35)',
        }}
      >
        {/* Ambient glow */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse at 15% 50%, rgba(255,160,0,0.12) 0%, transparent 60%), ' +
              'radial-gradient(ellipse at 85% 50%, rgba(255,191,0,0.07) 0%, transparent 60%)',
            pointerEvents: 'none',
          }}
        />

        <Box
          sx={{
            position: 'relative',
            maxWidth: 1200,
            mx: 'auto',
            px: { xs: 2, sm: 3, md: 4 },
            py: { xs: 1.5, sm: 1.75 },
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 2, sm: 3 },
          }}
        >
          {/* Icon */}
          <Box
            sx={{
              flexShrink: 0,
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: 'rgba(255,160,0,0.15)',
              border: '1px solid rgba(255,160,0,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(255,160,0,0.2)',
            }}
          >
            <MarkEmailUnreadOutlinedIcon sx={{ color: '#ffa000', fontSize: 20 }} />
          </Box>

          {/* Text content */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              sx={{ color: '#ffe082', fontWeight: 700, lineHeight: 1.4 }}
            >
              Verify your email address
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: 'rgba(255,224,130,0.55)', lineHeight: 1.5, display: 'block' }}
            >
              A confirmation email was sent to your inbox — check your spam folder too.
            </Typography>
          </Box>

          {/* Action button */}
          {resendVerification.isSuccess ? (
            <Box
              sx={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                px: 2,
                py: 0.75,
                borderRadius: 10,
                bgcolor: 'rgba(37,211,102,0.12)',
                border: '1px solid rgba(37,211,102,0.25)',
              }}
            >
              <CheckCircleIcon sx={{ fontSize: 15, color: '#25D366' }} />
              <Typography variant="caption" sx={{ color: '#25D366', fontWeight: 700 }}>
                Sent!
              </Typography>
            </Box>
          ) : (
            <Box
              component="button"
              onClick={() => resendVerification.mutate()}
              disabled={resendVerification.isPending}
              sx={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                px: { xs: 1.5, sm: 2 },
                py: 0.75,
                border: '1px solid rgba(255,160,0,0.35)',
                borderRadius: 10,
                bgcolor: 'rgba(255,160,0,0.1)',
                cursor: resendVerification.isPending ? 'not-allowed' : 'pointer',
                opacity: resendVerification.isPending ? 0.65 : 1,
                transition: 'all 0.2s ease',
                '&:hover:not(:disabled)': {
                  bgcolor: 'rgba(255,160,0,0.2)',
                  borderColor: 'rgba(255,160,0,0.55)',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 16px rgba(255,160,0,0.2)',
                },
                '&:active:not(:disabled)': { transform: 'translateY(0)' },
              }}
            >
              {resendVerification.isPending ? (
                <CircularProgress size={13} sx={{ color: '#ffa000' }} />
              ) : (
                <SendIcon sx={{ fontSize: 13, color: '#ffa000' }} />
              )}
              <Typography
                variant="caption"
                sx={{
                  color: '#ffa000',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  display: { xs: 'none', sm: 'block' },
                }}
              >
                {resendVerification.isPending ? 'Sending…' : 'Resend email'}
              </Typography>
            </Box>
          )}

          {/* Dismiss */}
          <IconButton
            size="small"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss verification banner"
            sx={{
              flexShrink: 0,
              color: 'rgba(255,224,130,0.4)',
              '&:hover': {
                color: 'rgba(255,224,130,0.9)',
                bgcolor: 'rgba(255,160,0,0.1)',
              },
            }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </Box>
    </Collapse>
  );
}

export function AuthGuard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  const showBanner = user !== null && !user.emailVerified;

  return (
    <>
      {showBanner && <VerificationBanner />}
      <Outlet />
    </>
  );
}
