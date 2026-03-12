import { useState, useCallback, useEffect } from 'react';
import { useChatContext } from '@/context/ChatContext';
import { useAppContext } from '@/context/AppContext';
import * as api from '@/api/conversations';
import type { ConversationSummary, ChatMessage, MessageData } from '@/types';

/**
 * Hook for conversation CRUD + sidebar list management.
 * Mirrors inference_ui's loadConversations/loadConversation/createNewChat/delete.
 */
export function useConversations() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const { state: chatState, dispatch: chatDispatch } = useChatContext();
  const { state: appState, dispatch: appDispatch } = useAppContext();

  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.listConversations();
      setConversations(list);
    } catch {
      // Silently fail — server might not be ready
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount and when conversationVersion changes (triggered by BUMP_CONVERSATIONS)
  useEffect(() => {
    loadConversations();
  }, [loadConversations, appState.conversationVersion]);

  const switchTo = useCallback(
    async (convId: string) => {
      if (convId === chatState.conversationId) return;

      try {
        const detail = await api.getConversation(convId);
        const messages: ChatMessage[] = detail.messages.map((m: MessageData) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

        chatDispatch({ type: 'SET_CONVERSATION', payload: { id: convId, messages } });

        // Restore detail panel from [PLAN_COMPLETE] marker in messages
        restoreDetailPanel(detail.messages);
      } catch (err) {
        chatDispatch({ type: 'SET_ERROR', payload: String(err) });
      }
    },
    [chatState.conversationId, chatDispatch, appDispatch],
  );

  const createNew = useCallback(async () => {
    chatDispatch({ type: 'SET_CONVERSATION', payload: { id: null, messages: [] } });
    appDispatch({ type: 'CLEAR_DETAIL_PANEL' });
    await loadConversations();
  }, [chatDispatch, appDispatch, loadConversations]);

  const deleteFn = useCallback(
    async (convId: string) => {
      // Optimistic removal
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      try {
        await api.deleteConversation(convId);
        // Clean up graph localStorage for deleted conversation
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key?.startsWith(`graphState-${convId}-`)) {
            localStorage.removeItem(key);
          }
        }
        // 항상 현재 대화 + Detail Panel 초기화 (삭제한 채팅이 현재든 아니든)
        chatDispatch({ type: 'SET_CONVERSATION', payload: { id: null, messages: [] } });
        appDispatch({ type: 'CLEAR_DETAIL_PANEL' });
      } catch {
        // Rollback
        await loadConversations();
      }
    },
    [chatState.conversationId, chatDispatch, appDispatch, loadConversations],
  );

  const renameFn = useCallback(
    async (convId: string, newTitle: string) => {
      // Optimistic update
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, title: newTitle } : c)),
      );
      try {
        await api.renameConversation(convId, newTitle);
      } catch {
        await loadConversations();
      }
    },
    [loadConversations],
  );

  /** Restore detail panel from [PLAN_COMPLETE] marker in conversation messages */
  function restoreDetailPanel(messages: MessageData[]) {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === 'assistant' && msg.content.includes('[PLAN_COMPLETE]')) {
        try {
          const marker = msg.content.substring(
            msg.content.indexOf('[PLAN_COMPLETE]') + '[PLAN_COMPLETE]'.length,
          );
          const planData = JSON.parse(marker.trim());
          if (planData.goal && planData.steps) {
            appDispatch({
              type: 'SET_DETAIL_PANEL_DATA',
              payload: {
                goal: planData.goal,
                steps: planData.steps.map((s: { name: string; description: string }) => ({
                  name: s.name,
                  description: s.description,
                  status: 'completed' as const,
                })),
                results: planData.results || [],
                codes: planData.codes || {},
                analysis: planData.analysis || '',
                currentStep: planData.steps.length,
              },
            });
            return;
          }
        } catch {
          // Malformed plan data — skip
        }
      }
    }
    // No plan found — clear detail panel
    appDispatch({ type: 'CLEAR_DETAIL_PANEL' });
  }

  return {
    conversations,
    loading,
    loadConversations,
    switchTo,
    createNew,
    deleteFn,
    renameFn,
    currentConversationId: chatState.conversationId,
  };
}
