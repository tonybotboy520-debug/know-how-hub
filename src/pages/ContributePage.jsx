import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  FileText,
  LockKeyhole,
  MessageSquareMore,
  Paperclip,
  PencilLine,
  RotateCcw,
  Sparkles,
  Upload,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { tasks } from '../data';
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
  const { submittedTasks, setSubmittedTasks, notify } = useDemo();
  const task = tasks.find((item) => item.id === taskId) || tasks[0];
  const [mode, setMode] = useState(null);
  const [step, setStep] = useState(0);
  const [chatIndex, setChatIndex] = useState(0);
  const [uploadState, setUploadState] = useState('idle');
  const [content, setContent] = useState(generatedContent);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(submittedTasks.includes(task.id));

  const chat = [
    { who: 'agent', text: '你亲自经历过与这个问题相似的项目吗？先说一个最接近的场景，当时的目标和结果分别是什么？' },
    { who: 'user', text: '有。我们先选了一个范围可控的业务场景，用四周完成首轮验证。真正起作用的是先固定基线，再记录每次调整带来的变化。' },
    { who: 'agent', text: '“先固定基线”很关键。你们具体记录了哪些信息？由谁确认测试口径没有变化？' },
    { who: 'user', text: '业务负责人确认目标和样本范围，执行人员记录每次变更，数据同学按固定周期复测。口径变化时不会直接和历史结果比较。' },
    { who: 'agent', text: '执行过程中出现过哪些失败或异常？团队如何判断应该改规则、补知识，还是转人工处理？' },
    { who: 'user', text: '我们按原因分类失败样本。事实缺失就补知识，流程不清就改规则，高风险或无法判断的情况直接转给业务负责人确认。' },
  ];

  const submit = () => {
    setSubmitting(true);
    window.setTimeout(() => {
      if (!submittedTasks.includes(task.id)) setSubmittedTasks([...submittedTasks, task.id]);
      setSubmitting(false);
      setSubmitted(true);
      notify('贡献已密封提交，截止前可继续修改');
    }, 900);
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
          <div><strong>3 个实践要点 · 862 字</strong><span>提交于刚刚 · 有效性检查已通过</span></div>
          <button onClick={() => { setSubmitted(false); setStep(2); }}><PencilLine size={16} />继续编辑</button>
        </div>
        <div className="success-actions">
          <button className="primary-button" onClick={() => navigate('/workspace/tasks')}>查看我的参与<ArrowRight size={17} /></button>
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
          <button className="contribute-mode primary-mode" onClick={() => { setMode('chat'); setStep(1); }}>
            <span><MessageSquareMore size={25} /></span>
            <small>推荐方式</small>
            <h2>让对话 Agent 访谈我</h2>
            <p>从真实案例开始，Agent 会沿着任务提纲追问判断、步骤和容易被忽略的细节。</p>
            <strong>开始访谈<ArrowRight size={17} /></strong>
          </button>
          <button className="contribute-mode" onClick={() => { setMode('direct'); setStep(1); }}>
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
          <label className="large-editor"><textarea defaultValue={`我们曾经处理过“${task.title}”的相似场景。项目开始时先固定了目标、样本范围和判断基线，再按周记录执行变化与失败案例……`} /></label>
          <div className={`upload-zone ${uploadState}`}>
            {uploadState === 'failed' ? (
              <><span className="upload-error">!</span><div><strong>上传失败</strong><p>enterprise-ai-practice-notes.pdf · 网络连接中断</p></div><button onClick={() => setUploadState('idle')}><RotateCcw size={15} />重试</button></>
            ) : (
              <><Upload size={22} /><div><strong>{uploadState === 'uploading' ? '正在上传…' : '拖放文档到这里，或点击上传'}</strong><p>支持 PDF、DOCX、TXT，单个文件不超过 20MB</p></div><button onClick={doUpload} disabled={uploadState === 'uploading'}>选择文件</button></>
            )}
          </div>
          <button className="primary-button large" onClick={() => setStep(2)}>让 Agent 整理并检查缺口<Sparkles size={17} /></button>
        </div>
      </div>
    );
  }

  if (mode === 'chat' && step === 1) {
    const done = chatIndex >= 4;
    return (
      <div className="contribution-workspace">
        <header className="builder-header">
          <button className="back-button" onClick={() => setMode(null)}><ArrowLeft size={17} />保存并退出</button>
          <div><span>对话 Agent</span><i />访谈进行中 · 约 8 分钟</div>
          <span>进度 {done ? '80' : chatIndex > 1 ? '55' : '30'}%</span>
        </header>
        <div className="interview-layout">
          <aside className="interview-outline">
            <span className="page-kicker">INTERVIEW GUIDE</span>
            <h3>本次访谈提纲</h3>
            {task.outline.map((item, index) => <div key={item} className={index < (done ? 3 : 2) ? 'done' : index === (done ? 3 : 2) ? 'current' : ''}><i>{index < (done ? 3 : 2) ? <Check size={11} /> : index + 1}</i><span>{item}</span></div>)}
            <p><Sparkles size={14} />Agent 会根据你的回答动态追问，不会机械逐题执行。</p>
          </aside>
          <div className="interview-chat">
            <div className="chat-list">{chat.slice(0, chatIndex + 2).map((item, index) => (
              <div className={`chat-bubble ${item.who}`} key={`${index}-${item.who}`}><span>{item.who === 'agent' ? <Sparkles size={16} /> : '钟'}</span><p>{item.text}</p></div>
            ))}</div>
            {!done ? <button className="chat-continue" onClick={() => setChatIndex((value) => value + 2)}>使用预设回答继续<ArrowRight size={17} /></button> :
              <div className="generate-prompt"><CheckCircle2 size={21} /><div><strong>信息已经基本充分</strong><p>我已经识别出 3 个可复用的实践要点。你可以继续补充，或生成结构化贡献。</p></div><button className="primary-button" onClick={() => setStep(2)}>生成贡献内容</button></div>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="contribution-workspace preview-workspace">
      <header className="builder-header">
        <button className="back-button" onClick={() => setStep(1)}><ArrowLeft size={17} />返回补充</button>
        <div><span>贡献预览</span><i />提交前最后确认</div>
        <span>草稿自动保存</span>
      </header>
      <div className="preview-layout">
        <main className="contribution-preview">
          <div className="preview-title">
            <span className="page-kicker">STRUCTURED CONTRIBUTION</span>
            <h1>先建立可验证基线，再把执行与复盘连成闭环</h1>
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
          <button className="add-section"><span>＋</span>补充一个要点</button>
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
          <button className="primary-button large" onClick={submit} disabled={submitting}>{submitting ? '正在密封提交…' : '确认并密封提交'}<ChevronRight size={18} /></button>
        </aside>
      </div>
    </div>
  );
}
