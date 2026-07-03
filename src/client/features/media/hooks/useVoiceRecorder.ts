import { useRef, useCallback, useEffect } from 'react';
import { useVoiceStore } from '@/store/voiceStore';

export function useVoiceRecorder() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<Blob[]>([]);
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef      = useRef<AnalyserNode | null>(null);
  const animFrameRef     = useRef<number | null>(null);
  const streamRef        = useRef<MediaStream | null>(null);

  const {
    startRecording: storeStart,
    stopRecording:  storeStop,
    cancelRecording,
    setDuration,
    addWaveformPoint,
    isRecording,
    audioBlob,
    audioUrl,
    duration,
    waveform,
  } = useVoiceStore();

  const stopRecording = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Setup audio analyser for waveform visualization
      const ctx      = new AudioContext();
      const source   = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Waveform animation
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const animate = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 255;
        addWaveformPoint(Math.max(0.05, avg));
        animFrameRef.current = requestAnimationFrame(animate);
      };
      animFrameRef.current = requestAnimationFrame(animate);

      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url  = URL.createObjectURL(blob);
        storeStop(blob, url);
        stream.getTracks().forEach((t) => t.stop());
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      };

      recorder.start(100);
      storeStart();

      // Duration timer
      let secs = 0;
      timerRef.current = setInterval(() => {
        secs++;
        setDuration(secs);
        // Auto-stop at 5 minutes
        if (secs >= 300) stopRecording();
      }, 1000);
    } catch {
      cancelRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeStart, storeStop, cancelRecording, setDuration, addWaveformPoint]);

  const cancel = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop();
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    cancelRecording();
  }, [cancelRecording]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return { startRecording, stopRecording, cancel, isRecording, audioBlob, audioUrl, duration, waveform };
}
