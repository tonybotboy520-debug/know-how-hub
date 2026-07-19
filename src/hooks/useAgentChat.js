import { useCallback, useEffect, useState } from 'react';
import { chatWithAgent, suggestAgentAnswer } from '../api/agents';

const readStoredMessages = (storageKey) => {
  if (!storageKey) return null;
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey));
    return Array.isArray(stored) && stored.length ? stored : null;
  } catch {
    return null;
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
  const [loading, setLoading] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {
      // Local persistence is a Demo enhancement; chat remains usable if storage is unavailable.
    }
  }, [messages, storageKey]);

  const sendMessage = useCallback(async (content) => {
    const normalized = content.trim();
    if (!normalized || loading || suggesting) return false;

    const nextMessages = [...messages, { role: 'user', content: normalized }];
    setMessages(nextMessages);
    setLoading(true);
    setError('');

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
    error,
    setError,
    sendMessage,
    suggestAnswer,
    retry,
  };
}
