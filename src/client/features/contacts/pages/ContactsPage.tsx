import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  TextField,
  InputAdornment,
  Avatar,
  Chip,
  IconButton,
  Button,
  CircularProgress,
  Alert,
  Tooltip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Badge,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ChatIcon from '@mui/icons-material/Chat';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useContacts, useToggleFavorite, useContactSearch } from '../queries/index';
import { useCreateConversation } from '@/features/chat/queries/index';
import { ROUTES } from '@/routes/index';
import type { IContactWithUser } from '@shared/types/social';

function ContactItem({ contact }: { contact: IContactWithUser }) {
  const navigate = useNavigate();
  const toggle = useToggleFavorite();
  const createConversation = useCreateConversation();
  const initials = contact.displayName.charAt(0).toUpperCase();

  const handleMessage = () => {
    createConversation.mutate(contact.contactUserId, {
      onSuccess: (res) => navigate(`${ROUTES.CHAT}/${res.data._id}`),
    });
  };

  return (
    <ListItem alignItems="flex-start" divider>
      <ListItemAvatar>
        <Badge overlap="circular" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
          <Avatar src={contact.avatar} alt={contact.displayName} sx={{ bgcolor: 'primary.main' }}>
            {initials}
          </Avatar>
        </Badge>
      </ListItemAvatar>
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {contact.displayName}
            </Typography>
            {contact.labels.map((label) => (
              <Chip
                key={label}
                label={label}
                size="small"
                variant="outlined"
                sx={{ height: 18, fontSize: 10 }}
              />
            ))}
          </Box>
        }
        secondary={
          <Typography variant="caption" color="text.secondary">
            @{contact.username}
            {contact.notes && ` · ${contact.notes}`}
          </Typography>
        }
      />
      <ListItemSecondaryAction sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Tooltip title="Message">
          <IconButton
            size="small"
            onClick={handleMessage}
            disabled={createConversation.isPending}
            aria-label="Send message"
          >
            {createConversation.isPending ? (
              <CircularProgress size={16} />
            ) : (
              <ChatIcon fontSize="small" color="primary" />
            )}
          </IconButton>
        </Tooltip>
        <Tooltip title={contact.isFavorite ? 'Remove from favourites' : 'Add to favourites'}>
          <IconButton
            edge="end"
            size="small"
            onClick={() => toggle.mutate(contact.id)}
            disabled={toggle.isPending}
            aria-label={contact.isFavorite ? 'Remove favourite' : 'Add favourite'}
          >
            {contact.isFavorite ? (
              <StarIcon fontSize="small" color="warning" />
            ) : (
              <StarBorderIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>
      </ListItemSecondaryAction>
    </ListItem>
  );
}

export default function ContactsPage() {
  const [search, setSearch] = useState('');
  const [showFavourites, setShowFavourites] = useState(false);

  const { data, isLoading, isError } = useContacts(
    showFavourites ? { isFavorite: true } : undefined,
  );
  const { data: searchResults, isFetching: isSearching } = useContactSearch(search);

  const contacts = search.length > 0 ? (searchResults ?? []) : (data?.contacts ?? []);
  const meta = data?.meta;

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', p: { xs: 1.5, sm: 2.5 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Contacts
          </Typography>
          {meta && (
            <Typography variant="caption" color="text.secondary">
              {meta.total} contact{meta.total !== 1 ? 's' : ''}
            </Typography>
          )}
        </Box>
        <Button variant="contained" startIcon={<PersonAddIcon />} size="small">
          Add contact
        </Button>
      </Box>

      {/* Search & filter */}
      <Paper sx={{ p: 1.5, mb: 2, display: 'flex', gap: 1, alignItems: 'center', borderRadius: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search contacts…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  {isSearching ? <CircularProgress size={16} /> : <SearchIcon fontSize="small" />}
                </InputAdornment>
              ),
            },
          }}
        />
        <Tooltip title={showFavourites ? 'Show all' : 'Favourites only'}>
          <IconButton
            onClick={() => setShowFavourites((v) => !v)}
            color={showFavourites ? 'warning' : 'default'}
            aria-label="Toggle favourites filter"
          >
            {showFavourites ? <StarIcon /> : <StarBorderIcon />}
          </IconButton>
        </Tooltip>
        <Tooltip title="Filter">
          <IconButton aria-label="Filter contacts">
            <FilterListIcon />
          </IconButton>
        </Tooltip>
      </Paper>

      {/* List */}
      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        )}
        {isError && (
          <Alert severity="error" sx={{ m: 2 }}>
            Failed to load contacts.
          </Alert>
        )}
        {!isLoading && contacts.length === 0 && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              {search
                ? 'No contacts match your search.'
                : 'No contacts yet. Add someone to get started!'}
            </Typography>
          </Box>
        )}
        {contacts.length > 0 && (
          <List disablePadding>
            {contacts.map((c, i) => (
              <Box key={c.id}>
                <ContactItem contact={c} />
                {i < contacts.length - 1 && <Divider component="li" />}
              </Box>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
}
