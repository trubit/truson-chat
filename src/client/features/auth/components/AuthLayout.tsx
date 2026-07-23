import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import BoltIcon from '@mui/icons-material/Bolt';
import GroupsIcon from '@mui/icons-material/Groups';
import { LinkoraLogo } from '@/components/LinkoraLogo';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

const FEATURES = [
  { Icon: ShieldOutlinedIcon, text: 'End-to-end encrypted by default' },
  { Icon: BoltIcon, text: 'Real-time sync across all your devices' },
  { Icon: GroupsIcon, text: 'Groups, channels & direct messages' },
];

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
          background: 'linear-gradient(155deg, #07101C 0%, #0B1E30 40%, #092019 75%, #071A16 100%)',
          overflow: 'hidden',
        }}
      >
        {/* Ambient glow */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: `
              radial-gradient(ellipse at 20% 18%, rgba(16,196,160,0.22) 0%, transparent 52%),
              radial-gradient(ellipse at 82% 85%, rgba(232,120,48,0.10) 0%, transparent 50%),
              radial-gradient(ellipse at 58% 48%, rgba(16,196,160,0.06) 0%, transparent 62%)
            `,
          }}
        />

        {/* Dot grid */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(rgba(16,196,160,0.16) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
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
          <Box sx={{ mb: 9 }}>
            <LinkoraLogo size={42} showWordmark wordmarkColor="#fff" wordmarkSize="1.0625rem" />
          </Box>

          {/* ── Signal rings illustration ─── */}
          <Box sx={{ position: 'relative', width: 170, height: 170, mb: 5 }}>
            {/* Expanding ping rings */}
            {[0, 1, 2].map((i) => (
              <Box
                key={`ping-${i}`}
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: `${56 + i * 46}px`,
                  height: `${56 + i * 46}px`,
                  borderRadius: '50%',
                  border: `1.5px solid rgba(16,196,160,${0.5 - i * 0.12})`,
                  '@keyframes expand-out': {
                    '0%': {
                      transform: 'translate(-50%, -50%) scale(0.8)',
                      opacity: 0.8,
                    },
                    '100%': {
                      transform: 'translate(-50%, -50%) scale(1.5)',
                      opacity: 0,
                    },
                  },
                  animation: `expand-out 3s cubic-bezier(0.35, 0, 0.65, 1) ${i * 1}s infinite`,
                }}
              />
            ))}
            {/* Static rings */}
            {[48, 88, 130].map((size, i) => (
              <Box
                key={`ring-${i}`}
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: size,
                  height: size,
                  borderRadius: '50%',
                  border: `1px solid rgba(16,196,160,${0.22 - i * 0.05})`,
                }}
              />
            ))}
            {/* Central node */}
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10C4A0, #0D9E80)',
                boxShadow: '0 0 0 5px rgba(16,196,160,0.2), 0 0 28px rgba(16,196,160,0.55)',
                zIndex: 2,
              }}
            />
          </Box>

          {/* Headline */}
          <Typography
            component="h1"
            sx={{
              color: '#fff',
              fontWeight: 800,
              fontSize: { md: '1.8rem', lg: '2.15rem' },
              lineHeight: 1.15,
              letterSpacing: '-0.6px',
              mb: 1.75,
            }}
          >
            Built for the way
            <br />
            people actually{' '}
            <Box component="span" sx={{ color: '#10C4A0' }}>
              connect.
            </Box>
          </Typography>

          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255,255,255,0.42)',
              lineHeight: 1.85,
              mb: 6,
              maxWidth: 310,
            }}
          >
            Fast, private messaging with real-time sync — for individuals, teams, and every
            conversation in between.
          </Typography>

          {/* Feature list */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {FEATURES.map(({ Icon, text }) => (
              <Box key={text} sx={{ display: 'flex', alignItems: 'center', gap: 1.75 }}>
                <Box
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: '9px',
                    bgcolor: 'rgba(16,196,160,0.1)',
                    border: '1px solid rgba(16,196,160,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon sx={{ fontSize: 16, color: '#10C4A0' }} />
                </Box>
                <Typography
                  sx={{
                    fontSize: 13.5,
                    color: 'rgba(255,255,255,0.58)',
                    fontWeight: 500,
                    lineHeight: 1.4,
                  }}
                >
                  {text}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Footer */}
        <Box sx={{ px: { md: 5, lg: 6.5 }, pb: 4, position: 'relative', zIndex: 1 }}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.18)', fontWeight: 500 }}>
            © 2026 Linkora · Secure · Private · Fast
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
              radial-gradient(ellipse at 70% 20%, rgba(16,196,160,0.07) 0%, transparent 55%),
              radial-gradient(ellipse at 30% 80%, rgba(232,120,48,0.05) 0%, transparent 50%)
            `,
          }}
        />

        {/* Mobile bar */}
        <Box
          sx={{
            display: { xs: 'flex', md: 'none' },
            alignItems: 'center',
            gap: 1.5,
            px: 3,
            py: 2.5,
            position: 'relative',
            zIndex: 1,
            background: 'linear-gradient(135deg, #07101C 0%, #071A16 100%)',
          }}
        >
          <LinkoraLogo size={36} showWordmark wordmarkColor="#fff" wordmarkSize="1rem" />
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
                  ? 'rgba(255,255,255,0.028)'
                  : 'rgba(255,255,255,0.88)',
              border: (theme) =>
                theme.palette.mode === 'dark'
                  ? '1px solid rgba(143,168,189,0.13)'
                  : '1px solid rgba(16,196,160,0.14)',
              backdropFilter: 'blur(24px)',
              boxShadow: (theme) =>
                theme.palette.mode === 'dark'
                  ? '0 8px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(16,196,160,0.07)'
                  : '0 8px 48px rgba(16,196,160,0.1), 0 2px 20px rgba(0,0,0,0.06)',
              px: { xs: 3, sm: 5 },
              py: { xs: 4, sm: 5 },
            }}
          >
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
