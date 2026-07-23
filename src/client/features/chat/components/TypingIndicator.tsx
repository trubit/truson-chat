import { Box, Typography } from '@mui/material';
import { useTypingStore } from '@/store/typingStore';

const C = {
  accent: '#9B6DFF',
  txt2: '#94A3B8',
} as const;

const EMPTY_ARRAY: string[] = [];

interface TypingIndicatorProps {
  conversationId: string;
  currentUserId: string;
}

export default function TypingIndicator({ conversationId, currentUserId }: TypingIndicatorProps) {
  const typing = useTypingStore((s) => s.typing[conversationId] ?? EMPTY_ARRAY);
  const others = typing.filter((uid) => uid !== currentUserId);

  if (others.length === 0) return null;

  const label = others.length === 1 ? `Someone is typing…` : `${others.length} people are typing…`;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 2,
        py: 0.75,
        minHeight: 28,
      }}
    >
      {/* Bouncing dots */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            sx={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              bgcolor: C.accent,
              opacity: 0.8,
              animation: 'typing-bounce 1.2s ease-in-out infinite',
              animationDelay: `${i * 0.2}s`,
              '@keyframes typing-bounce': {
                '0%, 60%, 100%': { transform: 'translateY(0)' },
                '30%': { transform: 'translateY(-5px)' },
              },
            }}
          />
        ))}
      </Box>
      <Typography sx={{ fontSize: 12, color: C.txt2, fontStyle: 'italic' }}>{label}</Typography>
    </Box>
  );
}
