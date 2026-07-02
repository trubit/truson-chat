import { useState } from 'react';
import {
  Box, Typography, Paper, TextField, InputAdornment,
  Avatar, Button, CircularProgress, Grid, Card,
  CardContent, CardActions, Chip, Alert,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CheckIcon from '@mui/icons-material/Check';
import { useSearchUsers, useSuggestions, useRecentSearches, useClearRecentSearches } from '../queries/index';
import { useSendFriendRequest } from '@/features/friends/queries/index';
import { useAddContact } from '@/features/contacts/queries/index';
import type { DiscoveredUser } from '@shared/types/social';

function UserCard({ user }: { user: DiscoveredUser }) {
  const sendRequest = useSendFriendRequest();
  const addContact = useAddContact();

  const initials = user.displayName.charAt(0).toUpperCase();
  const canAddFriend = !user.isFriend && !user.pendingRequest;
  const canAddContact = !user.isContact;

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 2 }}>
      <CardContent sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Avatar src={user.avatar} alt={user.displayName} sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
            {initials}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body1" sx={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.displayName}
            </Typography>
            <Typography variant="caption" color="text.secondary">@{user.username}</Typography>
          </Box>
        </Box>
        {user.bio && (
          <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {user.bio}
          </Typography>
        )}
        <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {user.isFriend && <Chip label="Friend" size="small" color="primary" icon={<CheckIcon />} />}
          {user.isContact && <Chip label="Contact" size="small" variant="outlined" />}
          {user.pendingRequest === 'sent' && <Chip label="Request sent" size="small" color="info" />}
          {user.pendingRequest === 'received' && <Chip label="Wants to connect" size="small" color="success" />}
          {user.mutualFriendCount > 0 && (
            <Chip label={`${user.mutualFriendCount} mutual`} size="small" variant="outlined" />
          )}
        </Box>
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2, gap: 1 }}>
        {canAddFriend && (
          <Button
            size="small"
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={() => sendRequest.mutate({ userId: user.id })}
            disabled={sendRequest.isPending}
            fullWidth
          >
            Add friend
          </Button>
        )}
        {canAddContact && !user.isFriend && (
          <Button
            size="small"
            variant="outlined"
            onClick={() => addContact.mutate({ userId: user.id })}
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
  const [query, setQuery] = useState('');

  const { data: searchData, isFetching } = useSearchUsers({ q: query }, query.length >= 2);
  const { data: suggestions = [] } = useSuggestions(12);
  const { data: recentSearches = [] } = useRecentSearches();
  const clearRecent = useClearRecentSearches();

  const searchResults = searchData?.users ?? [];
  const showResults = query.length >= 2;

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: { xs: 1.5, sm: 2.5 } }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Discover People</Typography>

      {/* Search bar */}
      <Paper sx={{ p: 1.5, mb: 3, borderRadius: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search by name or username…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
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
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'text.secondary' }}>
            Results
          </Typography>
          {searchResults.length === 0 && !isFetching && (
            <Alert severity="info">No users found for &ldquo;{query}&rdquo;.</Alert>
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
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
              Recent searches
            </Typography>
            <Button size="small" onClick={() => clearRecent.mutate()} disabled={clearRecent.isPending}>
              Clear
            </Button>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {recentSearches.map((r) => (
              <Chip
                key={r.userId}
                avatar={<Avatar src={r.avatar}>{r.displayName.charAt(0)}</Avatar>}
                label={r.displayName}
                onClick={() => setQuery(r.username)}
                clickable
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Suggestions */}
      {!showResults && suggestions.length > 0 && (
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'text.secondary' }}>
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
