import { fetchJSON } from './client';
import type { UpdatePlanAnalysisRequest, StatusResponse } from '@/types';

export async function updatePlanAnalysis(
  body: UpdatePlanAnalysisRequest,
): Promise<StatusResponse> {
  return fetchJSON('/api/update_plan_analysis', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export interface AnalyzePlanRequest {
  goal: string;
  steps: Array<{
    name: string;
    tool?: string;
    description?: string;
    status?: string;
    result?: unknown;
  }>;
  current_step: number;
}

export interface AnalyzePlanResponse {
  success: boolean;
  analysis: string;
  error?: string;
}

export async function analyzePlan(
  body: AnalyzePlanRequest,
): Promise<AnalyzePlanResponse> {
  return fetchJSON('/api/analyze_plan', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
