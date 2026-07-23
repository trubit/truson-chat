import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Avatar,
  Card,
  CardActionArea,
  Button,
  CircularProgress,
  TextField,
  InputAdornment,
  alpha,
  Chip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import CreateCommunityDialog from '../components/CreateCommunityDialog';
import { useMyCommunities, useDiscoverCommunities } from '../queries/index';
import type { CommunitySummary } from '@shared/types';

const C = {
  bg: '#07101C',
  card: '#0C1722',
  border: 'rgba(134,150,160,0.1)',
  accent: '#10C4A0',
  copper: '#E87830',
  txt1: '#E9EDEF',
  txt2: '#8696A0',
} as const;

function CommunityCard({ community, onView }: { community: CommunitySummary; onView: () => void }) {
  return (
    <Card
      sx={{
        bgcolor: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: '16px',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        '&:hover': {
          borderColor: alpha(C.accent, 0.4),
          boxShadow: `0 4px 20px rgba(16,196,160,0.12)`,
        },
      }}
    >
      <CardActionArea onClick={onView} sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
          <Avatar
            src={community.avatar?.url}
            sx={{ width: 52, height: 52, bgcolor: C.copper, fontWeight: 700, fontSize: 22 }}
          >
            {community.name[0]?.toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ color: C.txt1, fontWeight: 700, fontSize: 16 }} noWrap>
              {community.name}
            </Typography>
            {community.handle && (
              <Typography sx={{ color: C.txt2, fontSize: 12 }}>@{community.handle}</Typography>
            )}
          </Box>
          <Chip
            label={community.type}
            size="small"
            sx={{
              bgcolor: alpha(community.type === 'public' ? C.accent : C.copper, 0.15),
              color: community.type === 'public' ? C.accent : C.copper,
              fontSize: 11,
              fontWeight: 700,
              border: `1px solid ${alpha(community.type === 'public' ? C.accent : C.copper, 0.3)}`,
            }}
          />
        </Box>
        {community.description && (
          <Typography sx={{ color: C.txt2, fontSize: 13, lineHeight: 1.5, mb: 1.5 }} noWrap>
            {community.description}
          </Typography>
        )}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <PeopleAltOutlinedIcon sx={{ fontSize: 15, color: C.txt2 }} />
            <Typography sx={{ color: C.txt2, fontSize: 12 }}>
              {community.memberCount.toLocaleString()} members
            </Typography>
          </Box>
        </Box>
      </CardActionArea>
    </Card>
  );
}

export default function CommunitiesPage() {
  const [tab, setTab] = useState<'mine' | 'discover'>('mine');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const { data: myData, isLoading: myLoading } = useMyCommunities();
  const { data: discoverData, isLoading: discoverLoading } = useDiscoverCommunities(
    tab === 'discover' ? q : undefined,
  );

  const communities: CommunitySummary[] =
    tab === 'mine' ? (myData?.communities ?? []) : (discoverData?.data?.communities ?? []);
  const isLoading = tab === 'mine' ? myLoading : discoverLoading;

  const searchSlotProps = useMemo(
    () => ({
      input: {
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon sx={{ fontSize: 18, color: C.txt2 }} />
          </InputAdornment>
        ),
      },
    }),
    [],
  );

  return (
    <Box sx={{ height: '100%', bgcolor: C.bg, overflowY: 'auto', px: { xs: 2, md: 4 }, py: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography sx={{ color: C.txt1, fontWeight: 800, fontSize: 24 }}>Communities</Typography>
        <Button
          onClick={() => setOpen(true)}
          variant="contained"
          startIcon={<AddIcon />}
          sx={{
            bgcolor: C.accent,
            color: '#fff',
            textTransform: 'none',
            borderRadius: '20px',
            px: 3,
            '&:hover': { bgcolor: '#0D9E80' },
          }}
        >
          New Community
        </Button>
      </Box>

      {/* Tabs */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
        {(['mine', 'discover'] as const).map((t) => (
          <Button
            key={t}
            onClick={() => setTab(t)}
            sx={{
              textTransform: 'none',
              borderRadius: '20px',
              px: 2.5,
              py: 0.75,
              bgcolor: tab === t ? C.accent : alpha('#fff', 0.04),
              color: tab === t ? '#fff' : C.txt2,
              fontWeight: tab === t ? 700 : 400,
              '&:hover': { bgcolor: tab === t ? '#0D9E80' : alpha('#fff', 0.08) },
            }}
          >
            {t === 'mine' ? 'My Communities' : 'Discover'}
          </Button>
        ))}
      </Box>

      {/* Search (discover only) */}
      {tab === 'discover' && (
        <TextField
          fullWidth
          size="small"
          placeholder="Search communities…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          slotProps={searchSlotProps}
          sx={{
            mb: 3,
            '& .MuiOutlinedInput-root': {
              bgcolor: alpha('#fff', 0.04),
              borderRadius: '10px',
              color: C.txt1,
              fontSize: 14,
              '& fieldset': { borderColor: C.border },
              '&.Mui-focused fieldset': { borderColor: C.accent },
            },
          }}
        />
      )}

      {/* Grid */}
      {isLoading ? (
        <Box sx={{ textAlign: 'center', pt: 6 }}>
          <CircularProgress sx={{ color: C.accent }} />
        </Box>
      ) : communities.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography sx={{ color: C.txt2, fontSize: 16 }}>
            {tab === 'mine' ? 'No communities yet.' : 'No communities found.'}
          </Typography>
          {tab === 'mine' && (
            <Button
              onClick={() => setOpen(true)}
              sx={{ mt: 2, color: C.accent, textTransform: 'none' }}
            >
              Create your first community
            </Button>
          )}
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 2,
          }}
        >
          {communities.map((community) => (
            <CommunityCard
              key={community._id}
              community={community}
              onView={() => navigate(`/communities/${community._id}`)}
            />
          ))}
        </Box>
      )}

      <CreateCommunityDialog open={open} onClose={() => setOpen(false)} />
    </Box>
  );
}
