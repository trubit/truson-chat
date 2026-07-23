import { useState, useEffect, useCallback } from 'react';
import { Box, Typography, LinearProgress, IconButton, Collapse } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ImageIcon from '@mui/icons-material/Image';
import VideocamIcon from '@mui/icons-material/Videocam';
import AudiotrackIcon from '@mui/icons-material/Audiotrack';
import { useUploadStore } from '@/store/uploadStore';
import type { UploadItem } from '@/store/uploadStore';

const C = {
  panel: '#080C18',
  border: 'rgba(139,92,246,0.12)',
  accent: '#9B6DFF',
  txt1: '#F1F5F9',
  txt2: '#94A3B8',
  txt3: '#475569',
  badge: '#10B981',
} as const;

function FileTypeIcon({ file }: { file: File }) {
  if (file.type.startsWith('image/')) return <ImageIcon sx={{ fontSize: 18, color: C.accent }} />;
  if (file.type.startsWith('video/'))
    return <VideocamIcon sx={{ fontSize: 18, color: '#22D3EE' }} />;
  if (file.type.startsWith('audio/'))
    return <AudiotrackIcon sx={{ fontSize: 18, color: '#FBBF24' }} />;
  return <InsertDriveFileIcon sx={{ fontSize: 18, color: C.txt2 }} />;
}

function UploadRow({ item }: { item: UploadItem }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.75 }}>
      <FileTypeIcon file={item.file} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: 12,
            color: C.txt1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 1.4,
          }}
        >
          {item.file.name}
        </Typography>
        {(item.status === 'uploading' || item.status === 'pending') && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
            <LinearProgress
              variant="determinate"
              value={item.progress}
              sx={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                bgcolor: 'rgba(155,109,255,0.15)',
                '& .MuiLinearProgress-bar': { bgcolor: C.accent, borderRadius: 2 },
              }}
            />
            <Typography sx={{ fontSize: 10, color: C.txt3, flexShrink: 0 }}>
              {item.progress}%
            </Typography>
          </Box>
        )}
      </Box>
      {item.status === 'done' && (
        <CheckCircleIcon sx={{ fontSize: 16, color: C.badge, flexShrink: 0 }} />
      )}
      {item.status === 'error' && (
        <ErrorIcon sx={{ fontSize: 16, color: '#EF4444', flexShrink: 0 }} />
      )}
    </Box>
  );
}

export function UploadProgress() {
  const { uploads, clearCompleted } = useUploadStore();
  const [allDoneTimer, setAllDoneTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(false);

  const items = Array.from(uploads.values());
  const activeItems = items.filter((i) => i.status === 'uploading' || i.status === 'pending');
  const hasError = items.some((i) => i.status === 'error');
  const allDone = items.length > 0 && activeItems.length === 0;

  useEffect(() => {
    if (items.length > 0) setVisible(true);
  }, [items.length]);

  const handleClear = useCallback(() => {
    clearCompleted();
    setVisible(false);
  }, [clearCompleted]);

  useEffect(() => {
    if (allDone && !hasError) {
      const t = setTimeout(() => {
        clearCompleted();
        setVisible(false);
      }, 2500);
      setAllDoneTimer(t);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [allDone, hasError, clearCompleted]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (allDoneTimer) clearTimeout(allDoneTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible || items.length === 0) return null;

  return (
    <Collapse in={visible}>
      <Box
        sx={{
          position: 'fixed',
          bottom: 80,
          left: 16,
          zIndex: 1400,
          width: 300,
          bgcolor: C.panel,
          border: `1px solid ${C.border}`,
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 1.5,
            py: 0.75,
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: C.txt2 }}>
            {allDone
              ? 'All uploads complete'
              : `Uploading ${activeItems.length} file${activeItems.length !== 1 ? 's' : ''}…`}
          </Typography>
          <IconButton
            size="small"
            onClick={handleClear}
            sx={{ color: C.txt3, p: 0.25, '&:hover': { color: C.txt2 } }}
          >
            <CloseIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>

        {/* Items */}
        <Box sx={{ px: 1.5, maxHeight: 200, overflow: 'auto' }}>
          {items.map((item) => (
            <UploadRow key={item.id} item={item} />
          ))}
        </Box>
      </Box>
    </Collapse>
  );
}
