import { useCallback, useEffect, useRef, useState } from 'react';
import { analyzeAgentConversation, chatWithAgent, suggestAgentAnswer } from '../api/agents';

const readStoredMessages = (storageKey) => {
  if (!storageKey) return null;
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey));
    return Array.isArray(stored) && stored.length ? stored : null;
  } catch {
    return null;
  }
};

const initialConversationStatus = (userTurns = 0) => ({
  progress: userTurns ? Math.min(94, Math.round(35 + 63 * (1 - Math.exp(-0.55 * userTurns)))) : 35,
  turn: userTurns,
  stage: userTurns ? '等待更新' : '等待开始',
  summary: userTurns ? '继续对话后，Agent 将更新覆盖情况。' : '回答当前问题后，Agent 将实时判断信息覆盖情况。',
  covered: [],
  gaps: ['回答 Agent 当前问题'],
  submitReady: false,
  nextAction: '继续补充真实实践信息',
});

const readStoredStatus = (storageKey, userTurns) => {
  if (!storageKey) return initialConversationStatus(userTurns);
  try {
    const stored = JSON.parse(localStorage.getItem(`${storageKey}-status`));
    return stored && typeof stored.progress === 'number'
      ? stored
      : initialConversationStatus(userTurns);
  } catch {
    return initialConversationStatus(userTurns);
  }
};

export function useAgentChat({
  agentId,
  context,
  greeting,
  initialMessages = null,
  storageKey = '',
}) {
  const [messages, setMessages] = useState(() => (
    readStoredMessages(storageKey)
    || initialMessages
    || (greeting ? [{ role: 'assistant', content: greeting }] : [])
  ));
  const [conversationStatus, setConversationStatus] = useState(() => (
    readStoredStatus(storageKey, messages.filter((message) => message.role === 'user').length)
  ));
  const [loading, setLoading] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState('');
  const [error, setError] = useState('');
  const conversationStatusRef = useRef(conversationStatus);
  const statusQueueRef = useRef(Promise.resolve());

  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {
      // Local persistence is a Demo enhancement; chat remains usable if storage is unavailable.
    }
  }, [messages, storageKey]);

  useEffect(() => {
    conversationStatusRef.current = conversationStatus;
    if (!storageKey) return;
    try {
      localStorage.setItem(`${storageKey}-status`, JSON.stringify(conversationStatus));
    } catch {
      // Status persistence is optional; live analysis remains available.
    }
  }, [conversationStatus, storageKey]);

  const sendMessage = useCallback(async (content) => {
    const normalized = content.trim();
    if (!normalized || loading || suggesting) return false;

    const nextMessages = [...messages, { role: 'user', content: normalized }];
    setMessages(nextMessages);
    setLoading(true);
    setError('');
    setStatusError('');

    setStatusLoading(true);
    const statusPromise = statusQueueRef.current
      .catch(() => null)
      .then(() => analyzeAgentConversation(
        agentId,
        nextMessages,
        context,
        conversationStatusRef.current.progress,
      ));
    statusQueueRef.current = statusPromise;
    statusPromise
      .then((nextStatus) => {
        setConversationStatus((current) => {
          if (nextStatus.turn < current.turn) return current;
          const updated = nextStatus.turn === current.turn
            ? { ...nextStatus, progress: current.progress }
            : nextStatus;
          conversationStatusRef.current = updated;
          return updated;
        });
        setStatusError('');
      })
      .catch((requestError) => {
        setStatusError(requestError.message);
      })
      .finally(() => {
        if (statusQueueRef.current === statusPromise) setStatusLoading(false);
      });

    try {
      const reply = await chatWithAgent(agentId, nextMessages, context);
      setMessages([...nextMessages, reply]);
      return true;
    } catch (requestError) {
      setError(requestError.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [agentId, context, loading, messages, suggesting]);

  const suggestAnswer = useCallback(async (draft = '') => {
    if (loading || suggesting || !messages.length) return '';

    setSuggesting(true);
    setError('');
    try {
      return await suggestAgentAnswer(agentId, messages, context, draft);
    } catch (requestError) {
      setError(requestError.message);
      return '';
    } finally {
      setSuggesting(false);
    }
  }, [agentId, context, loading, messages, suggesting]);

  const retry = useCallback(async () => {
    const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user');
    if (!lastUserMessage || loading || suggesting) return false;
    const messagesBeforeReply = messages[0]?.role === 'assistant'
      ? messages.filter((message, index) => message.role !== 'assistant' || index === 0)
      : messages.filter((message) => message.role !== 'assistant');
    setMessages(messagesBeforeReply.slice(0, -1));
    return sendMessage(lastUserMessage.content);
  }, [loading, messages, sendMessage, suggesting]);

  return {
    messages,
    setMessages,
    loading,
    suggesting,
    conversationStatus,
    statusLoading,
    statusError,
    error,
    setError,
    sendMessage,
    suggestAnswer,
    retry,
  };
}
