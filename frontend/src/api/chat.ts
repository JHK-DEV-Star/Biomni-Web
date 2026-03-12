import { fetchJSON } from './client';
import type { StopRequest, StatusResponse } from '@/types';

/**
 * HTTP fallback for stopping generation.
 * Primary stop is via WebSocket action.
 */
export async function stopGeneration(convId: string): Promise<StatusResponse> {
  const body: StopRequest = { conv_id: convId };
  return fetchJSON('/api/stop', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
