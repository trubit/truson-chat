import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  InputBase,
  Box,
  CircularProgress,
  IconButton,
  alpha,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import { useFriends } from '@/features/friends/queries/index';
import { useCreateConversation } from '../queries/index';
import { ROUTES } from '@/routes/index';

const C = {
  panel: '#080C18',
  border: 'rgba(139,92,246,0.12)',
  accent: '#9B6DFF',
  txt1: '#F1F5F9',
  txt2: '#94A3B8',
  searchBg: 'rgba(139,92,246,0.07)',
} as const;

interface NewConversationDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function NewConversationDialog({ open, onClose }: NewConversationDialogProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [startingId, setStartingId] = useState<string | null>(null);

  const { data: friendsData, isLoading } = useFriends();
  const createConversation = useCreateConversation();

  const friends = friendsData?.items ?? [];
  const filtered = friends.filter((f) => {
    const q = search.toLowerCase();
    return !q || f.displayName.toLowerCase().includes(q) || f.username.toLowerCase().includes(q);
  });

  const handleSelect = (friendId: string) => {
    if (startingId) return;
    setStartingId(friendId);
    createConversation.mutate(friendId, {
      onSuccess: (res) => {
        onClose();
        setSearch('');
        setStartingId(null);
        navigate(`${ROUTES.CHAT}/${res.data._id}`);
      },
      onError: () => setStartingId(null),
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: { sx: { bgcolor: C.panel, border: `1px solid ${C.border}`, borderRadius: 3 } },
      }}
    >
      <DialogTitle
        sx={{
          color: C.txt1,
          fontWeight: 700,
          pb: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        New Conversation
        <IconButton size="small" onClick={onClose} sx={{ color: C.txt2 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {/* Search */}
        <Box sx={{ px: 2, pb: 1.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              bgcolor: C.searchBg,
              borderRadius: '10px',
              px: 1.5,
              py: 0.85,
              border: `1px solid ${C.border}`,
              '&:focus-within': { borderColor: alpha(C.accent, 0.4) },
            }}
          >
            <SearchIcon sx={{ fontSize: 16, color: C.txt2, flexShrink: 0 }} />
            <InputBase
              autoFocus
              placeholder="Search friends…"
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
        </Box>

        {/* List */}
        {isLoading ? (
          <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={24} sx={{ color: C.accent }} />
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography sx={{ color: C.txt2, fontSize: 13.5 }}>
              {friends.length === 0 ? 'Add friends to start chatting' : 'No matches'}
            </Typography>
          </Box>
        ) : (
          <List disablePadding sx={{ maxHeight: 360, overflowY: 'auto' }}>
            {filtered.map((f) => {
              const loading = startingId === f.friendId;
              return (
                <ListItem
                  key={f.friendshipId}
                  onClick={() => handleSelect(f.friendId)}
                  sx={{
                    cursor: 'pointer',
                    px: 2,
                    py: 1.25,
                    transition: 'bgcolor 0.15s',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      src={f.avatar}
                      alt={f.displayName}
                      sx={{
                        width: 40,
                        height: 40,
                        bgcolor: C.accent,
                        fontSize: 15,
                        fontWeight: 700,
                      }}
                    >
                      {f.displayName.charAt(0).toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography sx={{ color: C.txt1, fontWeight: 600, fontSize: 14 }}>
                        {f.displayName}
                      </Typography>
                    }
                    secondary={
                      <Typography sx={{ color: C.txt2, fontSize: 12 }}>@{f.username}</Typography>
                    }
                  />
                  {loading && <CircularProgress size={18} sx={{ color: C.accent }} />}
                </ListItem>
              );
            })}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
}
