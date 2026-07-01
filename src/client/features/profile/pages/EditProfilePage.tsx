import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import {
  Box,
  TextField,
  Button,
  Avatar,
  Alert,
  CircularProgress,
  Typography,
  Paper,
  IconButton,
  Tooltip,
  Skeleton,
  Divider,
} from '@mui/material';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import DeleteIcon from '@mui/icons-material/Delete';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import {
  useGetOwnProfile,
  useUpdateProfile,
  useUploadAvatar,
  useRemoveAvatar,
  useUploadCoverImage,
  useRemoveCoverImage,
} from '../queries';
import { useAuthStore } from '@/store/authStore';

interface EditProfileFormValues {
  displayName: string;
  bio: string;
  location: string;
  website: string;
  statusMessage: string;
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error
  ) {
    const axiosError = error as {
      response?: { data?: { message?: string; error?: string } };
    };
    return (
      axiosError.response?.data?.message ??
      axiosError.response?.data?.error ??
      'Failed to update profile. Please try again.'
    );
  }
  return 'Failed to update profile. Please try again.';
}

export default function EditProfilePage() {
  const user = useAuthStore((s) => s.user);
  const { data: profile, isLoading } = useGetOwnProfile();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const removeAvatar = useRemoveAvatar();
  const uploadCover = useUploadCoverImage();
  const removeCover = useRemoveCoverImage();

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<EditProfileFormValues>({
    defaultValues: {
      displayName: '',
      bio: '',
      location: '',
      website: '',
      statusMessage: '',
    },
  });

  // Populate form once profile loads.
  useEffect(() => {
    if (profile) {
      reset({
        displayName: profile.displayName ?? '',
        bio: profile.bio ?? '',
        location: profile.location ?? '',
        website: profile.website ?? '',
        statusMessage: profile.statusMessage ?? '',
      });
    }
  }, [profile, reset]);

  const onSubmit = (data: EditProfileFormValues) => {
    updateProfile.mutate({
      displayName: data.displayName || undefined,
      bio: data.bio || undefined,
      location: data.location || undefined,
      website: data.website || undefined,
      statusMessage: data.statusMessage || undefined,
    });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadAvatar.mutate(file);
    e.target.value = '';
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadCover.mutate(file);
    e.target.value = '';
  };

  const isFormLoading = isSubmitting || updateProfile.isPending;
  const displayName = profile?.displayName ?? user?.username ?? '';
  const avatarUrl = profile?.avatar?.url;
  const coverUrl = profile?.coverImage?.url;

  if (isLoading) {
    return (
      <Box data-testid="page-edit-profile" sx={{ maxWidth: 680, mx: 'auto', p: 2 }}>
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Skeleton width="40%" height={40} />
          <Skeleton variant="rectangular" height={160} sx={{ mt: 2, borderRadius: 2 }} />
          <Skeleton variant="circular" width={80} height={80} sx={{ mt: -4 }} />
          <Skeleton width="100%" height={56} sx={{ mt: 3 }} />
          <Skeleton width="100%" height={56} sx={{ mt: 2 }} />
          <Skeleton width="100%" height={100} sx={{ mt: 2 }} />
        </Paper>
      </Box>
    );
  }

  return (
    <Box data-testid="page-edit-profile" sx={{ maxWidth: 680, mx: 'auto', p: { xs: 1, sm: 2 } }}>
      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        {/* Cover image */}
        <Box
          sx={{
            height: { xs: 120, sm: 160 },
            bgcolor: 'primary.light',
            backgroundImage: coverUrl ? `url(${coverUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              display: 'flex',
              gap: 1,
            }}
          >
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleCoverChange}
              aria-label="Upload cover image"
            />
            <Tooltip title="Change cover image">
              <IconButton
                onClick={() => coverInputRef.current?.click()}
                disabled={uploadCover.isPending}
                sx={{ bgcolor: 'background.paper', '&:hover': { bgcolor: 'action.hover' } }}
                aria-label="Change cover image"
              >
                {uploadCover.isPending ? (
                  <CircularProgress size={18} />
                ) : (
                  <AddPhotoAlternateIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
            {coverUrl && (
              <Tooltip title="Remove cover image">
                <IconButton
                  onClick={() => removeCover.mutate()}
                  disabled={removeCover.isPending}
                  sx={{ bgcolor: 'background.paper', '&:hover': { bgcolor: 'action.hover' } }}
                  aria-label="Remove cover image"
                >
                  {removeCover.isPending ? (
                    <CircularProgress size={18} />
                  ) : (
                    <DeleteIcon fontSize="small" color="error" />
                  )}
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* Form body */}
        <Box sx={{ px: { xs: 2, sm: 3 }, pb: 3 }}>
          {/* Avatar */}
          <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, mt: '-40px', mb: 2 }}>
            <Box sx={{ position: 'relative' }}>
              <Avatar
                src={avatarUrl}
                alt={displayName}
                sx={{
                  width: 80,
                  height: 80,
                  border: '3px solid',
                  borderColor: 'background.paper',
                  bgcolor: 'primary.main',
                  fontSize: 28,
                }}
              >
                {displayName.charAt(0).toUpperCase()}
              </Avatar>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarChange}
                aria-label="Upload avatar"
              />
              <Tooltip title="Change avatar">
                <IconButton
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadAvatar.isPending}
                  size="small"
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    bgcolor: 'primary.main',
                    color: 'white',
                    '&:hover': { bgcolor: 'primary.dark' },
                    width: 26,
                    height: 26,
                  }}
                  aria-label="Change avatar"
                >
                  {uploadAvatar.isPending ? (
                    <CircularProgress size={14} color="inherit" />
                  ) : (
                    <CameraAltIcon sx={{ fontSize: 14 }} />
                  )}
                </IconButton>
              </Tooltip>
            </Box>
            {avatarUrl && (
              <Tooltip title="Remove avatar">
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => removeAvatar.mutate()}
                  disabled={removeAvatar.isPending}
                >
                  Remove
                </Button>
              </Tooltip>
            )}
          </Box>

          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            Edit Profile
          </Typography>
          <Divider sx={{ mb: 3 }} />

          {/* Error alerts */}
          {updateProfile.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {extractErrorMessage(updateProfile.error)}
            </Alert>
          )}
          {uploadAvatar.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {extractErrorMessage(uploadAvatar.error)}
            </Alert>
          )}
          {uploadCover.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {extractErrorMessage(uploadCover.error)}
            </Alert>
          )}
          {updateProfile.isSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Profile updated successfully.
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
          >
            <TextField
              id="edit-display-name"
              label="Display name"
              required
              fullWidth
              error={Boolean(errors.displayName)}
              helperText={errors.displayName?.message}
              disabled={isFormLoading}
              slotProps={{ htmlInput: { 'aria-label': 'Display name' } }}
              {...register('displayName', {
                required: 'Display name is required',
                maxLength: {
                  value: 50,
                  message: 'Display name must be at most 50 characters',
                },
              })}
            />

            <TextField
              id="edit-status-message"
              label="Status message"
              fullWidth
              placeholder="What's on your mind?"
              error={Boolean(errors.statusMessage)}
              helperText={errors.statusMessage?.message}
              disabled={isFormLoading}
              slotProps={{ htmlInput: { maxLength: 150, 'aria-label': 'Status message' } }}
              {...register('statusMessage', {
                maxLength: {
                  value: 150,
                  message: 'Status message must be at most 150 characters',
                },
              })}
            />

            <TextField
              id="edit-bio"
              label="Bio"
              fullWidth
              multiline
              minRows={3}
              maxRows={6}
              placeholder="Tell others about yourself"
              error={Boolean(errors.bio)}
              helperText={errors.bio?.message}
              disabled={isFormLoading}
              slotProps={{ htmlInput: { maxLength: 500, 'aria-label': 'Bio' } }}
              {...register('bio', {
                maxLength: {
                  value: 500,
                  message: 'Bio must be at most 500 characters',
                },
              })}
            />

            <TextField
              id="edit-location"
              label="Location"
              fullWidth
              placeholder="City, Country"
              error={Boolean(errors.location)}
              helperText={errors.location?.message}
              disabled={isFormLoading}
              slotProps={{ htmlInput: { maxLength: 100, 'aria-label': 'Location' } }}
              {...register('location', {
                maxLength: {
                  value: 100,
                  message: 'Location must be at most 100 characters',
                },
              })}
            />

            <TextField
              id="edit-website"
              label="Website"
              type="url"
              fullWidth
              placeholder="https://yourwebsite.com"
              error={Boolean(errors.website)}
              helperText={errors.website?.message}
              disabled={isFormLoading}
              slotProps={{ htmlInput: { maxLength: 200, 'aria-label': 'Website' } }}
              {...register('website', {
                maxLength: {
                  value: 200,
                  message: 'Website URL must be at most 200 characters',
                },
                pattern: {
                  value: /^(https?:\/\/)?([\w-]+(\.[\w-]+)+)(\/\S*)?$/,
                  message: 'Enter a valid URL',
                },
              })}
            />

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 1 }}>
              <Button
                type="button"
                variant="outlined"
                onClick={() => reset()}
                disabled={!isDirty || isFormLoading}
              >
                Discard changes
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isFormLoading}
                sx={{ minWidth: 120 }}
              >
                {isFormLoading ? (
                  <CircularProgress size={22} color="inherit" />
                ) : (
                  'Save changes'
                )}
              </Button>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
