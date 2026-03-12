import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { useTranslation } from '@/i18n';

export function CodeTab() {
  const { state } = useAppContext();
  const { t } = useTranslation();
  const data = state.detailPanelData;
  const [selectedStep, setSelectedStep] = useState(0);
  const [copied, setCopied] = useState(false);

  if (!data || Object.keys(data.codes).length === 0) {
    return (
      <div className="detail-empty-state">
        <p>{t('no_code') !== 'no_code' ? t('no_code') : 'No code generated yet.'}</p>
      </div>
    );
  }

  const stepIndices = Object.keys(data.codes).map(Number).sort((a, b) => a - b);
  const currentCode = data.codes[selectedStep] || '';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="detail-code-content">
      <div className="code-step-selector">
        {stepIndices.map((idx) => (
          <button
            key={idx}
            className={`code-step-btn ${idx === selectedStep ? 'active' : ''}`}
            onClick={() => setSelectedStep(idx)}
          >
            Step {idx + 1}
          </button>
        ))}
      </div>

      <div className="code-block">
        <div className="code-block-header">
          <span className="code-block-title">Step {selectedStep + 1}</span>
          <button
            className={`code-copy-btn ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
            title="Copy code"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
        <div className="code-block-body">{currentCode}</div>
      </div>
    </div>
  );
}
