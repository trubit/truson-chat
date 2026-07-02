import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Box, Typography, Paper, FormControl,
  Select, MenuItem, Switch, FormControlLabel, Button,
  Divider, Alert, CircularProgress, Skeleton,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { usePrivacySettings, useUpdatePrivacySettings } from '../queries/index';
import type { UpdatePrivacyDto, VisibilityLevel, LimitedVisibility, RequestVisibility } from '@shared/types/social';

const VISIBILITY_OPTS: { value: VisibilityLevel; label: string }[] = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'friends', label: 'Friends only' },
  { value: 'contacts', label: 'Contacts only' },
  { value: 'nobody', label: 'Nobody' },
];

const LIMITED_OPTS: { value: LimitedVisibility; label: string }[] = [
  { value: 'friends', label: 'Friends only' },
  { value: 'contacts', label: 'Contacts only' },
  { value: 'nobody', label: 'Nobody' },
];

const REQUEST_OPTS: { value: RequestVisibility; label: string }[] = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'friends', label: 'Friends only' },
  { value: 'contacts', label: 'Contacts only' },
];

type SelectField<T> = {
  key: keyof UpdatePrivacyDto;
  label: string;
  description: string;
  options: { value: T; label: string }[];
};

const VISIBILITY_FIELDS: SelectField<VisibilityLevel>[] = [
  { key: 'profileVisibility', label: 'Profile', description: 'Who can view your full profile', options: VISIBILITY_OPTS },
  { key: 'lastSeenVisibility', label: 'Last seen', description: 'Who can see when you were last active', options: VISIBILITY_OPTS },
  { key: 'onlineStatusVisibility', label: 'Online status', description: 'Who can see when you are online', options: VISIBILITY_OPTS },
];

const LIMITED_FIELDS: SelectField<LimitedVisibility>[] = [
  { key: 'emailVisibility', label: 'Email address', description: 'Who can see your email', options: LIMITED_OPTS },
  { key: 'phoneVisibility', label: 'Phone number', description: 'Who can see your phone number', options: LIMITED_OPTS },
];

const REQUEST_FIELDS: SelectField<RequestVisibility>[] = [
  { key: 'friendRequestsFrom', label: 'Friend requests', description: 'Who can send you friend requests', options: REQUEST_OPTS },
  { key: 'searchVisibility', label: 'Search visibility', description: 'Who can find you via search', options: REQUEST_OPTS },
];

function SettingRow<T extends string>({
  field, control, options, isLoading,
}: { field: SelectField<T>; control: any; options: { value: T; label: string }[]; isLoading: boolean }) {
  return (
    <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{field.label}</Typography>
        <Typography variant="caption" color="text.secondary">{field.description}</Typography>
      </Box>
      <Controller
        name={field.key as any}
        control={control}
        render={({ field: f }) =>
          isLoading ? (
            <Skeleton variant="rectangular" width={160} height={36} sx={{ borderRadius: 1 }} />
          ) : (
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <Select {...f} value={f.value ?? options[0].value}>
                {options.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )
        }
      />
    </Box>
  );
}

export default function PrivacyPage() {
  const { data: settings, isLoading } = usePrivacySettings();
  const update = useUpdatePrivacySettings();

  const { control, handleSubmit, reset } = useForm<UpdatePrivacyDto>({
    defaultValues: {
      profileVisibility: 'everyone',
      lastSeenVisibility: 'friends',
      onlineStatusVisibility: 'friends',
      emailVisibility: 'nobody',
      phoneVisibility: 'nobody',
      friendRequestsFrom: 'everyone',
      searchVisibility: 'everyone',
      discoverable: true,
      allowContactFromEveryone: true,
    },
  });

  useEffect(() => {
    if (settings) {
      reset({
        profileVisibility: settings.profileVisibility,
        lastSeenVisibility: settings.lastSeenVisibility,
        onlineStatusVisibility: settings.onlineStatusVisibility,
        emailVisibility: settings.emailVisibility,
        phoneVisibility: settings.phoneVisibility,
        friendRequestsFrom: settings.friendRequestsFrom,
        searchVisibility: settings.searchVisibility,
        discoverable: settings.discoverable,
        allowContactFromEveryone: settings.allowContactFromEveryone,
      });
    }
  }, [settings, reset]);

  return (
    <Box sx={{ maxWidth: 640, mx: 'auto', p: { xs: 1.5, sm: 2.5 } }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>Privacy Settings</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
        Control who can see your information and how others can contact you.
      </Typography>

      {update.isSuccess && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => update.reset()}>
          Privacy settings saved.
        </Alert>
      )}
      {update.isError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => update.reset()}>
          Failed to save settings. Please try again.
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit((data) => update.mutate(data))} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Visibility */}
        <Paper sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Visibility</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {VISIBILITY_FIELDS.map((f, i) => (
              <Box key={f.key}>
                {i > 0 && <Divider sx={{ mb: 2 }} />}
                <SettingRow field={f} control={control} options={VISIBILITY_OPTS} isLoading={isLoading} />
              </Box>
            ))}
            {LIMITED_FIELDS.map((f) => (
              <Box key={f.key}>
                <Divider sx={{ mb: 2 }} />
                <SettingRow field={f} control={control} options={LIMITED_OPTS} isLoading={isLoading} />
              </Box>
            ))}
          </Box>
        </Paper>

        {/* Contact & discovery */}
        <Paper sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Contact & Discovery</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {REQUEST_FIELDS.map((f, i) => (
              <Box key={f.key}>
                {i > 0 && <Divider sx={{ mb: 2 }} />}
                <SettingRow field={f} control={control} options={REQUEST_OPTS} isLoading={isLoading} />
              </Box>
            ))}
            <Divider />
            <Controller
              name="discoverable"
              control={control}
              render={({ field: f }) => (
                <FormControlLabel
                  control={<Switch checked={f.value ?? true} onChange={(e) => f.onChange(e.target.checked)} />}
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>Discoverable</Typography>
                      <Typography variant="caption" color="text.secondary">Show your profile in suggestions</Typography>
                    </Box>
                  }
                  labelPlacement="start"
                  sx={{ justifyContent: 'space-between', mx: 0, width: '100%' }}
                />
              )}
            />
            <Divider />
            <Controller
              name="allowContactFromEveryone"
              control={control}
              render={({ field: f }) => (
                <FormControlLabel
                  control={<Switch checked={f.value ?? true} onChange={(e) => f.onChange(e.target.checked)} />}
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>Accept contact requests from anyone</Typography>
                      <Typography variant="caption" color="text.secondary">If off, only friends can add you as a contact</Typography>
                    </Box>
                  }
                  labelPlacement="start"
                  sx={{ justifyContent: 'space-between', mx: 0, width: '100%' }}
                />
              )}
            />
          </Box>
        </Paper>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            type="submit"
            variant="contained"
            startIcon={update.isPending ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            disabled={update.isPending || isLoading}
          >
            {update.isPending ? 'Saving…' : 'Save settings'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
