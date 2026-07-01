import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import ForumIcon from '@mui/icons-material/Forum';
import DoneAllIcon from '@mui/icons-material/DoneAll';

// ---------------------------------------------------------------------------
// Decorative chat bubble — used in the left hero panel
// ---------------------------------------------------------------------------

interface BubbleProps {
  text: string;
  sent?: boolean;
  delay?: number;
}

function Bubble({ text, sent = false, delay = 0 }: BubbleProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: sent ? 'flex-end' : 'flex-start',
        mb: 1.5,
        '@keyframes slideUp': {
          from: { opacity: 0, transform: 'translateY(14px)' },
          to:   { opacity: 1, transform: 'translateY(0)' },
        },
        animation: `slideUp 0.55s cubic-bezier(.22,.68,0,1.2) ${delay}s both`,
      }}
    >
      <Box
        sx={{
          maxWidth: '78%',
          px: 2,
          py: 1,
          borderRadius: sent ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          bgcolor: sent ? 'rgba(255,255,255,0.96)' : 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 2px 16px rgba(0,0,0,0.14)',
        }}
      >
        <Typography
          variant="body2"
          sx={{
            color: sent ? '#0a1929' : 'rgba(255,255,255,0.92)',
            fontWeight: 500,
            fontSize: '0.8125rem',
            lineHeight: 1.5,
          }}
        >
          {text}
        </Typography>
        {sent && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.25 }}>
            <DoneAllIcon sx={{ fontSize: 13, color: '#25D366' }} />
          </Box>
        )}
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// AuthLayout
// ---------------------------------------------------------------------------

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

const FEATURES = ['End-to-end encrypted', 'Real-time sync', 'Cross-platform'];

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>

      {/* ── Left hero panel (desktop only) ────────────────────────── */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          width: { md: '44%', lg: '42%' },
          minHeight: '100vh',
          position: 'sticky',
          top: 0,
          flexShrink: 0,
          background: 'linear-gradient(155deg, #0d1b2a 0%, #0f2437 30%, #0b3430 65%, #063a26 100%)',
          overflow: 'hidden',
        }}
      >
        {/* Ambient glow layers */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: `
              radial-gradient(ellipse at 20% 10%,  rgba(108,99,255,0.20) 0%, transparent 55%),
              radial-gradient(ellipse at 80% 90%,  rgba(37,211,102,0.14) 0%, transparent 55%),
              radial-gradient(ellipse at 55% 50%,  rgba(3,218,198,0.07)  0%, transparent 65%)
            `,
          }}
        />

        {/* Grid lines */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
          }}
        />

        {/* Content */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            px: { md: 5, lg: 6.5 },
            py: 6,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Brand mark */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 7 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #6c63ff 0%, #03dac6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 0 10px rgba(108,99,255,0.12), 0 4px 20px rgba(108,99,255,0.35)',
              }}
            >
              <ForumIcon sx={{ color: '#fff', fontSize: 22 }} />
            </Box>
            <Typography
              variant="h6"
              sx={{ color: '#fff', fontWeight: 800, letterSpacing: '-0.5px' }}
            >
              Truson-Chat
            </Typography>
          </Box>

          {/* Headline */}
          <Typography
            sx={{
              color: '#fff',
              fontWeight: 800,
              fontSize: { md: '1.85rem', lg: '2.25rem' },
              lineHeight: 1.15,
              letterSpacing: '-0.5px',
              mb: 2,
            }}
          >
            Stay close with
            <br />
            everyone you{' '}
            <Box component="span" sx={{ color: '#25D366' }}>
              love
            </Box>
          </Typography>

          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255,255,255,0.45)',
              lineHeight: 1.85,
              mb: 6,
              maxWidth: 300,
            }}
          >
            Real-time messaging, group chats, voice notes, and more — all secured end-to-end.
          </Typography>

          {/* Chat preview */}
          <Box sx={{ maxWidth: 300 }}>
            <Bubble text="Hey! Are you joining tonight? 🎉" delay={0.3} />
            <Bubble text="Of course! Can't wait 🙌" sent delay={0.6} />
            <Bubble text="Great, see you at 8 PM 😊" delay={0.9} />
          </Box>

          {/* Feature pills */}
          <Box sx={{ display: 'flex', gap: 1, mt: 5, flexWrap: 'wrap' }}>
            {FEATURES.map((f) => (
              <Box
                key={f}
                sx={{
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 10,
                  bgcolor: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}
                >
                  {f}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Footer */}
        <Box sx={{ px: { md: 5, lg: 6.5 }, pb: 4, position: 'relative', zIndex: 1 }}>
          <Typography
            variant="caption"
            sx={{ color: 'rgba(255,255,255,0.18)', fontWeight: 500 }}
          >
            © 2026 Truson-Chat · Secure · Private · Fast
          </Typography>
        </Box>
      </Box>

      {/* ── Right form panel ───────────────────────────────────────── */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          overflowY: 'auto',
          position: 'relative',
        }}
      >
        {/* Ambient glow behind form */}
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: '60%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 0,
            background: `
              radial-gradient(ellipse at 70% 20%, rgba(108,99,255,0.09) 0%, transparent 55%),
              radial-gradient(ellipse at 30% 80%, rgba(3,218,198,0.05) 0%, transparent 50%)
            `,
          }}
        />

        {/* Mobile top bar */}
        <Box
          sx={{
            display: { xs: 'flex', md: 'none' },
            alignItems: 'center',
            gap: 1.5,
            px: 3,
            py: 2.5,
            position: 'relative',
            zIndex: 1,
            background: 'linear-gradient(135deg, #0d1b2a 0%, #063a26 100%)',
          }}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1.5,
              background: 'linear-gradient(135deg, #6c63ff, #03dac6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 12px rgba(108,99,255,0.4)',
            }}
          >
            <ForumIcon sx={{ color: '#fff', fontSize: 18 }} />
          </Box>
          <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.3px' }}>
            Truson-Chat
          </Typography>
        </Box>

        {/* Form content */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            zIndex: 1,
            px: { xs: 2, sm: 3 },
            py: { xs: 4, sm: 6 },
          }}
        >
          {/* Glass card */}
          <Box
            sx={{
              width: '100%',
              maxWidth: 460,
              borderRadius: { xs: 4, sm: 5 },
              bgcolor: (theme) =>
                theme.palette.mode === 'dark'
                  ? 'rgba(255,255,255,0.025)'
                  : 'rgba(255,255,255,0.85)',
              border: (theme) =>
                theme.palette.mode === 'dark'
                  ? '1px solid rgba(255,255,255,0.07)'
                  : '1px solid rgba(108,99,255,0.1)',
              backdropFilter: 'blur(20px)',
              boxShadow: (theme) =>
                theme.palette.mode === 'dark'
                  ? '0 8px 60px rgba(0,0,0,0.35), 0 0 0 1px rgba(108,99,255,0.06)'
                  : '0 8px 48px rgba(108,99,255,0.1), 0 2px 16px rgba(0,0,0,0.06)',
              px: { xs: 3, sm: 5 },
              py: { xs: 4, sm: 5 },
            }}
          >
            {/* Form header */}
            <Box sx={{ mb: 4 }}>
              <Typography
                variant="h4"
                component="h1"
                sx={{ fontWeight: 800, letterSpacing: '-0.5px', mb: 0.75 }}
              >
                {title}
              </Typography>
              {subtitle && (
                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  {subtitle}
                </Typography>
              )}
            </Box>

            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
