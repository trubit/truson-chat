import { useState, type SyntheticEvent } from 'react';
import {
  Box, Typography, Paper, Tabs, Tab, Avatar, Button,
  CircularProgress, List, ListItem, ListItemAvatar,
  ListItemText, ListItemSecondaryAction,
} from '@mui/material';
import BlockIcon from '@mui/icons-material/Block';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import {
  useBlockedList, useMutedList,
  useUnblockUser, useUnmuteUser,
} from '../queries/index';
import type { IBlockData, IMuteData } from '@shared/types/social';

function BlockedItem({ entry }: { entry: IBlockData }) {
  const unblock = useUnblockUser();
  return (
    <ListItem divider>
      <ListItemAvatar>
        <Avatar src={entry.blockedUser.avatar} alt={entry.blockedUser.displayName} sx={{ bgcolor: 'error.main' }}>
          {entry.blockedUser.displayName.charAt(0).toUpperCase()}
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={<Typography variant="body1" sx={{ fontWeight: 600 }}>{entry.blockedUser.displayName}</Typography>}
        secondary={<Typography variant="caption" color="text.secondary">@{entry.blockedUser.username}</Typography>}
      />
      <ListItemSecondaryAction>
        <Button
          size="small"
          variant="outlined"
          color="warning"
          startIcon={<BlockIcon />}
          onClick={() => unblock.mutate(entry.blockedUser.id)}
          disabled={unblock.isPending}
        >
          Unblock
        </Button>
      </ListItemSecondaryAction>
    </ListItem>
  );
}

function MutedItem({ entry }: { entry: IMuteData }) {
  const unmute = useUnmuteUser();
  return (
    <ListItem divider>
      <ListItemAvatar>
        <Avatar src={entry.mutedUser.avatar} alt={entry.mutedUser.displayName} sx={{ bgcolor: 'action.disabled' }}>
          {entry.mutedUser.displayName.charAt(0).toUpperCase()}
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={<Typography variant="body1" sx={{ fontWeight: 600 }}>{entry.mutedUser.displayName}</Typography>}
        secondary={
          <Typography variant="caption" color="text.secondary">
            @{entry.mutedUser.username}
            {entry.expiresAt && ` · Until ${new Date(entry.expiresAt).toLocaleDateString()}`}
          </Typography>
        }
      />
      <ListItemSecondaryAction>
        <Button
          size="small"
          variant="outlined"
          startIcon={<VolumeOffIcon />}
          onClick={() => unmute.mutate(entry.mutedUser.id)}
          disabled={unmute.isPending}
        >
          Unmute
        </Button>
      </ListItemSecondaryAction>
    </ListItem>
  );
}

interface TabPanelProps { children?: React.ReactNode; index: number; value: number; }
function TabPanel({ children, value, index }: TabPanelProps) {
  return <div hidden={value !== index}>{value === index && <Box sx={{ pt: 1 }}>{children}</Box>}</div>;
}

export default function BlockingPage() {
  const [tab, setTab] = useState(0);

  const { data: blockedData, isLoading: loadingBlocked } = useBlockedList();
  const { data: mutedData, isLoading: loadingMuted } = useMutedList();

  const blocked = blockedData?.blocks ?? [];
  const muted = mutedData?.mutes ?? [];

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', p: { xs: 1.5, sm: 2.5 } }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Blocked & Muted</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
        Blocked users cannot message you or see your profile. Muted users' notifications are suppressed.
      </Typography>

      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Tabs
          value={tab}
          onChange={(_: SyntheticEvent, v: number) => setTab(v)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab label={`Blocked (${blocked.length})`} />
          <Tab label={`Muted (${muted.length})`} />
        </Tabs>

        <TabPanel value={tab} index={0}>
          {loadingBlocked && <Box sx={{ p: 3, textAlign: 'center' }}><CircularProgress /></Box>}
          {!loadingBlocked && blocked.length === 0 && (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <BlockIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary">You haven&rsquo;t blocked anyone.</Typography>
            </Box>
          )}
          {blocked.length > 0 && (
            <List disablePadding>
              {blocked.map((b) => <BlockedItem key={b.id} entry={b} />)}
            </List>
          )}
        </TabPanel>

        <TabPanel value={tab} index={1}>
          {loadingMuted && <Box sx={{ p: 3, textAlign: 'center' }}><CircularProgress /></Box>}
          {!loadingMuted && muted.length === 0 && (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <VolumeOffIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary">You haven&rsquo;t muted anyone.</Typography>
            </Box>
          )}
          {muted.length > 0 && (
            <List disablePadding>
              {muted.map((m) => <MutedItem key={m.id} entry={m} />)}
            </List>
          )}
        </TabPanel>
      </Paper>
    </Box>
  );
}
