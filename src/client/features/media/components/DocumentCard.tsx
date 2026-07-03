import { Box, Typography, IconButton } from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableChartIcon from '@mui/icons-material/TableChart';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import FolderZipIcon from '@mui/icons-material/FolderZip';
import DownloadIcon from '@mui/icons-material/Download';

const C = {
  border:  'rgba(139,92,246,0.12)',
  txt1:    '#F1F5F9',
  txt2:    '#94A3B8',
  txt3:    '#475569',
  bg:      'rgba(13,18,37,0.9)',
  accent:  '#9B6DFF',
} as const;

function formatSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ mimeType }: { mimeType?: string }) {
  if (!mimeType) return <DescriptionIcon sx={{ fontSize: 28, color: '#94A3B8' }} />;
  if (mimeType.includes('pdf'))
    return <PictureAsPdfIcon sx={{ fontSize: 28, color: '#EF4444' }} />;
  if (mimeType.includes('word') || mimeType.includes('document'))
    return <DescriptionIcon sx={{ fontSize: 28, color: '#3B82F6' }} />;
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet') || mimeType.includes('csv'))
    return <TableChartIcon sx={{ fontSize: 28, color: '#22C55E' }} />;
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation'))
    return <SlideshowIcon sx={{ fontSize: 28, color: '#F97316' }} />;
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar') || mimeType.includes('gz'))
    return <FolderZipIcon sx={{ fontSize: 28, color: '#EAB308' }} />;
  return <DescriptionIcon sx={{ fontSize: 28, color: '#94A3B8' }} />;
}

export function DocumentCard({
  url,
  name,
  size,
  mimeType,
}: {
  url: string;
  name: string;
  size?: number;
  mimeType?: string;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        px: 1.25,
        py: 1,
        bgcolor: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: '12px',
        maxWidth: 280,
      }}
    >
      <FileIcon mimeType={mimeType} />

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: 13,
            fontWeight: 500,
            color: C.txt1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 1.4,
          }}
        >
          {name}
        </Typography>
        {size !== undefined && (
          <Typography sx={{ fontSize: 11, color: C.txt3 }}>
            {formatSize(size)}
          </Typography>
        )}
      </Box>

      <IconButton
        component="a"
        href={url}
        download={name}
        target="_blank"
        rel="noopener noreferrer"
        size="small"
        sx={{
          color: C.txt3,
          flexShrink: 0,
          '&:hover': { color: C.accent },
        }}
      >
        <DownloadIcon sx={{ fontSize: 18 }} />
      </IconButton>
    </Box>
  );
}
