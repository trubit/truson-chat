import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, FormControl, InputLabel, Select, MenuItem,
  Typography, alpha,
} from '@mui/material';
import { useCreateCommunity } from '../queries/index';

const C = { bg: '#0C1722', border: 'rgba(134,150,160,0.15)', accent: '#10C4A0', txt1: '#E9EDEF', txt2: '#8696A0' } as const;

interface Props { open: boolean; onClose: () => void; }

export default function CreateCommunityDialog({ open, onClose }: Props) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [type, setType] = useState<'public' | 'private'>('public');
  const navigate        = useNavigate();
  const { mutateAsync, isPending, error } = useCreateCommunity();

  async function handleCreate() {
    if (!name.trim()) return;
    try {
      const res = await mutateAsync({ name: name.trim(), description: desc.trim() || undefined, type });
      onClose(); navigate(`/communities/${res.data._id}`);
      setName(''); setDesc(''); setType('public');
    } catch { /* error shown below */ }
  }

  const sx = {
    '& .MuiOutlinedInput-root': {
      bgcolor: alpha('#fff', 0.04), color: C.txt1,
      '& fieldset': { borderColor: C.border },
      '&:hover fieldset': { borderColor: alpha(C.accent, 0.4) },
      '&.Mui-focused fieldset': { borderColor: C.accent },
    },
    '& .MuiInputLabel-root': { color: C.txt2 },
    '& .MuiInputLabel-root.Mui-focused': { color: C.accent },
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm"
      slotProps={{ paper: { sx: { bgcolor: C.bg, border: `1px solid ${C.border}`, borderRadius: '16px' } } }}>
      <DialogTitle sx={{ color: C.txt1, fontWeight: 700, fontSize: 18 }}>Create Community</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '16px !important' }}>
        <TextField label="Community name" fullWidth required value={name} onChange={(e) => setName(e.target.value)} sx={sx} />
        <TextField label="Description (optional)" fullWidth multiline rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} sx={sx} />
        <FormControl fullWidth sx={sx}>
          <InputLabel>Visibility</InputLabel>
          <Select value={type} onChange={(e) => setType(e.target.value as typeof type)} label="Visibility"
            MenuProps={{ slotProps: { paper: { sx: { bgcolor: '#1A2636', color: C.txt1 } } } }}>
            <MenuItem value="public">Public</MenuItem>
            <MenuItem value="private">Private</MenuItem>
          </Select>
        </FormControl>
        {error && <Typography sx={{ color: '#f44336', fontSize: 13 }}>{(error as Error).message}</Typography>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} sx={{ color: C.txt2, textTransform: 'none' }}>Cancel</Button>
        <Button onClick={() => void handleCreate()} disabled={!name.trim() || isPending} variant="contained"
          sx={{ bgcolor: C.accent, color: '#fff', textTransform: 'none', borderRadius: '10px', px: 3, '&:hover': { bgcolor: '#0D9E80' } }}>
          {isPending ? 'Creating…' : 'Create Community'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
