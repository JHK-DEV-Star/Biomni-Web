import { API_BASE } from './config';
import { ApiError, fetchJSON } from './client';
import type { FileInfo, FileUploadResponse, StatusResponse } from '@/types';

export async function listFiles(): Promise<FileInfo[]> {
  return fetchJSON('/api/data/list');
}

export async function uploadFile(file: File): Promise<FileUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/api/data/upload`, {
    method: 'POST',
    body: formData, // No Content-Type header — browser sets multipart boundary
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, err.detail || 'Upload failed');
  }

  return res.json();
}

export async function deleteFile(filename: string): Promise<StatusResponse> {
  return fetchJSON(`/api/data/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
  });
}

export async function listStepOutputs(
  convId: string,
  stepId: number,
): Promise<{ figures: string[]; tables: string[] }> {
  return fetchJSON(`/api/outputs/${convId}/step_${stepId}`);
}

export function getStepOutputUrl(
  convId: string,
  stepId: number,
  filename: string,
): string {
  return `${API_BASE}/api/outputs/${convId}/step_${stepId}/${encodeURIComponent(filename)}`;
}
