import { useState } from 'react';
import { Box, Typography, Tab, Tabs, CircularProgress } from '@mui/material';
import { useStickerStore } from '@/store/stickerStore';
import { useStickerPacks } from '../queries/index';
import type { StickerItem } from '@/store/stickerStore';

const C = {
  panel:   '#080C18',
  border:  'rgba(139,92,246,0.12)',
  accent:  '#9B6DFF',
  txt2:    '#94A3B8',
  txt3:    '#475569',
} as const;

export function StickerPicker({
  onSelect,
}: {
  onSelect: (sticker: StickerItem) => void;
  onClose: () => void;
}) {
  const { packs, recentStickers, useSticker: trackStickerUse } = useStickerStore();
  const { isLoading } = useStickerPacks();
  const [tabIdx, setTabIdx] = useState(0);

  // Build all stickers flat map for recent lookup
  const allStickers: Map<string, StickerItem> = new Map();
  packs.forEach((pack) => pack.stickers.forEach((s) => allStickers.set(s._id, s)));

  const recentItems = recentStickers
    .map((id) => allStickers.get(id))
    .filter((s): s is StickerItem => s !== undefined);

  const tabs = recentItems.length > 0
    ? [{ label: 'Recent', stickers: recentItems }, ...packs.map((p) => ({ label: p.name, stickers: p.stickers }))]
    : packs.map((p) => ({ label: p.name, stickers: p.stickers }));

  const handleSelect = (sticker: StickerItem) => {
    trackStickerUse(sticker._id);
    onSelect(sticker);
  };

  return (
    <Box sx={{ width: 300, bgcolor: C.panel }}>
      {isLoading && packs.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={28} sx={{ color: C.accent }} />
        </Box>
      ) : tabs.length === 0 ? (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 13, color: C.txt3 }}>No sticker packs available</Typography>
        </Box>
      ) : (
        <>
          <Tabs
            value={Math.min(tabIdx, tabs.length - 1)}
            onChange={(_, v: number) => setTabIdx(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              borderBottom: `1px solid ${C.border}`,
              minHeight: 36,
              '& .MuiTab-root': { fontSize: 11, minHeight: 36, color: C.txt3, textTransform: 'none', px: 1.5 },
              '& .Mui-selected': { color: C.accent },
              '& .MuiTabs-indicator': { bgcolor: C.accent },
            }}
          >
            {tabs.map((t, i) => (
              <Tab key={i} label={t.label} />
            ))}
          </Tabs>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 0.5,
              p: 1,
              maxHeight: 240,
              overflowY: 'auto',
            }}
          >
            {(tabs[Math.min(tabIdx, tabs.length - 1)]?.stickers ?? []).map((sticker) => (
              <Box
                key={sticker._id}
                onClick={() => handleSelect(sticker)}
                sx={{
                  width: 60,
                  height: 60,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  '&:hover': { bgcolor: 'rgba(155,109,255,0.1)' },
                }}
              >
                <Box
                  component="img"
                  src={sticker.url}
                  alt={sticker.name}
                  sx={{ width: 52, height: 52, objectFit: 'contain' }}
                />
              </Box>
            ))}
          </Box>
        </>
      )}
    </Box>
  );
}
