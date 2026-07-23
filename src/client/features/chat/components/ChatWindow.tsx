import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  Fragment,
} from 'react';
import { Box, Typography, Avatar, IconButton, Skeleton, Badge, Fab } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useConversationStore } from '@/store/conversationStore';
import { useMessageStore } from '@/store/messageStore';
import { usePresenceStore } from '@/store/presenceStore';
import { useSocketStore } from '@/store';
import { getChatSocket } from '../hooks/useChatSocket';
import { useMessages } from '../queries/index';
import MessageBubble from './MessageBubble';
import MessageComposer from './MessageComposer';
import TypingIndicator from './TypingIndicator';
import type { Message, MessageMedia } from '@shared/types';
import { ROUTES } from '@/routes/index';

const EMPTY_MESSAGES: Message[] = [];

const C = {
  panelHdr: '#0E1E2B', // header bar — premium dark blue
  main: '#08111A', // chat area — deep midnight
  border: 'rgba(134,150,160,0.12)',
  accent: '#10C4A0',
  accentDark: '#0D9E80',
  teal: '#53BDEB', // blue read-ticks
  txt1: '#E9EDEF',
  txt2: '#8696A0',
  txt3: '#567390',
  badge: '#10C4A0',
} as const;

function formatDateLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}

function DateDivider({ label }: { label: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 1.25 }}>
      <Box
        sx={{
          px: 1.5,
          py: 0.375,
          bgcolor: '#182229',
          borderRadius: '6px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
        }}
      >
        <Typography sx={{ fontSize: '0.6875rem', color: '#8696A0', fontWeight: 500 }}>
          {label}
        </Typography>
      </Box>
    </Box>
  );
}

interface ChatWindowProps {
  conversationId: string;
  sendMessage: (payload: {
    conversationId: string;
    type: import('@shared/types').MessageType;
    content: string;
    replyTo?: string;
    media?: import('@shared/types').MessageMedia[];
  }) => Promise<{ success: boolean; message?: Message; error?: string }>;
  sendTypingStart: (conversationId: string) => void;
  sendTypingStop: (conversationId: string) => void;
  sendRead: (conversationId: string, messageId: string) => void;
  sendDeleteMessage: (messageId: string) => Promise<{ success: boolean; error?: string }>;
  sendReactToMessage: (
    messageId: string,
    emoji: string,
    conversationId: string,
  ) => Promise<{ success: boolean; error?: string }>;
}

export default function ChatWindow({
  conversationId,
  sendMessage,
  sendTypingStart,
  sendTypingStop,
  sendRead,
  sendDeleteMessage,
  sendReactToMessage,
}: ChatWindowProps) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const conversation = useConversationStore((s) => s.conversations.get(conversationId));
  const resetUnread = useConversationStore((s) => s.resetUnread);
  const messages = useMessageStore((s) => s.messages[conversationId] ?? EMPTY_MESSAGES);
  const presencesRef = usePresenceStore((s) => s.presences);

  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [newMsgCount, setNewMsgCount] = useState(0);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  // Tracks which conversation's initial scroll we have already done
  const initialConvRef = useRef<string>('');

  const { isLoading, fetchNextPage, hasNextPage } = useMessages(conversationId);
  const isConnected = useSocketStore((s) => s.isConnected);

  // ── Ensure this socket is in the conversation room (handles new DMs created after connect) ──
  useEffect(() => {
    const socket = getChatSocket();
    if (!socket || !conversationId) return;
    socket.emit('conversation:join', { conversationId });
  }, [conversationId, isConnected]);

  // ── Reset per-conversation state ──────────────────────────────────────────
  useEffect(() => {
    isAtBottomRef.current = true;
    setIsAtBottom(true);
    setNewMsgCount(0);
    setReplyTo(null);
  }, [conversationId]);

  // ── Track scroll position ─────────────────────────────────────────────────
  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    isAtBottomRef.current = atBottom;
    setIsAtBottom(atBottom);
    if (atBottom) setNewMsgCount(0);
  }, []);

  // ── Initial jump to bottom (synchronous, before paint, once per conversation)
  useLayoutEffect(() => {
    if (messages.length === 0) return;
    if (initialConvRef.current === conversationId) return; // already done
    initialConvRef.current = conversationId;
    isAtBottomRef.current = true;
    setIsAtBottom(true);
    setNewMsgCount(0);
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight; // instant scroll — no rAF needed here
  }, [messages.length, conversationId]);

  // ── Scroll when new messages arrive on an already-open conversation ────────
  useEffect(() => {
    if (messages.length === 0) return;
    if (initialConvRef.current !== conversationId) return; // still on initial load

    const lastMsg = messages[messages.length - 1];
    const isMyMsg = lastMsg?.senderId === user?._id;
    if (isAtBottomRef.current || isMyMsg) {
      // Smooth-scroll to bottom so the user sees the new message land
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
      setNewMsgCount(0);
      setIsAtBottom(true);
      isAtBottomRef.current = true;
    } else {
      setNewMsgCount((c) => c + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, conversationId]);

  // ── Mark as read whenever the open conversation gets new messages ─────────
  useEffect(() => {
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    sendRead(conversationId, lastMsg._id);
    resetUnread(conversationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, messages.length]);

  // ── Infinite scroll — load older messages when sentinel enters viewport ───
  useEffect(() => {
    const sentinel = topSentinelRef.current;
    const container = messagesContainerRef.current;
    if (!sentinel || !container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage) void fetchNextPage();
      },
      { root: container, threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, fetchNextPage]);

  const scrollToBottom = useCallback(() => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    setNewMsgCount(0);
    setIsAtBottom(true);
    isAtBottomRef.current = true;
  }, []);

  // ── Message actions ───────────────────────────────────────────────────────
  const handleSend = useCallback(
    async (content: string, replyToId?: string, media?: MessageMedia[], type?: string) => {
      const result = await sendMessage({
        conversationId,
        type: (type ?? 'text') as import('@shared/types').MessageType,
        content,
        replyTo: replyToId,
        media,
      });
      // Immediately add to store from the callback so the sender always sees
      // their message without waiting for the socket room broadcast echo.
      if (result.success && result.message) {
        useMessageStore.getState().appendMessage(result.message);
        useConversationStore.getState().updateLastMessage(result.message.conversationId, {
          messageId: result.message._id,
          content: result.message.content,
          senderId: result.message.senderId,
          type: result.message.type,
          timestamp: result.message.createdAt,
        });
      }
      setReplyTo(null);
    },
    [conversationId, sendMessage],
  );

  const handleDelete = useCallback(
    async (messageId: string) => {
      await sendDeleteMessage(messageId);
    },
    [sendDeleteMessage],
  );

  const handleReact = useCallback(
    async (messageId: string, emoji: string) => {
      await sendReactToMessage(messageId, emoji, conversationId);
    },
    [sendReactToMessage, conversationId],
  );

  // ── Derived values ────────────────────────────────────────────────────────
  const convName = useMemo(() => {
    if (!conversation) return 'Chat';
    if (conversation.metadata.name) return conversation.metadata.name;
    if (conversation.type === 'direct') {
      const otherId = conversation.participants?.find((p) => p !== user?._id);
      const profile = conversation.memberProfiles?.find((pr) => pr.userId === otherId);
      return profile?.displayName ?? profile?.username ?? 'Direct Message';
    }
    return 'Chat';
  }, [conversation, user?._id]);

  const otherUserId = useMemo(() => {
    if (!conversation || conversation.type !== 'direct') return null;
    return conversation.participants?.find((p) => p !== user?._id) ?? null;
  }, [conversation, user?._id]);

  const otherPresence = otherUserId ? presencesRef[otherUserId] : null;
  const isOnline = otherPresence?.status === 'online';

  // Group messages: avatar visibility + date separator
  const groupedMessages = useMemo(() => {
    return messages.map((msg, idx) => {
      const prev = messages[idx - 1];
      const showAvatar =
        !prev ||
        prev.senderId !== msg.senderId ||
        new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() > 60_000 * 5;
      const showDateSep =
        !prev || new Date(msg.createdAt).toDateString() !== new Date(prev.createdAt).toDateString();
      return { msg, showAvatar, showDateSep };
    });
  }, [messages]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: C.main }}>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <Box
        sx={{
          height: 64,
          flexShrink: 0,
          background: `linear-gradient(180deg, ${C.panelHdr} 0%, rgba(14,30,43,0.98) 100%)`,
          borderBottom: `1px solid ${C.border}`,
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          px: 2,
          gap: 1.5,
        }}
      >
        <IconButton
          size="small"
          onClick={() => navigate(ROUTES.CHAT)}
          sx={{ color: C.txt2, display: { md: 'none' }, '&:hover': { color: C.txt1 } }}
        >
          <ArrowBackIcon sx={{ fontSize: 20 }} />
        </IconButton>

        {/* Avatar with gradient ring when online */}
        <Box
          sx={{
            position: 'relative',
            flexShrink: 0,
            p: '2px',
            borderRadius: '50%',
            background: isOnline ? 'linear-gradient(135deg, #10C4A0, #0D9E80)' : 'transparent',
            boxShadow: isOnline ? '0 0 12px rgba(16,196,160,0.4)' : 'none',
          }}
        >
          <Avatar
            sx={{
              width: 40,
              height: 40,
              fontSize: 15,
              fontWeight: 700,
              bgcolor: '#1A2E3A',
              border: `2px solid ${C.panelHdr}`,
            }}
          >
            {convName.charAt(0).toUpperCase()}
          </Avatar>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: 14.5,
              fontWeight: 700,
              color: C.txt1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              letterSpacing: '-0.2px',
            }}
          >
            {convName}
          </Typography>
          {otherPresence ? (
            <Typography
              sx={{
                fontSize: 11.5,
                color: isOnline ? C.accent : C.txt3,
                fontWeight: isOnline ? 600 : 400,
              }}
            >
              {isOnline
                ? '● Online'
                : otherPresence.lastSeen
                  ? `Last seen ${new Date(otherPresence.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : 'Offline'}
            </Typography>
          ) : (
            <Typography sx={{ fontSize: 11.5, color: C.txt3 }}>
              {conversation?.type === 'group'
                ? `${conversation.participants?.length ?? 0} members`
                : ''}
            </Typography>
          )}
        </Box>

        <IconButton
          size="small"
          sx={{ color: C.txt2, '&:hover': { color: C.accent, bgcolor: 'rgba(16,196,160,0.08)' } }}
        >
          <PhoneOutlinedIcon sx={{ fontSize: 19 }} />
        </IconButton>
        <IconButton
          size="small"
          sx={{ color: C.txt2, '&:hover': { color: C.accent, bgcolor: 'rgba(16,196,160,0.08)' } }}
        >
          <VideocamOutlinedIcon sx={{ fontSize: 20 }} />
        </IconButton>
        <IconButton size="small" sx={{ color: C.txt2, '&:hover': { color: C.txt1 } }}>
          <MoreVertIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Box>

      {/* ── Messages area ─────────────────────────────────────────────────── */}
      {/*
        The outer wrapper is relative so the scroll-to-bottom FAB can float
        over the message list without affecting the layout.
      */}
      <Box
        sx={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box
          ref={messagesContainerRef}
          onScroll={handleScroll}
          sx={{
            flex: 1,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.022) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            '&::-webkit-scrollbar': { width: 4 },
            '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.07)', borderRadius: 4 },
          }}
        >
          {isLoading && messages.length === 0 ? (
            /* Skeleton placeholders while the first page loads */
            <Box sx={{ px: 2, py: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {Array.from({ length: 7 }).map((_, i) => (
                <Box
                  key={i}
                  sx={{
                    display: 'flex',
                    justifyContent: i % 2 === 0 ? 'flex-start' : 'flex-end',
                    gap: 1,
                    alignItems: 'flex-end',
                  }}
                >
                  {i % 2 === 0 && (
                    <Skeleton
                      variant="circular"
                      width={28}
                      height={28}
                      sx={{ bgcolor: 'rgba(255,255,255,0.06)', flexShrink: 0 }}
                    />
                  )}
                  <Skeleton
                    variant="rounded"
                    width={`${38 + ((i * 17 + 5) % 28)}%`}
                    height={36 + (i % 3) * 8}
                    sx={{ borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.06)' }}
                  />
                </Box>
              ))}
            </Box>
          ) : (
            <>
              {/*
                KEY TRICK: This spacer grows to fill all available space when
                there are few messages, pushing them to the bottom — exactly
                like WhatsApp. When messages overflow the container the spacer
                collapses to zero and messages fill the scroll area normally.
              */}
              <Box sx={{ flex: 1 }} />

              {/* Sentinel — observed relative to the scroll container so that
                  loading-more only triggers when the user actually scrolls up
                  to the top, not just because the page fits on screen. */}
              <Box ref={topSentinelRef} sx={{ height: 2 }} />

              {messages.length === 0 ? (
                <Box
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 6 }}
                >
                  <Typography sx={{ fontSize: 13.5, color: C.txt3 }}>
                    No messages yet. Say hello! 👋
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ pb: 1 }}>
                  {groupedMessages.map(({ msg, showAvatar, showDateSep }) => (
                    <Fragment key={msg._id}>
                      {showDateSep && <DateDivider label={formatDateLabel(msg.createdAt)} />}
                      <MessageBubble
                        message={msg}
                        isMine={msg.senderId === user?._id}
                        showAvatar={showAvatar}
                        onReply={setReplyTo}
                        onReact={handleReact}
                        onDelete={msg.senderId === user?._id ? handleDelete : undefined}
                      />
                    </Fragment>
                  ))}
                </Box>
              )}

              {/* Invisible anchor — scrollIntoView snaps here */}
              <Box ref={messagesEndRef} sx={{ height: 0 }} />
            </>
          )}
        </Box>

        {/* Scroll-to-bottom FAB — shows whenever the user has scrolled up */}
        {(!isAtBottom || newMsgCount > 0) && (
          <Box sx={{ position: 'absolute', bottom: 16, right: 16, zIndex: 10 }}>
            <Badge
              badgeContent={newMsgCount > 0 ? newMsgCount : undefined}
              max={99}
              sx={{
                '& .MuiBadge-badge': {
                  bgcolor: C.accent,
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 700,
                  minWidth: 18,
                  height: 18,
                  top: 2,
                  right: 2,
                },
              }}
            >
              <Fab
                size="small"
                onClick={scrollToBottom}
                sx={{
                  width: 38,
                  height: 38,
                  bgcolor: C.accent,
                  boxShadow: '0 4px 16px rgba(16,196,160,0.45)',
                  '&:hover': { bgcolor: C.accentDark, transform: 'scale(1.08)' },
                  transition: 'all 0.2s',
                }}
              >
                <KeyboardArrowDownIcon sx={{ color: '#fff', fontSize: 20 }} />
              </Fab>
            </Badge>
          </Box>
        )}
      </Box>

      {/* ── Typing indicator ─────────────────────────────────────────────── */}
      {user && (
        <Box sx={{ px: 2, minHeight: 28, bgcolor: '#0A1722' }}>
          <TypingIndicator conversationId={conversationId} currentUserId={user._id} />
        </Box>
      )}

      {/* ── Composer ─────────────────────────────────────────────────────── */}
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
