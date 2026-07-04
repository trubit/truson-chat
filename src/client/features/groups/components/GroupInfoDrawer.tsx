import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Drawer, Box, Typography, Avatar, IconButton, CircularProgress,
  Divider, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  Menu, MenuItem, alpha,
} from '@mui/material';
import CloseIcon          from '@mui/icons-material/Close';
import MoreVertIcon       from '@mui/icons-material/MoreVert';
import ExitToAppIcon      from '@mui/icons-material/ExitToApp';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import PersonAddIcon      from '@mui/icons-material/PersonAdd';
import {
  useGroup, useGroupMembers, useLeaveGroup,
  useDeleteGroup, useKickMember,
} from '../queries/index';
import AddMemberDialog from './AddMemberDialog';

const C = {
  panel:  '#0C1722',
  bg:     '#07101C',
  border: 'rgba(134,150,160,0.12)',
  accent: '#10C4A0',
  copper: '#E87830',
  danger: '#ef4444',
  txt1:   '#E9EDEF',
  txt2:   '#8696A0',
} as const;

const ROLE_LABEL: Record<string, string> = {
  owner: 'Group Creator',
  admin: 'Group Admin',
};

interface Props {
  open:    boolean;
  onClose: () => void;
  groupId: string;
  myId:    string;
}

export default function GroupInfoDrawer({ open, onClose, groupId, myId }: Props) {
  const navigate = useNavigate();
  const { data: groupDetail }            = useGroup(groupId);
  const { data: membersData, isLoading } = useGroupMembers(open ? groupId : null);

  const leaveGroup  = useLeaveGroup(groupId);
  const deleteGroup = useDeleteGroup(groupId);
  const kickMember  = useKickMember(groupId);

  const [confirmLeave,  setConfirmLeave]  = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [memberMenu, setMemberMenu] = useState<{
    anchorEl: HTMLElement; userId: string; name: string;
  } | null>(null);

  const memberIds = membersData?.members.map((m) => m.userId) ?? [];

  function handleLeaveConfirmed() {
    setConfirmLeave(false);
    leaveGroup.mutate(undefined, {
      onSuccess: () => { onClose(); navigate('/chat'); },
    });
  }

  function handleDeleteConfirmed() {
    setConfirmDelete(false);
    deleteGroup.mutate(undefined, {
      onSuccess: () => { onClose(); navigate('/chat'); },
    });
  }

  function handleKick(userId: string) {
    setMemberMenu(null);
    kickMember.mutate(userId);
  }

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        slotProps={{
          paper: {
            sx: {
              width: 340, bgcolor: C.bg,
              borderLeft: `1px solid ${C.border}`,
              display: 'flex', flexDirection: 'column',
            },
          },
        }}
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <Box sx={{
          px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1,
          bgcolor: C.panel, borderBottom: `1px solid ${C.border}`, flexShrink: 0,
        }}>
          <IconButton size="small" onClick={onClose} sx={{ color: C.txt2 }}>
            <CloseIcon />
          </IconButton>
          <Typography sx={{ color: C.txt1, fontWeight: 700, fontSize: 16 }}>
            Group info
          </Typography>
        </Box>

        <Box sx={{ flex: 1, overflowY: 'auto' }}>

          {/* ── Group identity ─────────────────────────────────────── */}
          <Box sx={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            bgcolor: C.panel, pt: 3, pb: 2.5, px: 2, gap: 1.5,
          }}>
            <Avatar
              src={groupDetail?.avatar?.url}
              sx={{
                width: 84, height: 84, fontSize: 34, fontWeight: 700,
                background: 'linear-gradient(135deg, #10C4A0, #0D9E80)',
                boxShadow: `0 0 0 3px ${C.bg}, 0 0 0 5px ${alpha(C.accent, 0.35)}`,
              }}
            >
              {(groupDetail?.name ?? '?')[0].toUpperCase()}
            </Avatar>
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ color: C.txt1, fontWeight: 800, fontSize: 20, lineHeight: 1.2 }}>
                {groupDetail?.name ?? ''}
              </Typography>
              <Typography sx={{ color: C.txt2, fontSize: 13, mt: 0.5 }}>
                Group · {(groupDetail?.memberCount ?? 0).toLocaleString()} participants
              </Typography>
            </Box>
            {groupDetail?.description && (
              <Typography sx={{
                color: C.txt2, fontSize: 13, textAlign: 'center',
                maxWidth: 260, lineHeight: 1.6, mt: 0.5,
              }}>
                {groupDetail.description}
              </Typography>
            )}
          </Box>

          <Divider sx={{ borderColor: C.border }} />

          {/* ── Add participant ────────────────────────────────────── */}
          <Box sx={{ bgcolor: C.panel, mt: 1 }}>
            <Button
              fullWidth
              startIcon={<PersonAddIcon sx={{ fontSize: 20 }} />}
              onClick={() => setAddMemberOpen(true)}
              sx={{
                justifyContent: 'flex-start', px: 2.5, py: 1.6,
                color: C.accent, textTransform: 'none', fontSize: 14.5, fontWeight: 600,
                borderRadius: 0,
                '&:hover': { bgcolor: alpha(C.accent, 0.08) },
              }}
            >
              Add participant
            </Button>
          </Box>

          <Divider sx={{ borderColor: C.border }} />

          {/* ── Participants ───────────────────────────────────────── */}
          <Box sx={{ bgcolor: C.panel, mt: 1 }}>
            <Typography sx={{
              color: C.txt2, fontSize: 11.5, fontWeight: 700, letterSpacing: 0.8,
              px: 2.5, pt: 1.5, pb: 0.75, textTransform: 'uppercase',
            }}>
              {membersData?.members.length ?? 0} participants
            </Typography>

            {isLoading && (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <CircularProgress size={22} sx={{ color: C.accent }} />
              </Box>
            )}

            {membersData?.members.map((m) => {
              const roleLabel = ROLE_LABEL[m.role];
              const isMe      = m.userId === myId;
              const label     = isMe ? 'You' : (m.displayName || m.username || 'Unknown');
              const initial   = label[0]?.toUpperCase() ?? '?';
              const canKick   = !isMe && m.role !== 'owner';

              return (
                <Box
                  key={m.userId}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5,
                    px: 2.5, py: 1.25,
                    '&:hover': { bgcolor: alpha(C.accent, 0.04) },
                    transition: 'background 0.15s',
                  }}
                >
                  <Avatar
                    src={m.avatarUrl}
                    sx={{ width: 44, height: 44, fontSize: 17, bgcolor: C.accent, fontWeight: 700 }}
                  >
                    {initial}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ color: C.txt1, fontSize: 14, fontWeight: 600 }} noWrap>
                      {label}
                    </Typography>
                    {roleLabel ? (
                      <Typography sx={{ color: C.copper, fontSize: 12, fontWeight: 600 }}>
                        {roleLabel}
                      </Typography>
                    ) : m.customTitle ? (
                      <Typography sx={{ color: C.txt2, fontSize: 12 }} noWrap>
                        {m.customTitle}
                      </Typography>
                    ) : null}
                  </Box>
                  {canKick && (
                    <IconButton
                      size="small"
                      onClick={(e) => setMemberMenu({
                        anchorEl: e.currentTarget,
                        userId: m.userId,
                        name: label,
                      })}
                      sx={{ color: C.txt2, opacity: 0.55, '&:hover': { opacity: 1, color: C.txt1 } }}
                    >
                      <MoreVertIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  )}
                </Box>
              );
            })}
          </Box>

          <Divider sx={{ borderColor: C.border, mt: 1 }} />

          {/* ── Actions ───────────────────────────────────────────── */}
          <Box sx={{ bgcolor: C.panel, mt: 1, mb: 2 }}>
            {/* Exit group */}
            <Button
              fullWidth
              startIcon={<ExitToAppIcon sx={{ fontSize: 20 }} />}
              onClick={() => setConfirmLeave(true)}
              disabled={leaveGroup.isPending}
              sx={{
                justifyContent: 'flex-start', px: 2.5, py: 1.6,
                color: C.danger, textTransform: 'none', fontSize: 14.5, fontWeight: 600,
                borderRadius: 0,
                '&:hover': { bgcolor: alpha(C.danger, 0.08) },
              }}
            >
              Exit group
            </Button>

            <Divider sx={{ borderColor: C.border, mx: 2.5 }} />

            {/* Delete group — permanently removes it */}
            <Button
              fullWidth
              startIcon={<DeleteOutlinedIcon sx={{ fontSize: 20 }} />}
              onClick={() => setConfirmDelete(true)}
              disabled={deleteGroup.isPending}
              sx={{
                justifyContent: 'flex-start', px: 2.5, py: 1.6,
                color: C.danger, textTransform: 'none', fontSize: 14.5, fontWeight: 600,
                borderRadius: 0,
                '&:hover': { bgcolor: alpha(C.danger, 0.08) },
              }}
            >
              Delete group
            </Button>
          </Box>
        </Box>
      </Drawer>

      {/* ── Member context menu ──────────────────────────────────── */}
      <Menu
        anchorEl={memberMenu?.anchorEl}
        open={Boolean(memberMenu)}
        onClose={() => setMemberMenu(null)}
        slotProps={{
          paper: {
            sx: {
              bgcolor: '#1A2636', border: `1px solid ${C.border}`,
              borderRadius: '10px', minWidth: 170,
            },
          },
        }}
      >
        <MenuItem
          onClick={() => memberMenu && handleKick(memberMenu.userId)}
          sx={{ color: C.danger, fontSize: 14, py: 1.25 }}
        >
          Remove {memberMenu?.name}
        </MenuItem>
      </Menu>

      {/* ── Add member dialog ────────────────────────────────────── */}
      <AddMemberDialog
        open={addMemberOpen}
        onClose={() => setAddMemberOpen(false)}
        groupId={groupId}
        alreadyMemberIds={memberIds}
      />

      {/* ── Confirm exit ─────────────────────────────────────────── */}
      <Dialog
        open={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        slotProps={{ paper: { sx: { bgcolor: '#0C1722', border: `1px solid ${C.border}`, borderRadius: '16px', minWidth: 300 } } }}
      >
        <DialogTitle sx={{ color: C.txt1, fontWeight: 700 }}>Exit group?</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: C.txt2, fontSize: 14 }}>
            You will leave this group and will no longer receive messages.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setConfirmLeave(false)} sx={{ color: C.txt2, textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={handleLeaveConfirmed}
            variant="contained"
            sx={{ bgcolor: C.danger, color: '#fff', textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#dc2626' } }}
          >
            Exit
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Confirm delete ───────────────────────────────────────── */}
      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        slotProps={{ paper: { sx: { bgcolor: '#0C1722', border: `1px solid ${C.border}`, borderRadius: '16px', minWidth: 300 } } }}
      >
        <DialogTitle sx={{ color: C.txt1, fontWeight: 700 }}>Delete group?</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: C.txt2, fontSize: 14 }}>
            This will permanently delete <Typography component="span" sx={{ color: C.txt1, fontWeight: 700 }}>{groupDetail?.name}</Typography> and all its messages for everyone. This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setConfirmDelete(false)} sx={{ color: C.txt2, textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirmed}
            variant="contained"
            disabled={deleteGroup.isPending}
            sx={{ bgcolor: C.danger, color: '#fff', textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#dc2626' } }}
          >
            {deleteGroup.isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
