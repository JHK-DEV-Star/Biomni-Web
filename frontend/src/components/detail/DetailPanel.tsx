import { useAppContext } from '@/context/AppContext';
import { useTranslation } from '@/i18n';
import { PlanTab } from './PlanTab';
import { GraphTab } from './GraphTab';
import { CodeTab } from './CodeTab';
import { OutputsTab } from './OutputsTab';

export function DetailPanel() {
  const { state, dispatch } = useAppContext();
  const { t } = useTranslation();
  const activeTab = state.activeDetailTab;

  return (
    <div className="detail-panel">
      <div className="detail-header">
        <div className="detail-tabs">
          <button
            className={`detail-tab ${activeTab === 'plan' ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'SET_ACTIVE_DETAIL_TAB', payload: 'plan' })}
          >
            {t('label.tab_plan')}
          </button>
          <button
            className={`detail-tab ${activeTab === 'graph' ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'SET_ACTIVE_DETAIL_TAB', payload: 'graph' })}
          >
            {t('label.tab_graph')}
          </button>
          <button
            className={`detail-tab ${activeTab === 'code' ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'SET_ACTIVE_DETAIL_TAB', payload: 'code' })}
          >
            {t('label.tab_code')}
          </button>
          <button
            className={`detail-tab ${activeTab === 'outputs' ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'SET_ACTIVE_DETAIL_TAB', payload: 'outputs' })}
          >
            {t('label.tab_outputs')}
          </button>
        </div>
      </div>

      <div className="detail-content">
        {activeTab === 'plan' && <PlanTab />}
        {activeTab === 'graph' && <GraphTab />}
        {activeTab === 'code' && <CodeTab />}
        {activeTab === 'outputs' && <OutputsTab />}
      </div>
    </div>
  );
}
