import { useState, useEffect, useRef, useCallback } from 'react';
import { InputBase, Box, Typography, Tabs, Tab, CircularProgress } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useGifStore } from '@/store/gifStore';
import { useTrendingGifs, useGifSearch } from '../queries/index';
import type { GifItem } from '@/store/gifStore';

const C = {
  panel: '#080C18',
  border: 'rgba(139,92,246,0.12)',
  accent: '#9B6DFF',
  searchBg: 'rgba(139,92,246,0.07)',
  txt2: '#94A3B8',
  txt3: '#475569',
} as const;

const SEARCH_DEBOUNCE_MS = 400;

export function GifPicker({ onSelect }: { onSelect: (gif: GifItem) => void; onClose: () => void }) {
  const [inputVal, setInputVal] = useState('');
  const [query, setQuery] = useState('');
  const [tabIdx, setTabIdx] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { trending, searchResults, isSearching } = useGifStore();

  const { isLoading: loadingTrend } = useTrendingGifs();
  const { isLoading: loadingSearch } = useGifSearch(query);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputVal(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setQuery(val.trim());
      if (val.trim().length >= 2) setTabIdx(1);
      else setTabIdx(0);
    }, SEARCH_DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const displayGifs = tabIdx === 1 && query.length >= 2 ? searchResults : trending;
  const isLoading = tabIdx === 0 ? loadingTrend : loadingSearch || isSearching;

  return (
    <Box sx={{ width: 320, bgcolor: C.panel }}>
      {/* Search */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mx: 1,
          mt: 1,
          mb: 0.5,
          px: 1.25,
          py: 0.5,
          bgcolor: C.searchBg,
          border: `1px solid ${C.border}`,
          borderRadius: '10px',
        }}
      >
        <SearchIcon sx={{ fontSize: 16, color: C.txt3 }} />
        <InputBase
          value={inputVal}
          onChange={handleInputChange}
          placeholder="Search GIFs…"
          sx={{ flex: 1, fontSize: 13, color: C.txt2 }}
        />
      </Box>

      {/* Tabs */}
      <Tabs
        value={tabIdx}
        onChange={(_, v: number) => setTabIdx(v)}
        sx={{
          borderBottom: `1px solid ${C.border}`,
          minHeight: 32,
          '& .MuiTab-root': { fontSize: 11, minHeight: 32, color: C.txt3, textTransform: 'none' },
          '& .Mui-selected': { color: C.accent },
          '& .MuiTabs-indicator': { bgcolor: C.accent },
        }}
      >
        <Tab label="Trending" />
        <Tab label="Search Results" disabled={query.length < 2} />
      </Tabs>

      {/* Grid */}
      <Box sx={{ p: 0.75, maxHeight: 260, overflowY: 'auto' }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={24} sx={{ color: C.accent }} />
          </Box>
        ) : displayGifs.length === 0 ? (
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 13, color: C.txt3 }}>
              {tabIdx === 1 ? 'No results found' : 'No trending GIFs'}
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              columnCount: 2,
              columnGap: '6px',
            }}
          >
            {displayGifs.map((gif) => (
              <Box
                key={gif.id}
                onClick={() => onSelect(gif)}
                sx={{
                  mb: '6px',
                  breakInside: 'avoid',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  '&:hover': { opacity: 0.85 },
                  position: 'relative',
                }}
                title={gif.title}
              >
                <Box
                  component="img"
                  src={gif.url}
                  alt={gif.title}
                  sx={{
                    width: '100%',
                    display: 'block',
                    borderRadius: '8px',
                  }}
                />
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* Tenor watermark */}
      <Box sx={{ textAlign: 'center', py: 0.5, borderTop: `1px solid ${C.border}` }}>
        <Typography sx={{ fontSize: 10, color: C.txt3, letterSpacing: 0.5 }}>
          Powered by Tenor
        </Typography>
      </Box>
    </Box>
  );
}
