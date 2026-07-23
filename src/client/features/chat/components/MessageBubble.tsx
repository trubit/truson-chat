import { useState, lazy, Suspense } from 'react';
import { Box, Typography, Avatar, IconButton, Tooltip } from '@mui/material';
import ReplyIcon from '@mui/icons-material/Reply';
import AddReactionIcon from '@mui/icons-material/AddReaction';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import DoneIcon from '@mui/icons-material/Done';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import BlockIcon from '@mui/icons-material/Block';
import type { Message } from '@shared/types';
import { VoiceNotePlayer } from '@/features/media/components/VoiceNotePlayer';
import { DocumentCard } from '@/features/media/components/DocumentCard';
import { ContactCard } from '@/features/media/components/ContactCard';
import { LocationCard } from '@/features/media/components/LocationCard';

const ImageViewer = lazy(() =>
  import('@/features/media/components/ImageViewer').then((m) => ({ default: m.ImageViewer })),
);

const WA = {
  sentBg: '#0D3D2E', // premium dark teal (richer than WA green)
  sentBorder: 'rgba(16,196,160,0.14)',
  sentShadow: '0 2px 10px rgba(16,196,160,0.12), 0 1px 3px rgba(0,0,0,0.25)',
  rcvdBg: '#12202D', // premium blue-dark (cooler than WA dark)
  rcvdBorder: 'rgba(134,150,160,0.1)',
  rcvdShadow: '0 1px 4px rgba(0,0,0,0.2)',
  text: '#E9EDEF',
  timeTxt: 'rgba(233,237,239,0.52)',
  tickGray: '#8696A0',
  tickBlue: '#53BDEB',
  green: '#10C4A0',
  txt2: '#8696A0',
  actionBg: '#0E1D28',
  border: 'rgba(134,150,160,0.14)',
} as const;

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

function StatusIcon({ status }: { status: Message['status'] }) {
  if (status === 'sent')
    return <DoneIcon sx={{ fontSize: 14, color: WA.tickGray, flexShrink: 0 }} />;
  if (status === 'delivered')
    return <DoneAllIcon sx={{ fontSize: 14, color: WA.tickGray, flexShrink: 0 }} />;
  if (status === 'read')
    return <DoneAllIcon sx={{ fontSize: 14, color: WA.tickBlue, flexShrink: 0 }} />;
  return null;
}

function formatMessageTime(ts: string): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ---------- MessageContent ----------

function MessageContent({ message, isMine: _isMine }: { message: Message; isMine: boolean }) {
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [viewerSrc, setViewerSrc] = useState('');

  if (message.deletedAt) {
    return (
      <Typography variant="body2" sx={{ color: WA.txt2, fontStyle: 'italic', fontSize: '0.82rem' }}>
        This message was deleted
      </Typography>
    );
  }

  const media = message.media?.[0];

  switch (message.type) {
    case 'image':
      return (
        <>
          <Box
            component="img"
            src={media?.url ?? media?.thumbnail ?? ''}
            alt="Image"
            onClick={() => {
              setViewerSrc(media?.url ?? '');
              setImageViewerOpen(true);
            }}
            sx={{
              maxWidth: 260,
              maxHeight: 260,
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'block',
              objectFit: 'cover',
              '&:hover': { opacity: 0.9 },
            }}
          />
          {message.content && (
            <Typography variant="body2" sx={{ mt: 0.5, color: WA.text, fontSize: '0.9rem' }}>
              {message.content}
            </Typography>
          )}
          <Suspense fallback={null}>
            <ImageViewer
              src={viewerSrc}
              open={imageViewerOpen}
              onClose={() => setImageViewerOpen(false)}
            />
          </Suspense>
        </>
      );

    case 'video':
      return (
        <Box sx={{ maxWidth: 280, borderRadius: '6px', overflow: 'hidden' }}>
          <video
            src={media?.url}
            controls
            poster={media?.thumbnail}
            style={{ width: '100%', maxHeight: 200, borderRadius: '6px', display: 'block' }}
          />
          {message.content && (
            <Typography variant="body2" sx={{ mt: 0.5, color: WA.text, fontSize: '0.9rem' }}>
              {message.content}
            </Typography>
          )}
        </Box>
      );

    case 'audio':
      return (
        <Box sx={{ maxWidth: 280 }}>
          <audio src={media?.url} controls style={{ width: '100%' }} />
          {message.content && (
            <Typography variant="body2" sx={{ mt: 0.5, color: WA.text, fontSize: '0.9rem' }}>
              {message.content}
            </Typography>
          )}
        </Box>
      );

    case 'voice_note':
      return (
        <VoiceNotePlayer
          url={media?.url ?? ''}
          duration={media?.duration}
          waveform={media?.waveform}
        />
      );

    case 'file':
      return (
        <DocumentCard
          url={media?.url ?? ''}
          name={media?.originalName ?? 'File'}
          size={media?.size}
          mimeType={media?.mimeType}
        />
      );

    case 'sticker':
      return (
        <Box
          component="img"
          src={media?.url ?? message.content}
          alt="Sticker"
          sx={{ width: 120, height: 120, objectFit: 'contain' }}
        />
      );

    case 'gif':
      return (
        <Box
          component="img"
          src={media?.url ?? message.content}
          alt="GIF"
          sx={{ maxWidth: 260, maxHeight: 200, borderRadius: '6px', display: 'block' }}
        />
      );

    case 'contact': {
      let contactData: {
        displayName?: string;
        phones?: { number: string; type: string }[];
        emails?: { email: string; type: string }[];
      } = {};
      try {
        contactData = JSON.parse(message.content) as typeof contactData;
      } catch {
        /* empty */
      }
      return (
        <ContactCard
          displayName={contactData.displayName ?? 'Contact'}
          phones={contactData.phones ?? []}
          emails={contactData.emails}
        />
      );
    }

    case 'location': {
      let locData: { latitude?: number; longitude?: number; name?: string; address?: string } = {};
      try {
        locData = JSON.parse(message.content) as typeof locData;
      } catch {
        /* empty */
      }
      if (!locData.latitude || !locData.longitude) return null;
      return (
        <LocationCard
          latitude={locData.latitude}
          longitude={locData.longitude}
          name={locData.name}
          address={locData.address}
        />
      );
    }

    default:
      return (
        <Typography
          variant="body2"
          sx={{
            color: WA.text,
            fontSize: '0.9rem',
            lineHeight: 1.5,
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
          }}
        >
          {message.content}
        </Typography>
      );
  }
}

// ---------- MessageBubble ----------

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
  const isBubbleless = message.type === 'sticker'; // stickers have no bubble
  const replyMsg =
    message.replyTo && typeof message.replyTo === 'object' ? (message.replyTo as Message) : null;

  const bubbleBg = isMine ? WA.sentBg : WA.rcvdBg;
  const bubbleBorder = `1px solid ${isMine ? WA.sentBorder : WA.rcvdBorder}`;
  const bubbleShadow = isMine ? WA.sentShadow : WA.rcvdShadow;
  const borderRadius = showAvatar ? (isMine ? '8px 2px 8px 8px' : '2px 8px 8px 8px') : '8px';

  return (
    <Box
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setEmojiPickerOpen(false);
      }}
      sx={{
        display: 'flex',
        flexDirection: isMine ? 'row-reverse' : 'row',
        alignItems: 'flex-end',
        gap: 0.75,
        mb: showAvatar ? 1.25 : 0.375,
        px: 1.75,
      }}
    >
      {/* Avatar — only for others, only on first message in a group */}
      {!isMine && (
        <Box sx={{ width: 32, flexShrink: 0, alignSelf: 'flex-end', mb: 0.5 }}>
          {showAvatar ? (
            <Avatar
              sx={{ width: 32, height: 32, fontSize: 12, fontWeight: 700, bgcolor: '#2A3942' }}
            >
              {(message.sender?.username ?? 'U').charAt(0).toUpperCase()}
            </Avatar>
          ) : null}
        </Box>
      )}

      {/* Content column */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: isMine ? 'flex-end' : 'flex-start',
          maxWidth: '65%',
        }}
      >
        {/* Bubble + floating actions */}
        <Box sx={{ position: 'relative' }}>
          {/* Hover action bar */}
          {hovered && !isDeleted && (
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                transform: 'translateY(-50%)',
                ...(isMine ? { right: '100%', mr: 0.75 } : { left: '100%', ml: 0.75 }),
                display: 'flex',
                alignItems: 'center',
                gap: 0.25,
                bgcolor: WA.actionBg,
                border: `1px solid ${WA.border}`,
                borderRadius: '10px',
                px: 0.5,
                py: 0.25,
                zIndex: 10,
                boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              }}
            >
              <Tooltip title="Reply">
                <IconButton
                  size="small"
                  onClick={() => onReply(message)}
                  sx={{ color: WA.txt2, p: 0.5, '&:hover': { color: WA.text } }}
                >
                  <ReplyIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="React">
                <IconButton
                  size="small"
                  onClick={() => setEmojiPickerOpen((p) => !p)}
                  sx={{ color: WA.txt2, p: 0.5, '&:hover': { color: WA.text } }}
                >
                  <AddReactionIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              {isMine && onDelete && (
                <Tooltip title="Delete">
                  <IconButton
                    size="small"
                    onClick={() => onDelete(message._id)}
                    sx={{ color: WA.txt2, p: 0.5, '&:hover': { color: '#EF4444' } }}
                  >
                    <DeleteOutlinedIcon sx={{ fontSize: 16 }} />
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
                bgcolor: WA.actionBg,
                border: `1px solid ${WA.border}`,
                borderRadius: '14px',
                px: 0.75,
                py: 0.5,
                zIndex: 20,
                boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
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
                    fontSize: 20,
                    cursor: 'pointer',
                    p: 0.375,
                    borderRadius: '6px',
                    transition: 'transform 0.1s',
                    '&:hover': { transform: 'scale(1.3)', bgcolor: 'rgba(255,255,255,0.08)' },
                  }}
                >
                  {emoji}
                </Box>
              ))}
            </Box>
          )}

          {/* ── Bubble ──────────────────────────────────────── */}
          {isDeleted ? (
            /* Deleted message pill */
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                px: 1.75,
                py: 0.875,
                borderRadius: '7.5px',
                bgcolor: isMine ? 'rgba(0,92,75,0.35)' : 'rgba(31,44,52,0.7)',
                border: `1px solid ${WA.border}`,
              }}
            >
              <BlockIcon sx={{ fontSize: 14, color: WA.txt2 }} />
              <Typography sx={{ fontSize: '0.82rem', color: WA.txt2, fontStyle: 'italic' }}>
                This message was deleted
              </Typography>
            </Box>
          ) : isBubbleless ? (
            /* Stickers — no bubble */
            <MessageContent message={message} isMine={isMine} />
          ) : (
            <Box sx={{ position: 'relative' }}>
              {/*
                WhatsApp tail: a clip-path triangle that extends 8 × 13 px
                from the top corner of the bubble, creating the distinctive
                "pointed" look. Only shown for the first message in a group.
              */}
              {showAvatar && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    ...(isMine ? { right: -7 } : { left: -7 }),
                    width: 7,
                    height: 12,
                    bgcolor: bubbleBg,
                    clipPath: isMine
                      ? 'polygon(0 0, 100% 0, 0 100%)'
                      : 'polygon(0 0, 100% 0, 100% 100%)',
                  }}
                />
              )}

              {/* Bubble body */}
              <Box
                sx={{
                  bgcolor: bubbleBg,
                  borderRadius,
                  border: bubbleBorder,
                  boxShadow: bubbleShadow,
                  overflow: 'hidden',
                }}
              >
                {/* Reply preview — inside the bubble (WhatsApp style) */}
                {replyMsg && (
                  <Box
                    sx={{
                      mx: 1.25,
                      mt: 0.875,
                      mb: 0,
                      px: 1,
                      py: 0.5,
                      borderRadius: '4px',
                      bgcolor: 'rgba(0,0,0,0.22)',
                      borderLeft: `3px solid ${isMine ? 'rgba(255,255,255,0.55)' : WA.green}`,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        mb: 0.125,
                        lineHeight: 1.3,
                        color: isMine ? 'rgba(255,255,255,0.85)' : WA.green,
                      }}
                    >
                      {replyMsg.sender?.username ?? 'Unknown'}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '0.75rem',
                        color: isMine ? 'rgba(255,255,255,0.6)' : WA.txt2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        lineHeight: 1.3,
                      }}
                    >
                      {replyMsg.content || 'Media'}
                    </Typography>
                  </Box>
                )}

                {/* Message content */}
                <Box sx={{ px: 1.5, pt: replyMsg ? 0.5 : 0.875, pb: 0 }}>
                  <MessageContent message={message} isMine={isMine} />
                </Box>

                {/* Meta: time + status ticks */}
                <Box
                  sx={{
                    px: 1.25,
                    pb: 0.375,
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    gap: 0.25,
                    mt: 0.25,
                  }}
                >
                  {message.editedAt && (
                    <Typography sx={{ fontSize: '0.625rem', color: WA.timeTxt, lineHeight: 1 }}>
                      edited
                    </Typography>
                  )}
                  <Typography
                    sx={{
                      fontSize: '0.6875rem',
                      color: WA.timeTxt,
                      lineHeight: 1,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {formatMessageTime(message.createdAt)}
                  </Typography>
                  {isMine && <StatusIcon status={message.status} />}
                </Box>
              </Box>
            </Box>
          )}
        </Box>

        {/* Reactions — emoji pills below the bubble */}
        {message.reactions.length > 0 && !isDeleted && (
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0.375,
              mt: 0.375,
              justifyContent: isMine ? 'flex-end' : 'flex-start',
            }}
          >
            {message.reactions.map((r) => (
              <Box
                key={r.emoji}
                onClick={() => onReact(message._id, r.emoji)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.375,
                  px: 0.75,
                  py: 0.125,
                  bgcolor: WA.actionBg,
                  border: `1px solid ${WA.border}`,
                  borderRadius: '100px',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
                }}
              >
                <Typography sx={{ fontSize: 13, lineHeight: 1.6 }}>{r.emoji}</Typography>
                {r.count > 1 && (
                  <Typography sx={{ fontSize: '0.6875rem', color: WA.txt2, lineHeight: 1 }}>
                    {r.count}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
