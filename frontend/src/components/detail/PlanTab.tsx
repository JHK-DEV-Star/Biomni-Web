import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAppContext } from '@/context/AppContext';
import { useChatContext } from '@/context/ChatContext';
import { useWebSocket } from '@/context/WebSocketContext';
import { truncateConversation } from '@/api/conversations';
import { analyzePlan } from '@/api/plan';
import { useTranslation } from '@/i18n';
import { RefreshCw, Loader, AlertCircle } from 'lucide-react';

export function PlanTab() {
  const { state, dispatch: appDispatch } = useAppContext();
  const { state: chatState, dispatch: chatDispatch } = useChatContext();
  const { sendMessage, isStreaming } = useWebSocket();
  const { t } = useTranslation();
  const data = state.detailPanelData;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const requestedRef = useRef(false);

  // Detect plan completion: all steps have a terminal status
  const allStepsDone = data
    ? data.steps.length > 0 &&
      data.steps.every(
        (s) => s.status === 'completed' || s.status === 'error' || s.status === 'stopped',
      )
    : false;

  const requestAnalysis = useCallback(
    async (force = false) => {
      if (!data || (!force && data.analysis)) return;
      if (!allStepsDone && !force) return;

      setLoading(true);
      setError('');
      try {
        const stepsWithResults = data.steps.map((step, i) => ({
          name: step.name,
          tool: step.tool || '',
          description: step.description || '',
          status: step.status || 'pending',
          result: data.results[i] || null,
        }));

        const res = await analyzePlan({
          goal: data.goal,
          steps: stepsWithResults,
          current_step: data.currentStep,
        });

        if (res.success && res.analysis) {
          appDispatch({ type: 'SET_ANALYSIS', payload: res.analysis });
        } else {
          setError(res.error || 'Analysis generation failed');
        }
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    },
    [data, allStepsDone, appDispatch],
  );

  // Auto-request analysis when plan completes (once)
  useEffect(() => {
    if (allStepsDone && data && !data.analysis && !requestedRef.current) {
      requestedRef.current = true;
      requestAnalysis();
    }
    // Reset flag when plan data changes (new plan)
    if (!allStepsDone) {
      requestedRef.current = false;
    }
  }, [allStepsDone, data, requestAnalysis]);

  const handleReplan = async () => {
    if (isStreaming) return;
    const convId = chatState.conversationId;
    if (!convId) return;

    const messages = chatState.messages;
    let userMsgIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        userMsgIndex = i;
        break;
      }
    }
    if (userMsgIndex < 0) return;

    const userContent = messages[userMsgIndex].content;
    try {
      await truncateConversation(convId, userMsgIndex);
      chatDispatch({ type: 'TRUNCATE_FROM', payload: userMsgIndex });
      sendMessage(userContent);
    } catch (err) {
      chatDispatch({ type: 'SET_ERROR', payload: String(err) });
    }
  };

  // No plan data yet
  if (!data) {
    return (
      <div className="detail-empty-state">
        <p>{t('empty.plan_hint')}</p>
      </div>
    );
  }

  // Plan in progress — not yet complete
  if (!allStepsDone && !data.analysis) {
    return (
      <div className="detail-empty-state">
        <p>{t('status.plan_running') !== 'status.plan_running'
          ? t('status.plan_running')
          : 'Plan is running. Analysis will appear here when all steps complete.'}</p>
      </div>
    );
  }

  // Loading analysis
  if (loading) {
    return (
      <div className="detail-empty-state">
        <Loader size={20} className="spin" style={{ marginBottom: 8 }} />
        <p>{t('status.analyzing') !== 'status.analyzing'
          ? t('status.analyzing')
          : 'Generating analysis...'}</p>
      </div>
    );
  }

  return (
    <div className="plan-content">
      {/* Top action bar: Replan + Regenerate */}
      <div className="plan-goal-actions" style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', padding: '8px 12px 0' }}>
        <button
          className="plan-regen-btn"
          onClick={handleReplan}
          disabled={isStreaming}
          title="Regenerate Plan"
        >
          <RefreshCw size={14} />
          <span style={{ marginLeft: 4, fontSize: 12 }}>Replan</span>
        </button>
        <button
          className="plan-regen-btn"
          onClick={() => requestAnalysis(true)}
          disabled={loading || isStreaming}
          title="Regenerate Analysis"
        >
          <RefreshCw size={14} />
          <span style={{ marginLeft: 4, fontSize: 12 }}>Regenerate</span>
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="detail-error-banner">
          <AlertCircle size={16} className="error-icon" />
          <span className="error-text">{error}</span>
        </div>
      )}

      {/* Analysis markdown */}
      {data.analysis && (
        <div className="plan-analysis">
          <div className="analysis-content markdown-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {data.analysis}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* No analysis yet but steps are done */}
      {!data.analysis && !error && (
        <div className="detail-empty-state">
          <p>Click "Regenerate" to generate analysis.</p>
        </div>
      )}
    </div>
  );
}
