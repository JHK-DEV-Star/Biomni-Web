// ============================================
// Connection Status Indicator
// Shows vLLM/DB connection health in bottom-right
// ============================================

import { useState, useEffect, useRef } from 'react';
import { fetchHealth } from '@/api/client';
import type { HealthStatus } from '@/api/client';

const POLL_INTERVAL = 30_000; // 30 seconds

export function ConnectionStatus() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    const check = async () => {
      try {
        const h = await fetchHealth();
        setHealth(h);
      } catch {
        setHealth({ status: 'error', vllm: false, db: false });
      }
    };

    check();
    intervalRef.current = setInterval(check, POLL_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, []);

  if (!health) return null;

  const allOk = health.vllm && health.db;
  const issues: string[] = [];
  if (!health.vllm) issues.push('vLLM');
  if (!health.db) issues.push('Database');

  return (
    <div
      className={`connection-status ${allOk ? 'ok' : 'error'}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span className={`connection-dot ${allOk ? 'ok' : 'error'}`} />
      {!allOk && (
        <span className="connection-label">
          {issues.join(', ')}
        </span>
      )}
      {showTooltip && (
        <div className="connection-tooltip">
          <div className={`connection-tooltip-row ${health.vllm ? 'ok' : 'error'}`}>
            <span className={`connection-dot-sm ${health.vllm ? 'ok' : 'error'}`} />
            vLLM: {health.vllm ? 'Connected' : 'Disconnected'}
          </div>
          <div className={`connection-tooltip-row ${health.db ? 'ok' : 'error'}`}>
            <span className={`connection-dot-sm ${health.db ? 'ok' : 'error'}`} />
            Database: {health.db ? 'Connected' : 'Disconnected'}
          </div>
        </div>
      )}
    </div>
  );
}
