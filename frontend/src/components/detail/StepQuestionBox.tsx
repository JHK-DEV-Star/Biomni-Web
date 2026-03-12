import { useState } from 'react';
import { Send, RotateCcw } from 'lucide-react';
import { useWebSocket } from '@/context/WebSocketContext';
import { useTranslation } from '@/i18n';

interface Props {
  stepIndex: number;
  stepName: string;
}

/**
 * Step question/retry UI shown in the plan tab.
 * Uses CSS: .step-question-box (flat flex row), .step-question-input, .step-question-send
 */
export function StepQuestionBox({ stepIndex }: Props) {
  const [question, setQuestion] = useState('');
  const { sendStepQuestion, retryStep, isStreaming } = useWebSocket();
  const { t } = useTranslation();

  const handleAsk = () => {
    const text = question.trim();
    if (!text || isStreaming) return;
    sendStepQuestion(text, stepIndex);
    setQuestion('');
  };

  const handleRetry = () => {
    if (isStreaming) return;
    retryStep(stepIndex);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  return (
    <div className="step-question-box">
      <input
        className="step-question-input"
        type="text"
        placeholder={t('ask_about_step') !== 'ask_about_step' ? t('ask_about_step') : 'Ask about this step...'}
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isStreaming}
      />
      <button
        className="step-question-send"
        onClick={handleAsk}
        disabled={!question.trim() || isStreaming}
        title={t('ask') !== 'ask' ? t('ask') : 'Ask'}
      >
        <Send size={14} />
      </button>
      <button
        className="step-question-send"
        onClick={handleRetry}
        disabled={isStreaming}
        title={t('retry') !== 'retry' ? t('retry') : 'Retry'}
      >
        <RotateCcw size={14} />
      </button>
    </div>
  );
}
