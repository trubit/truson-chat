import { useState, useRef, useCallback, useEffect, type KeyboardEvent } from 'react';
import { Box, IconButton, Tooltip, Typography, alpha } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import CloseIcon from '@mui/icons-material/Close';
import ReplyIcon from '@mui/icons-material/Reply';
import type { Message } from '@shared/types';

const C = {
  panel: '#080C18',
  border: 'rgba(139,92,246,0.12)',
  accent: '#9B6DFF',
  accentDark: '#7C3AED',
  txt1: '#F1F5F9',
  txt2: '#94A3B8',
  txt3: '#475569',
} as const;

interface MessageComposerProps {
  conversationId: string;
  onSend: (content: string, replyTo?: string) => Promise<void>;
  replyTo?: Message | null;
  onCancelReply: () => void;
  disabled?: boolean;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
}

export default function MessageComposer({
  onSend,
  replyTo,
  onCancelReply,
  disabled = false,
  onTypingStart,
  onTypingStop,
}: MessageComposerProps) {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingEmitRef = useRef<number>(0);
  const isTypingRef = useRef(false);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const maxH = 120; // ~5 rows
    el.style.height = `${Math.min(el.scrollHeight, maxH)}px`;
  }, [content]);

  const stopTyping = useCallback(() => {
    if (isTypingRef.current) {
      isTypingRef.current = false;
      onTypingStop?.();
    }
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
  }, [onTypingStop]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setContent(e.target.value);

      // Emit typing:start at most once every 3s
      const now = Date.now();
      if (now - lastTypingEmitRef.current > 3000) {
        lastTypingEmitRef.current = now;
        if (!isTypingRef.current) {
          isTypingRef.current = true;
          onTypingStart?.();
        }
      }

      // Reset stop timer
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(stopTyping, 5000);
    },
    [onTypingStart, stopTyping],
  );

  const handleSend = useCallback(async () => {
    const text = content.trim();
    if (!text || sending || disabled) return;
    setSending(true);
    stopTyping();
    try {
      await onSend(text, replyTo?._id);
      setContent('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } finally {
      setSending(false);
    }
  }, [content, sending, disabled, onSend, replyTo, stopTyping]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void handleSend();
      }
    },
    [handleSend],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, []);

  const canSend = content.trim().length > 0 && !sending && !disabled;

  return (
    <Box
      sx={{
        bgcolor: C.panel,
        borderTop: `1px solid ${C.border}`,
        flexShrink: 0,
      }}
    >
      {/* Reply preview */}
      {replyTo && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 0.75,
            bgcolor: 'rgba(155,109,255,0.06)',
            borderBottom: `1px solid ${C.border}`,
            borderLeft: `3px solid ${C.accent}`,
          }}
        >
          <ReplyIcon sx={{ fontSize: 16, color: C.accent, flexShrink: 0 }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 11, color: C.accent, fontWeight: 600 }}>
              Replying to {replyTo.sender?.username ?? 'message'}
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
              {replyTo.content || '📎 Media'}
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={onCancelReply}
            sx={{ color: C.txt3, p: 0.5, '&:hover': { color: C.txt2 } }}
          >
            <CloseIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Box>
      )}

      {/* Input row */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 0.5,
          px: 1.5,
          py: 1,
        }}
      >
        {/* Emoji button */}
        <Tooltip title="Emoji">
          <IconButton
            size="small"
            disabled={disabled}
            sx={{
              color: C.txt3,
              mb: 0.25,
              '&:hover': { color: C.txt2 },
            }}
          >
            <EmojiEmotionsIcon sx={{ fontSize: 22 }} />
          </IconButton>
        </Tooltip>

        {/* Text input */}
        <Box
          sx={{
            flex: 1,
            bgcolor: 'rgba(255,255,255,0.04)',
            borderRadius: '16px',
            border: `1px solid ${C.border}`,
            px: 1.75,
            py: 0.85,
            transition: 'all 0.2s',
            '&:focus-within': {
              borderColor: alpha(C.accent, 0.4),
              boxShadow: `0 0 0 3px rgba(155,109,255,0.08)`,
            },
          }}
        >
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="Type a message…"
            rows={1}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              fontFamily: 'inherit',
              fontSize: '14px',
              color: '#F1F5F9',
              lineHeight: '1.5',
              maxHeight: '120px',
              overflow: 'auto',
            }}
          />
        </Box>

        {/* Send button */}
        <IconButton
          onClick={() => { void handleSend(); }}
          disabled={!canSend}
          sx={{
            mb: 0.25,
            width: 38,
            height: 38,
            background: canSend
              ? `linear-gradient(135deg, ${C.accentDark} 0%, ${C.accent} 100%)`
              : 'rgba(255,255,255,0.06)',
            color: canSend ? '#fff' : C.txt3,
            transition: 'all 0.2s',
            '&:hover': {
              background: canSend
                ? `linear-gradient(135deg, ${C.accent} 0%, #B68DFF 100%)`
                : 'rgba(255,255,255,0.08)',
              transform: canSend ? 'scale(1.05)' : 'none',
            },
            '&.Mui-disabled': {
              background: 'rgba(255,255,255,0.06)',
              color: C.txt3,
            },
          }}
        >
          <SendIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>
    </Box>
  );
}
