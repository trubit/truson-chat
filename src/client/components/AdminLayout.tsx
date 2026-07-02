import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Drawer,
  IconButton,
  Typography,
  Avatar,
  Divider,
  Tooltip,
} from '@mui/material';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import MonitorOutlinedIcon from '@mui/icons-material/MonitorOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { useAuthStore } from '@/store/authStore';
import { ROUTES } from '@/routes/index';

const C = {
  bg:          '#05060E',
  sidebar:     '#070911',
  sidebarHdr:  '#0A0D1C',
  border:      'rgba(245,158,11,0.12)',
  accent:      '#F59E0B',
  accentGlow:  'rgba(245,158,11,0.18)',
  accentDark:  '#D97706',
  violet:      '#9B6DFF',
  teal:        '#22D3EE',
  icon:        'rgba(255,255,255,0.38)',
  iconHover:   '#F1F5F9',
  txt1:        '#F1F5F9',
  txt2:        '#94A3B8',
  txt3:        '#475569',
};

const SIDEBAR_W = 240;

const NAV = [
  { label: 'Overview',  to: ROUTES.ADMIN,        icon: DashboardOutlinedIcon,  exact: true },
  { label: 'Users',     to: ROUTES.ADMIN_USERS,   icon: PeopleOutlinedIcon,     exact: false },
  { label: 'System',    to: ROUTES.ADMIN_SYSTEM,  icon: MonitorOutlinedIcon,    exact: false },
];

function NavItem({ label, to, Icon, exact }: {
  label: string;
  to: string;
  Icon: React.ElementType;
  exact: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={exact}
      style={{ textDecoration: 'none' }}
    >
      {({ isActive }) => (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 2,
            py: 1.25,
            mx: 1,
            mb: 0.5,
            borderRadius: 2,
            cursor: 'pointer',
            position: 'relative',
            bgcolor: isActive ? C.accentGlow : 'transparent',
            border: isActive ? `1px solid rgba(245,158,11,0.2)` : '1px solid transparent',
            transition: 'all 0.18s ease',
            '&:hover': {
              bgcolor: isActive ? C.accentGlow : 'rgba(255,255,255,0.04)',
            },
          }}
        >
          {isActive && (
            <Box
              sx={{
                position: 'absolute',
                left: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 3,
                height: 20,
                borderRadius: '0 2px 2px 0',
                bgcolor: C.accent,
                boxShadow: `0 0 8px ${C.accent}`,
              }}
            />
          )}
          <Icon
            sx={{
              fontSize: 20,
              color: isActive ? C.accent : C.icon,
              transition: 'color 0.18s',
              flexShrink: 0,
            }}
          />
          <Typography
            variant="body2"
            sx={{
              color: isActive ? C.txt1 : C.txt2,
              fontWeight: isActive ? 600 : 400,
              fontSize: '0.875rem',
              transition: 'color 0.18s',
            }}
          >
            {label}
          </Typography>
        </Box>
      )}
    </NavLink>
  );
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        width: SIDEBAR_W,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: C.sidebar,
        borderRight: `1px solid ${C.border}`,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 2.5,
          py: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          bgcolor: C.sidebarHdr,
          borderBottom: `1px solid ${C.border}`,
          minHeight: 64,
        }}
      >
        {/* Logo */}
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1.5,
            background: `linear-gradient(135deg, #D97706 0%, #F59E0B 50%, #FCD34D 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 12px rgba(245,158,11,0.45), 0 0 24px rgba(245,158,11,0.2)`,
            flexShrink: 0,
          }}
        >
          <ShieldOutlinedIcon sx={{ fontSize: 17, color: '#000' }} />
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            sx={{ color: C.txt1, fontWeight: 700, fontSize: '0.875rem', lineHeight: 1.2 }}
          >
            Admin Panel
          </Typography>
          <Typography variant="caption" sx={{ color: C.txt3, fontSize: '0.7rem' }}>
            TrusonChat
          </Typography>
        </Box>

        {onClose && (
          <IconButton size="small" onClick={onClose} sx={{ color: C.icon }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        )}
      </Box>

      {/* Nav */}
      <Box sx={{ flex: 1, overflowY: 'auto', pt: 1.5 }}>
        <Typography
          variant="caption"
          sx={{ color: C.txt3, px: 3, mb: 1, display: 'block', letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.65rem' }}
        >
          Management
        </Typography>
        {NAV.map(({ label, to, icon: Icon, exact }) => (
          <NavItem key={to} label={label} to={to} Icon={Icon} exact={exact} />
        ))}
      </Box>

      <Divider sx={{ borderColor: C.border }} />

      {/* Footer */}
      <Box sx={{ p: 2 }}>
        <Tooltip title="Back to app" placement="right">
          <Box
            onClick={() => navigate(ROUTES.CHAT)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              px: 2,
              py: 1.25,
              borderRadius: 2,
              cursor: 'pointer',
              border: '1px solid transparent',
              transition: 'all 0.18s',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.04)',
                borderColor: 'rgba(255,255,255,0.06)',
              },
            }}
          >
            <ArrowBackOutlinedIcon sx={{ fontSize: 18, color: C.icon }} />
            <Typography variant="body2" sx={{ color: C.txt2, fontSize: '0.8rem' }}>
              Back to App
            </Typography>
          </Box>
        </Tooltip>

        {user && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              px: 2,
              pt: 1.5,
            }}
          >
            <Avatar
              sx={{
                width: 28,
                height: 28,
                fontSize: '0.75rem',
                bgcolor: C.accentDark,
                border: `1px solid ${C.accent}`,
                flexShrink: 0,
              }}
            >
              {user.username[0]?.toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="body2"
                sx={{ color: C.txt1, fontWeight: 600, fontSize: '0.8rem', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {user.username}
              </Typography>
              <Typography variant="caption" sx={{ color: C.accent, fontSize: '0.65rem', fontWeight: 700 }}>
                Admin
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: C.bg, overflow: 'hidden' }}>
      {/* Desktop sidebar */}
      <Box
        component="aside"
        sx={{
          width: SIDEBAR_W,
          flexShrink: 0,
          display: { xs: 'none', md: 'block' },
        }}
      >
        <SidebarContent />
      </Box>

      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        slotProps={{ paper: { sx: { bgcolor: 'transparent', border: 'none', boxShadow: 'none' } } }}
        sx={{ display: { md: 'none' } }}
      >
        <SidebarContent onClose={() => setMobileOpen(false)} />
      </Drawer>

      {/* Main content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar (mobile only) */}
        <Box
          sx={{
            display: { md: 'none' },
            px: 2,
            py: 1.5,
            bgcolor: C.sidebarHdr,
            borderBottom: `1px solid ${C.border}`,
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <IconButton onClick={(e) => { (e.currentTarget as HTMLElement).blur(); setMobileOpen(true); }} sx={{ color: C.icon }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="body1" sx={{ color: C.txt1, fontWeight: 700 }}>
            Admin Panel
          </Typography>
        </Box>

        {/* Page content */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            bgcolor: C.bg,
            '&::-webkit-scrollbar': { width: 6 },
            '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
            '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.08)', borderRadius: 3 },
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
