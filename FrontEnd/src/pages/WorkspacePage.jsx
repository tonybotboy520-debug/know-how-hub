import {
  ArrowRight,
  Bell,
  BookOpenText,
  Check,
  ChevronDown,
  Coins,
  FileEdit,
  Plus,
  Sparkles,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { knowHows, notifications, tasks } from '../data';
import { EmptyState, KnowHowCard, StatusPill, Tag, TaskCard } from '../components/Ui';
import { useDemo } from '../state/DemoContext';

const labels = {
  tasks: {
    kicker: 'MY TASKS / 任务工作台',
    title: '我的任务',
    description: '从发出问题到收到答案，所有进展都在这里。',
  },
  knowhow: {
    kicker: 'MY KNOW-HOW / 实践资产',
    title: '我的 Know-how',
    description: '你创建、贡献和仍在打磨的实践知识。',
  },
  following: {
    kicker: 'FOLLOWING / 持续关注',
    title: '我的关注',
    description: '跟进问题的进展，也留意 Know-how 的下一次生长。',
  },
  notifications: {
    kicker: 'INBOX / 站内动态',
    title: '通知',
    description: '与你的任务、贡献和领域相关的新进展。',
  },
};

export default function WorkspacePage() {
  const { section } = useParams();
  const navigate = useNavigate();
  const { followedTasks, followedKnowHows, createdTasks, submittedTasks, points } = useDemo();
  const [tab, setTab] = useState(section === 'knowhow' ? 'created' : section === 'following' ? 'tasks' : 'published');
  const [status, setStatus] = useState('全部状态');
  const info = labels[section] || labels.tasks;

  const published = useMemo(() => {
    const base = [tasks.find((item) => item.id === 'old-house-noise'), tasks.find((item) => item.id === 'coffee-schedule')];
    const local = createdTasks.map((task) => ({
      id: task.id,
      title: task.title,
      brief: task.description,
      tags: ['新发布', '待匹配'],
      reward: Number(task.reward),
      deadlineShort: '剩 7 天',
      participants: 0,
      updated: '刚刚',
      status: task.status,
    }));
    return [...local, ...base].filter(Boolean);
  }, [createdTasks]);
  const participating = tasks.filter((item) => submittedTasks.includes(item.id) || ['saas-onboarding', 'factory-vision'].includes(item.id));
  const myKnowHows = knowHows.slice(0, 3);

  if (section === 'notifications') {
    return (
      <div className="page workspace-page">
        <WorkspaceHeader info={info} />
        <div className="notification-tools"><button className="text-button"><Check size={15} />全部标为已读</button></div>
        <div className="notification-list">{notifications.map((item) => (
          <button className={`notification-item ${item.unread ? 'unread' : ''}`} key={item.id}>
            <span className={`notification-icon ${item.type}`}>{item.type === 'result' ? <Coins size={19} /> : item.type === 'match' ? <Sparkles size={19} /> : <Bell size={19} />}</span>
            <div><strong>{item.title}{item.unread && <i />}</strong><p>{item.detail}</p><span>{item.time}</span></div>
            <ArrowRight size={17} />
          </button>
        ))}</div>
      </div>
    );
  }

  return (
    <div className="page workspace-page">
      <WorkspaceHeader info={info} action={section === 'tasks' ? <button className="primary-button" onClick={() => navigate('/create-task')}><Plus size={17} />新建任务</button> : section === 'knowhow' ? <button className="primary-button" onClick={() => navigate('/create-task')}><FileEdit size={17} />自由创作</button> : null} />

      {section === 'tasks' && (
        <>
          <div className="workspace-stats">
            <div><span>进行中的发布</span><strong>2</strong><small>1 项本周截止</small></div>
            <div><span>参与中的任务</span><strong>{participating.length}</strong><small>1 份待补充</small></div>
            <div><span>累计获得积分</span><strong>548</strong><small>当前余额 {points.toLocaleString()}</small></div>
          </div>
          <div className="workspace-tabs">
            <button className={tab === 'published' ? 'active' : ''} onClick={() => setTab('published')}>我发布的 <span>{published.length}</span></button>
            <button className={tab === 'participating' ? 'active' : ''} onClick={() => setTab('participating')}>我参与的 <span>{participating.length}</span></button>
            <label><select value={status} onChange={(event) => setStatus(event.target.value)}><option>全部状态</option><option>征集中</option><option>萃取中</option><option>已完成</option></select><ChevronDown size={14} /></label>
          </div>
          <div className="task-grid compact-grid">
            {(tab === 'published' ? published : participating).filter((task) => status === '全部状态' || task.status === status).map((task) => <TaskCard task={task} key={task.id} />)}
          </div>
        </>
      )}

      {section === 'knowhow' && (
        <>
          <div className="workspace-tabs">
            <button className={tab === 'created' ? 'active' : ''} onClick={() => setTab('created')}>我创建的 <span>3</span></button>
            <button className={tab === 'contributed' ? 'active' : ''} onClick={() => setTab('contributed')}>我贡献的 <span>5</span></button>
            <button className={tab === 'drafts' ? 'active' : ''} onClick={() => setTab('drafts')}>草稿 <span>1</span></button>
          </div>
          {tab !== 'drafts' ? <div className="know-grid">{myKnowHows.slice(tab === 'created' ? 1 : 0).map((item) => <KnowHowCard item={item} key={item.id} />)}</div> :
            <div className="draft-card"><span><FileEdit size={20} /></span><div><small>上次编辑于昨天</small><h3>服务团队如何建立问题升级机制</h3><p>已完成背景和分级原则，仍缺少响应时限与案例。</p><div className="draft-progress"><i style={{ width: '58%' }} /></div></div><button className="outline-button">继续编辑<ArrowRight size={16} /></button></div>}
        </>
      )}

      {section === 'following' && (
        <>
          <div className="workspace-tabs">
            <button className={tab === 'tasks' ? 'active' : ''} onClick={() => setTab('tasks')}>任务 <span>{followedTasks.length}</span></button>
            <button className={tab === 'knowhow' ? 'active' : ''} onClick={() => setTab('knowhow')}>Know-how <span>{followedKnowHows.length}</span></button>
          </div>
          {tab === 'tasks' && (followedTasks.length ? <div className="task-grid compact-grid">{tasks.filter((task) => followedTasks.includes(task.id)).map((task) => <TaskCard task={task} key={task.id} />)}</div> : <EmptyState title="还没有关注任务" description="关注后，可以持续收到征集、萃取和交付进展。" action={<Link className="primary-button" to="/">去任务市场看看</Link>} />)}
          {tab === 'knowhow' && (followedKnowHows.length ? <div className="know-grid">{knowHows.filter((item) => followedKnowHows.includes(item.id)).map((item) => <KnowHowCard item={item} key={item.id} />)}</div> : <EmptyState title="还没有关注 Know-how" description="关注后，新版本和关联任务都会出现在这里。" />)}
        </>
      )}
    </div>
  );
}

function WorkspaceHeader({ info, action }) {
  return (
    <header className="workspace-header">
      <div><span className="page-kicker">{info.kicker}</span><h1>{info.title}</h1><p>{info.description}</p></div>
      {action}
    </header>
  );
}
