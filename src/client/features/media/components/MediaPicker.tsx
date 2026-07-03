import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Dialog,
  DialogTitle,
  Tabs,
  Tab,
  Box,
  Typography,
  IconButton,
  Button,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ImageIcon from '@mui/icons-material/Image';
import VideocamIcon from '@mui/icons-material/Videocam';
import AudiotrackIcon from '@mui/icons-material/Audiotrack';
import DescriptionIcon from '@mui/icons-material/Description';
import PlaceIcon from '@mui/icons-material/Place';
import GifBoxIcon from '@mui/icons-material/GifBox';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import { StickerPicker } from './StickerPicker';
import { GifPicker }     from './GifPicker';
import type { StickerItem } from '@/store/stickerStore';
import type { GifItem }    from '@/store/gifStore';

const C = {
  panel:    '#080C18',
  panelHdr: '#0B1022',
  border:   'rgba(139,92,246,0.12)',
  accent:   '#9B6DFF',
  txt1:     '#F1F5F9',
  txt2:     '#94A3B8',
  txt3:     '#475569',
  searchBg: 'rgba(139,92,246,0.07)',
} as const;

type TabId = 'file' | 'image' | 'video' | 'audio' | 'document' | 'gif' | 'sticker' | 'location';

interface TabConfig {
  id:     TabId;
  label:  string;
  icon:   React.ReactNode;
  accept?: Record<string, string[]>;
}

const TABS: TabConfig[] = [
  { id: 'file',     label: 'File',     icon: <AttachFileIcon sx={{ fontSize: 18 }} />,    accept: undefined },
  { id: 'image',    label: 'Image',    icon: <ImageIcon sx={{ fontSize: 18 }} />,          accept: { 'image/*': [] } },
  { id: 'video',    label: 'Video',    icon: <VideocamIcon sx={{ fontSize: 18 }} />,       accept: { 'video/*': [] } },
  { id: 'audio',    label: 'Audio',    icon: <AudiotrackIcon sx={{ fontSize: 18 }} />,     accept: { 'audio/*': [] } },
  { id: 'document', label: 'Document', icon: <DescriptionIcon sx={{ fontSize: 18 }} />,   accept: { 'application/*': [], 'text/*': [] } },
  { id: 'gif',      label: 'GIF',      icon: <GifBoxIcon sx={{ fontSize: 18 }} /> },
  { id: 'sticker',  label: 'Sticker',  icon: <EmojiEmotionsIcon sx={{ fontSize: 18 }} /> },
  { id: 'location', label: 'Location', icon: <PlaceIcon sx={{ fontSize: 18 }} /> },
];

function DropzonePanel({
  accept,
  onFilesSelected,
  onClose,
}: {
  accept?: Record<string, string[]>;
  onFilesSelected: (files: File[]) => void;
  onClose: () => void;
}) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length > 0) {
        onFilesSelected(accepted);
        onClose();
      }
    },
    [onFilesSelected, onClose],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple: true,
  });

  return (
    <Box
      {...getRootProps()}
      sx={{
        border: `2px dashed ${isDragActive ? C.accent : C.border}`,
        borderRadius: '12px',
        p: 4,
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s',
        bgcolor: isDragActive ? 'rgba(155,109,255,0.06)' : 'transparent',
        '&:hover': { borderColor: C.accent, bgcolor: 'rgba(155,109,255,0.04)' },
      }}
    >
      <input {...getInputProps()} />
      <Typography sx={{ fontSize: 13, color: isDragActive ? C.accent : C.txt3, mb: 1 }}>
        {isDragActive ? 'Drop files here…' : 'Drag & drop files here, or click to select'}
      </Typography>
      <Button
        variant="outlined"
        size="small"
        sx={{
          fontSize: 12,
          color: C.accent,
          borderColor: C.border,
          textTransform: 'none',
          borderRadius: '8px',
          '&:hover': { borderColor: C.accent },
        }}
      >
        Browse Files
      </Button>
    </Box>
  );
}

function LocationPanel({ onLocationShare, onClose }: { onLocationShare: () => void; onClose: () => void }) {
  const handleShare = useCallback(() => {
    onLocationShare();
    onClose();
  }, [onLocationShare, onClose]);

  return (
    <Box sx={{ textAlign: 'center', py: 3 }}>
      <PlaceIcon sx={{ fontSize: 48, color: C.accent, mb: 1 }} />
      <Typography sx={{ fontSize: 13, color: C.txt2, mb: 2 }}>
        Share your current location
      </Typography>
      <Button
        onClick={handleShare}
        variant="contained"
        size="small"
        sx={{
          bgcolor: C.accent,
          textTransform: 'none',
          borderRadius: '10px',
          '&:hover': { bgcolor: '#B68DFF' },
        }}
      >
        Share Location
      </Button>
    </Box>
  );
}

export function MediaPicker({
  open,
  onClose,
  onFilesSelected,
  onStickerSelected,
  onGifSelected,
  onLocationShare,
}: {
  open: boolean;
  onClose: () => void;
  onFilesSelected: (files: File[]) => void;
  onStickerSelected: (sticker: StickerItem) => void;
  onGifSelected: (gif: GifItem) => void;
  onLocationShare: () => void;
}) {
  const [tabIdx, setTabIdx] = useState(0);
  const currentTab = TABS[tabIdx] ?? TABS[0];

  const handleStickerSelect = useCallback(
    (sticker: StickerItem) => {
      onStickerSelected(sticker);
      onClose();
    },
    [onStickerSelected, onClose],
  );

  const handleGifSelect = useCallback(
    (gif: GifItem) => {
      onGifSelected(gif);
      onClose();
    },
    [onGifSelected, onClose],
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            bgcolor: C.panel,
            border: `1px solid ${C.border}`,
            borderRadius: '16px',
            minWidth: 360,
            maxWidth: 400,
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          py: 1.25,
          px: 2,
          bgcolor: C.panelHdr,
          borderBottom: `1px solid ${C.border}`,
          fontSize: 14,
          fontWeight: 600,
          color: C.txt1,
        }}
      >
        Share Media
        <IconButton size="small" onClick={onClose} sx={{ color: C.txt3, '&:hover': { color: C.txt2 } }}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      {/* Tabs */}
      <Tabs
        value={tabIdx}
        onChange={(_, v: number) => setTabIdx(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          borderBottom: `1px solid ${C.border}`,
          minHeight: 42,
          '& .MuiTab-root': {
            fontSize: 10,
            minHeight: 42,
            minWidth: 40,
            color: C.txt3,
            textTransform: 'none',
            gap: 0.25,
            flexDirection: 'column',
            py: 0.5,
          },
          '& .Mui-selected': { color: C.accent },
          '& .MuiTabs-indicator': { bgcolor: C.accent },
        }}
      >
        {TABS.map((t, i) => (
          <Tab key={i} icon={t.icon as React.ReactElement} label={t.label} iconPosition="top" />
        ))}
      </Tabs>

      {/* Panel content */}
      <Box sx={{ p: currentTab.id === 'gif' || currentTab.id === 'sticker' ? 0 : 2 }}>
        {currentTab.id === 'sticker' ? (
          <StickerPicker onSelect={handleStickerSelect} onClose={onClose} />
        ) : currentTab.id === 'gif' ? (
          <GifPicker onSelect={handleGifSelect} onClose={onClose} />
        ) : currentTab.id === 'location' ? (
          <LocationPanel onLocationShare={onLocationShare} onClose={onClose} />
        ) : (
          <DropzonePanel accept={currentTab.accept} onFilesSelected={onFilesSelected} onClose={onClose} />
        )}
      </Box>
    </Dialog>
  );
}
