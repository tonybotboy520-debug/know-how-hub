import { Award, Check, Coins, Edit3, LogOut, Settings, Sparkles, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { knowHows, tasks } from '../data';
import { KnowHowCard, TaskCard, Tag } from '../components/Ui';
import { useDemo } from '../state/DemoContext';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, setUser, points, notify } = useDemo();

  const logout = () => {
    setUser(null);
    notify('已退出登录');
    navigate('/');
  };

  return (
    <div className="page profile-page">
      <header className="profile-hero">
        <div className="profile-avatar">{user.initials}<i /></div>
        <div className="profile-copy">
          <div><h1>{user.name}</h1><span>{user.handle}</span></div>
          <p>{user.bio}</p>
          <div className="tag-row">{user.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}</div>
        </div>
        <div className="profile-actions">
          <button className="outline-button" onClick={() => notify('演示版暂不保存资料编辑')}><Edit3 size={16} />编辑资料</button>
          <button className="icon-button" aria-label="设置"><Settings size={17} /></button>
          <button className="icon-button danger" aria-label="退出" onClick={logout}><LogOut size={17} /></button>
        </div>
      </header>

      <section className="profile-dashboard">
        <div className="points-card">
          <span><Coins size={18} />可用积分</span>
          <strong>{points.toLocaleString()}</strong>
          <p>另有 280 积分冻结在 1 项悬赏中</p>
          <div className="points-card-actions">
            <button onClick={() => navigate('/buy-points')}>购买积分</button>
            <button onClick={() => navigate('/workspace/tasks')}>查看积分记录</button>
          </div>
        </div>
        <div className="reputation-card">
          <div className="rep-heading"><span><Award size={18} />领域贡献</span><small>按领域分别记录</small></div>
          <div className="rep-row"><div><strong>客户成功</strong><span>持续贡献 14 个月</span></div><div className="rep-bar"><i style={{ width: '86%' }} /></div><b>领先 14%</b></div>
          <div className="rep-row"><div><strong>服务设计</strong><span>贡献 6 个版本</span></div><div className="rep-bar"><i style={{ width: '68%' }} /></div><b>稳定</b></div>
        </div>
        <div className="profile-metrics">
          <div><TrendingUp size={18} /><strong>12</strong><span>被采纳次数</span></div>
          <div><Check size={18} /><strong>71%</strong><span>贡献采纳率</span></div>
          <div><Sparkles size={18} /><strong>8</strong><span>贡献版本</span></div>
        </div>
      </section>

      <section className="profile-section">
        <div className="profile-section-head"><div><span className="page-kicker">SELECTED WORK</span><h2>创建的 Know-how</h2></div><button onClick={() => navigate('/workspace/knowhow')}>查看全部</button></div>
        <div className="know-grid">{knowHows.slice(1, 3).map((item) => <KnowHowCard item={item} key={item.id} />)}</div>
      </section>
      <section className="profile-section">
        <div className="profile-section-head"><div><span className="page-kicker">CONTRIBUTION HISTORY</span><h2>最近参与</h2></div><button onClick={() => navigate('/workspace/tasks')}>查看履历</button></div>
        <div className="task-grid compact-grid">{tasks.filter((task) => ['factory-vision', 'saas-onboarding'].includes(task.id)).map((task) => <TaskCard task={task} key={task.id} />)}</div>
      </section>
    </div>
  );
}
