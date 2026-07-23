import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider,
  IconButton,
  Tooltip,
  Grid,
  Card,
  CardContent,
  Skeleton,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DevicesIcon from '@mui/icons-material/Devices';
import SecurityIcon from '@mui/icons-material/Security';
import HistoryIcon from '@mui/icons-material/History';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import ComputerIcon from '@mui/icons-material/Computer';
import { useSecurityOverview, useSecurityLogs } from '../queries';
import {
  useListSessions,
  useRevokeSession,
  useRevokeAllSessions,
} from '@/features/sessions/queries';
import { useListDevices, useTrustDevice, useRemoveDevice } from '@/features/devices/queries';
import { formatDistanceToNow } from 'date-fns';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateString: string): string {
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch {
    return dateString;
  }
}

function severityColor(severity: string): 'default' | 'warning' | 'error' | 'success' | 'info' {
  if (severity === 'high' || severity === 'critical') return 'error';
  if (severity === 'medium') return 'warning';
  if (severity === 'low') return 'info';
  return 'default';
}

// ---------------------------------------------------------------------------
// Overview stats card
// ---------------------------------------------------------------------------

function OverviewCard() {
  const { data: overview, isLoading } = useSecurityOverview();

  const stats = [
    { label: 'Active sessions', value: overview?.activeSessions ?? 0, icon: <DevicesIcon /> },
    { label: 'Trusted devices', value: overview?.trustedDevices ?? 0, icon: <SmartphoneIcon /> },
    { label: 'Failed logins', value: overview?.failedLogins ?? 0, icon: <SecurityIcon /> },
  ];

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {stats.map((stat) => (
        <Grid key={stat.label} size={{ xs: 12, sm: 4 }}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ color: 'primary.main' }}>{stat.icon}</Box>
              <Box>
                {isLoading ? (
                  <Skeleton width={40} height={32} />
                ) : (
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {stat.value}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary">
                  {stat.label}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

// ---------------------------------------------------------------------------
// Sessions section
// ---------------------------------------------------------------------------

function SessionsSection() {
  const { data: sessionsData, isLoading } = useListSessions();
  const revokeSession = useRevokeSession();
  const revokeAllSessions = useRevokeAllSessions();

  const sessions = sessionsData?.sessions ?? [];
  const currentSessionId = sessionsData?.currentSessionId;

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Active sessions
        </Typography>
        {sessions.length > 1 && (
          <Button
            size="small"
            color="error"
            variant="outlined"
            onClick={() => revokeAllSessions.mutate()}
            disabled={revokeAllSessions.isPending}
          >
            {revokeAllSessions.isPending ? <CircularProgress size={16} /> : 'Revoke all others'}
          </Button>
        )}
      </Box>

      {isLoading ? (
        [1, 2, 3].map((i) => <Skeleton key={i} height={72} sx={{ mb: 1 }} />)
      ) : sessions.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No active sessions found.
        </Typography>
      ) : (
        <List disablePadding>
          {sessions.map((session, idx) => (
            <Box key={session.id}>
              <ListItem
                disablePadding
                sx={{ py: 1.5 }}
                secondaryAction={
                  !session.isCurrent && (
                    <Tooltip title="Revoke session">
                      <IconButton
                        edge="end"
                        color="error"
                        onClick={() => revokeSession.mutate(session.id)}
                        disabled={revokeSession.isPending}
                        aria-label="Revoke session"
                        size="small"
                      >
                        {revokeSession.isPending ? <CircularProgress size={16} /> : <DeleteIcon />}
                      </IconButton>
                    </Tooltip>
                  )
                }
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {session.location?.city
                          ? `${session.location.city}, ${session.location.country ?? ''}`
                          : session.ipAddress}
                      </Typography>
                      {session.id === currentSessionId && (
                        <Chip label="Current" size="small" color="success" />
                      )}
                    </Box>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {session.userAgent} &bull; Active {formatDate(session.lastActivityAt)}
                    </Typography>
                  }
                />
              </ListItem>
              {idx < sessions.length - 1 && <Divider />}
            </Box>
          ))}
        </List>
      )}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Devices section
// ---------------------------------------------------------------------------

function DevicesSection() {
  const { data: devices = [], isLoading } = useListDevices();
  const trustDevice = useTrustDevice();
  const removeDevice = useRemoveDevice();

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
        Trusted devices
      </Typography>

      {isLoading ? (
        [1, 2].map((i) => <Skeleton key={i} height={72} sx={{ mb: 1 }} />)
      ) : devices.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No devices recorded.
        </Typography>
      ) : (
        <List disablePadding>
          {devices.map((device, idx) => (
            <Box key={device.id}>
              <ListItem
                disablePadding
                sx={{ py: 1.5 }}
                secondaryAction={
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant={device.trusted ? 'outlined' : 'contained'}
                      onClick={() =>
                        trustDevice.mutate({ id: device.id, trusted: !device.trusted })
                      }
                      disabled={trustDevice.isPending}
                    >
                      {device.trusted ? 'Untrust' : 'Trust'}
                    </Button>
                    {!device.isCurrentDevice && (
                      <Tooltip title="Remove device">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => removeDevice.mutate(device.id)}
                          disabled={removeDevice.isPending}
                          aria-label="Remove device"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                }
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mr: 12 }}>
                  {device.type === 'mobile' ? (
                    <SmartphoneIcon color="action" />
                  ) : (
                    <ComputerIcon color="action" />
                  )}
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {device.name}
                        </Typography>
                        {device.isCurrentDevice && (
                          <Chip label="This device" size="small" color="primary" />
                        )}
                        {device.trusted && <Chip label="Trusted" size="small" color="success" />}
                      </Box>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {device.platform}
                        {device.browser ? ` · ${device.browser}` : ''} · Last seen{' '}
                        {formatDate(device.lastSeenAt)}
                      </Typography>
                    }
                  />
                </Box>
              </ListItem>
              {idx < devices.length - 1 && <Divider />}
            </Box>
          ))}
        </List>
      )}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Security logs section
// ---------------------------------------------------------------------------

function SecurityLogsSection() {
  const { data, isLoading } = useSecurityLogs({ page: 1, limit: 20 });
  const logs = data?.logs ?? [];

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <HistoryIcon color="action" />
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Recent security events
        </Typography>
      </Box>

      {isLoading ? (
        [1, 2, 3].map((i) => <Skeleton key={i} height={56} sx={{ mb: 0.5 }} />)
      ) : logs.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No security events recorded.
        </Typography>
      ) : (
        <List disablePadding dense>
          {logs.map((log, idx) => (
            <Box key={log.id}>
              <ListItem disablePadding sx={{ py: 1 }}>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2">{log.eventType.replace(/_/g, ' ')}</Typography>
                      <Chip
                        label={log.severity}
                        size="small"
                        color={severityColor(log.severity)}
                        sx={{ textTransform: 'capitalize', height: 18, fontSize: 10 }}
                      />
                    </Box>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {log.ipAddress ? `${log.ipAddress} · ` : ''}
                      {formatDate(log.createdAt)}
                    </Typography>
                  }
                />
              </ListItem>
              {idx < logs.length - 1 && <Divider />}
            </Box>
          ))}
        </List>
      )}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Main SecurityPage
// ---------------------------------------------------------------------------

export default function SecurityPage() {
  return (
    <Box data-testid="page-security" sx={{ maxWidth: 800, mx: 'auto', p: { xs: 1, sm: 2 } }}>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
        Security center
      </Typography>

      <OverviewCard />

      <Paper sx={{ borderRadius: 3, p: { xs: 2, sm: 3 }, mb: 3 }}>
        <SessionsSection />
      </Paper>

      <Paper sx={{ borderRadius: 3, p: { xs: 2, sm: 3 }, mb: 3 }}>
        <DevicesSection />
      </Paper>

      <Paper sx={{ borderRadius: 3, p: { xs: 2, sm: 3 } }}>
        <SecurityLogsSection />
      </Paper>
    </Box>
  );
}
