import { create } from 'zustand';

export type UploadStatus = 'pending' | 'uploading' | 'done' | 'error';

export interface UploadItem {
  id:           string;    // temp uuid
  file:         File;
  progress:     number;    // 0-100
  status:       UploadStatus;
  error?:       string;
  result?: {
    _id:          string;
    url:          string;
    secureUrl:    string;
    publicId:     string;
    mimeType:     string;
    size:         number;
    originalName: string;
    width?:       number;
    height?:      number;
    duration?:    number;
    thumbnail?:   string;
    type:         string;
  };
}

interface UploadState {
  uploads: Map<string, UploadItem>;
}
interface UploadActions {
  addUpload:       (id: string, file: File) => void;
  setProgress:     (id: string, progress: number) => void;
  completeUpload:  (id: string, result: UploadItem['result']) => void;
  failUpload:      (id: string, error: string) => void;
  removeUpload:    (id: string) => void;
  clearCompleted:  () => void;
  reset:           () => void;
}

export const useUploadStore = create<UploadState & UploadActions>()((set) => ({
  uploads: new Map(),
  addUpload: (id, file) => set((s) => {
    const m = new Map(s.uploads);
    m.set(id, { id, file, progress: 0, status: 'pending' });
    return { uploads: m };
  }),
  setProgress: (id, progress) => set((s) => {
    const m = new Map(s.uploads);
    const item = m.get(id);
    if (item) m.set(id, { ...item, progress, status: 'uploading' });
    return { uploads: m };
  }),
  completeUpload: (id, result) => set((s) => {
    const m = new Map(s.uploads);
    const item = m.get(id);
    if (item) m.set(id, { ...item, progress: 100, status: 'done', result });
    return { uploads: m };
  }),
  failUpload: (id, error) => set((s) => {
    const m = new Map(s.uploads);
    const item = m.get(id);
    if (item) m.set(id, { ...item, status: 'error', error });
    return { uploads: m };
  }),
  removeUpload: (id) => set((s) => {
    const m = new Map(s.uploads);
    m.delete(id);
    return { uploads: m };
  }),
  clearCompleted: () => set((s) => {
    const m = new Map(s.uploads);
    for (const [id, item] of m) {
      if (item.status === 'done' || item.status === 'error') m.delete(id);
    }
    return { uploads: m };
  }),
  reset: () => set({ uploads: new Map() }),
}));
