import { useState, useRef, useCallback, useEffect, type KeyboardEvent } from 'react';
import { Box, IconButton, Tooltip, Typography, alpha } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import CloseIcon from '@mui/icons-material/Close';
import ReplyIcon from '@mui/icons-material/Reply';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import CancelIcon from '@mui/icons-material/Cancel';
import type { Message, MessageMedia } from '@shared/types';
import { MediaPicker }      from '@/features/media/components/MediaPicker';
import { useUpload }        from '@/features/media/hooks/useUpload';
import { useVoiceRecorder } from '@/features/media/hooks/useVoiceRecorder';
import type { StickerItem } from '@/store/stickerStore';
import type { GifItem }     from '@/store/gifStore';

const C = {
  panel:      '#1F2C34',
  border:     'rgba(134,150,160,0.15)',
  accent:     '#10C4A0',
  accentDark: '#0D9E80',
  txt1:       '#E9EDEF',
  txt2:       '#8696A0',
  txt3:       '#567390',
} as const;

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface MessageComposerProps {
  conversationId: string;
  onSend: (content: string, replyTo?: string, media?: MessageMedia[], type?: string) => Promise<void>;
  replyTo?: Message | null;
  onCancelReply: () => void;
  disabled?: boolean;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
}

export default function MessageComposer({
  conversationId,
  onSend,
  replyTo,
  onCancelReply,
  disabled = false,
  onTypingStart,
  onTypingStop,
}: MessageComposerProps) {
  const [content, setContent]             = useState('');
  const [sending, setSending]             = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [pendingFiles, setPendingFiles]   = useState<File[]>([]);

  const textareaRef       = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingEmitRef = useRef<number>(0);
  const isTypingRef       = useRef(false);

  const { upload, uploadVoiceNote } = useUpload();
  const {
    startRecording,
    stopRecording,
    cancel: cancelRecording,
    isRecording,
    audioBlob,
    audioUrl,
    duration,
    waveform,
  } = useVoiceRecorder();

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const maxH = 120;
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

      const now = Date.now();
      if (now - lastTypingEmitRef.current > 3000) {
        lastTypingEmitRef.current = now;
        if (!isTypingRef.current) {
          isTypingRef.current = true;
          onTypingStart?.();
        }
      }

      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(stopTyping, 5000);
    },
    [onTypingStart, stopTyping],
  );

  const handleSend = useCallback(async () => {
    const text = content.trim();
    if ((!text && pendingFiles.length === 0) || sending || disabled) return;
    setSending(true);
    stopTyping();
    try {
      if (pendingFiles.length > 0) {
        // Upload each file and send as separate messages
        for (const file of pendingFiles) {
          const result = await upload(file, { conversationId });
          if (!result) continue;
          const msgType =
            result.type === 'image' ? 'image'
            : result.type === 'video' ? 'video'
            : result.type === 'audio' ? 'audio'
            : 'file';
          await onSend('', replyTo?._id, [{
            url:          result.url,
            publicId:     result.publicId,
            mimeType:     result.mimeType,
            size:         result.size,
            originalName: result.originalName,
            width:        result.width,
            height:       result.height,
            duration:     result.duration,
            thumbnail:    result.thumbnail,
            type:         result.type,
          }], msgType);
        }
        setPendingFiles([]);
        if (text) {
          await onSend(text, replyTo?._id);
        }
      } else if (text) {
        await onSend(text, replyTo?._id);
      }
      setContent('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    } finally {
      setSending(false);
    }
  }, [content, pendingFiles, sending, disabled, onSend, replyTo, stopTyping, upload, conversationId]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void handleSend();
      }
    },
    [handleSend],
  );

  // Send voice note after recording stopped and blob ready
  useEffect(() => {
    if (audioBlob && audioUrl) {
      const sendVoice = async () => {
        setSending(true);
        try {
          const result = await uploadVoiceNote(audioBlob, { conversationId });
          if (result) {
            await onSend('', replyTo?._id, [{
              url:          result.url,
              publicId:     result.publicId,
              mimeType:     result.mimeType,
              size:         result.size,
              originalName: result.originalName,
              duration:     result.duration,
              type:         result.type,
            }], 'voice_note');
          }
        } finally {
          setSending(false);
          cancelRecording();
        }
      };
      void sendVoice();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioBlob]);

  const handleFilesSelected = useCallback((files: File[]) => {
    setPendingFiles((prev) => [...prev, ...files]);
  }, []);

  const handleStickerSelected = useCallback(
    async (sticker: StickerItem) => {
      setSending(true);
      try {
        await onSend(sticker.url, replyTo?._id, undefined, 'sticker');
      } finally {
        setSending(false);
      }
    },
    [onSend, replyTo],
  );

  const handleGifSelected = useCallback(
    async (gif: GifItem) => {
      setSending(true);
      try {
        await onSend(gif.url, replyTo?._id, undefined, 'gif');
      } finally {
        setSending(false);
      }
    },
    [onSend, replyTo],
  );

  const handleLocationShare = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const payload = JSON.stringify({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        void onSend(payload, replyTo?._id, undefined, 'location');
      },
    );
  }, [onSend, replyTo]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, []);

  const canSend = (content.trim().length > 0 || pendingFiles.length > 0) && !sending && !disabled;

  // ---------- Voice recording UI ----------
  if (isRecording) {
    return (
      <Box
        sx={{
          bgcolor: C.panel,
          borderTop: `1px solid ${C.border}`,
          flexShrink: 0,
          px: 1.5,
          py: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        {/* Cancel */}
        <Tooltip title="Cancel recording">
          <IconButton
            size="small"
            onClick={cancelRecording}
            sx={{ color: '#EF4444', '&:hover': { color: '#F87171' } }}
          >
            <CancelIcon sx={{ fontSize: 22 }} />
          </IconButton>
        </Tooltip>

        {/* Waveform bars */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            height: 32,
            overflow: 'hidden',
          }}
        >
          {Array.from({ length: 40 }).map((_, i) => {
            const amp = waveform[waveform.length - 40 + i] ?? 0.05;
            return (
              <Box
                key={i}
                sx={{
                  flex: 1,
                  height: `${Math.max(3, amp * 28)}px`,
                  borderRadius: '1px',
                  bgcolor: C.accent,
                  opacity: 0.5 + amp * 0.5,
                }}
              />
            );
          })}
        </Box>

        {/* Timer */}
        <Typography sx={{ fontSize: 13, color: C.txt2, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
          {formatDuration(duration)}
        </Typography>

        {/* Stop / send */}
        <Tooltip title="Stop and send">
          <IconButton
            size="small"
            onClick={stopRecording}
            sx={{
              width: 36,
              height: 36,
              bgcolor: C.accent,
              color: '#fff',
              '&:hover': { bgcolor: C.accentDark },
            }}
          >
            <StopIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>
      </Box>
    );
  }

  // ---------- Normal composer UI ----------
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
            bgcolor: 'rgba(16,196,160,0.06)',
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
              {replyTo.content || 'Media'}
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

      {/* Pending file previews */}
      {pendingFiles.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            gap: 0.75,
            px: 1.5,
            pt: 0.75,
            flexWrap: 'wrap',
          }}
        >
          {pendingFiles.map((file, idx) => (
            <Box
              key={idx}
              sx={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                px: 1,
                py: 0.4,
                bgcolor: 'rgba(16,196,160,0.08)',
                border: `1px solid ${C.border}`,
                borderRadius: '8px',
                maxWidth: 160,
              }}
            >
              <Typography
                sx={{
                  fontSize: 11,
                  color: C.txt2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {file.name}
              </Typography>
              <IconButton
                size="small"
                onClick={() => setPendingFiles((p) => p.filter((_, i) => i !== idx))}
                sx={{ p: 0, color: C.txt3, ml: 0.25, '&:hover': { color: '#EF4444' } }}
              >
                <CloseIcon sx={{ fontSize: 12 }} />
              </IconButton>
            </Box>
          ))}
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
            sx={{ color: C.txt3, mb: 0.25, '&:hover': { color: C.txt2 } }}
          >
            <EmojiEmotionsIcon sx={{ fontSize: 22 }} />
          </IconButton>
        </Tooltip>

        {/* Attachment button */}
        <Tooltip title="Attach media">
          <IconButton
            size="small"
            disabled={disabled}
            onClick={() => setMediaPickerOpen(true)}
            sx={{ color: C.txt3, mb: 0.25, '&:hover': { color: C.accent } }}
          >
            <AttachFileIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>

        {/* Text input */}
        <Box
          sx={{
            flex: 1,
            bgcolor: '#2A3942',
            borderRadius: '16px',
            border: `1px solid ${C.border}`,
            px: 1.75,
            py: 0.85,
            transition: 'all 0.2s',
            '&:focus-within': {
              borderColor: alpha(C.accent, 0.5),
              boxShadow: `0 0 0 3px rgba(16,196,160,0.1)`,
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
              color: '#E9EDEF',
              lineHeight: '1.5',
              maxHeight: '120px',
              overflow: 'auto',
            }}
          />
        </Box>

        {/* Mic or Send */}
        {content.trim().length === 0 && pendingFiles.length === 0 ? (
          <Tooltip title="Voice message">
            <IconButton
              size="small"
              disabled={disabled}
              onClick={() => { void startRecording(); }}
              sx={{
                mb: 0.25,
                width: 38,
                height: 38,
                bgcolor: 'rgba(255,255,255,0.05)',
                color: C.txt3,
                transition: 'all 0.2s',
                '&:hover': {
                  bgcolor: 'rgba(16,196,160,0.12)',
                  color: C.accent,
                },
              }}
            >
              <MicIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
        ) : (
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
                  ? `linear-gradient(135deg, ${C.accent} 0%, #3DD4B8 100%)`
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
        )}
      </Box>

      {/* Media Picker */}
      <MediaPicker
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onFilesSelected={handleFilesSelected}
        onStickerSelected={(s) => { void handleStickerSelected(s); }}
        onGifSelected={(g) => { void handleGifSelected(g); }}
        onLocationShare={handleLocationShare}
      />
    </Box>
  );
}
