import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Typography, Avatar, TextField, InputAdornment,
  CircularProgress, Button, alpha, IconButton, Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import GroupsIcon from '@mui/icons-material/Groups';
import GroupWindow from '../components/GroupWindow';
import CreateGroupDialog from '../components/CreateGroupDialog';
import { useMyGroups } from '../queries/index';
import { useGroupStore } from '@/store/groupStore';
import type { GroupSummary } from '@shared/types';

const C = {
  bg:       '#07101C',
  panel:    '#0C1722',
  panelHdr: '#0E1B2A',
  active:   'linear-gradient(180deg, #10C4A0, #0D9E80)',
  accent:   '#10C4A0',
  txt1:     '#E9EDEF',
  txt2:     '#8696A0',
  border:   'rgba(134,150,160,0.12)',
} as const;

function GroupItem({ group, isActive, onClick }: { group: GroupSummary; isActive: boolean; onClick: () => void }) {
  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.25,
        cursor: 'pointer', position: 'relative',
        background: isActive ? alpha(C.accent, 0.1) : 'transparent',
        '&:hover': { background: alpha(C.accent, 0.06) },
        '&::before': isActive ? {
          content: '""', position: 'absolute', left: 0, top: '20%', bottom: '20%',
          width: 3, background: C.active, borderRadius: '0 2px 2px 0',
          boxShadow: `2px 0 8px rgba(16,196,160,0.4)`,
        } : {},
      }}
    >
      <Avatar
        src={group.avatar?.url}
        sx={{
          width: 46, height: 46,
          bgcolor: C.accent,
          background: !group.avatar ? C.active : undefined,
          fontSize: 18, fontWeight: 700,
          border: isActive ? `2px solid ${C.accent}` : '2px solid transparent',
        }}
      >
        {group.name[0]?.toUpperCase()}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ color: C.txt1, fontSize: 15, fontWeight: 600, lineHeight: 1.3 }} noWrap>
          {group.name}
        </Typography>
        <Typography sx={{ color: C.txt2, fontSize: 12, lineHeight: 1.4 }} noWrap>
          {group.memberCount.toLocaleString()} members
        </Typography>
      </Box>
    </Box>
  );
}

export default function GroupsPage() {
  const { groupId } = useParams<{ groupId?: string }>();
  const navigate    = useNavigate();
  const [q, setQ]   = useState('');
  const [open, setOpen] = useState(false);

  const { isLoading } = useMyGroups();
  const orderedIds = useGroupStore((s) => s.orderedIds);
  const groupMap   = useGroupStore((s) => s.groups);
  const groups     = orderedIds.map((id) => groupMap.get(id)).filter((g): g is GroupSummary => Boolean(g));
  const filtered = groups.filter((g) => g.name.toLowerCase().includes(q.toLowerCase()));

  const searchSlotProps = useMemo(() => ({
    input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: C.txt2 }} /></InputAdornment> },
  }), []);

  function selectGroup(id: string) {
    useGroupStore.getState().setActiveGroup(id);
    navigate(`/groups/${id}`);
  }

  return (
    <Box sx={{ display: 'flex', height: '100%', bgcolor: C.bg, overflow: 'hidden' }}>
      {/* Sidebar */}
      <Box sx={{ width: 320, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', bgcolor: C.panel }}>
        {/* Header */}
        <Box sx={{
          px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: `linear-gradient(180deg, ${C.panelHdr} 0%, rgba(14,27,42,0.98) 100%)`,
          backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${C.border}`,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{
              width: 30, height: 30, borderRadius: '8px', bgcolor: C.accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <GroupsIcon sx={{ fontSize: 18, color: '#fff' }} />
            </Box>
            <Typography sx={{ color: C.txt1, fontSize: 17, fontWeight: 800, letterSpacing: '-0.2px' }}>
              Groups
            </Typography>
          </Box>
          <Tooltip title="Create group">
            <IconButton size="small" onClick={() => setOpen(true)} sx={{ color: C.txt2, '&:hover': { color: C.accent, bgcolor: alpha(C.accent, 0.1) } }}>
              <AddIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Search */}
        <Box sx={{ px: 2, py: 1.25, borderBottom: `1px solid ${C.border}` }}>
          <TextField
            fullWidth size="small" placeholder="Search groups…"
            value={q} onChange={(e) => setQ(e.target.value)}
            slotProps={searchSlotProps}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: alpha('#fff', 0.04), borderRadius: '10px',
                color: C.txt1, fontSize: 14,
                '& fieldset': { borderColor: C.border },
                '&:hover fieldset': { borderColor: alpha(C.accent, 0.4) },
                '&.Mui-focused fieldset': { borderColor: C.accent },
              },
              '& input::placeholder': { color: C.txt2, opacity: 1 },
            }}
          />
        </Box>

        {/* List */}
        <Box sx={{ flex: 1, overflowY: 'auto', py: 0.5 }}>
          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}>
              <CircularProgress size={24} sx={{ color: C.accent }} />
            </Box>
          )}
          {!isLoading && filtered.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography sx={{ color: C.txt2, fontSize: 14 }}>
                {q ? 'No groups match your search' : 'No groups yet'}
              </Typography>
              {!q && (
                <Button onClick={() => setOpen(true)} sx={{ mt: 2, color: C.accent, textTransform: 'none' }}>
                  Create your first group
                </Button>
              )}
            </Box>
          )}
          {filtered.map((g) => (
            <GroupItem key={g._id} group={g} isActive={g._id === groupId} onClick={() => selectGroup(g._id)} />
          ))}
        </Box>
      </Box>

      {/* Main area */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        {groupId ? (
          <GroupWindow groupId={groupId} />
        ) : (
          <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2 }}>
            <Box sx={{
              width: 72, height: 72, borderRadius: '50%',
              background: C.active,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 40px rgba(16,196,160,0.25)`,
            }}>
              <GroupsIcon sx={{ fontSize: 34, color: '#fff' }} />
            </Box>
            <Typography sx={{ color: C.txt1, fontWeight: 700, fontSize: 18 }}>TrusonChat Groups</Typography>
            <Typography sx={{ color: C.txt2, textAlign: 'center', maxWidth: 280, lineHeight: 1.6, fontSize: 14 }}>
              Select a group from the sidebar or create a new one.
            </Typography>
            <Button onClick={() => setOpen(true)} variant="contained" startIcon={<AddIcon />}
              sx={{ bgcolor: C.accent, color: '#fff', textTransform: 'none', borderRadius: '20px', px: 3, '&:hover': { bgcolor: '#0D9E80' } }}>
              New Group
            </Button>
          </Box>
        )}
      </Box>

      <CreateGroupDialog open={open} onClose={() => setOpen(false)} />
    </Box>
  );
}
