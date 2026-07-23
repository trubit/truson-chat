export interface VoiceNoteResponse {
  _id: string;
  url: string;
  secureUrl: string;
  publicId: string;
  mimeType: string;
  size: number;
  duration?: number;
  waveform: number[];
  status: string;
  createdAt: string;
}
