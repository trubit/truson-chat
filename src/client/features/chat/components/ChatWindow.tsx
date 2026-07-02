import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import {
  Box,
  Typography,
  Avatar,
  IconButton,
  Skeleton,
  alpha,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useConversationStore } from '@/store/conversationStore';
import { useMessageStore } from '@/store/messageStore';
import { usePresenceStore } from '@/store/presenceStore';
import { useMessages } from '../queries/index';
import MessageBubble from './MessageBubble';
import MessageComposer from './MessageComposer';
import TypingIndicator from './TypingIndicator';
import type { Message } from '@shared/types';
import { ROUTES } from '@/routes/index';

const C = {
  panel: '#080C18',
  panelHdr: '#0B1022',
  main: '#060914',
  border: 'rgba(139,92,246,0.12)',
  accent: '#9B6DFF',
  accentDark: '#7C3AED',
  teal: '#22D3EE',
  txt1: '#F1F5F9',
  txt2: '#94A3B8',
  txt3: '#475569',
  badge: '#10B981',
} as const;

interface ChatWindowProps {
  conversationId: string;
  sendMessage: (payload: {
    conversationId: string;
    type: 'text';
    content: string;
    replyTo?: string;
  }) => Promise<{ success: boolean; message?: Message; error?: string }>;
  sendTypingStart: (conversationId: string) => void;
  sendTypingStop: (conversationId: string) => void;
  sendRead: (conversationId: string, messageId: string) => void;
}

export default function ChatWindow({
  conversationId,
  sendMessage,
  sendTypingStart,
  sendTypingStop,
  sendRead,
}: ChatWindowProps) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { conversations, resetUnread } = useConversationStore();
  const messages = useMessageStore((s) => s.messages[conversationId] ?? []);
  const presences = usePresenceStore((s) => s.presences);

  const conversation = conversations.get(conversationId);

  const [replyTo, setReplyTo] = useState<Message | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);

  // Load messages
  const { isLoading, fetchNextPage, hasNextPage } = useMessages(conversationId);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Mark as read when conversation is open
  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      sendRead(conversationId, lastMsg._id);
      resetUnread(conversationId);
    }
  }, [conversationId, messages.length, sendRead, resetUnread]);

  // Intersection observer to load older messages
  useEffect(() => {
    const sentinel = topSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage) {
          void fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, fetchNextPage]);

  const handleSend = useCallback(
    async (content: string, replyToId?: string) => {
      await sendMessage({
        conversationId,
        type: 'text',
        content,
        replyTo: replyToId,
      });
      setReplyTo(null);
    },
    [conversationId, sendMessage],
  );

  const handleReact = useCallback(
    (_messageId: string, _emoji: string) => {
      // React via socket — extend later
    },
    [],
  );

  const handleDelete = useCallback(
    (_messageId: string) => {
      // Delete via socket — extend later
    },
    [],
  );

  // Determine conversation display name
  const convName = useMemo(() => {
    if (!conversation) return 'Chat';
    return conversation.metadata.name ?? 'Direct Message';
  }, [conversation]);

  // Get other user's ID for presence (direct conversations)
  const otherUserId = useMemo(() => {
    if (!conversation || conversation.type !== 'direct') return null;
    return (
      conversation.participants?.find((p) => p !== user?._id) ?? null
    );
  }, [conversation, user]);

  const otherPresence = otherUserId ? presences[otherUserId] : null;
  const isOnline = otherPresence?.status === 'online';

  // Group messages by sender for avatar display
  const groupedMessages = useMemo(() => {
    return messages.map((msg, idx) => {
      const prev = messages[idx - 1];
      const showAvatar =
        !prev ||
        prev.senderId !== msg.senderId ||
        new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() > 60_000 * 5;
      return { msg, showAvatar };
    });
  }, [messages]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: C.main,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          height: 64,
          flexShrink: 0,
          bgcolor: C.panelHdr,
          borderBottom: `1px solid ${C.border}`,
          display: 'flex',
          alignItems: 'center',
          px: 2,
          gap: 1.5,
        }}
      >
        {/* Back button (mobile) */}
        <IconButton
          size="small"
          onClick={() => navigate(ROUTES.CHAT)}
          sx={{
            color: C.txt2,
            display: { md: 'none' },
            '&:hover': { color: C.txt1 },
          }}
        >
          <ArrowBackIcon sx={{ fontSize: 20 }} />
        </IconButton>

        {/* Avatar + info */}
        <Avatar
          sx={{
            width: 38,
            height: 38,
            fontSize: 14,
            fontWeight: 700,
            background: `linear-gradient(135deg, ${C.accentDark} 0%, ${C.accent} 100%)`,
            flexShrink: 0,
          }}
        >
          {convName.charAt(0).toUpperCase()}
        </Avatar>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: 14,
              fontWeight: 600,
              color: C.txt1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {convName}
          </Typography>
          {otherPresence && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: isOnline ? C.badge : C.txt3,
                }}
              />
              <Typography sx={{ fontSize: 11.5, color: isOnline ? C.badge : C.txt3 }}>
                {isOnline
                  ? 'Online'
                  : otherPresence.lastSeen
                    ? `Last seen ${new Date(otherPresence.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'Offline'}
              </Typography>
            </Box>
          )}
        </Box>

        <IconButton size="small" sx={{ color: C.txt2, '&:hover': { color: C.txt1 } }}>
          <MoreVertIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Box>

      {/* Messages */}
      <Box
        ref={messagesContainerRef}
        sx={{
          flex: 1,
          overflow: 'auto',
          py: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Top sentinel for infinite scroll */}
        <Box ref={topSentinelRef} sx={{ height: 1 }} />

        {isLoading && messages.length === 0 ? (
          // Skeleton loading
          <Box sx={{ px: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Box
                key={i}
                sx={{
                  display: 'flex',
                  justifyContent: i % 2 === 0 ? 'flex-start' : 'flex-end',
                  gap: 1,
                }}
              >
                {i % 2 === 0 && (
                  <Skeleton variant="circular" width={28} height={28} sx={{ bgcolor: 'rgba(255,255,255,0.06)' }} />
                )}
                <Skeleton
                  variant="rounded"
                  width={`${40 + Math.random() * 30}%`}
                  height={40}
                  sx={{ borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.06)' }}
                />
              </Box>
            ))}
          </Box>
        ) : messages.length === 0 ? (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              py: 4,
            }}
          >
            <Typography sx={{ fontSize: 13.5, color: C.txt3 }}>
              No messages yet. Say hello! 👋
            </Typography>
          </Box>
        ) : (
          groupedMessages.map(({ msg, showAvatar }) => (
            <MessageBubble
              key={msg._id}
              message={msg}
              isMine={msg.senderId === user?._id}
              showAvatar={showAvatar}
              onReply={setReplyTo}
              onReact={handleReact}
              onDelete={msg.senderId === user?._id ? handleDelete : undefined}
            />
          ))
        )}

        <Box ref={messagesEndRef} />
      </Box>

      {/* Typing indicator */}
      {user && (
        <Box
          sx={{
            px: 2,
            minHeight: 28,
            bgcolor: C.main,
          }}
        >
          <TypingIndicator
            conversationId={conversationId}
            currentUserId={user._id}
          />
        </Box>
      )}

      {/* Composer */}
      <MessageComposer
        conversationId={conversationId}
        onSend={handleSend}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        disabled={conversation?.metadata.isReadOnly}
        onTypingStart={() => sendTypingStart(conversationId)}
        onTypingStop={() => sendTypingStop(conversationId)}
      />
    </Box>
  );
}



