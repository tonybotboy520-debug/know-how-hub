const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

async function requestAgent(path, body) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || 'Agent 服务暂时不可用，请稍后重试。');
  }

  return payload;
}

export async function chatWithAgent(agentId, messages, context = {}) {
  const payload = await requestAgent(`/api/agents/${agentId}/chat`, { messages, context });
  return payload.message;
}

export async function suggestAgentAnswer(agentId, messages, context = {}, draft = '') {
  const payload = await requestAgent(`/api/agents/${agentId}/suggest`, {
    messages,
    context,
    draft,
  });
  return payload.suggestion?.content || '';
}

export async function analyzeAgentConversation(agentId, messages, context = {}, progress = 35) {
  const payload = await requestAgent(`/api/agents/${agentId}/status`, {
    messages,
    context,
    progress,
  });
  return payload.status;
}

export async function generateAgentArtifact(agentId, messages, context = {}) {
  const payload = await requestAgent(`/api/agents/${agentId}/generate`, { messages, context });
  return payload.artifact;
}
