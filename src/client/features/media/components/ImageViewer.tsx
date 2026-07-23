import { useState, useCallback } from 'react';
import { Dialog, IconButton, Box, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import DownloadIcon from '@mui/icons-material/Download';
import FitScreenIcon from '@mui/icons-material/FitScreen';

export function ImageViewer({
  src,
  alt = '',
  open,
  onClose,
}: {
  src: string;
  alt?: string;
  open: boolean;
  onClose: () => void;
}) {
  const [scale, setScale] = useState(1);

  const zoomIn = useCallback(() => setScale((s) => Math.min(s + 0.25, 4)), []);
  const zoomOut = useCallback(() => setScale((s) => Math.max(s - 0.25, 0.25)), []);
  const fitScreen = useCallback(() => setScale(1), []);

  const filename = src.split('/').pop() ?? 'image';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      slotProps={{ paper: { sx: { bgcolor: '#000000' } } }}
    >
      {/* Top bar */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)',
        }}
      >
        <IconButton onClick={onClose} sx={{ color: '#fff' }}>
          <CloseIcon />
        </IconButton>

        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton onClick={zoomOut} sx={{ color: '#fff' }} disabled={scale <= 0.25}>
            <ZoomOutIcon />
          </IconButton>
          <IconButton onClick={fitScreen} sx={{ color: '#fff' }}>
            <FitScreenIcon />
          </IconButton>
          <IconButton onClick={zoomIn} sx={{ color: '#fff' }} disabled={scale >= 4}>
            <ZoomInIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Image */}
      <Box
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'auto',
        }}
      >
        <Box
          component="img"
          src={src}
          alt={alt}
          sx={{
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
            transition: 'transform 0.2s ease',
            maxWidth: scale === 1 ? '90vw' : 'none',
            maxHeight: scale === 1 ? '85vh' : 'none',
            objectFit: 'contain',
            display: 'block',
          }}
        />
      </Box>

      {/* Bottom bar */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
          background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)',
        }}
      >
        <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace' }}>
          {filename}
        </Typography>
        <IconButton component="a" href={src} download={filename} sx={{ color: '#fff' }}>
          <DownloadIcon />
        </IconButton>
      </Box>
    </Dialog>
  );
}
