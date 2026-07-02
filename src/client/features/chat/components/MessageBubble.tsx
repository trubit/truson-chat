import { useState } from 'react';
import { Box, Typography, Avatar, IconButton, Tooltip, Chip } from '@mui/material';
import ReplyIcon from '@mui/icons-material/Reply';
import AddReactionIcon from '@mui/icons-material/AddReaction';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import DoneIcon from '@mui/icons-material/Done';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import type { Message } from '@shared/types';

const C = {
  accent: '#9B6DFF',
  accentDark: '#7C3AED',
  teal: '#22D3EE',
  txt1: '#F1F5F9',
  txt2: '#94A3B8',
  txt3: '#475569',
  border: 'rgba(139,92,246,0.15)',
} as const;

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

function StatusIcon({ status }: { status: Message['status'] }) {
  if (status === 'sent') {
    return <DoneIcon sx={{ fontSize: 12, color: C.txt3 }} />;
  }
  if (status === 'delivered') {
    return <DoneAllIcon sx={{ fontSize: 12, color: C.txt3 }} />;
  }
  if (status === 'read') {
    return <DoneAllIcon sx={{ fontSize: 12, color: C.teal }} />;
  }
  return null;
}

function formatMessageTime(ts: string): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
  showAvatar: boolean;
  onReply: (msg: Message) => void;
  onReact: (messageId: string, emoji: string) => void;
  onDelete?: (messageId: string) => void;
}

export default function MessageBubble({
  message,
  isMine,
  showAvatar,
  onReply,
  onReact,
  onDelete,
}: MessageBubbleProps) {
  const [hovered, setHovered] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const isDeleted = Boolean(message.deletedAt) || message.status === 'deleted';

  const replyMsg =
    message.replyTo && typeof message.replyTo === 'object'
      ? (message.replyTo as Message)
      : null;

  return (
    <Box
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setEmojiPickerOpen(false); }}
      sx={{
        display: 'flex',
        flexDirection: isMine ? 'row-reverse' : 'row',
        alignItems: 'flex-end',
        gap: 0.75,
        mb: 0.5,
        px: 2,
        position: 'relative',
      }}
    >
      {/* Avatar (others only, shown for first message in group) */}
      {!isMine && (
        <Box sx={{ width: 28, flexShrink: 0 }}>
          {showAvatar ? (
            <Avatar
              sx={{
                width: 28,
                height: 28,
                fontSize: 11,
                fontWeight: 700,
                background: `linear-gradient(135deg, ${C.accentDark} 0%, ${C.accent} 100%)`,
              }}
            >
              {(message.sender?.username ?? 'U').charAt(0).toUpperCase()}
            </Avatar>
          ) : null}
        </Box>
      )}

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: isMine ? 'flex-end' : 'flex-start',
          maxWidth: '70%',
        }}
      >
        {/* Reply preview */}
        {replyMsg && !isDeleted && (
          <Box
            sx={{
              mb: 0.5,
              px: 1.5,
              py: 0.75,
              borderRadius: '10px 10px 0 0',
              bgcolor: 'rgba(155,109,255,0.08)',
              border: `1px solid ${C.border}`,
              borderLeft: `3px solid ${C.accent}`,
              maxWidth: '100%',
            }}
          >
            <Typography sx={{ fontSize: 11, color: C.accent, fontWeight: 600, mb: 0.25 }}>
              {replyMsg.sender?.username ?? 'Unknown'}
            </Typography>
            <Typography
              sx={{
                fontSize: 12,
                color: C.txt2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {replyMsg.content || '📎 Media'}
            </Typography>
          </Box>
        )}

        {/* Bubble */}
        <Box sx={{ position: 'relative' }}>
          {/* Hover actions */}
          {hovered && !isDeleted && (
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                transform: 'translateY(-50%)',
                ...(isMine ? { right: '100%', mr: 0.5 } : { left: '100%', ml: 0.5 }),
                display: 'flex',
                alignItems: 'center',
                gap: 0.25,
                bgcolor: '#0D1225',
                border: `1px solid ${C.border}`,
                borderRadius: '10px',
                px: 0.5,
                py: 0.25,
                zIndex: 10,
              }}
            >
              <Tooltip title="Reply">
                <IconButton size="small" onClick={() => onReply(message)} sx={{ color: C.txt2, p: 0.5 }}>
                  <ReplyIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="React">
                <IconButton
                  size="small"
                  onClick={() => setEmojiPickerOpen((p) => !p)}
                  sx={{ color: C.txt2, p: 0.5 }}
                >
                  <AddReactionIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
              {isMine && onDelete && (
                <Tooltip title="Delete">
                  <IconButton
                    size="small"
                    onClick={() => onDelete(message._id)}
                    sx={{ color: C.txt2, p: 0.5, '&:hover': { color: '#EF4444' } }}
                  >
                    <DeleteOutlinedIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          )}

          {/* Emoji quick picker */}
          {emojiPickerOpen && (
            <Box
              sx={{
                position: 'absolute',
                bottom: '100%',
                mb: 0.5,
                ...(isMine ? { right: 0 } : { left: 0 }),
                display: 'flex',
                gap: 0.25,
                bgcolor: '#0D1225',
                border: `1px solid ${C.border}`,
                borderRadius: '12px',
                px: 0.75,
                py: 0.5,
                zIndex: 20,
              }}
            >
              {QUICK_EMOJIS.map((emoji) => (
                <Box
                  key={emoji}
                  onClick={() => {
                    onReact(message._id, emoji);
                    setEmojiPickerOpen(false);
                  }}
                  sx={{
                    fontSize: 18,
                    cursor: 'pointer',
                    p: 0.25,
                    borderRadius: '6px',
                    transition: 'transform 0.1s',
                    '&:hover': { transform: 'scale(1.3)' },
                  }}
                >
                  {emoji}
                </Box>
              ))}
            </Box>
          )}

          {/* Message content */}
          {isDeleted ? (
            <Box
              sx={{
                px: 1.75,
                py: 1,
                borderRadius: '16px',
                bgcolor: 'rgba(255,255,255,0.04)',
                border: `1px solid rgba(255,255,255,0.06)`,
              }}
            >
              <Typography
                sx={{ fontSize: 13, color: C.txt3, fontStyle: 'italic' }}
              >
                🚫 This message was deleted
              </Typography>
            </Box>
          ) : (
            <Box
              sx={{
                px: 1.75,
                py: 1,
                borderRadius: isMine ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                ...(isMine
                  ? {
                      background: `linear-gradient(135deg, ${C.accentDark} 0%, ${C.accent} 100%)`,
                      boxShadow: `0 2px 12px rgba(124,58,237,0.35)`,
                    }
                  : {
                      bgcolor: '#0D1225',
                      border: `1px solid ${C.border}`,
                    }),
              }}
            >
              <Typography
                sx={{
                  fontSize: 14,
                  color: isMine ? '#fff' : C.txt1,
                  lineHeight: 1.5,
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {message.content}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Timestamp + status */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            mt: 0.3,
            px: 0.5,
          }}
        >
          {message.editedAt && (
            <Typography sx={{ fontSize: 10, color: C.txt3 }}>edited</Typography>
          )}
          <Typography sx={{ fontSize: 11, color: C.txt3 }}>
            {formatMessageTime(message.createdAt)}
          </Typography>
          {isMine && !isDeleted && <StatusIcon status={message.status} />}
        </Box>

        {/* Reactions */}
        {message.reactions.length > 0 && !isDeleted && (
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0.5,
              mt: 0.5,
              justifyContent: isMine ? 'flex-end' : 'flex-start',
            }}
          >
            {message.reactions.map((r) => (
              <Chip
                key={r.emoji}
                label={`${r.emoji} ${r.count}`}
                size="small"
                onClick={() => onReact(message._id, r.emoji)}
                sx={{
                  height: 22,
                  fontSize: 12,
                  bgcolor: 'rgba(155,109,255,0.12)',
                  color: C.txt2,
                  border: `1px solid ${C.border}`,
                  cursor: 'pointer',
                  '& .MuiChip-label': { px: 0.75 },
                  '&:hover': { bgcolor: 'rgba(155,109,255,0.2)' },
                }}
              />
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
