import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BookOpenText,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileCheck2,
  GitMerge,
  LockKeyhole,
  MessageSquareText,
  Share2,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { tasks } from '../data';
import { Avatar, StatusPill, Tag } from '../components/Ui';
import { useDemo } from '../state/DemoContext';

const contributions = [
  { name: '梁知远', initials: '梁', role: 'GEO 策略负责人', adopted: 31, title: '先固定业务目标和测试基线', note: '采纳：目标定义、基线与验证口径' },
  { name: '许望', initials: '许', role: '企业 AI 售前负责人', adopted: 24, title: '把判断规则写成可执行的业务条件', note: '采纳：执行步骤、角色与异常处理' },
  { name: '沈知行', initials: '沈', role: '知识库产品经理', adopted: 19, title: '保留来源证据和版本变更记录', note: '采纳：证据追溯、版本与复盘机制' },
];

export default function TaskPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { user, followedTasks, toggleTaskFollow, notify, createdTasks } = useDemo();
  const savedTask = createdTasks.find((item) => item.id === taskId);
  const task = tasks.find((item) => item.id === taskId) || (savedTask && {
    ...savedTask,
    brief: savedTask.outcome || savedTask.description,
    tags: ['新发布', '待匹配'],
    deadlineShort: '剩 7 天',
    participants: 0,
    updated: '刚刚',
    owner: user?.name || '我',
    avatar: user?.initials || '我',
    outline: ['你在什么场景中遇到过类似问题？', '当时最关键的判断依据是什么？', '具体按什么步骤执行？', '哪些错误最容易让结果失效？'],
  }) || tasks[0];
  const isFollowed = followedTasks.includes(task.id);
  const completed = ['已完成', '部分完成'].includes(task.status);

  const guard = (action) => {
    if (!user) return navigate('/login');
    action();
  };

  return (
    <div className="page detail-page">
      <div className="detail-nav">
        <button className="back-button" onClick={() => navigate(-1)}><ArrowLeft size={17} />返回任务市场</button>
        <div>
          <button className="icon-button" onClick={() => notify('分享链接已复制')}><Share2 size={17} /></button>
          <button className={`outline-button ${isFollowed ? 'selected' : ''}`} onClick={() => guard(() => toggleTaskFollow(task.id))}>
            {isFollowed ? <Check size={16} /> : <BookOpenText size={16} />}{isFollowed ? '已关注' : '关注进展'}
          </button>
        </div>
      </div>

      <section className="task-detail-hero">
        <div className="task-detail-main">
          <div className="eyebrow-row"><StatusPill status={task.status} /><span>任务编号 KH–0716–0{tasks.indexOf(task) + 1}</span></div>
          <h1>{task.title}</h1>
          <p className="detail-lede">{task.brief}</p>
          <div className="tag-row">{task.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}</div>
          {task.baseVersion && <Link className="base-version" to={`/know-how/${task.baseKnowHowId || 'b2b-geo-visibility'}`}><GitMerge size={16} />基于「{task.baseVersion}」发起迭代<ChevronRight size={15} /></Link>}
          <div className="owner-row">
            <Avatar text={task.avatar} />
            <div><strong>{task.owner}</strong><span>发起于 2026 年 7 月 12 日</span></div>
          </div>
        </div>
        <aside className="task-action-card">
          <div className="reward-large"><span>悬赏积分</span><strong>{task.reward}</strong><small>PTS</small></div>
          <div className="deadline"><Clock3 size={18} /><div><span>贡献截止</span><strong>{task.deadline}</strong></div></div>
          <div className="participation"><UsersRound size={18} /><div><span>当前已有</span><strong>{task.participants} 位实践者贡献</strong></div></div>
          {task.status === '征集中' ? (
            <>
              <button className="primary-button large" onClick={() => guard(() => navigate(`/contribute/${task.id}`))}>贡献我的经验<ArrowRight size={18} /></button>
              <p className="sealed-note"><LockKeyhole size={14} />截止前为密封提交，其他人看不到你的内容</p>
            </>
          ) : completed && task.knowHowId ? (
            <Link className="primary-button large" to={`/know-how/${task.knowHowId}`}>查看最终 Know-how<ArrowRight size={18} /></Link>
          ) : (
            <button className="primary-button large muted" disabled>{task.status === '萃取中' ? '萃取 Agent 工作中' : '任务已停止接收贡献'}</button>
          )}
        </aside>
      </section>

      <div className="detail-columns">
        <div className="detail-article">
          <section className="article-section">
            <div className="section-number">01</div>
            <div>
              <h2>问题与背景</h2>
              <p>{task.description}</p>
            </div>
          </section>
          <section className="article-section">
            <div className="section-number">02</div>
            <div>
              <h2>期望得到什么</h2>
              <ul className="check-list">
                <li><Check size={17} />可以直接用于判断与执行的步骤，不只是概念说明</li>
                <li><Check size={17} />说明方法的适用条件、风险和常见误区</li>
                <li><Check size={17} />提供可复用的清单、模板或验收标准</li>
              </ul>
            </div>
          </section>
          <section className="article-section">
            <div className="section-number">03</div>
            <div>
              <h2>访谈提纲</h2>
              <p>任务 Agent 根据问题缺口生成。参与访谈时，对话 Agent 会结合你的回答继续追问。</p>
              <ol className="outline-list">{task.outline.map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, '0')}</span>{item}</li>)}</ol>
            </div>
          </section>

          {completed && (
            <section className="extraction-result">
              <div className="result-heading">
                <span><Sparkles size={18} />萃取结果</span>
                <strong>{task.resultAdopted || 6} / {task.resultTotal || task.participants} 份贡献被采纳</strong>
              </div>
              <h2>不同实践者在关键判断与执行顺序上形成共识</h2>
              <p>{task.result}</p>
              <div className="confidence"><BadgeCheck size={18} /><div><strong>中高可信度</strong><span>{task.confidenceNote}</span></div></div>
            </section>
          )}
        </div>

        <aside className="detail-aside">
          <div className="aside-block">
            <h3>任务进度</h3>
            <div className="progress-track">
              <div className="progress-item done"><i><Check size={12} /></i><div><strong>任务已发布</strong><span>7 月 12 日 09:30</span></div></div>
              <div className={`progress-item ${task.status !== '征集中' ? 'done' : 'current'}`}><i>{task.status === '征集中' ? task.participants : <Check size={12} />}</i><div><strong>{task.participants} 份有效贡献</strong><span>{task.status === '征集中' ? '继续征集中' : '提交已锁定并公开'}</span></div></div>
              <div className={`progress-item ${completed ? 'done' : task.status === '萃取中' ? 'current' : ''}`}><i>{completed ? <Check size={12} /> : <Sparkles size={12} />}</i><div><strong>萃取与评估</strong><span>{completed ? '冲突与来源已标注' : '等待截止后自动启动'}</span></div></div>
              <div className={`progress-item ${completed ? 'done' : ''}`}><i>{completed ? <Check size={12} /> : '4'}</i><div><strong>交付与积分分配</strong><span>{completed ? '已自动完成' : '尚未开始'}</span></div></div>
            </div>
          </div>
          {completed ? (
            <div className="aside-block">
              <h3>采纳与积分</h3>
              <div className="contribution-mini-list">{contributions.map((person) => (
                <div className="contribution-mini" key={person.name}>
                  <Avatar text={person.initials} size="small" />
                  <div><strong>{person.name}<span>{person.adopted}%</span></strong><p>{person.note}</p></div>
                </div>
              ))}</div>
              <button className="text-button" onClick={() => notify('已展开全部贡献记录')}>查看全部 {task.resultTotal || task.participants} 份贡献<ChevronRight size={15} /></button>
            </div>
          ) : (
            <div className="aside-block tip-block">
              <MessageSquareText size={20} />
              <h3>不擅长写，也能贡献</h3>
              <p>对话 Agent 会像一位有准备的采访者，帮你从真实经历中把关键细节说清楚。</p>
            </div>
          )}
          {task.status === '部分完成' && <div className="aside-block warning-block"><CircleAlert size={18} /><div><strong>仍有信息缺口</strong><p>{task.gapNote}</p></div></div>}
        </aside>
      </div>
    </div>
  );
}
