import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Chip,
  IconButton,
  CircularProgress,
  InputAdornment,
  FormControl,
  InputLabel,
  Pagination,
  Tooltip,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import SearchIcon from '@mui/icons-material/Search';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
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
  amber: '#FBBF24',
  txt1: '#F1F5F9',
  txt2: '#94A3B8',
  txt3: '#475569',
  input: 'rgba(255,255,255,0.04)',
};

const FIELD_SX = {
  bgcolor: C.input,
  borderRadius: 2,
  '& .MuiOutlinedInput-notchedOutline': { borderColor: C.border },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.15)' },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: C.accent },
  '& input': { color: C.txt1, py: 1.25 },
  '& .MuiSvgIcon-root': { color: C.txt3 },
};

const SELECT_SX = {
  bgcolor: C.input,
  color: C.txt1,
  borderRadius: 2,
  '& .MuiOutlinedInput-notchedOutline': { borderColor: C.border },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.15)' },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: C.accent },
  '& .MuiSvgIcon-root': { color: C.txt2 },
};

type UserRole = 'user' | 'admin' | 'business' | '';
type UserStatus = 'active' | 'suspended' | 'pending_verification' | 'deleted' | '';

interface AdminUser {
  _id: string;
  username: string;
  email: string;
  role: 'user' | 'admin' | 'business';
  status: 'active' | 'suspended' | 'pending_verification' | 'deleted';
  emailVerified: boolean;
  createdAt: string;
}

interface UsersResponse {
  success: boolean;
  data: {
    users: AdminUser[];
    total: number;
    page: number;
    totalPages: number;
  };
}

interface MutResponse {
  success: boolean;
  data: AdminUser;
}

function roleChip(role: AdminUser['role']) {
  const map: Record<AdminUser['role'], { label: string; color: string; bg: string }> = {
    admin: { label: 'Admin', color: C.accent, bg: 'rgba(245,158,11,0.12)' },
    business: { label: 'Business', color: C.teal, bg: 'rgba(34,211,238,0.12)' },
    user: { label: 'User', color: C.txt2, bg: 'rgba(255,255,255,0.06)' },
  };
  const s = map[role];
  return (
    <Chip
      label={s.label}
      size="small"
      sx={{
        bgcolor: s.bg,
        color: s.color,
        border: `1px solid ${s.color}30`,
        fontSize: '0.7rem',
        height: 22,
      }}
    />
  );
}

function statusChip(status: AdminUser['status']) {
  const map: Record<AdminUser['status'], { label: string; color: string; bg: string }> = {
    active: { label: 'Active', color: C.green, bg: 'rgba(16,185,129,0.12)' },
    suspended: { label: 'Suspended', color: C.red, bg: 'rgba(239,68,68,0.12)' },
    pending_verification: { label: 'Pending', color: C.amber, bg: 'rgba(251,191,36,0.12)' },
    deleted: { label: 'Deleted', color: C.txt3, bg: 'rgba(255,255,255,0.06)' },
  };
  const s = map[status];
  return (
    <Chip
      label={s.label}
      size="small"
      sx={{
        bgcolor: s.bg,
        color: s.color,
        border: `1px solid ${s.color}30`,
        fontSize: '0.7rem',
        height: 22,
      }}
    />
  );
}

function UserRowActions({
  user,
  onStatusChange,
  onRoleChange,
}: {
  user: AdminUser;
  onStatusChange: (id: string, status: 'active' | 'suspended') => void;
  onRoleChange: (id: string, role: 'user' | 'admin' | 'business') => void;
}) {
  const canToggle = user.status === 'active' || user.status === 'suspended';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {/* Role selector */}
      <Select
        value={user.role}
        onChange={(e: SelectChangeEvent) =>
          onRoleChange(user._id, e.target.value as 'user' | 'admin' | 'business')
        }
        size="small"
        sx={{
          height: 28,
          fontSize: '0.75rem',
          color: C.txt1,
          bgcolor: 'rgba(255,255,255,0.04)',
          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.08)' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
          '& .MuiSvgIcon-root': { color: C.txt3 },
          minWidth: 90,
        }}
      >
        <MenuItem value="user">User</MenuItem>
        <MenuItem value="admin">Admin</MenuItem>
        <MenuItem value="business">Business</MenuItem>
      </Select>

      {/* Suspend / Activate */}
      {canToggle &&
        (user.status === 'active' ? (
          <Tooltip title="Suspend user">
            <IconButton
              size="small"
              onClick={() => onStatusChange(user._id, 'suspended')}
              sx={{ color: C.red, '&:hover': { bgcolor: 'rgba(239,68,68,0.12)' } }}
            >
              <BlockOutlinedIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>
        ) : (
          <Tooltip title="Activate user">
            <IconButton
              size="small"
              onClick={() => onStatusChange(user._id, 'active')}
              sx={{ color: C.green, '&:hover': { bgcolor: 'rgba(16,185,129,0.12)' } }}
            >
              <CheckCircleOutlinedIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>
        ))}
    </Box>
  );
}

export default function AdminUsers() {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<UserRole>('');
  const [status, setStatus] = useState<UserStatus>('');
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', { search, role, status, page }],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (role) params.set('role', role);
      if (status) params.set('status', status);
      return apiService.get<UsersResponse>(`/admin/users?${params.toString()}`);
    },
    placeholderData: (prev) => prev,
  });

  const statusMut = useMutation({
    mutationFn: ({ id, s }: { id: string; s: 'active' | 'suspended' }) =>
      apiService.patch<MutResponse>(`/admin/users/${id}/status`, { status: s }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });

  const roleMut = useMutation({
    mutationFn: ({ id, r }: { id: string; r: 'user' | 'admin' | 'business' }) =>
      apiService.patch<MutResponse>(`/admin/users/${id}/role`, { role: r }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });

  const handleStatusChange = useCallback(
    (id: string, s: 'active' | 'suspended') => statusMut.mutate({ id, s }),
    [statusMut],
  );

  const handleRoleChange = useCallback(
    (id: string, r: 'user' | 'admin' | 'business') => roleMut.mutate({ id, r }),
    [roleMut],
  );

  const users = data?.data.users ?? [];
  const totalPages = data?.data.totalPages ?? 1;
  const total = data?.data.total ?? 0;

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ color: C.txt1, fontWeight: 700, mb: 0.5 }}>
          Users
        </Typography>
        <Typography variant="body2" sx={{ color: C.txt3 }}>
          {total.toLocaleString()} total users — search, filter, and manage roles
        </Typography>
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search username or email…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          size="small"
          sx={{ flex: 1, minWidth: 220 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: C.txt3, fontSize: 18 }} />
                </InputAdornment>
              ),
              sx: FIELD_SX,
            },
          }}
        />

        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel sx={{ color: C.txt3, '&.Mui-focused': { color: C.accent } }}>Role</InputLabel>
          <Select
            label="Role"
            value={role}
            onChange={(e: SelectChangeEvent) => {
              setRole(e.target.value as UserRole);
              setPage(1);
            }}
            sx={SELECT_SX}
          >
            <MenuItem value="">All roles</MenuItem>
            <MenuItem value="user">User</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
            <MenuItem value="business">Business</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel sx={{ color: C.txt3, '&.Mui-focused': { color: C.accent } }}>
            Status
          </InputLabel>
          <Select
            label="Status"
            value={status}
            onChange={(e: SelectChangeEvent) => {
              setStatus(e.target.value as UserStatus);
              setPage(1);
            }}
            sx={SELECT_SX}
          >
            <MenuItem value="">All statuses</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="suspended">Suspended</MenuItem>
            <MenuItem value="pending_verification">Pending</MenuItem>
            <MenuItem value="deleted">Deleted</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Table */}
      <Box
        sx={{
          bgcolor: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress sx={{ color: C.accent }} />
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow
                  sx={{
                    '& .MuiTableCell-head': {
                      bgcolor: 'rgba(255,255,255,0.025)',
                      color: C.txt3,
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      borderBottom: `1px solid ${C.border}`,
                      py: 1.5,
                    },
                  }}
                >
                  <TableCell>User</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Joined</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      sx={{ textAlign: 'center', py: 6, color: C.txt3, borderBottom: 'none' }}
                    >
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => (
                    <TableRow
                      key={u._id}
                      sx={{
                        '& .MuiTableCell-root': {
                          borderBottom: `1px solid rgba(255,255,255,0.04)`,
                          py: 1.25,
                          color: C.txt2,
                          fontSize: '0.82rem',
                        },
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' },
                        '&:last-child .MuiTableCell-root': { borderBottom: 'none' },
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar
                            sx={{
                              width: 30,
                              height: 30,
                              fontSize: '0.75rem',
                              bgcolor:
                                u.role === 'admin'
                                  ? 'rgba(245,158,11,0.2)'
                                  : u.role === 'business'
                                    ? 'rgba(34,211,238,0.2)'
                                    : 'rgba(155,109,255,0.2)',
                              color:
                                u.role === 'admin'
                                  ? C.accent
                                  : u.role === 'business'
                                    ? C.teal
                                    : C.violet,
                            }}
                          >
                            {u.username[0]?.toUpperCase()}
                          </Avatar>
                          <Typography
                            variant="body2"
                            sx={{ color: C.txt1, fontWeight: 500, fontSize: '0.82rem' }}
                          >
                            {u.username}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell
                        sx={{
                          maxWidth: 200,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {u.email}
                      </TableCell>
                      <TableCell>{roleChip(u.role)}</TableCell>
                      <TableCell>{statusChip(u.status)}</TableCell>
                      <TableCell>
                        {new Date(u.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell>
                        <UserRowActions
                          user={u}
                          onStatusChange={handleStatusChange}
                          onRoleChange={handleRoleChange}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              py: 2,
              borderTop: `1px solid ${C.border}`,
            }}
          >
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, p) => setPage(p)}
              size="small"
              sx={{
                '& .MuiPaginationItem-root': { color: C.txt2 },
                '& .MuiPaginationItem-root.Mui-selected': {
                  bgcolor: 'rgba(245,158,11,0.15)',
                  color: C.accent,
                  border: `1px solid rgba(245,158,11,0.3)`,
                },
              }}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
}
