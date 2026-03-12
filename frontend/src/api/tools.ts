import { fetchJSON } from './client';
import type {
  ToolCallRequest,
  ExecuteCodeRequest,
  NodeManifest,
} from '@/types';

export async function toolCall(
  body: ToolCallRequest,
): Promise<Record<string, unknown>> {
  return fetchJSON('/api/tool_call', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function executeCode(
  body: ExecuteCodeRequest,
): Promise<Record<string, unknown>> {
  return fetchJSON('/api/execute_code', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getNodeManifest(): Promise<NodeManifest> {
  return fetchJSON('/api/node-manifest');
}
