import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BookOpenText,
  Check,
  FileStack,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { notifications } from '../data';

const notificationIcons = {
  system: Bell,
  task: FileStack,
  knowhow: BookOpenText,
};

const notificationLabels = {
  system: '系统',
  task: '任务',
  knowhow: 'Know-how',
};

export default function NotificationDetailPage() {
  const { notificationId } = useParams();
  const navigate = useNavigate();
  const item = notifications.find((entry) => String(entry.id) === notificationId) || notifications[0];
  const messageType = item.messageType || 'system';
  const Icon = notificationIcons[messageType] || Bell;

  return (
    <div className="page notification-detail-page">
      <div className="detail-nav">
        <button className="back-button" onClick={() => navigate('/workspace/notifications')}><ArrowLeft size={17} />返回消息</button>
        <span className="notification-delivery-state"><Check size={15} />消息已送达</span>
      </div>

      <header className="notification-detail-hero">
        <span className={`notification-detail-icon ${messageType}`}><Icon size={27} /></span>
        <div>
          <span className="page-kicker">{item.category} / MESSAGE</span>
          <div className="notification-detail-title">
            <span className={`notification-type-label ${messageType}`}>{notificationLabels[messageType]}</span>
            <h1>{item.title}</h1>
          </div>
          <p>{item.detail}</p>
          <time>{item.timestamp}</time>
        </div>
      </header>

      <main className="notification-detail-layout">
        <article className="notification-detail-copy">
          <span className="page-kicker">消息详情</span>
          {item.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          <div className="notification-facts">
            {item.facts.map(([label, value]) => (
              <div key={label}><span>{label}</span><strong>{value}</strong></div>
            ))}
          </div>
        </article>

        <aside className="notification-detail-aside">
          <span className={`notification-aside-mark ${messageType}`}><Icon size={20} /></span>
          <div>
            <span>关联操作</span>
            <strong>{item.category}</strong>
            <p>查看本条消息关联的任务、Know-how、版本或收益信息。</p>
          </div>
          <Link className="primary-button large" to={item.actionTo}>{item.actionLabel}<ArrowRight size={17} /></Link>
          <Link className="notification-back-link" to="/workspace/notifications">返回全部消息</Link>
        </aside>
      </main>
    </div>
  );
}
