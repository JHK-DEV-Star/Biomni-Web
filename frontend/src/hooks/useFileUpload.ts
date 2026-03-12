import { useState, useCallback } from 'react';
import { uploadFile } from '@/api/files';
import type { PendingFile } from '@/types';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3'];

function getFileType(file: File): PendingFile['type'] {
  if (IMAGE_TYPES.some((t) => file.type.startsWith(t.split('/')[0]))) return 'image';
  if (AUDIO_TYPES.some((t) => file.type.startsWith(t.split('/')[0]))) return 'audio';
  return 'document';
}

export function useFileUpload(maxAttachments = 5) {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const remaining = maxAttachments - pendingFiles.length;
      const toAdd = fileArray.slice(0, remaining);

      if (toAdd.length === 0) return;

      setUploading(true);

      const newPending: PendingFile[] = [];

      for (const file of toAdd) {
        const fileType = getFileType(file);
        const pending: PendingFile = {
          file,
          name: file.name,
          type: fileType,
        };

        // Generate preview URL for images
        if (fileType === 'image') {
          pending.previewUrl = URL.createObjectURL(file);
        }

        // Upload to server
        try {
          const res = await uploadFile(file);
          pending.uploadedFilename = res.filename;
          if (res.text_content) {
            pending.textContent = res.text_content;
          }
        } catch {
          // Skip failed uploads
          continue;
        }

        newPending.push(pending);
      }

      setPendingFiles((prev) => [...prev, ...newPending]);
      setUploading(false);
    },
    [pendingFiles.length, maxAttachments],
  );

  const removeFile = useCallback((index: number) => {
    setPendingFiles((prev) => {
      const file = prev[index];
      if (file?.previewUrl) {
        URL.revokeObjectURL(file.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const clearFiles = useCallback(() => {
    pendingFiles.forEach((f) => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    });
    setPendingFiles([]);
  }, [pendingFiles]);

  return { pendingFiles, uploading, addFiles, removeFile, clearFiles };
}
