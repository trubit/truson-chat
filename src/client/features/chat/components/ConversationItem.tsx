import { Box, Avatar, Typography, Badge } from '@mui/material';
import PushPinIcon from '@mui/icons-material/PushPin';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import type { ConversationWithMeta } from '@/store/conversationStore';

const C = {
  panel: '#080C18',
  panelHdr: '#0B1022',
  border: 'rgba(139,92,246,0.12)',
  accent: '#9B6DFF',
  accentGlow: 'rgba(155,109,255,0.18)',
  accentDark: '#7C3AED',
  txt1: '#F1F5F9',
  txt2: '#94A3B8',
  txt3: '#475569',
  badge: '#10B981',
} as const;

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString([], { month: '2-digit', day: '2-digit' });
  }
}

function getLastMessagePreview(conv: ConversationWithMeta): string {
  const lm = conv.lastMessage;
  if (!lm) return '';
  if (lm.type === 'image') return '📷 Photo';
  if (lm.type === 'video') return '🎥 Video';
  if (lm.type === 'audio') return '🎵 Audio';
  if (lm.type === 'file') return '📎 File';
  return lm.content || '';
}

function getConversationName(
  conv: ConversationWithMeta,
  currentUserId: string,
): string {
  if (conv.metadata.name) return conv.metadata.name;
  if (conv.type === 'direct') {
    // For direct conversations, the name is the other participant
    return `User ${conv.participants?.find((p) => p !== currentUserId) ?? ''}`;
  }
  return 'Conversation';
}

function getAvatarLetter(name: string): string {
  return (name || 'C').charAt(0).toUpperCase();
}

interface ConversationItemProps {
  conversation: ConversationWithMeta;
  isActive: boolean;
  onClick: () => void;
  currentUserId: string;
}

export default function ConversationItem({
  conversation,
  isActive,
  onClick,
  currentUserId,
}: ConversationItemProps) {
  const name = getConversationName(conversation, currentUserId);
  const preview = getLastMessagePreview(conversation);
  const timeStr = conversation.lastMessage?.timestamp
    ? formatTime(conversation.lastMessage.timestamp)
    : conversation.lastActivity
      ? formatTime(conversation.lastActivity)
      : '';

  const hasUnread = conversation.unreadCount > 0;

  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 1.5,
        py: 1.25,
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.15s',
        bgcolor: isActive ? 'rgba(155,109,255,0.1)' : 'transparent',
        '&:hover': {
          bgcolor: isActive
            ? 'rgba(155,109,255,0.12)'
            : 'rgba(255,255,255,0.03)',
        },
        ...(isActive && {
          '&::before': {
            content: '""',
            position: 'absolute',
            left: 0,
            top: '15%',
            height: '70%',
            width: 3,
            borderRadius: '0 3px 3px 0',
            bgcolor: C.accent,
          },
        }),
      }}
    >
      {/* Avatar */}
      <Avatar
        sx={{
          width: 42,
          height: 42,
          fontSize: 16,
          fontWeight: 700,
          flexShrink: 0,
          background: `linear-gradient(135deg, ${C.accentDark} 0%, ${C.accent} 100%)`,
        }}
      >
        {getAvatarLetter(name)}
      </Avatar>

      {/* Content */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 0.3,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: 13.5,
                fontWeight: hasUnread ? 700 : 500,
                color: C.txt1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {name}
            </Typography>
            {conversation.isPinned && (
              <PushPinIcon sx={{ fontSize: 11, color: C.accent, flexShrink: 0 }} />
            )}
            {conversation.isMuted && (
              <VolumeOffIcon sx={{ fontSize: 11, color: C.txt3, flexShrink: 0 }} />
            )}
          </Box>
          <Typography
            sx={{
              fontSize: 11,
              color: hasUnread ? C.accent : C.txt3,
              fontWeight: hasUnread ? 600 : 400,
              flexShrink: 0,
              ml: 0.5,
            }}
          >
            {timeStr}
          </Typography>
        </Box>

        <Box
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Typography
            sx={{
              fontSize: 12.5,
              color: hasUnread ? C.txt2 : C.txt3,
              fontWeight: hasUnread ? 500 : 400,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
              mr: 1,
            }}
          >
            {preview || ' '}
          </Typography>
          {hasUnread && (
            <Badge
              badgeContent={
                conversation.unreadCount > 99 ? '99+' : conversation.unreadCount
              }
              sx={{
                flexShrink: 0,
                '& .MuiBadge-badge': {
                  position: 'static',
                  transform: 'none',
                  bgcolor: C.badge,
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 700,
                  minWidth: 20,
                  height: 20,
                  borderRadius: '10px',
                  px: 0.5,
                },
              }}
            >
              <Box />
            </Badge>
          )}
        </Box>
      </Box>
    </Box>
  );
}
