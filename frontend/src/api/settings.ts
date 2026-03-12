import { fetchJSON } from './client';
import type {
  SettingsResponse,
  SettingsUpdateRequest,
  SystemPromptResponse,
  StatusResponse,
} from '@/types';

export async function getSettings(): Promise<SettingsResponse> {
  return fetchJSON('/api/settings');
}

export async function updateSettings(body: SettingsUpdateRequest): Promise<StatusResponse> {
  return fetchJSON('/api/settings', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getSystemPrompt(signal?: AbortSignal): Promise<SystemPromptResponse> {
  return fetchJSON('/api/system_prompt', signal ? { signal } : undefined);
}

export async function getDefaultSystemPrompt(): Promise<SystemPromptResponse> {
  return fetchJSON('/api/system_prompt/default');
}

export async function setSystemPrompt(prompt: string): Promise<StatusResponse> {
  return fetchJSON('/api/system_prompt', {
    method: 'POST',
    body: JSON.stringify({ prompt }),
  });
}
