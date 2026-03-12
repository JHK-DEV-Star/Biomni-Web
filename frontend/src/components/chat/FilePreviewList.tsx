import { X, FileText, Music } from 'lucide-react';
import type { PendingFile } from '@/types';

interface Props {
  files: PendingFile[];
  onRemove: (index: number) => void;
}

/**
 * File preview thumbnails in the input area.
 * Uses CSS: .file-preview-container, .file-preview(.image|.document|.audio)
 */
export function FilePreviewList({ files, onRemove }: Props) {
  if (files.length === 0) return null;

  return (
    <div className="file-preview-container">
      {files.map((file, i) => (
        <div key={i} className={`file-preview ${file.type}`}>
          {file.type === 'image' && file.previewUrl ? (
            <img src={file.previewUrl} alt={file.name} />
          ) : (
            <span className="file-preview-icon">
              {file.type === 'audio' ? <Music size={24} /> : <FileText size={24} />}
            </span>
          )}
          <span className="file-preview-name">{file.name}</span>
          <button
            className="file-preview-remove"
            onClick={() => onRemove(i)}
            title="Remove"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
