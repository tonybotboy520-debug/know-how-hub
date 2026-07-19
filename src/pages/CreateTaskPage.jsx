import { ArrowLeft, ArrowRight, Check, ChevronRight, FilePenLine, MessageSquareMore, Sparkles, WandSparkles } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { generateAgentArtifact } from '../api/agents';
import { AgentComposer, AgentStatusPanel } from '../components/Ui';
import { useAgentChat } from '../hooks/useAgentChat';
import { useDemo } from '../state/DemoContext';

const defaultDraft = {
  title: '如何建立一套可复测的企业 AI 产品 GEO 可见度诊断方法？',
  description: '我们正在为多款企业 AI 产品做 GEO 诊断，但不同同学选择的平台、问题和测试时间都不一样，结果无法横向比较，也很难判断优化是否真实有效。',
  outcome: '形成一套可以按月复测的诊断方法，覆盖问题集、平台抽样、引用来源、推荐位置、情感倾向和异常波动。',
  audience: '负责企业 AI 产品的品牌、市场、GEO 运营与数据分析团队',
  constraints: '必须基于真实品牌事实；不使用虚假内容和 AI 投毒；需要保留完整测试证据与版本记录。',
  deadline: '2026-07-25',
  reward: 680,
};

const taskAgentContext = {
  existingKnowHows: [
    {
      title: 'B2B 品牌 GEO 可见度诊断与评分手册 v1.0',
      match: 82,
      covered: ['基础问题集', '品牌提及、推荐位置、引用与情感四维评分'],
      gaps: ['跨平台抽样', '波动排查', '业务转化关联'],
    },
  ],
  defaultDeadline: '2026-07-25',
  defaultReward: 680,
};

export default function CreateTaskPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { points, setPoints, setCreatedTasks, notify } = useDemo();
  const seededDraft = location.state?.agentDraft;
  const [path, setPath] = useState(seededDraft ? 'agent' : null);
  const [step, setStep] = useState(seededDraft ? 2 : 1);
  const [draft, setDraft] = useState(seededDraft ? { ...defaultDraft, ...seededDraft } : defaultDraft);
  const [chatInput, setChatInput] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [draftError, setDraftError] = useState('');
  const {
    messages,
    loading: agentLoading,
    suggesting,
    error: agentError,
    setError: setAgentError,
    conversationStatus,
    statusLoading,
    statusError,
    sendMessage,
    suggestAnswer,
  } = useAgentChat({
    agentId: 'task',
    context: taskAgentContext,
    greeting: '先用一句话告诉我：你现在最想解决的具体问题是什么？',
    storageKey: 'kh-agent-task',
  });

  const update = (field, value) => setDraft((item) => ({ ...item, [field]: value }));
  const insufficient = Number(draft.reward) > points;

  const submitChat = async (value) => {
    const sent = await sendMessage(value);
    if (sent) setChatInput('');
  };

  const suggestChatAnswer = async () => {
    const suggestion = await suggestAnswer(chatInput);
    if (suggestion) setChatInput(suggestion);
  };

  const generate = async () => {
    setPublishing(true);
    setDraftError('');
    try {
      const artifact = await generateAgentArtifact('task', messages, taskAgentContext);
      setDraft((current) => ({ ...current, ...artifact }));
      setStep(2);
    } catch (error) {
      setDraftError(error.message);
      setAgentError(error.message);
    } finally {
      setPublishing(false);
    }
  };

  const publish = () => {
    if (insufficient) return;
    setPublishing(true);
    window.setTimeout(() => {
      const localTask = {
        ...draft,
        id: `local-${Date.now()}`,
        brief: draft.description,
        tags: ['用户发布', '待匹配'],
        deadlineShort: '新发布',
        participants: 0,
        updated: '刚刚',
        status: '征集中',
        owner: '钟源',
        avatar: '钟',
        outline: ['你在什么场景中遇到过类似问题？', '当时最关键的判断依据是什么？', '具体按什么步骤执行？', '哪些错误最容易让结果失效？'],
        isLocal: true,
        createdAt: new Date().toISOString(),
      };
      setPoints((current) => current - Number(draft.reward));
      setCreatedTasks((current) => [localTask, ...current]);
      setPublishing(false);
      setPublished(true);
      notify(`${draft.reward} 积分已冻结，任务发布成功`);
    }, 1100);
  };

  if (!path) {
    return (
      <div className="page create-page">
        <button className="back-button" onClick={() => navigate(-1)}><ArrowLeft size={17} />返回</button>
        <div className="create-intro">
          <span className="page-kicker">CREATE A CALL / 发起征集</span>
          <h1>你想怎样描述<br />这个待解决的问题？</h1>
          <p>两种方式最终都会生成同一份任务草稿，并由你确认后发布。</p>
        </div>
        <div className="path-grid">
          <button className="path-card recommended" onClick={() => setPath('agent')}>
            <span className="recommended-label">推荐</span>
            <i className="path-icon"><MessageSquareMore size={26} /></i>
            <span className="path-number">01</span>
            <h2>和任务 Agent 聊聊</h2>
            <p>适合问题还比较模糊。Agent 会追问目标、背景与限制，并先检索已有 Know-how。</p>
            <strong>开始对话<ArrowRight size={18} /></strong>
          </button>
          <button className="path-card" onClick={() => { setPath('form'); setStep(2); }}>
            <i className="path-icon"><FilePenLine size={26} /></i>
            <span className="path-number">02</span>
            <h2>直接填写任务</h2>
            <p>适合目标已经清楚。你可以直接填写任务信息，Agent 会帮你检查缺口与完善表达。</p>
            <strong>填写任务<ArrowRight size={18} /></strong>
          </button>
        </div>
        <p className="create-footnote">发布前你始终拥有最后确认权 · 任务发布后将立即冻结悬赏积分</p>
      </div>
    );
  }

  if (published) {
    return (
      <div className="page success-page">
        <div className="success-orbit"><Check size={34} /></div>
        <span className="page-kicker">TASK PUBLISHED</span>
        <h1>问题已经发出，<br />等待实践者带回答案。</h1>
        <p>{draft.reward} 积分已冻结。任务截止后，萃取 Agent 将自动整合有效贡献并完成分配。</p>
        <div className="success-actions">
          <button className="primary-button" onClick={() => navigate('/workspace/tasks')}>查看我的任务<ArrowRight size={17} /></button>
          <button className="back-button" onClick={() => navigate('/')}><ArrowLeft size={17} />返回任务市场</button>
        </div>
      </div>
    );
  }

  if (path === 'agent' && step === 1) {
    return (
      <div className="agent-builder">
        <header className="builder-header">
          <button className="back-button" onClick={() => setPath(null)}><ArrowLeft size={17} />选择其他方式</button>
          <div><span>任务 Agent</span><i />正在帮你澄清问题</div>
          <span>草稿自动保存</span>
        </header>
        <div className="chat-stage">
          <div className="agent-identity"><span className="agent-glyph"><Sparkles size={20} /></span><div><h1>把真实问题说清楚，<br />是得到好答案的一半。</h1><p>我会先理解你的目标，再检查市场里是否已有答案。</p></div></div>
          <div className="chat-list" aria-live="polite">{messages.map((message, index) => (
            <div className={`chat-bubble ${message.role === 'assistant' ? 'agent' : 'user'}`} key={`${message.role}-${index}`}>
              <span>{message.role === 'assistant' ? <Sparkles size={16} /> : '钟'}</span><p>{message.content}</p>
            </div>
          ))}
            {agentLoading && <div className="chat-bubble agent thinking"><span><Sparkles size={16} /></span><p>正在理解并整理你的问题…</p></div>}
          </div>
          <AgentComposer
            value={chatInput}
            onChange={setChatInput}
            onSubmit={submitChat}
            onSuggest={suggestChatAnswer}
            loading={agentLoading}
            suggesting={suggesting}
            error={agentError || draftError}
            placeholder="描述你的真实问题、背景或限制…"
          />
          <AgentStatusPanel
            status={conversationStatus}
            loading={statusLoading}
            error={statusError}
            action={(
              <button
                className="primary-button"
                disabled={!conversationStatus.submitReady || publishing || agentLoading}
                onClick={generate}
              >
                {publishing ? '正在生成任务草稿…' : '基于对话生成任务草稿'}<ArrowRight size={17} />
              </button>
            )}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page task-form-page">
      <header className="form-header">
        <div><button className="back-button" onClick={() => setPath(null)}><ArrowLeft size={17} />退出编辑</button><span>新建 Know-how 任务</span></div>
        <span className="save-state"><Check size={14} />已保存</span>
      </header>
      <div className="form-layout">
        <div className="form-main">
          <div className="form-title">
            <span className="page-kicker">{path === 'agent' ? 'AGENT DRAFT / AI 生成草稿' : 'DIRECT CREATE / 直接创建'}</span>
            <h1>确认任务信息</h1>
            <p>以下内容将公开展示。发布前可以自由修改。</p>
          </div>
          {path === 'agent' && <div className="agent-suggestion"><WandSparkles size={18} /><div><strong>已根据对话补全 5 项信息</strong><p>同时关联了相关 Know-how，并把尚未覆盖的内容写入访谈提纲。</p></div><button>查看依据</button></div>}
          <div className="form-section">
            <h2><span>01</span>任务内容</h2>
            <label className="field"><span>任务标题</span><input value={draft.title} onChange={(e) => update('title', e.target.value)} /><small>{draft.title.length}/60</small></label>
            <label className="field"><span>问题与背景 <b>必填</b></span><textarea rows="6" value={draft.description} onChange={(e) => update('description', e.target.value)} /></label>
            <div className="field-grid">
              <label className="field"><span>期望结果</span><textarea rows="4" value={draft.outcome} onChange={(e) => update('outcome', e.target.value)} /></label>
              <label className="field"><span>已知限制</span><textarea rows="4" value={draft.constraints} onChange={(e) => update('constraints', e.target.value)} /></label>
            </div>
            <label className="field"><span>适用对象</span><input value={draft.audience} onChange={(e) => update('audience', e.target.value)} /></label>
          </div>
          <div className="form-section">
            <h2><span>02</span>悬赏与截止</h2>
            <div className="field-grid">
              <label className="field"><span>截止时间 <b>必填</b></span><input type="date" value={draft.deadline} onChange={(e) => update('deadline', e.target.value)} /></label>
              <label className={`field reward-field ${insufficient ? 'has-error' : ''}`}><span>悬赏积分 <b>必填</b></span><input type="number" value={draft.reward} onChange={(e) => update('reward', e.target.value)} /><small>当前可用 {points.toLocaleString()} 积分</small></label>
            </div>
            {insufficient && <div className="inline-error">可用积分不足，无法发布。请降低悬赏积分。</div>}
          </div>
        </div>
        <aside className="publish-aside">
          <div className="publish-summary">
            <h3>发布前确认</h3>
            <ul>
              <li><Check size={15} />任务与最终成果默认公开</li>
              <li><Check size={15} />截止前贡献内容密封</li>
              <li><Check size={15} />截止后自动萃取与交付</li>
              <li><Check size={15} />积分由 Agent 按采纳比例分配</li>
            </ul>
            <div className="points-lock"><span>发布后将冻结</span><strong>{Number(draft.reward || 0).toLocaleString()} <small>积分</small></strong><p>当前余额 {points.toLocaleString()}</p></div>
            <button className="primary-button large" disabled={insufficient || publishing} onClick={publish}>{publishing ? '正在发布…' : '确认并发布任务'}<ChevronRight size={18} /></button>
            <p>发布即表示你确认任务内容准确，并理解公开与积分规则。</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
