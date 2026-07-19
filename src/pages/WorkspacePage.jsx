import {
  ArrowRight,
  Bell,
  BookOpenText,
  Check,
  FileEdit,
  FileStack,
  Plus,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { knowHows, notifications, tasks } from '../data';
import { EmptyState, KnowHowCard, Pagination, SelectMenu, StatusPill, Tag, TaskCard } from '../components/Ui';
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
    title: '消息',
    description: '查看系统通知，以及与你的任务、Know-how 和贡献相关的新进展。',
  },
};

const defaultTabForSection = (section) => {
  if (section === 'knowhow') return 'created';
  if (section === 'following') return 'tasks';
  return 'published';
};

const notificationTypeMeta = {
  system: { label: '系统', icon: Bell },
  task: { label: '任务', icon: FileStack },
  knowhow: { label: 'Know-how', icon: BookOpenText },
};

export default function WorkspacePage() {
  const { section } = useParams();
  const navigate = useNavigate();
  const { followedTasks, followedKnowHows, createdTasks, createdKnowHows, submittedTasks, points } = useDemo();
  const [tab, setTab] = useState(() => defaultTabForSection(section));
  const [status, setStatus] = useState('全部状态');
  const [messagePage, setMessagePage] = useState(1);
  const info = labels[section] || labels.tasks;

  useEffect(() => {
    setTab(defaultTabForSection(section));
  }, [section]);

  const published = useMemo(() => {
    const base = [tasks.find((item) => item.id === 'geo-visibility-baseline'), tasks.find((item) => item.id === 'vibe-sales-crm')];
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
      isLocal: true,
    }));
    return [...local, ...base].filter(Boolean);
  }, [createdTasks]);
  const participating = tasks.filter((item) => submittedTasks.includes(item.id) || ['ai-presales-proposal', 'rag-quality-diagnosis'].includes(item.id));
  const myCreatedKnowHows = [...createdKnowHows, ...knowHows.slice(1, 3)];
  const myContributedKnowHows = knowHows.slice(0, 3);
  const messagePageSize = 10;
  const messageTotalPages = Math.max(1, Math.ceil(notifications.length / messagePageSize));
  const visibleMessages = notifications.slice((messagePage - 1) * messagePageSize, messagePage * messagePageSize);

  if (section === 'notifications') {
    return (
      <div className="page workspace-page">
        <WorkspaceHeader info={info} />
        <div className="notification-toolbar">
          <span>共 {notifications.length} 条消息</span>
          <button className="text-button"><Check size={15} />全部标为已读</button>
        </div>
        <div className="notification-list">{visibleMessages.map((item) => {
          const typeMeta = notificationTypeMeta[item.messageType] || notificationTypeMeta.system;
          const MessageIcon = typeMeta.icon;
          return (
            <Link className={`notification-item ${item.unread ? 'unread' : ''}`} to={`/workspace/notifications/${item.id}`} key={item.id}>
              <span className={`notification-icon ${item.messageType}`} aria-label={`${typeMeta.label}消息`}><MessageIcon size={19} /></span>
              <div>
                <strong>
                  <span className={`notification-type-label ${item.messageType}`}>{typeMeta.label}</span>
                  <span className="notification-title-text">{item.title}</span>
                  {item.unread && <i />}
                </strong>
                <p>{item.detail}</p>
                <span>{item.time}</span>
              </div>
              {typeof item.pointsChange === 'number' ? (
                <span className={`notification-points-change ${item.pointsChange < 0 ? 'negative' : 'positive'}`}>
                  {item.pointsChange > 0 ? '+' : '−'}{Math.abs(item.pointsChange).toLocaleString()}<small>积分</small>
                </span>
              ) : <ArrowRight size={17} />}
            </Link>
          );
        })}</div>
        <Pagination
          page={messagePage}
          totalPages={messageTotalPages}
          total={notifications.length}
          pageSize={messagePageSize}
          onChange={setMessagePage}
        />
      </div>
    );
  }

  return (
    <div className="page workspace-page">
      <WorkspaceHeader info={info} action={section === 'tasks' ? <button className="primary-button" onClick={() => navigate('/create-task')}><Plus size={17} />新建任务</button> : section === 'knowhow' ? <button className="primary-button" onClick={() => navigate('/create-knowhow')}><FileEdit size={17} />自由创作</button> : null} />

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
            <SelectMenu
              ariaLabel="筛选任务状态"
              value={status}
              options={['全部状态', '征集中', '萃取中', '已完成']}
              onChange={setStatus}
            />
          </div>
          <div className="task-grid compact-grid">
            {(tab === 'published' ? published : participating).filter((task) => status === '全部状态' || task.status === status).map((task) => <TaskCard task={task} key={task.id} />)}
          </div>
        </>
      )}

      {section === 'knowhow' && (
        <>
          <div className="workspace-tabs">
            <button className={tab === 'created' ? 'active' : ''} onClick={() => setTab('created')}>我创建的 <span>{2 + createdKnowHows.length}</span></button>
            <button className={tab === 'contributed' ? 'active' : ''} onClick={() => setTab('contributed')}>我贡献的 <span>5</span></button>
            <button className={tab === 'drafts' ? 'active' : ''} onClick={() => setTab('drafts')}>草稿 <span>1</span></button>
          </div>
          {tab !== 'drafts' ? <div className="know-grid">{(tab === 'created' ? myCreatedKnowHows : myContributedKnowHows).map((item) => <KnowHowCard item={item} key={item.id} />)}</div> :
            <div className="draft-card"><span><FileEdit size={20} /></span><div><small>上次编辑于昨天</small><h3>GEO 项目客户资料准入与事实核验清单</h3><p>已完成品牌事实和证据分级，仍缺少冲突信息的升级处理规则。</p><div className="draft-progress"><i style={{ width: '58%' }} /></div></div><button className="outline-button">继续编辑<ArrowRight size={16} /></button></div>}
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
