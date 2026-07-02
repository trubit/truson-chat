import { useQuery } from '@tanstack/react-query';
import { Box, Typography, Grid, CircularProgress, Chip } from '@mui/material';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { apiService } from '@/services/api';

const C = {
  bg:      '#060913',
  card:    '#0A0D1F',
  card2:   '#09101E',
  border:  'rgba(245,158,11,0.1)',
  border2: 'rgba(255,255,255,0.06)',
  accent:  '#F59E0B',
  violet:  '#9B6DFF',
  teal:    '#22D3EE',
  green:   '#10B981',
  red:     '#EF4444',
  amber:   '#FBBF24',
  txt1:    '#F1F5F9',
  txt2:    '#94A3B8',
  txt3:    '#475569',
};

interface UserStats {
  total: number;
  active: number;
  suspended: number;
  pendingVerification: number;
  deleted: number;
  admins: number;
  business: number;
  newToday: number;
  newThisWeek: number;
}

interface StatsResponse {
  success: boolean;
  data: { users: UserStats };
}

interface GrowthPoint { date: string; users: number }
interface GrowthResponse {
  success: boolean;
  data: GrowthPoint[];
}

function StatCard({
  label,
  value,
  sub,
  Icon,
  color,
  glow,
}: {
  label: string;
  value: number | string;
  sub?: string;
  Icon: React.ElementType;
  color: string;
  glow: string;
}) {
  return (
    <Box
      sx={{
        bgcolor: C.card,
        border: `1px solid ${C.border2}`,
        borderRadius: 3,
        p: 2.5,
        position: 'relative',
        overflow: 'hidden',
        transition: 'border-color 0.2s',
        '&:hover': { borderColor: `${color}30` },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 100,
          height: 100,
          borderRadius: '0 12px 0 100%',
          background: `radial-gradient(circle at top right, ${glow} 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="caption" sx={{ color: C.txt3, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.68rem' }}>
            {label}
          </Typography>
          <Typography variant="h4" sx={{ color: C.txt1, fontWeight: 700, mt: 0.5, lineHeight: 1 }}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </Typography>
          {sub && (
            <Typography variant="caption" sx={{ color: C.txt3, mt: 0.5, display: 'block' }}>
              {sub}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            bgcolor: `${color}18`,
            border: `1px solid ${color}30`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon sx={{ fontSize: 20, color }} />
        </Box>
      </Box>
    </Box>
  );
}

const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#0D1225',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  color: '#F1F5F9',
  fontSize: '0.8rem',
};

function formatDate(d: string) {
  const parts = d.split('-');
  return `${parts[1]}/${parts[2]}`;
}

const PIE_COLORS = [C.green, C.red, C.amber, C.teal];

export default function AdminDashboard() {
  const statsQ = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => apiService.get<StatsResponse>('/admin/stats'),
    refetchInterval: 60_000,
  });

  const growthQ = useQuery({
    queryKey: ['admin', 'growth'],
    queryFn: () => apiService.get<GrowthResponse>('/admin/stats/growth'),
    refetchInterval: 300_000,
  });

  const stats = statsQ.data?.data.users;
  const growth = growthQ.data?.data ?? [];

  const pieData = stats
    ? [
        { name: 'Active',      value: stats.active },
        { name: 'Suspended',   value: stats.suspended },
        { name: 'Pending',     value: stats.pendingVerification },
        { name: 'Deleted',     value: stats.deleted },
      ].filter((d) => d.value > 0)
    : [];

  if (statsQ.isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: C.accent }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1400, mx: 'auto' }}>
      {/* Page header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ color: C.txt1, fontWeight: 700, mb: 0.5 }}>
          Dashboard
        </Typography>
        <Typography variant="body2" sx={{ color: C.txt3 }}>
          Platform overview and key metrics
        </Typography>
      </Box>

      {/* Stat cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            label="Total Users"
            value={stats?.total ?? 0}
            sub={`+${stats?.newToday ?? 0} today`}
            Icon={PeopleOutlinedIcon}
            color={C.teal}
            glow="rgba(34,211,238,0.12)"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            label="Active Users"
            value={stats?.active ?? 0}
            sub={`${stats?.total ? Math.round(((stats.active) / stats.total) * 100) : 0}% of total`}
            Icon={CheckCircleOutlinedIcon}
            color={C.green}
            glow="rgba(16,185,129,0.12)"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            label="New This Week"
            value={stats?.newThisWeek ?? 0}
            sub="Last 7 days"
            Icon={TrendingUpOutlinedIcon}
            color={C.violet}
            glow="rgba(155,109,255,0.12)"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            label="Admins"
            value={stats?.admins ?? 0}
            sub={`${stats?.business ?? 0} business accounts`}
            Icon={ShieldOutlinedIcon}
            color={C.accent}
            glow="rgba(245,158,11,0.12)"
          />
        </Grid>
      </Grid>

      {/* Charts row */}
      <Grid container spacing={3}>
        {/* Growth line chart */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Box
            sx={{
              bgcolor: C.card,
              border: `1px solid ${C.border2}`,
              borderRadius: 3,
              p: 3,
              height: 340,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="body1" sx={{ color: C.txt1, fontWeight: 600 }}>
                User Growth
              </Typography>
              <Chip label="Last 30 days" size="small" sx={{ bgcolor: 'rgba(155,109,255,0.12)', color: C.violet, border: '1px solid rgba(155,109,255,0.2)', fontSize: '0.7rem' }} />
            </Box>
            {growthQ.isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}>
                <CircularProgress size={28} sx={{ color: C.violet }} />
              </Box>
            ) : growth.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70%' }}>
                <Typography variant="body2" sx={{ color: C.txt3 }}>No data for last 30 days</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={230}>
                <LineChart data={growth} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fill: C.txt3, fontSize: 11 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: C.txt3, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                    formatter={(v: number) => [v, 'New users']}
                    labelFormatter={(l: string) => `Date: ${l}`}
                    cursor={{ stroke: 'rgba(155,109,255,0.2)' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="users"
                    stroke={C.violet}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: C.violet, stroke: C.bg, strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Box>
        </Grid>

        {/* Status pie chart */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Box
            sx={{
              bgcolor: C.card,
              border: `1px solid ${C.border2}`,
              borderRadius: 3,
              p: 3,
              height: 340,
            }}
          >
            <Typography variant="body1" sx={{ color: C.txt1, fontWeight: 600, mb: 3 }}>
              Status Breakdown
            </Typography>
            {pieData.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70%' }}>
                <Typography variant="body2" sx={{ color: C.txt3 }}>No data</Typography>
              </Box>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={CHART_TOOLTIP_STYLE}
                      formatter={(v: number) => [v.toLocaleString(), '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  {pieData.map((d, i) => (
                    <Box key={d.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <Typography variant="caption" sx={{ color: C.txt2, fontSize: '0.72rem' }}>
                        {d.name} ({d.value.toLocaleString()})
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </>
            )}
          </Box>
        </Grid>
      </Grid>

      {/* Summary row */}
      <Grid container spacing={2} sx={{ mt: 3 }}>
        {[
          { label: 'Pending Verification', value: stats?.pendingVerification ?? 0, color: C.amber },
          { label: 'Suspended',            value: stats?.suspended ?? 0,           color: C.red },
          { label: 'Business Accounts',    value: stats?.business ?? 0,            color: C.teal },
          { label: 'New Today',            value: stats?.newToday ?? 0,            color: C.green },
        ].map(({ label, value, color }) => (
          <Grid size={{ xs: 6, md: 3 }} key={label}>
            <Box
              sx={{
                bgcolor: C.card2,
                border: `1px solid rgba(255,255,255,0.05)`,
                borderRadius: 2.5,
                p: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography variant="body2" sx={{ color: C.txt2, fontSize: '0.8rem' }}>{label}</Typography>
              <Typography variant="body1" sx={{ color, fontWeight: 700 }}>{value.toLocaleString()}</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
