import { useNavigate } from 'react-router-dom';
import {
  Box,
  Avatar,
  Typography,
  Button,
  Paper,
  Skeleton,
  Alert,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import LinkIcon from '@mui/icons-material/Link';
import { useGetOwnProfile } from '../queries';
import { useAuthStore } from '@/store/authStore';

export default function ProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { data: profile, isLoading, isError } = useGetOwnProfile();

  if (isLoading) {
    return (
      <Box data-testid="page-profile" sx={{ maxWidth: 680, mx: 'auto', p: 2 }}>
        <Paper sx={{ overflow: 'hidden', borderRadius: 3 }}>
          {/* Cover skeleton */}
          <Skeleton variant="rectangular" height={200} />
          <Box sx={{ px: 3, pb: 3 }}>
            {/* Avatar skeleton */}
            <Skeleton
              variant="circular"
              width={100}
              height={100}
              sx={{ mt: -6, border: '4px solid', borderColor: 'background.paper' }}
            />
            <Skeleton width="40%" height={32} sx={{ mt: 1 }} />
            <Skeleton width="25%" height={20} sx={{ mt: 0.5 }} />
            <Skeleton width="70%" height={20} sx={{ mt: 2 }} />
            <Skeleton width="55%" height={20} sx={{ mt: 0.5 }} />
          </Box>
        </Paper>
      </Box>
    );
  }

  if (isError) {
    return (
      <Box data-testid="page-profile" sx={{ maxWidth: 680, mx: 'auto', p: 2 }}>
        <Alert severity="error">Failed to load profile. Please try again.</Alert>
      </Box>
    );
  }

  const displayName = profile?.displayName ?? user?.username ?? 'Unknown';
  const username = user?.username ?? '';
  const coverUrl = profile?.coverImage?.url;
  const avatarUrl = profile?.avatar?.url;

  return (
    <Box data-testid="page-profile" sx={{ maxWidth: 680, mx: 'auto', p: { xs: 1, sm: 2 } }}>
      <Paper sx={{ overflow: 'hidden', borderRadius: 3 }}>
        {/* Cover image */}
        <Box
          sx={{
            height: { xs: 140, sm: 200 },
            bgcolor: 'primary.light',
            backgroundImage: coverUrl ? `url(${coverUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative',
          }}
        >
          <Tooltip title="Edit profile">
            <IconButton
              onClick={() => navigate('/settings/profile')}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                bgcolor: 'background.paper',
                '&:hover': { bgcolor: 'action.hover' },
              }}
              aria-label="Edit profile"
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ px: { xs: 2, sm: 3 }, pb: 3 }}>
          {/* Avatar */}
          <Avatar
            src={avatarUrl}
            alt={displayName}
            sx={{
              width: 100,
              height: 100,
              mt: '-50px',
              border: '4px solid',
              borderColor: 'background.paper',
              fontSize: 36,
              bgcolor: 'primary.main',
            }}
          >
            {displayName.charAt(0).toUpperCase()}
          </Avatar>

          {/* Name, username, status */}
          <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                {displayName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                @{username}
              </Typography>
            </Box>
            <Button
              variant="outlined"
              size="small"
              startIcon={<EditIcon />}
              onClick={() => navigate('/settings/profile')}
              sx={{ flexShrink: 0, mt: 0.5 }}
            >
              Edit profile
            </Button>
          </Box>

          {/* Role badge */}
          {user?.role && user.role !== 'user' && (
            <Chip
              label={user.role}
              size="small"
              color="primary"
              sx={{ mt: 1, textTransform: 'capitalize' }}
            />
          )}

          {/* Status message */}
          {profile?.statusMessage && (
            <Typography
              variant="body1"
              sx={{ mt: 1.5, fontStyle: 'italic', color: 'text.secondary' }}
            >
              &ldquo;{profile.statusMessage}&rdquo;
            </Typography>
          )}

          {/* Bio */}
          {profile?.bio && (
            <Typography variant="body2" sx={{ mt: 1.5 }}>
              {profile.bio}
            </Typography>
          )}

          {/* Location & website */}
          <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {profile?.location && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <LocationOnIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {profile.location}
                </Typography>
              </Box>
            )}
            {profile?.website && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <LinkIcon fontSize="small" color="action" />
                <Typography
                  component="a"
                  href={
                    profile.website.startsWith('http')
                      ? profile.website
                      : `https://${profile.website}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="body2"
                  color="primary"
                  sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                >
                  {profile.website}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Email verification badge */}
          {user && !user.emailVerified && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Your email is not verified. Check your inbox.
            </Alert>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
