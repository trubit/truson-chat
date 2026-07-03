import { create } from 'zustand';

interface VoiceState {
  isRecording:    boolean;
  isPaused:       boolean;
  duration:       number;      // seconds elapsed
  audioBlob:      Blob | null;
  audioUrl:       string | null;
  waveform:       number[];    // live amplitude values for visualization
}
interface VoiceActions {
  startRecording:  () => void;
  stopRecording:   (blob: Blob, url: string) => void;
  cancelRecording: () => void;
  clearRecording:  () => void;
  setDuration:     (d: number) => void;
  addWaveformPoint:(amplitude: number) => void;
  reset:           () => void;
}

export const useVoiceStore = create<VoiceState & VoiceActions>()((set) => ({
  isRecording:  false,
  isPaused:     false,
  duration:     0,
  audioBlob:    null,
  audioUrl:     null,
  waveform:     [],

  startRecording:   () => set({ isRecording: true, isPaused: false, duration: 0, audioBlob: null, audioUrl: null, waveform: [] }),
  stopRecording:    (blob, url) => set({ isRecording: false, audioBlob: blob, audioUrl: url }),
  cancelRecording:  () => set({ isRecording: false, isPaused: false, duration: 0, audioBlob: null, audioUrl: null, waveform: [] }),
  clearRecording:   () => set({ audioBlob: null, audioUrl: null, duration: 0, waveform: [] }),
  setDuration:      (d) => set({ duration: d }),
  addWaveformPoint: (amplitude) => set((s) => ({ waveform: [...s.waveform.slice(-49), amplitude] })),
  reset:            () => set({ isRecording: false, isPaused: false, duration: 0, audioBlob: null, audioUrl: null, waveform: [] }),
}));
