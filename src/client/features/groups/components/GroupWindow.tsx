import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Avatar,
  IconButton,
  CircularProgress,
  alpha,
  InputBase,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import EmojiEmotionsOutlinedIcon from '@mui/icons-material/EmojiEmotionsOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import GroupMessageBubble from './GroupMessageBubble';
import GroupInfoDrawer from './GroupInfoDrawer';
import { useGroup, useGroupMessages, useSendGroupMessage } from '../queries/index';
import { useGroupStore } from '@/store/groupStore';
import { useAuthStore } from '@/store';
import { useGroupSocket } from '../hooks/useGroupSocket';
import { useNavigate } from 'react-router-dom';

const C = {
  main: '#08111A',
  panelHdr: '#0E1E2B',
  accent: '#10C4A0',
  txt1: '#E9EDEF',
  txt2: '#8696A0',
  border: 'rgba(134,150,160,0.1)',
  inputBg: '#1F2C34',
} as const;

interface Props {
  groupId: string;
  channelId?: string;
}

export default function GroupWindow({ groupId, channelId }: Props) {
  const { data: groupDetail } = useGroup(groupId);
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = useGroupMessages(groupId, channelId);
  const sendMutation = useSendGroupMessage();
  const [text, setText] = useState('');
  const [infoOpen, setInfoOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const myId = useAuthStore((s) => s.user?._id);
  const store = useGroupStore();
  const msgs = store.messages.get(groupId) ?? [];
  const typingUsers = store.typingUsers.get(groupId) ?? new Set();
  const resetUnread = useGroupStore((s) => s.resetUnread);

  useGroupSocket(groupId);

  // Clear unread badge while the user is actively viewing this group
  useEffect(() => {
    resetUnread(groupId);
  }, [groupId, msgs.length, resetUnread]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs.length]);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      if (el.scrollTop < 80 && hasNextPage && !isFetchingNextPage) void fetchNextPage();
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  async function handleSend() {
    const content = text.trim();
    if (!content) return;
    setText('');
    try {
      await sendMutation.mutateAsync({ groupId, channelId, content });
    } catch {
      /* handled globally */
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  if (!groupDetail) {
    return (
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: C.main,
        }}
      >
        <CircularProgress sx={{ color: C.accent }} />
      </Box>
    );
  }

  const name = channelId ? '#channel' : groupDetail.name;
  const subtitle = `${groupDetail.memberCount.toLocaleString()} participants`;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: C.main }}>
      {/* WhatsApp-style header — entire left section is clickable to open Group Info */}
      <Box
        sx={{
          px: 1,
          py: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          background: `linear-gradient(180deg, ${C.panelHdr} 0%, rgba(14,30,43,0.98) 100%)`,
          backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${C.border}`,
          flexShrink: 0,
        }}
      >
        {/* Back button — navigates to /chat on mobile */}
        <IconButton
          size="small"
          onClick={() => navigate('/chat')}
          sx={{ color: C.txt2, '&:hover': { color: C.txt1 }, display: { md: 'none' } }}
        >
          <ArrowBackIcon sx={{ fontSize: 20 }} />
        </IconButton>

        {/* Clickable group identity → opens Group Info */}
        <Box
          onClick={() => setInfoOpen(true)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            flex: 1,
            cursor: 'pointer',
            borderRadius: '10px',
            px: 1,
            py: 0.5,
            '&:hover': { bgcolor: alpha('#fff', 0.04) },
            transition: 'background 0.15s',
          }}
        >
          <Avatar
            src={groupDetail.avatar?.url}
            sx={{
              width: 40,
              height: 40,
              background: !groupDetail.avatar
                ? 'linear-gradient(135deg, #10C4A0, #0D9E80)'
                : undefined,
              bgcolor: C.accent,
              fontWeight: 700,
              fontSize: 16,
              boxShadow: `0 0 0 2px #0E1E2B, 0 0 0 3px ${alpha(C.accent, 0.3)}`,
            }}
          >
            {groupDetail.name[0]?.toUpperCase()}
          </Avatar>
          <Box>
            <Typography sx={{ color: C.txt1, fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>
              {name}
            </Typography>
            <Typography sx={{ color: C.txt2, fontSize: 12, lineHeight: 1.4 }}>
              {subtitle}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Messages */}
      <Box
        onScroll={handleScroll}
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 2,
          py: 1.5,
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.022) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div />
        {isFetchingNextPage && (
          <Box sx={{ textAlign: 'center', py: 1 }}>
            <CircularProgress size={18} sx={{ color: C.accent }} />
          </Box>
        )}
        {msgs.map((msg) => (
          <GroupMessageBubble key={msg._id} message={msg} isMine={msg.senderId === myId} />
        ))}
        {typingUsers.size > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
            <Box sx={{ display: 'flex', gap: 0.3 }}>
              {[0, 1, 2].map((i) => (
                <Box
                  key={i}
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    bgcolor: C.txt2,
                    animation: 'bounce 1.2s ease infinite',
                    animationDelay: `${i * 0.2}s`,
                    '@keyframes bounce': {
                      '0%,100%': { transform: 'translateY(0)' },
                      '50%': { transform: 'translateY(-4px)' },
                    },
                  }}
                />
              ))}
            </Box>
            <Typography sx={{ color: C.txt2, fontSize: 12 }}>typing…</Typography>
          </Box>
        )}
        <div ref={endRef} />
      </Box>

      {/* Composer */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderTop: `1px solid ${C.border}`,
          display: 'flex',
          alignItems: 'flex-end',
          gap: 1.5,
          bgcolor: alpha(C.panelHdr, 0.8),
          flexShrink: 0,
        }}
      >
        <IconButton size="small" sx={{ color: C.txt2, '&:hover': { color: C.accent } }}>
          <EmojiEmotionsOutlinedIcon />
        </IconButton>
        <Box
          sx={{
            flex: 1,
            bgcolor: C.inputBg,
            borderRadius: '12px',
            px: 1.5,
            py: 0.75,
            border: `1px solid ${C.border}`,
            '&:focus-within': { borderColor: alpha(C.accent, 0.5) },
          }}
        >
          <InputBase
            fullWidth
            multiline
            maxRows={6}
            placeholder="Message"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            sx={{
              color: C.txt1,
              fontSize: 14,
              '& textarea::placeholder': { color: C.txt2, opacity: 1 },
            }}
          />
        </Box>
        <IconButton size="small" sx={{ color: C.txt2, '&:hover': { color: C.accent } }}>
          <AttachFileIcon />
        </IconButton>
        <IconButton
          onClick={() => void handleSend()}
          disabled={!text.trim()}
          sx={{
            bgcolor: text.trim() ? C.accent : 'transparent',
            color: text.trim() ? '#fff' : C.txt2,
            '&:hover': { bgcolor: text.trim() ? '#0D9E80' : undefined },
            width: 38,
            height: 38,
            borderRadius: '50%',
            boxShadow: text.trim() ? `0 4px 16px rgba(16,196,160,0.45)` : 'none',
            transition: 'all 0.2s',
          }}
        >
          <SendIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      {/* Group Info panel (WhatsApp-style) */}
      <GroupInfoDrawer
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        groupId={groupId}
        myId={myId ?? ''}
      />
    </Box>
  );
}
