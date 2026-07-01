import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Paper,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Skeleton,
} from '@mui/material';
import { useGetOwnProfile, useUpdatePrivacy } from '../queries';
import type { PrivacyVisibility } from '@/types/auth';

interface PrivacyState {
  profileVisibility: PrivacyVisibility;
  lastSeenVisibility: PrivacyVisibility;
  profilePhotoVisibility: PrivacyVisibility;
  aboutVisibility: PrivacyVisibility;
}

const VISIBILITY_OPTIONS: { value: PrivacyVisibility; label: string }[] = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'contacts', label: 'My contacts' },
  { value: 'nobody', label: 'Nobody' },
];

const DEFAULT_PRIVACY: PrivacyState = {
  profileVisibility: 'everyone',
  lastSeenVisibility: 'everyone',
  profilePhotoVisibility: 'everyone',
  aboutVisibility: 'everyone',
};

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
      'Failed to update privacy settings. Please try again.'
    );
  }
  return 'Failed to update privacy settings. Please try again.';
}

export default function PrivacySettingsPage() {
  const { data: profile, isLoading } = useGetOwnProfile();
  const updatePrivacy = useUpdatePrivacy();

  const [privacy, setPrivacy] = useState<PrivacyState>(DEFAULT_PRIVACY);

  useEffect(() => {
    if (profile?.privacySettings) {
      setPrivacy({
        profileVisibility: (profile.privacySettings.profileVisibility as PrivacyVisibility) ?? 'everyone',
        lastSeenVisibility: (profile.privacySettings.lastSeenVisibility as PrivacyVisibility) ?? 'everyone',
        profilePhotoVisibility: (profile.privacySettings.profilePhotoVisibility as PrivacyVisibility) ?? 'everyone',
        aboutVisibility: (profile.privacySettings.aboutVisibility as PrivacyVisibility) ?? 'everyone',
      });
    }
  }, [profile]);

  const handleChange =
    (field: keyof PrivacyState) => (value: PrivacyVisibility) => {
      setPrivacy((prev) => ({ ...prev, [field]: value }));
    };

  const handleSave = () => {
    updatePrivacy.mutate(privacy);
  };

  if (isLoading) {
    return (
      <Box data-testid="page-privacy-settings" sx={{ maxWidth: 600, mx: 'auto', p: 2 }}>
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Skeleton width="50%" height={40} />
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} width="100%" height={56} sx={{ mt: 2 }} />
          ))}
        </Paper>
      </Box>
    );
  }

  const fields: Array<{ key: keyof PrivacyState; label: string; description: string }> =
    [
      {
        key: 'profileVisibility',
        label: 'Profile visibility',
        description: 'Who can see your profile page',
      },
      {
        key: 'lastSeenVisibility',
        label: 'Last seen',
        description: 'Who can see when you were last active',
      },
      {
        key: 'profilePhotoVisibility',
        label: 'Profile photo',
        description: 'Who can see your profile picture',
      },
      {
        key: 'aboutVisibility',
        label: 'About / Bio',
        description: 'Who can see your bio information',
      },
    ];

  return (
    <Box
      data-testid="page-privacy-settings"
      sx={{ maxWidth: 600, mx: 'auto', p: { xs: 1, sm: 2 } }}
    >
      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            Privacy settings
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Control who can see your information on Truson-Chat.
          </Typography>
          <Divider sx={{ mb: 3 }} />

          {updatePrivacy.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {extractErrorMessage(updatePrivacy.error)}
            </Alert>
          )}
          {updatePrivacy.isSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Privacy settings updated.
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {fields.map(({ key, label, description }) => (
              <Box key={key}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: { xs: 1, sm: 2 },
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {description}
                    </Typography>
                  </Box>
                  <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel id={`${key}-label`}>{label}</InputLabel>
                    <Select
                      labelId={`${key}-label`}
                      id={`${key}-select`}
                      value={privacy[key]}
                      label={label}
                      onChange={(e) =>
                        handleChange(key)(e.target.value as PrivacyVisibility)
                      }
                      disabled={updatePrivacy.isPending}
                      aria-label={label}
                    >
                      {VISIBILITY_OPTIONS.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Box>
            ))}
          </Box>

          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={updatePrivacy.isPending}
              sx={{ minWidth: 140 }}
            >
              {updatePrivacy.isPending ? (
                <CircularProgress size={22} color="inherit" />
              ) : (
                'Save settings'
              )}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
