import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  InputBase,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  CircularProgress,
  alpha,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddCommentIcon from '@mui/icons-material/AddComment';
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';
import { useAuthStore } from '@/store/authStore';
import { useConversationStore } from '@/store/conversationStore';
import { useConversations } from '../queries/index';
import ConversationItem from './ConversationItem';

const C = {
  panel: '#080C18',
  panelHdr: '#0B1022',
  border: 'rgba(139,92,246,0.12)',
  accent: '#9B6DFF',
  accentGlow: 'rgba(155,109,255,0.18)',
  teal: '#22D3EE',
  txt1: '#F1F5F9',
  txt2: '#94A3B8',
  txt3: '#475569',
  searchBg: 'rgba(139,92,246,0.07)',
} as const;

interface ConversationListProps {
  onConversationSelect: (id: string) => void;
  activeId: string | null;
}

export default function ConversationList({
  onConversationSelect,
  activeId,
}: ConversationListProps) {
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');

  const user = useAuthStore((s) => s.user);
  const { conversations, orderedIds } = useConversationStore();
  const { isLoading } = useConversations();

  const allConvs = useMemo(
    () => orderedIds.map((id) => conversations.get(id)).filter(Boolean),
    [orderedIds, conversations],
  );

  const filtered = useMemo(() => {
    let list = allConvs;

    // Tab filter
    if (tab === 1) list = list.filter((c) => c!.unreadCount > 0);
    if (tab === 2) list = list.filter((c) => c!.isPinned);

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) => {
        const name = c!.metadata.name ?? '';
        const preview = c!.lastMessage?.content ?? '';
        return name.toLowerCase().includes(q) || preview.toLowerCase().includes(q);
      });
    }

    return list;
  }, [allConvs, tab, search]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box
        sx={{
          px: 2.5,
          pt: 2.5,
          pb: 1.5,
          bgcolor: C.panelHdr,
          borderBottom: `1px solid ${C.border}`,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography
            sx={{
              fontSize: 20,
              fontWeight: 700,
              color: C.txt1,
              letterSpacing: '-0.3px',
            }}
          >
            Messages
          </Typography>
          <Tooltip title="New conversation">
            <IconButton
              size="small"
              sx={{
                color: C.txt2,
                borderRadius: '10px',
                '&:hover': { color: C.txt1, bgcolor: 'rgba(255,255,255,0.06)' },
              }}
            >
              <AddCommentIcon sx={{ fontSize: 19 }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Search bar */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            bgcolor: C.searchBg,
            borderRadius: '12px',
            px: 1.5,
            py: 0.85,
            border: `1px solid ${C.border}`,
            transition: 'all 0.2s',
            '&:focus-within': {
              bgcolor: alpha(C.accent, 0.08),
              borderColor: alpha(C.accent, 0.35),
              boxShadow: `0 0 0 3px ${alpha(C.accent, 0.1)}`,
            },
          }}
        >
          <SearchIcon sx={{ fontSize: 16, color: C.txt2, flexShrink: 0 }} />
          <InputBase
            placeholder="Search conversations"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{
              flex: 1,
              fontSize: 13.5,
              color: C.txt1,
              '& input::placeholder': { color: C.txt2, opacity: 1 },
            }}
          />
        </Box>

        {/* Tabs */}
        <Tabs
          value={tab}
          onChange={(_, v: number) => setTab(v)}
          sx={{
            minHeight: 'unset',
            '& .MuiTabs-indicator': {
              height: 2,
              borderRadius: 1,
              bgcolor: C.accent,
              boxShadow: `0 0 10px ${C.accent}, 0 0 20px ${alpha(C.accent, 0.4)}`,
            },
            '& .MuiTab-root': {
              minHeight: 30,
              minWidth: 'unset',
              px: 1.5,
              py: 0.25,
              fontSize: 13,
              fontWeight: 500,
              color: C.txt2,
              textTransform: 'none',
              transition: 'color 0.15s',
              '&.Mui-selected': { color: C.accent, fontWeight: 600 },
            },
          }}
        >
          <Tab label="All" />
          <Tab label="Unread" />
          <Tab label="Pinned" />
        </Tabs>
      </Box>

      {/* List */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {isLoading && !allConvs.length ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              py: 6,
            }}
          >
            <CircularProgress size={28} sx={{ color: C.accent }} />
          </Box>
        ) : filtered.length === 0 ? (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              px: 3,
              py: 6,
              gap: 1.5,
            }}
          >
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${alpha(C.accent, 0.14)} 0%, ${alpha(C.teal, 0.08)} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${alpha(C.accent, 0.18)}`,
              }}
            >
              <ChatBubbleIcon sx={{ fontSize: 22, color: alpha(C.accent, 0.55) }} />
            </Box>
            <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: C.txt1 }}>
              {search ? 'No results' : 'No conversations'}
            </Typography>
            <Typography
              sx={{
                fontSize: 12.5,
                color: C.txt2,
                textAlign: 'center',
                lineHeight: 1.65,
              }}
            >
              {search
                ? 'Try a different search term'
                : 'Start a conversation from your contacts'}
            </Typography>
          </Box>
        ) : (
          filtered.map((conv) =>
            conv ? (
              <ConversationItem
                key={conv._id}
                conversation={conv}
                isActive={activeId === conv._id}
                onClick={() => onConversationSelect(conv._id)}
                currentUserId={user?._id ?? ''}
              />
            ) : null,
          )
        )}
      </Box>
    </Box>
  );
}
