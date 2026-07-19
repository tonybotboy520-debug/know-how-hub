import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  FileText,
  LockKeyhole,
  MessageSquareMore,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { generateAgentArtifact } from '../api/agents';
import { AgentComposer, AgentStatusPanel } from '../components/Ui';
import { tasks } from '../data';
import { useAgentChat } from '../hooks/useAgentChat';
import { useDemo } from '../state/DemoContext';

const generatedContent = [
  {
    title: '先固定目标、测试范围和初始基线',
    body: '开始执行前，先明确这项方法要改善的业务结果、适用对象、数据范围和当前基线。所有后续调整都写入变更记录，避免因为测试口径改变而误判效果。',
  },
  {
    title: '把经验拆成角色清楚的执行步骤',
    body: '将实践过程拆成准备、执行、检查和复盘四个阶段，每一步都写清输入材料、负责人、完成标准和最长等待时间。只有规则稳定的高频动作才交给自动化处理。',
  },
  {
    title: '把失败条件、人工介入和复盘写进流程',
    body: '提前定义结果异常、信息不足和高风险情况的判断条件。触发后暂停自动流程，转给指定角色确认；每周汇总失败样本，判断应修改规则、补充知识还是调整产品。',
  },
];

export default function ContributePage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { submittedTasks, createdTasks, notify, recordTaskContribution } = useDemo();
  const task = tasks.find((item) => item.id === taskId)
    || createdTasks.find((item) => item.id === taskId)
    || tasks[0];
  const openContributionPreview = Boolean(location.state?.viewContribution);
  const contributionGreeting = '请先讲一个与你看到的任务最接近的真实项目：当时的目标、你承担的角色和最终结果分别是什么？';
  const [mode, setMode] = useState(openContributionPreview ? 'chat' : null);
  const [step, setStep] = useState(openContributionPreview ? 2 : 0);
  const [chatInput, setChatInput] = useState('');
  const [directContent, setDirectContent] = useState(`我们曾经处理过“${task.title}”的相似场景。项目开始时先固定了目标、样本范围和判断基线，再按周记录执行变化与失败案例……`);
  const [uploadState, setUploadState] = useState('idle');
  const [content, setContent] = useState(generatedContent);
  const [manualPoints, setManualPoints] = useState([]);
  const [contributionTitle, setContributionTitle] = useState('先建立可验证基线，再把执行与复盘连成闭环');
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(openContributionPreview ? false : submittedTasks.includes(task.id));
  const [returnToPreview, setReturnToPreview] = useState(false);
  const [returnToSealed, setReturnToSealed] = useState(false);
  const agentContext = useMemo(() => ({
    task: {
      id: task.id,
      title: task.title,
      brief: task.brief,
      outline: task.outline,
    },
  }), [task]);
  const savedContributionHistory = useMemo(() => (
    submittedTasks.includes(task.id)
      ? [
          { role: 'assistant', content: contributionGreeting },
          { role: 'user', content: `我参与过“${task.title}”的相似项目，主要负责把零散经验整理成团队可以执行和验证的流程。` },
          { role: 'assistant', content: '在这次项目里，你们最先固定了什么判断基线？又是如何发现原有做法存在偏差的？' },
          { role: 'user', content: '我们先统一目标、样本范围和成功标准，再按周记录执行结果与失败案例。出现偏差时不直接改结论，而是先核对数据来源、执行角色和版本变化。' },
          { role: 'assistant', content: '已经记录了基线、证据与复盘机制。你还可以继续补充异常情况、人工介入条件或最终的验收标准。' },
        ]
      : null
  ), [contributionGreeting, submittedTasks, task.id, task.title]);
  const {
    messages,
    loading: agentLoading,
    suggesting,
    error: agentError,
    setError: setAgentError,
    conversationStatus,
    canGenerate,
    statusLoading,
    statusError,
    sendMessage,
    suggestAnswer,
  } = useAgentChat({
    agentId: 'contribution',
    context: agentContext,
    greeting: contributionGreeting,
    initialMessages: savedContributionHistory,
    storageKey: `kh-agent-contribution-${task.id}`,
  });
  const userAnswerCount = messages.filter((message) => message.role === 'user').length;
  const completedManualPoints = manualPoints.filter((item) => item.question.trim() || item.answer.trim());
  const submittedPointCount = content.length + completedManualPoints.length;
  const submittedCharacterCount = [
    contributionTitle,
    ...content.flatMap((item) => [item.title, item.body]),
    ...completedManualPoints.flatMap((item) => [item.question, item.answer]),
  ].join('').length;

  const addManualPoint = () => {
    setManualPoints((items) => [
      ...items,
      { id: `manual-point-${Date.now()}-${items.length}`, question: '', answer: '' },
    ]);
  };

  const updateManualPoint = (id, field, value) => {
    setManualPoints((items) => items.map((item) => (
      item.id === id ? { ...item, [field]: value } : item
    )));
  };

  const removeManualPoint = (id) => {
    setManualPoints((items) => items.filter((item) => item.id !== id));
  };

  const submitChat = async (value) => {
    const sent = await sendMessage(value);
    if (sent) setChatInput('');
  };

  const suggestChatAnswer = async () => {
    const suggestion = await suggestAnswer(chatInput);
    if (suggestion) setChatInput(suggestion);
  };

  const startGapInterview = async () => {
    if (!directContent.trim()) return;
    setReturnToPreview(false);
    setMode('chat');
    setStep(1);
    await sendMessage(`以下是我已经整理的内容。请先识别其中最关键的信息缺口，并从一个问题开始追问：\n\n${directContent}`);
  };

  const generateContribution = async () => {
    setGenerating(true);
    setAgentError('');
    try {
      const artifact = await generateAgentArtifact('contribution', messages, {
        ...agentContext,
        sourceContent: mode === 'direct' ? directContent : undefined,
      });
      setContributionTitle(artifact.title || contributionTitle);
      if (Array.isArray(artifact.sections) && artifact.sections.length) setContent(artifact.sections);
      setReturnToPreview(false);
      setStep(2);
    } catch (error) {
      setAgentError(error.message);
    } finally {
      setGenerating(false);
    }
  };

  const submit = () => {
    setSubmitting(true);
    window.setTimeout(() => {
      recordTaskContribution(task.id);
      setSubmitting(false);
      setSubmitted(true);
      notify('贡献已密封提交，截止前可继续修改');
    }, 900);
  };

  const showContributionPreview = () => {
    setSubmitted(false);
    setMode('chat');
    setStep(2);
    setReturnToPreview(false);
    setReturnToSealed(true);
  };

  const resumeAgentConversation = () => {
    setMode('chat');
    setStep(1);
    setReturnToPreview(true);
  };

  const leaveAgentConversation = () => {
    if (returnToPreview) {
      setReturnToPreview(false);
      setStep(2);
      return;
    }
    setMode(null);
  };

  const leaveContributionPreview = () => {
    if (returnToSealed) {
      setReturnToSealed(false);
      setSubmitted(true);
      return;
    }
    setStep(1);
  };

  if (submitted) {
    return (
      <div className="page success-page contribution-success">
        <div className="success-orbit"><Check size={34} /></div>
        <span className="page-kicker">CONTRIBUTION SEALED</span>
        <h1>你的经验已经密封提交。</h1>
        <p>任务截止前，只有你能看到和修改这份内容。截止后它将公开，并由萃取 Agent 评估采纳情况。</p>
        <div className="sealed-summary">
          <LockKeyhole size={20} />
          <div><strong>{submittedPointCount} 个实践要点 · {submittedCharacterCount} 字</strong><span>提交于刚刚 · 有效性检查已通过</span></div>
        </div>
        <div className="success-actions">
          <button className="primary-button" onClick={showContributionPreview}>查看我的贡献<ArrowRight size={17} /></button>
          <button className="back-button" onClick={() => navigate(`/task/${task.id}`)}><ArrowLeft size={17} />返回任务详情</button>
        </div>
      </div>
    );
  }

  if (!mode) {
    return (
      <div className="page contribute-start">
        <button className="back-button" onClick={() => navigate(-1)}><ArrowLeft size={17} />返回任务</button>
        <div className="contribute-heading">
          <span className="page-kicker">CONTRIBUTE / 分享实践</span>
          <h1>你不需要写一篇完美文章。<br />先把真实经历带进来。</h1>
          <p>{task.title}</p>
        </div>
        <div className="contribute-mode-grid">
          <button className="contribute-mode primary-mode" onClick={() => { setReturnToPreview(false); setMode('chat'); setStep(1); }}>
            <span><MessageSquareMore size={25} /></span>
            <small>推荐方式</small>
            <h2>让对话 Agent 访谈我</h2>
            <p>从真实案例开始，Agent 会沿着任务提纲追问判断、步骤和容易被忽略的细节。</p>
            <strong>开始访谈<ArrowRight size={17} /></strong>
          </button>
          <button className="contribute-mode" onClick={() => { setReturnToPreview(false); setMode('direct'); setStep(1); }}>
            <span><FileText size={25} /></span>
            <small>已有内容</small>
            <h2>直接撰写或上传</h2>
            <p>粘贴现有方法、上传文档，也可以先交给 Agent 检查缺口，再继续补充。</p>
            <strong>添加内容<ArrowRight size={17} /></strong>
          </button>
        </div>
        <div className="privacy-ribbon"><LockKeyhole size={17} /><div><strong>密封提交</strong><span>征集期间其他贡献者看不到你的内容；原始访谈记录始终只对你可见。</span></div></div>
      </div>
    );
  }

  if (mode === 'direct' && step === 1) {
    const doUpload = () => {
      setUploadState('uploading');
      window.setTimeout(() => setUploadState('failed'), 800);
    };
    return (
      <div className="contribution-workspace">
        <header className="builder-header">
          <button className="back-button" onClick={() => setMode(null)}><ArrowLeft size={17} />更换方式</button>
          <div><span>直接添加内容</span><i />仅你可见</div>
          <span>草稿自动保存</span>
        </header>
        <div className="direct-editor">
          <div className="direct-title">
            <span className="page-kicker">YOUR PRACTICE / 你的实践</span>
            <h1>把已有内容带进来</h1>
            <p>可以先不整理格式。Agent 会在下一步帮你识别结构和信息缺口。</p>
          </div>
          <label className="large-editor"><textarea value={directContent} onChange={(event) => setDirectContent(event.target.value)} /></label>
          <div className={`upload-zone ${uploadState}`}>
            {uploadState === 'failed' ? (
              <><span className="upload-error">!</span><div><strong>上传失败</strong><p>enterprise-ai-practice-notes.pdf · 网络连接中断</p></div><button onClick={() => setUploadState('idle')}><RotateCcw size={15} />重试</button></>
            ) : (
              <><Upload size={22} /><div><strong>{uploadState === 'uploading' ? '正在上传…' : '拖放文档到这里，或点击上传'}</strong><p>支持 PDF、DOCX、TXT，单个文件不超过 20MB</p></div><button onClick={doUpload} disabled={uploadState === 'uploading'}>选择文件</button></>
            )}
          </div>
          <button className="primary-button large" onClick={startGapInterview} disabled={!directContent.trim() || agentLoading}>让 Agent 整理并检查缺口<Sparkles size={17} /></button>
        </div>
      </div>
    );
  }

  if (mode === 'chat' && step === 1) {
    return (
      <div className="contribution-workspace">
        <header className="builder-header">
          <button className="back-button" onClick={leaveAgentConversation}>
            <ArrowLeft size={17} />{returnToPreview ? '返回贡献预览' : '保存并退出'}
          </button>
          <div><span>对话 Agent</span><i />访谈进行中 · 约 8 分钟</div>
          <span>进度 {conversationStatus.progress}%</span>
        </header>
        <div className="interview-layout">
          <aside className="interview-outline">
            <span className="page-kicker">INTERVIEW GUIDE</span>
            <h3>本次访谈提纲</h3>
            {task.outline.map((item, index) => <div key={item} className={index < Math.min(userAnswerCount, 3) ? 'done' : index === Math.min(userAnswerCount, 3) ? 'current' : ''}><i>{index < Math.min(userAnswerCount, 3) ? <Check size={11} /> : index + 1}</i><span>{item}</span></div>)}
            <p><Sparkles size={14} />Agent 会根据你的回答动态追问，不会机械逐题执行。</p>
          </aside>
          <div className="interview-chat">
            <div className="chat-list" aria-live="polite">{messages.map((message, index) => (
              <div className={`chat-bubble ${message.role === 'assistant' ? 'agent' : 'user'}`} key={`${index}-${message.role}`}><span>{message.role === 'assistant' ? <Sparkles size={16} /> : '钟'}</span><p>{message.content}</p></div>
            ))}
              {agentLoading && <div className="chat-bubble agent thinking"><span><Sparkles size={16} /></span><p>正在根据你的经历判断下一步该追问什么…</p></div>}
            </div>
            <AgentComposer
              value={chatInput}
              onChange={setChatInput}
              onSubmit={submitChat}
              onSuggest={suggestChatAnswer}
              loading={agentLoading}
              suggesting={suggesting}
              error={agentError}
              placeholder="补充真实经历、做法、异常或判断依据…"
            />
            <AgentStatusPanel
              status={conversationStatus}
              canGenerate={canGenerate}
              loading={statusLoading}
              error={statusError}
              action={(
                <button
                  className="primary-button"
                  disabled={!canGenerate || generating || agentLoading}
                  onClick={generateContribution}
                >
                  {generating ? '正在整理…' : '生成贡献内容'}
                </button>
              )}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="contribution-workspace preview-workspace">
      <header className="builder-header">
        <button className="back-button" onClick={leaveContributionPreview}>
          <ArrowLeft size={17} />{returnToSealed ? '返回提交结果' : '返回补充'}
        </button>
        <div><span>贡献预览</span><i />提交前最后确认</div>
        <span>草稿自动保存</span>
      </header>
      <div className="preview-layout">
        <main className="contribution-preview">
          <div className="preview-title">
            <span className="page-kicker">STRUCTURED CONTRIBUTION</span>
            <h1>{contributionTitle}</h1>
            <p>Agent 根据你的{mode === 'chat' ? '访谈记录' : '原始内容'}整理 · 你可以直接编辑</p>
          </div>
          {content.map((item, index) => (
            <article className="editable-section" key={index}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div>
                <input value={item.title} onChange={(event) => setContent(content.map((entry, i) => i === index ? { ...entry, title: event.target.value } : entry))} />
                <textarea rows="5" value={item.body} onChange={(event) => setContent(content.map((entry, i) => i === index ? { ...entry, body: event.target.value } : entry))} />
              </div>
            </article>
          ))}
          {manualPoints.map((item, index) => (
            <article className="manual-point" key={item.id}>
              <header>
                <div><span>补充要点</span><strong>{String(index + 1).padStart(2, '0')}</strong></div>
                <button type="button" onClick={() => removeManualPoint(item.id)}><Trash2 size={14} />删除</button>
              </header>
              <label>
                <span>关注的问题</span>
                <input
                  value={item.question}
                  onChange={(event) => updateManualPoint(item.id, 'question', event.target.value)}
                  placeholder="例如：这个方法在预算有限时，最应该优先验证什么？"
                />
              </label>
              <label>
                <span>回答</span>
                <textarea
                  rows="5"
                  value={item.answer}
                  onChange={(event) => updateManualPoint(item.id, 'answer', event.target.value)}
                  placeholder="请结合真实经验，补充你的判断、具体做法、例外情况或验证结果…"
                />
              </label>
            </article>
          ))}
          <button type="button" className="add-section" onClick={addManualPoint}><Plus size={15} />补充一个要点</button>
        </main>
        <aside className="submit-aside">
          <div className="validity-check"><span><Check size={15} />有效性检查通过</span><p>内容回应了任务，包含可执行细节与真实案例。最终是否采纳将在截止后评估。</p></div>
          <div className="submission-rules">
            <h3>提交后</h3>
            <ul>
              <li><LockKeyhole size={15} />截止前仍可修改或撤回</li>
              <li><Check size={15} />截止后内容锁定并公开</li>
              <li><Sparkles size={15} />被采纳后参与积分分配</li>
            </ul>
          </div>
          <button type="button" className="resume-agent-button" onClick={resumeAgentConversation}>
            <MessageSquareMore size={18} />
            <span><strong>继续跟 Agent 对话</strong><small>保留上次聊天记录，继续补充细节</small></span>
            <ArrowRight size={16} />
          </button>
          <button className="primary-button large" onClick={submit} disabled={submitting}>{submitting ? '正在密封提交…' : '确认并密封提交'}<ChevronRight size={18} /></button>
        </aside>
      </div>
    </div>
  );
}
