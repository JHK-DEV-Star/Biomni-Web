/**
 * Static model registry — fallback when backend API is unreachable.
 * Keep in sync with backend/model_registry.yaml.
 */
import type { ModelInfo } from '@/types';

export const MODEL_REGISTRY: ModelInfo[] = [
  // Local Models — only models with physical folders show up from backend
  { name: 'ministral-instruct', display_name: 'Ministral-3-3B-Reasoning-2512', type: 'local', provider: 'sglang', status: 'unavailable' },
  // Cloud API Models
  { name: 'gpt-4o', display_name: 'gpt-4o', type: 'api', provider: 'openai', status: 'no_api_key' },
  { name: 'gpt-4o-mini', display_name: 'gpt-4o-mini', type: 'api', provider: 'openai', status: 'no_api_key' },
  { name: 'claude-sonnet', display_name: 'claude-sonnet', type: 'api', provider: 'anthropic', status: 'no_api_key' },
  { name: 'claude-haiku', display_name: 'claude-haiku', type: 'api', provider: 'anthropic', status: 'no_api_key' },
  { name: 'gemini-2.0-flash', display_name: 'gemini-2.0-flash', type: 'api', provider: 'gemini', status: 'no_api_key' },
  { name: 'gemini-2.5-pro', display_name: 'gemini-2.5-pro', type: 'api', provider: 'gemini', status: 'no_api_key' },
];
