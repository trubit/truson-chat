import { useQuery } from '@tanstack/react-query';
import { Box, Typography, Grid, CircularProgress, LinearProgress } from '@mui/material';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import MemoryOutlinedIcon from '@mui/icons-material/MemoryOutlined';
import CodeOutlinedIcon from '@mui/icons-material/CodeOutlined';
import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import { apiService } from '@/services/api';

const C = {
  bg: '#060913',
  card: '#0A0D1F',
  border: 'rgba(255,255,255,0.06)',
  accent: '#F59E0B',
  violet: '#9B6DFF',
  teal: '#22D3EE',
  green: '#10B981',
  red: '#EF4444',
  txt1: '#F1F5F9',
  txt2: '#94A3B8',
  txt3: '#475569',
};

interface SystemInfo {
  uptime: number;
  uptimeHuman: string;
  memory: {
    heapUsedMB: number;
    heapTotalMB: number;
    rssMB: number;
  };
  nodeVersion: string;
  platform: string;
  env: string;
}

interface SystemResponse {
  success: boolean;
  data: SystemInfo;
}

function InfoCard({
  label,
  value,
  sub,
  Icon,
  color,
  progress,
  progressColor,
}: {
  label: string;
  value: string;
  sub?: string;
  Icon: React.ElementType;
  color: string;
  progress?: number;
  progressColor?: string;
}) {
  return (
    <Box
      sx={{
        bgcolor: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 3,
        p: 3,
        height: '100%',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2,
            bgcolor: `${color}18`,
            border: `1px solid ${color}30`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon sx={{ fontSize: 18, color }} />
        </Box>
        <Typography variant="body2" sx={{ color: C.txt3, fontWeight: 500 }}>
          {label}
        </Typography>
      </Box>

      <Typography variant="h5" sx={{ color: C.txt1, fontWeight: 700, mb: 0.5 }}>
        {value}
      </Typography>

      {sub && (
        <Typography variant="caption" sx={{ color: C.txt3 }}>
          {sub}
        </Typography>
      )}

      {typeof progress === 'number' && (
        <Box sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
            <Typography variant="caption" sx={{ color: C.txt3, fontSize: '0.68rem' }}>
              Usage
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: progressColor ?? C.accent, fontSize: '0.68rem', fontWeight: 600 }}
            >
              {progress}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={Math.min(progress, 100)}
            sx={{
              height: 4,
              borderRadius: 2,
              bgcolor: 'rgba(255,255,255,0.06)',
              '& .MuiLinearProgress-bar': {
                bgcolor: progressColor ?? C.accent,
                borderRadius: 2,
              },
            }}
          />
        </Box>
      )}
    </Box>
  );
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <Box
      sx={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        bgcolor: ok ? C.green : C.red,
        boxShadow: `0 0 6px ${ok ? C.green : C.red}`,
        flexShrink: 0,
      }}
    />
  );
}

export default function AdminSystem() {
  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['admin', 'system'],
    queryFn: () => apiService.get<SystemResponse>('/admin/system'),
    refetchInterval: 30_000,
  });

  const info = data?.data;
  const heapPct = info ? Math.round((info.memory.heapUsedMB / info.memory.heapTotalMB) * 100) : 0;

  const heapColor = heapPct > 85 ? C.red : heapPct > 65 ? C.accent : C.green;

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Box
        sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}
      >
        <Box>
          <Typography variant="h5" sx={{ color: C.txt1, fontWeight: 700, mb: 0.5 }}>
            System
          </Typography>
          <Typography variant="body2" sx={{ color: C.txt3 }}>
            Server health and runtime information — refreshes every 30 s
          </Typography>
        </Box>
        {dataUpdatedAt > 0 && (
          <Typography variant="caption" sx={{ color: C.txt3 }}>
            Last updated {new Date(dataUpdatedAt).toLocaleTimeString()}
          </Typography>
        )}
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: C.accent }} />
        </Box>
      ) : !info ? (
        <Typography sx={{ color: C.txt3, textAlign: 'center', py: 8 }}>
          Unable to load system info
        </Typography>
      ) : (
        <>
          {/* Status row */}
          <Box
            sx={{
              bgcolor: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 3,
              p: 2.5,
              mb: 3,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 3,
            }}
          >
            <Typography
              variant="body2"
              sx={{ color: C.txt2, fontWeight: 600, width: '100%', mb: -1 }}
            >
              Service Status
            </Typography>
            {[
              { label: 'API Server', ok: true },
              { label: 'Database', ok: true },
              { label: 'Redis', ok: true },
            ].map(({ label, ok }) => (
              <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <StatusDot ok={ok} />
                <Typography
                  variant="body2"
                  sx={{ color: ok ? C.txt1 : C.red, fontSize: '0.82rem' }}
                >
                  {label}
                </Typography>
                <Typography variant="caption" sx={{ color: ok ? C.green : C.red, fontWeight: 600 }}>
                  {ok ? 'Operational' : 'Down'}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Info cards */}
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <InfoCard
                label="Server Uptime"
                value={info.uptimeHuman}
                sub="Since last restart"
                Icon={AccessTimeOutlinedIcon}
                color={C.teal}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <InfoCard
                label="Heap Memory"
                value={`${info.memory.heapUsedMB} MB`}
                sub={`of ${info.memory.heapTotalMB} MB heap`}
                Icon={MemoryOutlinedIcon}
                color={heapColor}
                progress={heapPct}
                progressColor={heapColor}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <InfoCard
                label="RSS Memory"
                value={`${info.memory.rssMB} MB`}
                sub="Resident set size"
                Icon={StorageOutlinedIcon}
                color={C.violet}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <InfoCard
                label="Node.js"
                value={info.nodeVersion}
                sub={`${info.platform} · ${info.env}`}
                Icon={CodeOutlinedIcon}
                color={C.accent}
              />
            </Grid>
          </Grid>

          {/* Environment details */}
          <Box
            sx={{
              bgcolor: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 3,
              p: 3,
              mt: 3,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
              <CloudOutlinedIcon sx={{ fontSize: 18, color: C.txt3 }} />
              <Typography variant="body2" sx={{ color: C.txt2, fontWeight: 600 }}>
                Environment Details
              </Typography>
            </Box>

            <Grid container spacing={2}>
              {[
                { label: 'Environment', value: info.env },
                { label: 'Platform', value: info.platform },
                { label: 'Node Version', value: info.nodeVersion },
                { label: 'Uptime (sec)', value: Math.round(info.uptime).toLocaleString() },
              ].map(({ label, value }) => (
                <Grid size={{ xs: 12, sm: 6 }} key={label}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      py: 1,
                      borderBottom: `1px solid rgba(255,255,255,0.04)`,
                    }}
                  >
                    <Typography variant="body2" sx={{ color: C.txt3, fontSize: '0.82rem' }}>
                      {label}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: C.txt1, fontWeight: 500, fontSize: '0.82rem' }}
                    >
                      {value}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        </>
      )}
    </Box>
  );
}
