import { ArrowLeft, ArrowRight, Check, ChevronRight, FilePenLine, MessageSquareMore, PencilLine, Sparkles, WandSparkles } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

export default function CreateTaskPage() {
  const navigate = useNavigate();
  const { points, setPoints, createdTasks, setCreatedTasks, notify } = useDemo();
  const [path, setPath] = useState(null);
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState(defaultDraft);
  const [chatIndex, setChatIndex] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);

  const update = (field, value) => setDraft((item) => ({ ...item, [field]: value }));
  const insufficient = Number(draft.reward) > points;

  const generate = () => {
    setPublishing(true);
    window.setTimeout(() => {
      setPublishing(false);
      setStep(2);
    }, 1000);
  };

  const publish = () => {
    if (insufficient) return;
    setPublishing(true);
    window.setTimeout(() => {
      setPoints(points - Number(draft.reward));
      setCreatedTasks([...createdTasks, { ...draft, id: `local-${Date.now()}`, status: '征集中' }]);
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
          <button className="outline-button" onClick={() => navigate('/')}>返回任务市场</button>
        </div>
      </div>
    );
  }

  if (path === 'agent' && step === 1) {
    const chat = [
      { who: 'agent', text: '先用一句话告诉我：你现在最想解决的具体问题是什么？' },
      { who: 'user', text: '我们正在做企业 AI 产品的 GEO，但不同同学测出来的品牌可见度完全不能比较，我想先统一诊断方法。' },
      { who: 'agent', text: '明白。当前差异主要来自测试平台、用户问题、时间窗口，还是评分标准？' },
      { who: 'user', text: '都有。有人只看品牌有没有被提到，有人看推荐排名，还有人只测一个模型，也没有保存引用来源和测试版本。' },
      { who: 'agent', text: '我找到一份相关的「B2B 品牌 GEO 可见度诊断与评分手册 v1.0」，匹配度 82%。它覆盖基础评分，但缺少跨平台抽样、波动排查和业务转化关联。我建议基于这些缺口发布迭代悬赏。' },
    ];
    const visible = chat.slice(0, Math.min(chatIndex + 2, chat.length));
    return (
      <div className="agent-builder">
        <header className="builder-header">
          <button className="back-button" onClick={() => setPath(null)}><ArrowLeft size={17} />选择其他方式</button>
          <div><span>任务 Agent</span><i />正在帮你澄清问题</div>
          <span>草稿自动保存</span>
        </header>
        <div className="chat-stage">
          <div className="agent-identity"><span className="agent-glyph"><Sparkles size={20} /></span><div><h1>把真实问题说清楚，<br />是得到好答案的一半。</h1><p>我会先理解你的目标，再检查市场里是否已有答案。</p></div></div>
          <div className="chat-list">{visible.map((item, index) => (
            <div className={`chat-bubble ${item.who}`} key={`${item.who}-${index}`}>
              <span>{item.who === 'agent' ? <Sparkles size={16} /> : '钟'}</span><p>{item.text}</p>
            </div>
          ))}</div>
          {chatIndex < 3 ? (
            <button className="chat-continue" onClick={() => setChatIndex((value) => Math.min(value + 2, 3))}>使用预设回答继续<ArrowRight size={17} /></button>
          ) : (
            <div className="match-panel">
              <div><span>82%</span><p><strong>找到相关 Know-how</strong>B2B 品牌 GEO 可见度诊断与评分手册 v1.0</p></div>
              <ul><li><Check size={14} />已覆盖：基础问题集与四维评分</li><li><i>!</i>待补充：跨平台抽样、波动排查、转化关联</li></ul>
              <button className="primary-button" onClick={generate}>{publishing ? '正在生成任务草稿…' : '基于缺口生成迭代任务'}<ArrowRight size={17} /></button>
            </div>
          )}
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
