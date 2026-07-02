import { useState, type SyntheticEvent } from 'react';
import {
  Box, Typography, Paper, Tabs, Tab, Avatar, Button,
  CircularProgress, List, ListItem, ListItemAvatar,
  ListItemText, ListItemSecondaryAction, Chip,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import {
  useFriends, useReceivedRequests, useSentRequests,
  useAcceptFriendRequest, useRejectFriendRequest,
  useCancelFriendRequest, useRemoveFriend,
} from '../queries/index';
import type { IFriendData, IFriendRequestData } from '@shared/types/social';

function FriendItem({ friend }: { friend: IFriendData }) {
  const remove = useRemoveFriend();
  return (
    <ListItem divider>
      <ListItemAvatar>
        <Avatar src={friend.avatar} alt={friend.displayName} sx={{ bgcolor: 'primary.main' }}>
          {friend.displayName.charAt(0).toUpperCase()}
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={<Typography variant="body1" sx={{ fontWeight: 600 }}>{friend.displayName}</Typography>}
        secondary={<Typography variant="caption" color="text.secondary">@{friend.username}</Typography>}
      />
      <ListItemSecondaryAction>
        <Button
          size="small"
          color="error"
          variant="outlined"
          startIcon={<PersonRemoveIcon />}
          onClick={() => remove.mutate(friend.friendId)}
          disabled={remove.isPending}
        >
          Remove
        </Button>
      </ListItemSecondaryAction>
    </ListItem>
  );
}

function ReceivedRequestItem({ request }: { request: IFriendRequestData }) {
  const accept = useAcceptFriendRequest();
  const reject = useRejectFriendRequest();
  const isPending = accept.isPending || reject.isPending;

  return (
    <ListItem divider>
      <ListItemAvatar>
        <Avatar src={request.sender.avatar} alt={request.sender.displayName} sx={{ bgcolor: 'secondary.main' }}>
          {request.sender.displayName.charAt(0).toUpperCase()}
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={<Typography variant="body1" sx={{ fontWeight: 600 }}>{request.sender.displayName}</Typography>}
        secondary={
          <Box>
            <Typography variant="caption" color="text.secondary">@{request.sender.username}</Typography>
            {request.message && (
              <Typography variant="caption" sx={{ display: 'block', fontStyle: 'italic', mt: 0.25 }}>
                &ldquo;{request.message}&rdquo;
              </Typography>
            )}
          </Box>
        }
      />
      <ListItemSecondaryAction sx={{ display: 'flex', gap: 1 }}>
        <Button
          size="small"
          variant="contained"
          color="primary"
          startIcon={<CheckIcon />}
          onClick={() => accept.mutate(request.id)}
          disabled={isPending}
        >
          Accept
        </Button>
        <Button
          size="small"
          variant="outlined"
          color="error"
          startIcon={<CloseIcon />}
          onClick={() => reject.mutate(request.id)}
          disabled={isPending}
        >
          Reject
        </Button>
      </ListItemSecondaryAction>
    </ListItem>
  );
}

function SentRequestItem({ request }: { request: IFriendRequestData }) {
  const cancel = useCancelFriendRequest();
  return (
    <ListItem divider>
      <ListItemAvatar>
        <Avatar src={request.recipient.avatar} alt={request.recipient.displayName} sx={{ bgcolor: 'info.main' }}>
          {request.recipient.displayName.charAt(0).toUpperCase()}
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={<Typography variant="body1" sx={{ fontWeight: 600 }}>{request.recipient.displayName}</Typography>}
        secondary={<Typography variant="caption" color="text.secondary">@{request.recipient.username} · Pending</Typography>}
      />
      <ListItemSecondaryAction>
        <Button
          size="small"
          variant="outlined"
          startIcon={<CloseIcon />}
          onClick={() => cancel.mutate(request.id)}
          disabled={cancel.isPending}
        >
          Cancel
        </Button>
      </ListItemSecondaryAction>
    </ListItem>
  );
}

interface TabPanelProps { children?: React.ReactNode; index: number; value: number; }
function TabPanel({ children, value, index }: TabPanelProps) {
  return <div hidden={value !== index}>{value === index && <Box sx={{ pt: 1 }}>{children}</Box>}</div>;
}

export default function FriendsPage() {
  const [tab, setTab] = useState(0);

  const { data: friendsData, isLoading: loadingFriends } = useFriends();
  const { data: receivedData, isLoading: loadingReceived } = useReceivedRequests();
  const { data: sentData, isLoading: loadingSent } = useSentRequests();

  const friends = friendsData?.items ?? [];
  const received = receivedData?.items ?? [];
  const sent = sentData?.items ?? [];

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', p: { xs: 1.5, sm: 2.5 } }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Friends</Typography>

      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Tabs
          value={tab}
          onChange={(_: SyntheticEvent, v: number) => setTab(v)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Friends
                {friends.length > 0 && <Chip label={friends.length} size="small" />}
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Requests
                {received.length > 0 && <Chip label={received.length} size="small" color="primary" />}
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Sent
                {sent.length > 0 && <Chip label={sent.length} size="small" />}
              </Box>
            }
          />
        </Tabs>

        {/* Friends list */}
        <TabPanel value={tab} index={0}>
          {loadingFriends && <Box sx={{ p: 3, textAlign: 'center' }}><CircularProgress /></Box>}
          {!loadingFriends && friends.length === 0 && (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No friends yet. Use Discover to find people!</Typography>
            </Box>
          )}
          {friends.length > 0 && <List disablePadding>{friends.map((f) => <FriendItem key={f.friendshipId} friend={f} />)}</List>}
        </TabPanel>

        {/* Received requests */}
        <TabPanel value={tab} index={1}>
          {loadingReceived && <Box sx={{ p: 3, textAlign: 'center' }}><CircularProgress /></Box>}
          {!loadingReceived && received.length === 0 && (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No pending friend requests.</Typography>
            </Box>
          )}
          {received.length > 0 && <List disablePadding>{received.map((r) => <ReceivedRequestItem key={r.id} request={r} />)}</List>}
        </TabPanel>

        {/* Sent requests */}
        <TabPanel value={tab} index={2}>
          {loadingSent && <Box sx={{ p: 3, textAlign: 'center' }}><CircularProgress /></Box>}
          {!loadingSent && sent.length === 0 && (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No sent requests.</Typography>
            </Box>
          )}
          {sent.length > 0 && <List disablePadding>{sent.map((r) => <SentRequestItem key={r.id} request={r} />)}</List>}
        </TabPanel>
      </Paper>
    </Box>
  );
}
