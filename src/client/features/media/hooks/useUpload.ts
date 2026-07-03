import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useUploadStore } from '@/store/uploadStore';
import { useAuthStore } from '@/store/authStore';
import type { UploadItem } from '@/store/uploadStore';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api/v1';

export function useUpload() {
  const { addUpload, setProgress, completeUpload, failUpload } = useUploadStore();
  const accessToken = useAuthStore((s) => s.accessToken);

  const upload = useCallback(
    (file: File, opts: { conversationId?: string; isVoiceNote?: boolean } = {}): Promise<UploadItem['result']> => {
      return new Promise((resolve, reject) => {
        const id = uuidv4();
        addUpload(id, file);

        const formData = new FormData();
        formData.append('file', file);
        if (opts.conversationId) formData.append('conversationId', opts.conversationId);
        if (opts.isVoiceNote) formData.append('isVoiceNote', 'true');

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_BASE}/media/upload`);
        if (accessToken) xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            setProgress(id, Math.round((e.loaded / e.total) * 100));
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const response = JSON.parse(xhr.responseText) as { success: boolean; data: UploadItem['result'] };
            completeUpload(id, response.data);
            resolve(response.data);
          } else {
            let msg = `Upload failed (${xhr.status})`;
            try {
              const body = JSON.parse(xhr.responseText) as { message?: string; error?: string };
              msg = body.message ?? body.error ?? msg;
            } catch { /* keep default */ }
            failUpload(id, msg);
            reject(new Error(msg));
          }
        });

        xhr.addEventListener('error', () => {
          const msg = 'Network error during upload';
          failUpload(id, msg);
          reject(new Error(msg));
        });

        xhr.send(formData);
      });
    },
    [addUpload, setProgress, completeUpload, failUpload, accessToken],
  );

  const uploadVoiceNote = useCallback(
    (blob: Blob, opts: { conversationId?: string } = {}): Promise<UploadItem['result']> => {
      const file = new File([blob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });
      return upload(file, { ...opts, isVoiceNote: true });
    },
    [upload],
  );

  return { upload, uploadVoiceNote };
}
