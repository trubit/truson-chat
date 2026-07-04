import { useState, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, Box, TextField, Avatar,
  Typography, IconButton, CircularProgress, alpha, Button,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useSearchUsers } from '@/features/discovery/queries/index';
import { useAddMember } from '../queries/index';

const C = {
  bg:      '#0C1722',
  panel:   '#111D2B',
  border:  'rgba(134,150,160,0.12)',
  accent:  '#10C4A0',
  danger:  '#ef4444',
  txt1:    '#E9EDEF',
  txt2:    '#8696A0',
} as const;

interface Props {
  open:    boolean;
  onClose: () => void;
  groupId: string;
  alreadyMemberIds: string[];
}

export default function AddMemberDialog({ open, onClose, groupId, alreadyMemberIds }: Props) {
  const [q, setQ] = useState('');
  const [added, setAdded] = useState<Set<string>>(new Set());

  const { data: searchData, isFetching } = useSearchUsers({ q }, q.length >= 2);
  const addMember = useAddMember(groupId);

  const users = searchData?.users ?? [];

  const handleAdd = useCallback((userId: string) => {
    addMember.mutate(userId, {
      onSuccess: () => setAdded((prev) => new Set([...prev, userId])),
    });
  }, [addMember]);

  function handleClose() {
    setQ('');
    setAdded(new Set());
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      slotProps={{ paper: { sx: { bgcolor: C.bg, border: `1px solid ${C.border}`, borderRadius: '16px' } } }}
    >
      <DialogTitle sx={{ color: C.txt1, fontWeight: 700, pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Add participant
        <IconButton size="small" onClick={handleClose} sx={{ color: C.txt2 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 0 }}>
        {/* Search field */}
        <TextField
          autoFocus
          fullWidth size="small"
          placeholder="Search by name or username…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          sx={{
            mb: 2,
            '& .MuiOutlinedInput-root': {
              bgcolor: C.panel, borderRadius: '10px', color: C.txt1, fontSize: 14,
              '& fieldset': { borderColor: C.border },
              '&.Mui-focused fieldset': { borderColor: C.accent },
            },
            '& input::placeholder': { color: C.txt2, opacity: 1 },
          }}
        />

        {/* Results */}
        <Box sx={{ minHeight: 160 }}>
          {q.length < 2 ? (
            <Typography sx={{ color: C.txt2, fontSize: 13, textAlign: 'center', pt: 4 }}>
              Type at least 2 characters to search
            </Typography>
          ) : isFetching ? (
            <Box sx={{ textAlign: 'center', pt: 4 }}>
              <CircularProgress size={22} sx={{ color: C.accent }} />
            </Box>
          ) : users.length === 0 ? (
            <Typography sx={{ color: C.txt2, fontSize: 13, textAlign: 'center', pt: 4 }}>
              No users found
            </Typography>
          ) : (
            users.map((user) => {
              const isAlready = alreadyMemberIds.includes(user.id);
              const isAdded   = added.has(user.id);
              const isPending = addMember.isPending && addMember.variables === user.id;

              return (
                <Box
                  key={user.id}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5,
                    py: 1, px: 0.5, borderRadius: '10px',
                    '&:hover': { bgcolor: alpha(C.accent, 0.04) },
                  }}
                >
                  <Avatar
                    src={user.avatar}
                    sx={{ width: 40, height: 40, fontSize: 16, bgcolor: C.accent }}
                  >
                    {user.displayName[0]?.toUpperCase()}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ color: C.txt1, fontSize: 14, fontWeight: 600 }} noWrap>
                      {user.displayName}
                    </Typography>
                    <Typography sx={{ color: C.txt2, fontSize: 12 }} noWrap>
                      @{user.username}
                    </Typography>
                  </Box>

                  {isAlready ? (
                    <Typography sx={{ color: C.txt2, fontSize: 12, flexShrink: 0 }}>Already in</Typography>
                  ) : isAdded ? (
                    <CheckCircleIcon sx={{ color: C.accent, fontSize: 22 }} />
                  ) : (
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={isPending ? <CircularProgress size={12} color="inherit" /> : <PersonAddIcon sx={{ fontSize: 15 }} />}
                      onClick={() => handleAdd(user.id)}
                      disabled={isPending}
                      sx={{
                        bgcolor: C.accent, color: '#fff', textTransform: 'none',
                        fontSize: 12, fontWeight: 600, borderRadius: '8px',
                        px: 1.5, py: 0.5, minWidth: 'auto', flexShrink: 0,
                        '&:hover': { bgcolor: '#0D9E80' },
                      }}
                    >
                      Add
                    </Button>
                  )}
                </Box>
              );
            })
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
