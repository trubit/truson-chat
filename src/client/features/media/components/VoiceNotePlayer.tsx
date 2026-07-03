import { useRef, useState, useEffect, useCallback } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';

const C = {
  accent:    '#9B6DFF',
  accentDim: 'rgba(155,109,255,0.35)',
  txt2:      '#94A3B8',
  txt3:      '#475569',
  bg:        'rgba(13,18,37,0.9)',
  border:    'rgba(139,92,246,0.12)',
} as const;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function VoiceNotePlayer({
  url,
  duration,
  waveform,
}: {
  url: string;
  duration?: number;
  waveform?: number[];
}) {
  const audioRef  = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying]       = useState(false);
  const [current, setCurrent]       = useState(0);
  const [total, setTotal]           = useState(duration ?? 0);
  const [loadError, setLoadError]   = useState(false);

  // Normalize waveform to 50 bars
  const bars: number[] = (() => {
    const src = waveform && waveform.length > 0 ? waveform : [];
    if (src.length === 0) {
      // Default flat waveform
      return Array.from({ length: 50 }, (_, i) => 0.15 + Math.abs(Math.sin(i * 0.6)) * 0.35);
    }
    // Resample to 50 bars
    const result: number[] = [];
    for (let i = 0; i < 50; i++) {
      const idx = Math.floor((i / 50) * src.length);
      result.push(src[idx] ?? 0.15);
    }
    return result;
  })();

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrent(audio.currentTime);
    const onDuration   = () => { setTotal(audio.duration); setLoadError(false); };
    const onEnded      = () => {
      setPlaying(false);
      setCurrent(0);
      audio.currentTime = 0; // reset so next play starts from beginning
    };
    const onError      = () => { setLoadError(true); setPlaying(false); };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onDuration);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onDuration);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, []);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || loadError) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      try {
        await audio.play();
        setPlaying(true);
      } catch {
        setPlaying(false);
      }
    }
  }, [playing, loadError]);

  const handleWaveformClick = useCallback((idx: number) => {
    const audio = audioRef.current;
    if (!audio || !total) return;
    const seekTo = (idx / 50) * total;
    audio.currentTime = seekTo;
    setCurrent(seekTo);
  }, [total]);

  const playedBars = total > 0 ? Math.round((current / total) * 50) : 0;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1.25,
        py: 0.75,
        bgcolor: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: '12px',
        minWidth: 220,
        maxWidth: 280,
      }}
    >
      <audio ref={audioRef} src={url} preload="metadata" />

      {/* Play/Pause */}
      <IconButton
        size="small"
        onClick={() => { void togglePlay(); }}
        disabled={loadError}
        sx={{
          width: 32,
          height: 32,
          bgcolor: loadError ? C.txt3 : C.accent,
          color: '#fff',
          flexShrink: 0,
          '&:hover': { bgcolor: loadError ? C.txt3 : '#B68DFF' },
          '&.Mui-disabled': { bgcolor: C.txt3, color: 'rgba(255,255,255,0.4)' },
        }}
      >
        {loadError
          ? <ErrorOutlineIcon sx={{ fontSize: 16 }} />
          : playing
            ? <PauseIcon sx={{ fontSize: 16 }} />
            : <PlayArrowIcon sx={{ fontSize: 16 }} />}
      </IconButton>

      {/* Waveform */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: '1.5px',
          height: 28,
          cursor: 'pointer',
        }}
      >
        {bars.map((amp, i) => (
          <Box
            key={i}
            onClick={() => handleWaveformClick(i)}
            sx={{
              flex: 1,
              height: `${Math.max(3, amp * 24)}px`,
              borderRadius: '1px',
              bgcolor: i < playedBars ? C.accent : C.accentDim,
              transition: 'background-color 0.1s',
              '&:hover': { bgcolor: C.accent, opacity: 0.8 },
            }}
          />
        ))}
      </Box>

      {/* Time */}
      <Typography sx={{ fontSize: 11, color: C.txt3, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
        {formatTime(current)} / {formatTime(total)}
      </Typography>
    </Box>
  );
}
