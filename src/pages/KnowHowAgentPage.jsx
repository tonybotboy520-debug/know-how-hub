import { ArrowLeft, ArrowRight, Check, GitBranch, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { generateAgentArtifact } from '../api/agents';
import { AgentComposer, AgentStatusPanel, Tag } from '../components/Ui';
import { knowHows } from '../data';
import { useAgentChat } from '../hooks/useAgentChat';
import { useDemo } from '../state/DemoContext';

export default function KnowHowAgentPage({ mode }) {
  const navigate = useNavigate();
  const { knowHowId } = useParams();
  const { createdKnowHows, setCreatedKnowHows, notify } = useDemo();
  const source = mode === 'iteration'
    ? [...createdKnowHows, ...knowHows].find((item) => item.id === knowHowId) || knowHows[0]
    : null;
  const agentId = mode === 'iteration' ? 'iteration' : 'free-create';
  const [chatInput, setChatInput] = useState('');
  const [artifact, setArtifact] = useState(null);
  const [generating, setGenerating] = useState(false);
  const context = useMemo(() => (
    mode === 'iteration'
      ? {
        knowHow: {
          id: source.id,
          title: source.title,
          version: source.version,
          summary: source.summary,
          tags: source.tags,
          qualityStatus: source.status,
          confidence: source.confidence,
        },
        knownGaps: ['补充更多真实使用场景', '明确异常与回退边界', '增加可复测的验收标准'],
        defaultDeadline: '2026-07-28',
        defaultReward: 680,
      }
      : { creationMode: 'independent', defaultVisibility: 'public' }
  ), [mode, source]);
  const greeting = mode === 'iteration'
    ? `我已经带入《${source.title}》${source.version}。你希望纠正、补充或升级哪一部分？最好结合一次真实使用中的问题来说明。`
    : '你想沉淀哪一项真正做成过的实践？请先说清它解决什么问题，以及你亲自经历过的一个代表性案例。';
  const {
    messages,
    loading,
    suggesting,
    error,
    setError,
    conversationStatus,
    canGenerate,
    statusLoading,
    statusError,
    sendMessage,
    suggestAnswer,
  } = useAgentChat({
    agentId,
    context,
    greeting,
    storageKey: `kh-agent-${agentId}-${knowHowId || 'new'}`,
  });

  const submitChat = async (value) => {
    const sent = await sendMessage(value);
    if (sent) setChatInput('');
  };

  const suggestChatAnswer = async () => {
    const suggestion = await suggestAnswer(chatInput);
    if (suggestion) setChatInput(suggestion);
  };

  const generate = async () => {
    setGenerating(true);
    setError('');
    try {
      const result = await generateAgentArtifact(agentId, messages, context);
      if (mode === 'iteration') {
        navigate('/create-task', {
          state: {
            agentDraft: {
              ...result,
              baseVersion: `${source.title} ${source.version}`,
            },
          },
        });
        return;
      }
      setArtifact(result);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setGenerating(false);
    }
  };

  const updateArtifact = (field, value) => {
    setArtifact((current) => ({ ...current, [field]: value }));
  };

  const updateSection = (index, field, value) => {
    setArtifact((current) => ({
      ...current,
      sections: current.sections.map((section, sectionIndex) => (
        sectionIndex === index ? { ...section, [field]: value } : section
      )),
    }));
  };

  const publishKnowHow = () => {
    const newItem = {
      id: `local-knowhow-${Date.now()}`,
      version: 'v1.0',
      title: artifact.title,
      summary: artifact.summary,
      tags: artifact.tags?.slice(0, 3) || ['自由创作', '实践方法'],
      status: '完整',
      confidence: '待验证',
      contributors: 1,
      updated: '刚刚',
    };
    setCreatedKnowHows([newItem, ...createdKnowHows]);
    notify('Know-how v1.0 已生成并发布');
    navigate('/workspace/knowhow');
  };

  if (artifact && mode === 'free-create') {
    return (
      <div className="contribution-workspace preview-workspace">
        <header className="builder-header">
          <button className="back-button" onClick={() => setArtifact(null)}><ArrowLeft size={17} />返回补充</button>
          <div><span>自由创作预览</span><i />发布前最后确认</div>
          <span>Agent 已生成 v1.0 草稿</span>
        </header>
        <div className="preview-layout">
          <main className="contribution-preview">
            <div className="preview-title">
              <span className="page-kicker">KNOW-HOW DRAFT / VERSION 1.0</span>
              <input className="artifact-title-input" value={artifact.title} onChange={(event) => updateArtifact('title', event.target.value)} />
              <p>自由创作 Agent 根据访谈生成 · 你可以直接编辑</p>
            </div>
            <div className="free-draft-meta">
              <label><span>内容摘要</span><textarea rows="4" value={artifact.summary || ''} onChange={(event) => updateArtifact('summary', event.target.value)} /></label>
              <label><span>适用对象</span><input value={artifact.audience || ''} onChange={(event) => updateArtifact('audience', event.target.value)} /></label>
              <label><span>适用条件与边界</span><textarea rows="3" value={artifact.applicableScenarios || ''} onChange={(event) => updateArtifact('applicableScenarios', event.target.value)} /></label>
              <div className="tag-row">{artifact.tags?.map((tag) => <Tag key={tag}>{tag}</Tag>)}</div>
            </div>
            {artifact.sections?.map((section, index) => (
              <article className="editable-section" key={`${section.title}-${index}`}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <input value={section.title} onChange={(event) => updateSection(index, 'title', event.target.value)} />
                  <textarea rows="5" value={section.body} onChange={(event) => updateSection(index, 'body', event.target.value)} />
                </div>
              </article>
            ))}
          </main>
          <aside className="submit-aside">
            <div className="validity-check"><span><Check size={15} />基本有效性检查通过</span><p>内容包含实践场景、执行方法与适用边界。发布后仍可以通过新版本持续补充。</p></div>
            <div className="submission-rules">
              <h3>发布后</h3>
              <ul>
                <li><Check size={15} />形成独立 Know-how v1.0</li>
                <li><Sparkles size={15} />进入市场供搜索与调用</li>
                <li><GitBranch size={15} />后续补充生成新版本</li>
              </ul>
            </div>
            <button className="primary-button large" onClick={publishKnowHow}>确认并发布 Know-how<ArrowRight size={18} /></button>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="agent-builder">
      <header className="builder-header">
        <button className="back-button" onClick={() => navigate(-1)}><ArrowLeft size={17} />返回</button>
        <div><span>{mode === 'iteration' ? '版本迭代 Agent' : '自由创作 Agent'}</span><i />正在与你共同梳理</div>
        <span>对话仅用于生成当前草稿</span>
      </header>
      <div className="chat-stage agent-flow-stage">
        <div className="agent-identity">
          <span className="agent-glyph">{mode === 'iteration' ? <GitBranch size={20} /> : <Sparkles size={20} />}</span>
          <div>
            <h1>{mode === 'iteration' ? '让每一次真实使用，推动下一个版本。' : '把你做成过的事，沉淀成可复用的方法。'}</h1>
            <p>{mode === 'iteration' ? '我会保留当前版本的上下文，只追问真正影响新版本的变化。' : '我会从真实案例开始，帮助你补齐判断、步骤、边界和验证标准。'}</p>
          </div>
        </div>
        {source && (
          <div className="agent-context-card">
            <span>正在迭代</span>
            <div><strong>{source.title}</strong><small>{source.version} · {source.status} · {source.confidence}</small></div>
            <div className="tag-row">{source.tags.slice(0, 3).map((tag) => <Tag key={tag}>{tag}</Tag>)}</div>
          </div>
        )}
        <div className="chat-list" aria-live="polite">
          {messages.map((message, index) => (
            <div className={`chat-bubble ${message.role === 'assistant' ? 'agent' : 'user'}`} key={`${message.role}-${index}`}>
              <span>{message.role === 'assistant' ? <Sparkles size={16} /> : '钟'}</span>
              <p>{message.content}</p>
            </div>
          ))}
          {loading && <div className="chat-bubble agent thinking"><span><Sparkles size={16} /></span><p>正在结合上下文判断下一步…</p></div>}
        </div>
        <AgentComposer
          value={chatInput}
          onChange={setChatInput}
          onSubmit={submitChat}
          onSuggest={suggestChatAnswer}
          loading={loading}
          suggesting={suggesting}
          error={error}
          placeholder={mode === 'iteration' ? '描述需要补充、纠正或升级的内容…' : '讲讲你的真实实践、关键做法或失败经验…'}
        />
        <AgentStatusPanel
          status={conversationStatus}
          canGenerate={canGenerate}
          loading={statusLoading}
          error={statusError}
          action={(
            <button
              className="primary-button"
              disabled={!canGenerate || generating || loading}
              onClick={generate}
            >
              {generating ? '正在生成…' : mode === 'iteration' ? '生成迭代任务' : '生成第一个版本'}
            </button>
          )}
        />
      </div>
    </div>
  );
}
