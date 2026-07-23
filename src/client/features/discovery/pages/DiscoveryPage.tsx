import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Paper,
  TextField,
  InputAdornment,
  Avatar,
  Button,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Alert,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CheckIcon from '@mui/icons-material/Check';
import {
  useSearchUsers,
  useSuggestions,
  useRecentSearches,
  useClearRecentSearches,
} from '../queries/index';
import { useSendFriendRequest } from '@/features/friends/queries/index';
import { useAddContact } from '@/features/contacts/queries/index';
import type { DiscoveredUser } from '@shared/types/social';

function UserCard({ user }: { user: DiscoveredUser }) {
  const queryClient = useQueryClient();
  const sendRequest = useSendFriendRequest();
  const addContact = useAddContact();

  // Local optimistic state so the UI updates immediately on click
  const [friendSent, setFriendSent] = useState(user.pendingRequest === 'sent');
  const [contactAdded, setContactAdded] = useState(user.isContact);
  const [friendError, setFriendError] = useState('');
  const [contactError, setContactError] = useState('');

  const initials = user.displayName.charAt(0).toUpperCase();
  const isFriend = user.isFriend;
  const canAddFriend = !isFriend && !friendSent && user.pendingRequest !== 'received';
  const canAddContact = !isFriend && !contactAdded;

  const handleAddFriend = () => {
    setFriendError('');
    setFriendSent(true);
    sendRequest.mutate(
      { userId: user.id },
      {
        onSuccess: () => {
          // Refresh search so server-side flags sync
          void queryClient.invalidateQueries({ queryKey: ['discovery', 'search'] });
        },
        onError: (err: unknown) => {
          setFriendSent(false);
          const msg = err instanceof Error ? err.message : 'Failed to send request';
          setFriendError(msg);
        },
      },
    );
  };

  const handleAddContact = () => {
    setContactError('');
    setContactAdded(true);
    addContact.mutate(
      { userId: user.id },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: ['discovery', 'search'] });
        },
        onError: (err: unknown) => {
          setContactAdded(false);
          const msg = err instanceof Error ? err.message : 'Failed to add contact';
          setContactError(msg);
        },
      },
    );
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 2 }}>
      <CardContent sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Avatar
            src={user.avatar}
            alt={user.displayName}
            sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}
          >
            {initials}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="body1"
              sx={{
                fontWeight: 700,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user.displayName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              @{user.username}
            </Typography>
          </Box>
        </Box>
        {user.bio && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {user.bio}
          </Typography>
        )}
        <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {isFriend && <Chip label="Friend" size="small" color="primary" icon={<CheckIcon />} />}
          {contactAdded && <Chip label="Contact" size="small" variant="outlined" />}
          {friendSent && <Chip label="Request sent" size="small" color="info" />}
          {user.pendingRequest === 'received' && (
            <Chip label="Wants to connect" size="small" color="success" />
          )}
          {user.mutualFriendCount > 0 && (
            <Chip label={`${user.mutualFriendCount} mutual`} size="small" variant="outlined" />
          )}
        </Box>
        {friendError && (
          <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
            {friendError}
          </Typography>
        )}
        {contactError && (
          <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
            {contactError}
          </Typography>
        )}
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2, gap: 1 }}>
        {canAddFriend && (
          <Button
            size="small"
            variant="contained"
            startIcon={
              sendRequest.isPending ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <PersonAddIcon />
              )
            }
            onClick={handleAddFriend}
            disabled={sendRequest.isPending}
            fullWidth
          >
            Add friend
          </Button>
        )}
        {canAddContact && (
          <Button
            size="small"
            variant="outlined"
            startIcon={
              addContact.isPending ? <CircularProgress size={14} color="inherit" /> : undefined
            }
            onClick={handleAddContact}
            disabled={addContact.isPending}
            fullWidth
          >
            Add contact
          </Button>
        )}
      </CardActions>
    </Card>
  );
}

export default function DiscoveryPage() {
  const [rawQuery, setRawQuery] = useState('');
  // Strip leading @ so users can type "@username" or "username" interchangeably
  const query = rawQuery.startsWith('@') ? rawQuery.slice(1) : rawQuery;

  const { data: searchData, isFetching } = useSearchUsers({ q: query }, query.length >= 2);
  const { data: suggestions = [] } = useSuggestions(12);
  const { data: recentSearches = [] } = useRecentSearches();
  const clearRecent = useClearRecentSearches();

  const searchResults = searchData?.users ?? [];
  const showResults = rawQuery.length >= 2;

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: { xs: 1.5, sm: 2.5 } }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        Discover People
      </Typography>

      {/* Search bar */}
      <Paper sx={{ p: 1.5, mb: 3, borderRadius: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search by name or username…"
          value={rawQuery}
          onChange={(e) => setRawQuery(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  {isFetching ? <CircularProgress size={16} /> : <SearchIcon fontSize="small" />}
                </InputAdornment>
              ),
            },
          }}
        />
      </Paper>

      {/* Search results */}
      {showResults && (
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 700, mb: 1.5, color: 'text.secondary' }}
          >
            Results
          </Typography>
          {searchResults.length === 0 && !isFetching && (
            <Alert severity="info">No users found for &ldquo;{rawQuery}&rdquo;.</Alert>
          )}
          <Grid container spacing={2}>
            {searchResults.map((user) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={user.id}>
                <UserCard user={user} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Recent searches */}
      {!showResults && recentSearches.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
              Recent searches
            </Typography>
            <Button
              size="small"
              onClick={() => clearRecent.mutate()}
              disabled={clearRecent.isPending}
            >
              Clear
            </Button>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {recentSearches.map((r) => (
              <Chip
                key={r.userId}
                avatar={<Avatar src={r.avatar}>{r.displayName.charAt(0)}</Avatar>}
                label={r.displayName}
                onClick={() => setRawQuery(r.username)}
                clickable
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Suggestions */}
      {!showResults && suggestions.length > 0 && (
        <Box>
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 700, mb: 1.5, color: 'text.secondary' }}
          >
            People you may know
          </Typography>
          <Grid container spacing={2}>
            {suggestions.map((user) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={user.id}>
                <UserCard user={user} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
}
