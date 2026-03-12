import { fetchJSON } from './client';
import type {
  ConversationSummary,
  ConversationDetail,
  ConversationCreate,
  RenameRequest,
  TruncateRequest,
  StatusResponse,
} from '@/types';

export async function listConversations(): Promise<ConversationSummary[]> {
  return fetchJSON('/api/conversations');
}

export async function getConversation(convId: string): Promise<ConversationDetail> {
  return fetchJSON(`/api/conversation/${convId}`);
}

export async function createConversation(body?: ConversationCreate): Promise<ConversationDetail> {
  return fetchJSON('/api/new', {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
  });
}

export async function deleteConversation(convId: string): Promise<StatusResponse> {
  return fetchJSON(`/api/conversation/${convId}`, { method: 'DELETE' });
}

export async function renameConversation(convId: string, title: string): Promise<StatusResponse> {
  const body: RenameRequest = { title };
  return fetchJSON(`/api/conversation/${convId}/rename`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function truncateConversation(convId: string, messageIndex: number): Promise<StatusResponse> {
  const body: TruncateRequest = { message_index: messageIndex };
  return fetchJSON(`/api/conversation/${convId}/truncate`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function clearConversation(convId: string): Promise<StatusResponse> {
  return fetchJSON(`/api/conversation/${convId}/clear`, { method: 'POST' });
}
