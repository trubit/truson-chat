import { Box, Typography, Avatar, alpha } from '@mui/material';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import type { GroupMessage } from '@shared/types';

const C = {
  sentBg:    '#0D3D2E',
  sentBorder: 'rgba(16,196,160,0.14)',
  rcvdBg:    '#12202D',
  rcvdBorder: 'rgba(134,150,160,0.1)',
  txt1:      '#E9EDEF',
  txt2:      '#8696A0',
  accent:    '#10C4A0',
  system:    'rgba(16,196,160,0.08)',
} as const;

interface Props {
  message: GroupMessage;
  isMine:  boolean;
}

export default function GroupMessageBubble({ message, isMine }: Props) {
  const deleted = message.status === 'deleted';

  if (message.type === 'system') {
    return (
      <Box sx={{ textAlign: 'center', my: 0.75 }}>
        <Typography sx={{
          display: 'inline-block', px: 2, py: 0.5,
          bgcolor: C.system, borderRadius: '12px',
          color: C.txt2, fontSize: 12,
        }}>
          {message.content}
        </Typography>
      </Box>
    );
  }

  const senderName  = message.sender?.displayName ?? 'Unknown';
  const senderAvatar = message.sender?.avatarUrl;

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: isMine ? 'row-reverse' : 'row',
      alignItems: 'flex-end',
      gap: 0.75,
      mb: 0.5,
    }}>
      {!isMine && (
        <Avatar src={senderAvatar} sx={{ width: 28, height: 28, fontSize: 12, mb: 0.25, bgcolor: C.accent }}>
          {senderName[0]?.toUpperCase()}
        </Avatar>
      )}
      <Box sx={{ maxWidth: '70%' }}>
        {!isMine && (
          <Typography sx={{ color: C.accent, fontSize: 12, fontWeight: 700, mb: 0.25, ml: 1 }}>
            {senderName}
          </Typography>
        )}
        <Box sx={{
          px: 1.5, py: 1,
          bgcolor: isMine ? C.sentBg : C.rcvdBg,
          border: `1px solid ${isMine ? C.sentBorder : C.rcvdBorder}`,
          borderRadius: isMine ? '8px 2px 8px 8px' : '2px 8px 8px 8px',
          boxShadow: isMine
            ? `0 2px 10px rgba(16,196,160,0.12), 0 1px 3px rgba(0,0,0,0.25)`
            : `0 1px 4px rgba(0,0,0,0.2)`,
        }}>
          {deleted ? (
            <Typography sx={{ color: C.txt2, fontSize: 14, fontStyle: 'italic' }}>
              This message was deleted
            </Typography>
          ) : (
            <Typography sx={{ color: C.txt1, fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {message.content}
            </Typography>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5, mt: 0.25 }}>
            <Typography sx={{ color: C.txt2, fontSize: 11 }}>
              {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Typography>
            {isMine && <DoneAllIcon sx={{ fontSize: 14, color: C.accent }} />}
          </Box>
        </Box>
        {/* Reactions */}
        {message.reactions.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.25 }}>
            {message.reactions.map((r) => (
              <Box key={r.emoji} sx={{
                display: 'inline-flex', alignItems: 'center', gap: 0.25,
                bgcolor: alpha(C.accent, 0.1), borderRadius: '10px',
                px: 0.75, py: 0.25, fontSize: 12,
                border: `1px solid ${alpha(C.accent, 0.2)}`,
              }}>
                <span>{r.emoji}</span>
                <Typography sx={{ fontSize: 11, color: C.txt2 }}>{r.count}</Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
