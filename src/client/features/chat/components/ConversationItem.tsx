import { Box, Avatar, Typography, Badge } from '@mui/material';
import PushPinIcon from '@mui/icons-material/PushPin';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import type { ConversationWithMeta } from '@/store/conversationStore';
import { usePresenceStore } from '@/store/presenceStore';

const C = {
  panel: '#0C1722',
  border: 'rgba(134,150,160,0.12)',
  accent: '#10C4A0',
  accentDark: '#0D9E80',
  txt1: '#E9EDEF',
  txt2: '#8696A0',
  txt3: '#567390',
  badge: '#10C4A0',
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

function getConversationName(conv: ConversationWithMeta, currentUserId: string): string {
  if (conv.metadata.name) return conv.metadata.name;
  if (conv.type === 'direct') {
    const otherId = conv.participants?.find((p) => p !== currentUserId);
    const profile = conv.memberProfiles?.find((p) => p.userId === otherId);
    return profile?.displayName ?? profile?.username ?? 'Unknown';
  }
  return 'Conversation';
}

function getConversationAvatar(
  conv: ConversationWithMeta,
  currentUserId: string,
): string | undefined {
  if (conv.metadata.avatar?.url) return conv.metadata.avatar.url;
  if (conv.type === 'direct') {
    const otherId = conv.participants?.find((p) => p !== currentUserId);
    return conv.memberProfiles?.find((p) => p.userId === otherId)?.avatar;
  }
  return undefined;
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
  const avatarSrc = getConversationAvatar(conversation, currentUserId);
  const preview = getLastMessagePreview(conversation);
  const timeStr = conversation.lastMessage?.timestamp
    ? formatTime(conversation.lastMessage.timestamp)
    : conversation.lastActivity
      ? formatTime(conversation.lastActivity)
      : '';

  const hasUnread = conversation.unreadCount > 0;

  // For direct conversations, show online indicator for the other participant
  const presences = usePresenceStore((s) => s.presences);
  const otherUserId =
    conversation.type === 'direct'
      ? conversation.participants?.find((p) => p !== currentUserId)
      : undefined;
  const isOnline = otherUserId ? presences[otherUserId]?.status === 'online' : false;

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
        transition: 'background 0.18s',
        bgcolor: isActive ? 'rgba(16,196,160,0.09)' : 'transparent',
        '&:hover': {
          bgcolor: isActive ? 'rgba(16,196,160,0.12)' : 'rgba(255,255,255,0.025)',
        },
        ...(isActive && {
          '&::before': {
            content: '""',
            position: 'absolute',
            left: 0,
            top: '15%',
            height: '70%',
            width: 3,
            borderRadius: '0 4px 4px 0',
            background: 'linear-gradient(180deg, #10C4A0 0%, #0D9E80 100%)',
            boxShadow: '2px 0 8px rgba(16,196,160,0.4)',
          },
        }),
      }}
    >
      {/* Avatar with online indicator */}
      <Box sx={{ position: 'relative', flexShrink: 0 }}>
        <Avatar
          src={avatarSrc}
          alt={name}
          sx={{
            width: 46,
            height: 46,
            fontSize: 17,
            fontWeight: 700,
            background: `linear-gradient(135deg, ${C.accentDark} 0%, ${C.accent} 100%)`,
          }}
        >
          {getAvatarLetter(name)}
        </Avatar>
        {isOnline && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 1,
              right: 1,
              width: 11,
              height: 11,
              borderRadius: '50%',
              bgcolor: C.badge,
              border: `2px solid ${C.panel}`,
              boxShadow: `0 0 8px ${C.badge}`,
            }}
          />
        )}
      </Box>

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

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
              badgeContent={conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
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
