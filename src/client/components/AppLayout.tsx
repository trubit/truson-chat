import { useState } from 'react';
import { useNavigate, useLocation, Outlet, useMatch } from 'react-router-dom';
import {
  Box, Avatar, Tooltip, Typography,
  IconButton, Divider,
  useMediaQuery, useTheme, Drawer, alpha,
} from '@mui/material';
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';
import GroupsIcon from '@mui/icons-material/Groups';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import ExploreIcon from '@mui/icons-material/Explore';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import BlockIcon from '@mui/icons-material/Block';
import LockIcon from '@mui/icons-material/Lock';
import MenuIcon from '@mui/icons-material/Menu';
import { useAuthStore } from '@/store/authStore';
import { useLogout } from '@/features/auth/queries';
import { ROUTES } from '@/routes/index';
import ShieldIcon from '@mui/icons-material/Shield';
import ConversationList from '@/features/chat/components/ConversationList';
import { useChatSocket } from '@/features/chat/hooks/useChatSocket';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL as string | undefined;

// ─── Design tokens ────────────────────────────────────────────────────────────

const STRIP_W  = 62;
const PANEL_W  = 360;

const C = {
  // ── Backgrounds ──────────────────────────────────────────────────────────
  strip:      '#05060E',          // near-pure obsidian
  panel:      '#080C18',          // deep midnight
  panelHdr:   '#0B1022',          // slightly lighter midnight
  main:       '#060914',          // true dark base
  // ── Borders ──────────────────────────────────────────────────────────────
  border:     'rgba(139,92,246,0.12)',   // violet-tinted divider
  // ── Accent — electric violet + cyan ──────────────────────────────────────
  accent:     '#9B6DFF',          // vivid electric violet
  accentGlow: 'rgba(155,109,255,0.18)',
  accentDark: '#7C3AED',          // deeper violet for gradients
  teal:       '#22D3EE',          // electric cyan
  gold:       '#FBBF24',          // amber gold highlight
  // ── Icons ────────────────────────────────────────────────────────────────
  icon:       'rgba(255,255,255,0.38)',
  iconHover:  '#F1F5F9',
  // ── Search ───────────────────────────────────────────────────────────────
  searchBg:   'rgba(139,92,246,0.07)',
  // ── Status ───────────────────────────────────────────────────────────────
  badge:      '#10B981',          // emerald green
  // ── Text ─────────────────────────────────────────────────────────────────
  txt1:       '#F1F5F9',          // near-white
  txt2:       '#94A3B8',          // slate-blue secondary
  txt3:       '#475569',          // muted
} as const;

// ─── Nav items ─────────────────────────────────────────────────────────────────

const PRIMARY_NAV = [
  { label: 'Chats',       icon: <ChatBubbleIcon sx={{ fontSize: 21 }} />,    path: ROUTES.CHAT },
  { label: 'Groups',      icon: <GroupsIcon sx={{ fontSize: 21 }} />,        path: ROUTES.GROUPS },
  { label: 'Communities', icon: <Diversity3Icon sx={{ fontSize: 21 }} />,    path: ROUTES.COMMUNITIES },
  { label: 'Contacts',    icon: <PeopleAltIcon sx={{ fontSize: 21 }} />,     path: ROUTES.CONTACTS },
  { label: 'Friends',     icon: <PersonAddAlt1Icon sx={{ fontSize: 21 }} />, path: ROUTES.FRIENDS },
  { label: 'Discover',    icon: <ExploreIcon sx={{ fontSize: 21 }} />,       path: ROUTES.DISCOVERY },
];

const SECONDARY_NAV = [
  { label: 'Profile',  icon: <PersonIcon sx={{ fontSize: 21 }} />,   path: ROUTES.PROFILE },
  { label: 'Privacy',  icon: <LockIcon sx={{ fontSize: 21 }} />,     path: ROUTES.PRIVACY_SETTINGS },
  { label: 'Blocked',  icon: <BlockIcon sx={{ fontSize: 21 }} />,    path: ROUTES.BLOCKING },
  { label: 'Settings', icon: <SettingsIcon sx={{ fontSize: 21 }} />, path: ROUTES.SETTINGS },
];

// ─── Single nav icon ──────────────────────────────────────────────────────────

function NavDot({ item, active, onClick }: {
  item: { label: string; icon: React.ReactNode };
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip title={item.label} placement="right">
      <Box
        onClick={onClick}
        sx={{
          width: 44, height: 44,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: '14px', cursor: 'pointer', mb: 0.5,
          color: active ? C.accent : C.icon,
          bgcolor: active ? C.accentGlow : 'transparent',
          transition: 'all 0.18s ease',
          position: 'relative',
          '&:hover': {
            color: active ? C.accent : C.iconHover,
            bgcolor: active ? C.accentGlow : 'rgba(255,255,255,0.06)',
          },
          ...(active && {
            '&::before': {
              content: '""', position: 'absolute',
              left: -10, top: '50%', transform: 'translateY(-50%)',
              width: 3, height: 22, borderRadius: '0 3px 3px 0',
              bgcolor: C.accent, boxShadow: `0 0 12px ${C.accent}, 0 0 24px ${alpha(C.accent, 0.4)}`,
            },
          }),
        }}
      >
        {item.icon}
      </Box>
    </Tooltip>
  );
}

// ─── Icon strip ───────────────────────────────────────────────────────────────

function IconStrip({ onNav }: { onNav: (p: string) => void }) {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const isActive = (p: string) => location.pathname === p || location.pathname.startsWith(p + '/');

  return (
    <Box sx={{
      width: STRIP_W, minWidth: STRIP_W, height: '100%',
      bgcolor: C.strip, borderRight: `1px solid ${C.border}`,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      py: 1.5, zIndex: 10,
    }}>
      {/* Logo */}
      <Box sx={{
        width: 36, height: 36, borderRadius: '12px', mb: 2.5, flexShrink: 0,
        background: `linear-gradient(135deg, ${C.accentDark} 0%, ${C.accent} 50%, ${C.teal} 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 4px 20px rgba(124,58,237,0.55), 0 0 40px rgba(34,211,238,0.12)`,
      }}>
        <ChatBubbleIcon sx={{ fontSize: 17, color: '#fff' }} />
      </Box>

      {/* Primary */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
        {PRIMARY_NAV.map((it) => (
          <NavDot key={it.path} item={it} active={isActive(it.path)} onClick={() => onNav(it.path)} />
        ))}
      </Box>

      {/* Secondary */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {SECONDARY_NAV.map((it) => (
          <NavDot key={it.path} item={it} active={isActive(it.path)} onClick={() => onNav(it.path)} />
        ))}
        <Divider sx={{ width: 32, my: 1, borderColor: C.border }} />
        {ADMIN_EMAIL && user?.email === ADMIN_EMAIL && (
          <Tooltip title="Admin Panel" placement="right">
            <Box
              onClick={() => onNav(ROUTES.ADMIN)}
              sx={{
                width: 34, height: 34, borderRadius: 2, mb: 0.75, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                bgcolor: isActive(ROUTES.ADMIN) ? 'rgba(245,158,11,0.18)' : 'transparent',
                border: isActive(ROUTES.ADMIN) ? '1px solid rgba(245,158,11,0.3)' : '1px solid transparent',
                transition: 'all 0.18s',
                '&:hover': { bgcolor: 'rgba(245,158,11,0.14)', borderColor: 'rgba(245,158,11,0.25)' },
              }}
            >
              <ShieldIcon sx={{ fontSize: 18, color: isActive(ROUTES.ADMIN) ? '#F59E0B' : '#F59E0B80' }} />
            </Box>
          </Tooltip>
        )}
        <Tooltip title={`${user?.username ?? ''} · Sign out`} placement="right">
          <Avatar
            onClick={() => logout.mutate()}
            sx={{
              width: 34, height: 34, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              background: `linear-gradient(135deg, ${C.accentDark} 0%, ${C.accent} 100%)`,
              boxShadow: `0 2px 12px rgba(124,58,237,0.5), 0 0 20px rgba(155,109,255,0.2)`,
              transition: 'all 0.2s', mt: 0.5,
              '&:hover': { transform: 'scale(1.1)', boxShadow: `0 4px 20px rgba(124,58,237,0.7), 0 0 30px rgba(34,211,238,0.2)` },
            }}
          >
            {(user?.username ?? 'U').charAt(0).toUpperCase()}
          </Avatar>
        </Tooltip>
      </Box>
    </Box>
  );
}

// ─── Chat list panel wrapper (uses real ConversationList) ─────────────────────

function ChatListPanel() {
  const navigate    = useNavigate();
  const convMatch   = useMatch('/chat/:id');
  const groupMatch  = useMatch('/chat/g/:groupId');

  // Active id: conversation id as-is, group id prefixed with "g:" so GroupRow can match
  const activeId =
    convMatch?.params.id ??
    (groupMatch?.params.groupId ? `g:${groupMatch.params.groupId}` : null);

  return (
    <ConversationList
      onConversationSelect={(convId) => navigate(`${ROUTES.CHAT}/${convId}`)}
      activeId={activeId}
    />
  );
}

// ─── Chat main empty state ────────────────────────────────────────────────────

function ChatWelcome() {
  return (
    <Box sx={{
      height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 2, px: 4,
      background: `radial-gradient(ellipse at 30% 30%, ${alpha(C.accentDark, 0.12)} 0%, transparent 55%), radial-gradient(ellipse at 70% 70%, ${alpha(C.teal, 0.07)} 0%, transparent 50%)`,
    }}>
      <Box sx={{
        width: 96, height: 96, borderRadius: '50%',
        background: `linear-gradient(135deg, ${alpha(C.accent, 0.12)} 0%, ${alpha(C.teal, 0.08)} 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1.5px solid ${alpha(C.accent, 0.28)}`,
        boxShadow: `0 8px 40px ${alpha(C.accentDark, 0.35)}, 0 0 60px ${alpha(C.teal, 0.1)}`, mb: 0.5,
      }}>
        <ChatBubbleIcon sx={{ fontSize: 40, color: alpha(C.accent, 0.5) }} />
      </Box>

      <Box sx={{ textAlign: 'center' }}>
        <Typography sx={{
          fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', mb: 0.75,
          background: `linear-gradient(135deg, #F1F5F9 0%, ${C.accent} 60%, ${C.teal} 100%)`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          TrusonChat for Desktop
        </Typography>
        <Typography sx={{ fontSize: 13.5, color: C.txt2, lineHeight: 1.7, maxWidth: 280 }}>
          Select a conversation from the list or start a new one to begin messaging.
        </Typography>
      </Box>

      <Box sx={{
        mt: 0.5, px: 2, py: 0.75, borderRadius: '20px',
        border: `1px solid ${alpha(C.gold, 0.22)}`,
        background: `linear-gradient(135deg, ${alpha(C.gold, 0.06)} 0%, transparent 100%)`,
        display: 'flex', alignItems: 'center', gap: 0.75,
      }}>
        <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: C.gold, boxShadow: `0 0 8px ${C.gold}, 0 0 16px ${alpha(C.gold, 0.4)}` }} />
        <Typography sx={{ fontSize: 11.5, color: alpha(C.gold, 0.85), letterSpacing: 0.3, fontWeight: 500 }}>
          End-to-end encrypted
        </Typography>
      </Box>
    </Box>
  );
}

// ─── Desktop layout ───────────────────────────────────────────────────────────

function DesktopLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const isChat = location.pathname === ROUTES.CHAT || location.pathname.startsWith(ROUTES.CHAT + '/');
  const hasConversation = location.pathname.startsWith(ROUTES.CHAT + '/') && location.pathname !== ROUTES.CHAT;

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: C.main }}>
      {/* Icon strip — always visible */}
      <IconStrip onNav={(p) => navigate(p)} />

      {isChat ? (
        <>
          {/* Chat list panel */}
          <Box sx={{
            width: PANEL_W, minWidth: PANEL_W, height: '100%',
            bgcolor: C.panel, borderRight: `1px solid ${C.border}`,
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <ChatListPanel />
          </Box>

          {/* Conversation area */}
          <Box component="main" sx={{ flex: 1, height: '100%', overflow: 'hidden', bgcolor: C.main, display: 'flex', flexDirection: 'column' }}>
            {hasConversation ? <Outlet /> : <ChatWelcome />}
          </Box>
        </>
      ) : (
        /* Non-chat pages take full remaining width */
        <Box component="main" sx={{
          flex: 1, height: '100%', overflow: 'auto',
          bgcolor: C.main,
        }}>
          <Outlet />
        </Box>
      )}
    </Box>
  );
}

// ─── Mobile layout ────────────────────────────────────────────────────────────

function MobileLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isActive = (p: string) => location.pathname === p || location.pathname.startsWith(p + '/');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: C.main }}>
      {/* Top bar */}
      <Box sx={{
        height: 52, bgcolor: C.strip, borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', px: 1.5, gap: 1, flexShrink: 0,
      }}>
        <IconButton size="small" onClick={(e) => { (e.currentTarget as HTMLElement).blur(); setDrawerOpen(true); }} sx={{ color: C.icon }}>
          <MenuIcon />
        </IconButton>
        <Box sx={{
          width: 26, height: 26, borderRadius: '8px', flexShrink: 0,
          background: `linear-gradient(135deg, ${C.accentDark} 0%, ${C.accent} 50%, ${C.teal} 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ChatBubbleIcon sx={{ fontSize: 13, color: '#fff' }} />
        </Box>
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: C.txt1, letterSpacing: '-0.3px', flex: 1 }}>
          TrusonChat
        </Typography>
      </Box>

      {/* Page content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <Outlet />
      </Box>

      {/* Bottom tab bar */}
      <Box sx={{
        height: 58, bgcolor: C.strip, borderTop: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-around', px: 0.5,
      }}>
        {[...PRIMARY_NAV, SECONDARY_NAV[3]].map((it) => {
          const active = isActive(it.path);
          return (
            <Box
              key={it.path}
              onClick={() => navigate(it.path)}
              sx={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.2,
                px: 1.5, py: 0.5, borderRadius: '10px', cursor: 'pointer',
                color: active ? C.accent : C.icon, transition: 'all 0.15s',
              }}
            >
              {it.icon}
              <Typography sx={{ fontSize: 9.5, fontWeight: active ? 600 : 400, color: 'inherit' }}>
                {it.label}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {/* Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        slotProps={{ paper: { sx: { bgcolor: C.panel, width: 260, border: 'none' } } }}
      >
        <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: `1px solid ${C.border}` }}>
          <Box sx={{ width: 30, height: 30, borderRadius: '9px', background: `linear-gradient(135deg, ${C.accentDark} 0%, ${C.accent} 50%, ${C.teal} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChatBubbleIcon sx={{ fontSize: 14, color: '#fff' }} />
          </Box>
          <Typography sx={{ fontSize: 17, fontWeight: 700, color: C.txt1 }}>TrusonChat</Typography>
        </Box>
        <Box sx={{ p: 1.5 }}>
          {[...PRIMARY_NAV, ...SECONDARY_NAV].map((it) => {
            const active = isActive(it.path);
            return (
              <Box
                key={it.path}
                onClick={() => { navigate(it.path); setDrawerOpen(false); }}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5,
                  px: 1.5, py: 1, borderRadius: '10px', cursor: 'pointer', mb: 0.25,
                  color: active ? C.accent : C.icon,
                  bgcolor: active ? C.accentGlow : 'transparent',
                  transition: 'all 0.15s',
                  '&:hover': { bgcolor: active ? C.accentGlow : 'rgba(255,255,255,0.05)', color: active ? C.accent : C.iconHover },
                }}
              >
                {it.icon}
                <Typography sx={{ fontSize: 14, fontWeight: active ? 600 : 400, color: 'inherit' }}>{it.label}</Typography>
              </Box>
            );
          })}
        </Box>
      </Drawer>
    </Box>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function AppLayout() {
  useChatSocket(); // keep socket connected + DM event listeners alive across all pages
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  return isMobile ? <MobileLayout /> : <DesktopLayout />;
}
