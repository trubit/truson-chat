import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, InputBase, Tabs, Tab,
  IconButton, Tooltip, CircularProgress, Avatar, Badge, alpha,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddCommentIcon from '@mui/icons-material/AddComment';
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';
import GroupsIcon from '@mui/icons-material/Groups';
import { useAuthStore } from '@/store/authStore';
import { useConversationStore } from '@/store/conversationStore';
import { useGroupStore } from '@/store/groupStore';
import { useConversations } from '../queries/index';
import { useMyGroups } from '@/features/groups/queries/index';
import ConversationItem from './ConversationItem';
import NewConversationDialog from './NewConversationDialog';
import type { ConversationWithMeta } from '@/store/conversationStore';
import type { GroupSummary } from '@shared/types';

const C = {
  panel:     '#0C1722',
  panelHdr:  '#0E1B2A',
  border:    'rgba(134,150,160,0.12)',
  accent:    '#10C4A0',
  accentGlow:'rgba(16,196,160,0.12)',
  txt1:      '#E9EDEF',
  txt2:      '#8696A0',
  txt3:      '#567390',
  searchBg:  'rgba(16,196,160,0.05)',
} as const;

// ─── Unified list item ────────────────────────────────────────────────────────

type ListItem =
  | { kind: 'conversation'; data: ConversationWithMeta; sortKey: number }
  | { kind: 'group';        data: GroupSummary;         sortKey: number };

// ─── Group row ────────────────────────────────────────────────────────────────

function formatTime(ts: string): string {
  const date = new Date(ts);
  const now  = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diff === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diff === 1) return 'Yesterday';
  return date.toLocaleDateString([], { month: '2-digit', day: '2-digit' });
}

function GroupRow({ group, isActive, onClick }: { group: GroupSummary; isActive: boolean; onClick: () => void }) {
  const unread = useGroupStore((s) => s.unreadCounts.get(group._id) ?? 0);
  const timeStr = group.lastMessageAt ? formatTime(group.lastMessageAt) : '';

  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex', alignItems: 'center', gap: 1.5,
        px: 1.5, py: 1.25, cursor: 'pointer', position: 'relative',
        bgcolor: isActive ? alpha(C.accent, 0.09) : 'transparent',
        transition: 'background 0.18s',
        '&:hover': { bgcolor: isActive ? alpha(C.accent, 0.12) : 'rgba(255,255,255,0.025)' },
        ...(isActive && {
          '&::before': {
            content: '""', position: 'absolute', left: 0, top: '15%', height: '70%',
            width: 3, borderRadius: '0 4px 4px 0',
            background: 'linear-gradient(180deg, #10C4A0 0%, #0D9E80 100%)',
            boxShadow: '2px 0 8px rgba(16,196,160,0.4)',
          },
        }),
      }}
    >
      {/* Avatar with group badge */}
      <Box sx={{ position: 'relative', flexShrink: 0 }}>
        <Avatar
          src={group.avatar?.url}
          sx={{
            width: 46, height: 46, fontSize: 17, fontWeight: 700,
            background: 'linear-gradient(135deg, #0D9E80 0%, #10C4A0 100%)',
          }}
        >
          {group.name[0]?.toUpperCase()}
        </Avatar>
        {/* Group icon badge */}
        <Box sx={{
          position: 'absolute', bottom: -1, right: -1,
          width: 16, height: 16, borderRadius: '50%',
          bgcolor: '#0D9E80', border: `1.5px solid ${C.panel}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <GroupsIcon sx={{ fontSize: 10, color: '#fff' }} />
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.3 }}>
          <Typography sx={{ fontSize: 13.5, fontWeight: unread > 0 ? 700 : 500, color: C.txt1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {group.name}
          </Typography>
          {timeStr && (
            <Typography sx={{ fontSize: 11, color: unread > 0 ? C.accent : C.txt3, fontWeight: unread > 0 ? 600 : 400, flexShrink: 0, ml: 0.5 }}>
              {timeStr}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={{ fontSize: 12.5, color: C.txt3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, mr: 1 }}>
            {group.memberCount.toLocaleString()} members
          </Typography>
          {unread > 0 && (
            <Badge
              badgeContent={unread > 99 ? '99+' : unread}
              sx={{
                flexShrink: 0,
                '& .MuiBadge-badge': {
                  position: 'static', transform: 'none',
                  bgcolor: C.accent, color: '#fff', fontSize: 10, fontWeight: 700,
                  minWidth: 20, height: 20, borderRadius: '10px', px: 0.5,
                },
              }}
            >
              <Box />
            </Badge>
          )}
        </Box>
      </Box>
    </Box>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ConversationListProps {
  onConversationSelect: (id: string) => void;
  activeId: string | null;
}

export default function ConversationList({ onConversationSelect, activeId }: ConversationListProps) {
  const [tab, setTab]         = useState(0);
  const [search, setSearch]   = useState('');
  const [newChatOpen, setNewChatOpen] = useState(false);
  const openNewChat = useCallback(() => setNewChatOpen(true), []);
  const navigate    = useNavigate();

  const user          = useAuthStore((s) => s.user);
  const conversations = useConversationStore((s) => s.conversations);
  const orderedIds    = useConversationStore((s) => s.orderedIds);
  const { isLoading: convLoading } = useConversations();

  // Groups
  const groupOrderedIds = useGroupStore((s) => s.orderedIds);
  const groupMap        = useGroupStore((s) => s.groups);
  const { isLoading: groupLoading } = useMyGroups();

  // Build merged unified list
  const unified = useMemo((): ListItem[] => {
    const convItems: ListItem[] = orderedIds
      .map((id) => conversations.get(id))
      .filter((c): c is ConversationWithMeta => Boolean(c))
      .map((c) => ({
        kind: 'conversation' as const,
        data: c,
        sortKey: new Date(c.lastActivity).getTime(),
      }));

    const groupItems: ListItem[] = groupOrderedIds
      .map((id) => groupMap.get(id))
      .filter((g): g is GroupSummary => Boolean(g))
      .map((g) => ({
        kind: 'group' as const,
        data: g,
        sortKey: g.lastMessageAt
          ? new Date(g.lastMessageAt).getTime()
          : new Date(g.createdAt).getTime(),
      }));

    return [...convItems, ...groupItems].sort((a, b) => b.sortKey - a.sortKey);
  }, [orderedIds, conversations, groupOrderedIds, groupMap]);

  const filtered = useMemo(() => {
    let list = unified;

    if (tab === 1) {
      list = list.filter((item) =>
        item.kind === 'conversation'
          ? item.data.unreadCount > 0
          : (useGroupStore.getState().unreadCounts.get(item.data._id) ?? 0) > 0,
      );
    }
    if (tab === 2) {
      // Pinned: only conversations have isPinned
      list = list.filter((item) => item.kind === 'conversation' && item.data.isPinned);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((item) => {
        if (item.kind === 'conversation') {
          const name = item.data.metadata.name ?? '';
          const preview = item.data.lastMessage?.content ?? '';
          return name.toLowerCase().includes(q) || preview.toLowerCase().includes(q);
        }
        return item.data.name.toLowerCase().includes(q);
      });
    }

    return list;
  }, [unified, tab, search]);

  const isLoading = convLoading || groupLoading;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box sx={{
        px: 2.5, pt: 2.5, pb: 1.5,
        background: `linear-gradient(180deg, #121F2F 0%, ${C.panelHdr} 100%)`,
        borderBottom: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column', gap: 1.5, flexShrink: 0,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box sx={{
              width: 30, height: 30, borderRadius: '8px',
              background: 'linear-gradient(135deg, #10C4A0 0%, #0D9E80 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(16,196,160,0.35)',
            }}>
              <ChatBubbleIcon sx={{ fontSize: 14, color: '#fff' }} />
            </Box>
            <Typography sx={{ fontSize: 17, fontWeight: 800, color: C.txt1, letterSpacing: '-0.4px' }}>
              Messages
            </Typography>
          </Box>
          <Tooltip title="New conversation">
            <IconButton size="small" onClick={openNewChat} sx={{ color: C.txt2, borderRadius: '10px', transition: 'all 0.15s', '&:hover': { color: C.accent, bgcolor: 'rgba(16,196,160,0.09)' } }}>
              <AddCommentIcon sx={{ fontSize: 19 }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Search */}
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1,
          bgcolor: C.searchBg, borderRadius: '12px', px: 1.5, py: 0.85,
          border: `1px solid ${C.border}`, transition: 'all 0.2s',
          '&:focus-within': { bgcolor: alpha(C.accent, 0.08), borderColor: alpha(C.accent, 0.35), boxShadow: `0 0 0 3px ${alpha(C.accent, 0.1)}` },
        }}>
          <SearchIcon sx={{ fontSize: 16, color: C.txt2, flexShrink: 0 }} />
          <InputBase
            placeholder="Search conversations & groups"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flex: 1, fontSize: 13.5, color: C.txt1, '& input::placeholder': { color: C.txt2, opacity: 1 } }}
          />
        </Box>

        {/* Tabs */}
        <Tabs
          value={tab}
          onChange={(_, v: number) => setTab(v)}
          sx={{
            minHeight: 'unset',
            '& .MuiTabs-indicator': { height: 2, borderRadius: 1, bgcolor: C.accent, boxShadow: `0 0 10px ${C.accent}, 0 0 20px ${alpha(C.accent, 0.4)}` },
            '& .MuiTab-root': { minHeight: 30, minWidth: 'unset', px: 1.5, py: 0.25, fontSize: 13, fontWeight: 500, color: C.txt2, textTransform: 'none', transition: 'color 0.15s', '&.Mui-selected': { color: C.accent, fontWeight: 600 } },
          }}
        >
          <Tab label="All" />
          <Tab label="Unread" />
          <Tab label="Pinned" />
        </Tabs>
      </Box>

      {/* List */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {isLoading && filtered.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 6 }}>
            <CircularProgress size={28} sx={{ color: C.accent }} />
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', px: 3, py: 6, gap: 1.5 }}>
            <Box sx={{ width: 56, height: 56, borderRadius: '50%', background: `linear-gradient(135deg, ${alpha(C.accent, 0.14)} 0%, ${alpha(C.accent, 0.06)} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${alpha(C.accent, 0.18)}` }}>
              <ChatBubbleIcon sx={{ fontSize: 22, color: alpha(C.accent, 0.55) }} />
            </Box>
            <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: C.txt1 }}>
              {search ? 'No results' : 'No conversations'}
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: C.txt2, textAlign: 'center', lineHeight: 1.65 }}>
              {search ? 'Try a different search term' : 'Start a conversation from your contacts'}
            </Typography>
          </Box>
        ) : (
          filtered.map((item) => {
            if (item.kind === 'conversation') {
              return (
                <ConversationItem
                  key={`conv-${item.data._id}`}
                  conversation={item.data}
                  isActive={activeId === item.data._id}
                  onClick={() => onConversationSelect(item.data._id)}
                  currentUserId={user?._id ?? ''}
                />
              );
            }
            return (
              <GroupRow
                key={`group-${item.data._id}`}
                group={item.data}
                isActive={activeId === `g:${item.data._id}`}
                onClick={() => navigate(`/chat/g/${item.data._id}`)}
              />
            );
          })
        )}
      </Box>

      {newChatOpen && (
        <NewConversationDialog open={true} onClose={() => setNewChatOpen(false)} />
      )}
    </Box>
  );
}
