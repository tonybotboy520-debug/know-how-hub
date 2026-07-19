import {
  Bell,
  BookMarked,
  ChevronRight,
  CircleUserRound,
  Compass,
  FileStack,
  Menu,
  Plus,
  Search,
  Sparkles,
  WalletCards,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { notifications } from '../data';
import { useDemo } from '../state/DemoContext';
import BrandLogo from './BrandLogo';

const nav = [
  { to: '/', icon: Compass, label: '任务市场', exact: true },
  { to: '/workspace/tasks', icon: FileStack, label: '我的任务' },
  { to: '/workspace/knowhow', icon: Sparkles, label: '我的 Know-how' },
  { to: '/workspace/following', icon: BookMarked, label: '我的关注' },
  { to: '/workspace/notifications', icon: Bell, label: '消息', badge: true },
];

export default function Layout() {
  const { user, points, toast } = useDemo();
  const [mobileMenu, setMobileMenu] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isDetail = location.pathname.startsWith('/task/') || location.pathname.startsWith('/know-how/') || location.pathname.startsWith('/workspace/notifications/');
  const unreadNotificationCount = notifications.filter((item) => item.unread).length;

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);

  const ensureCreate = () => navigate(user ? '/create-task' : '/login');

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? 'is-open' : ''}`}>
        <Link className="brand" to="/" onClick={() => setMobileMenu(false)}>
          <BrandLogo />
        </Link>
        <button className="create-button" onClick={ensureCreate}><Plus size={18} />新建 Know-how 任务</button>
        <nav>
          {nav.map(({ to, icon: Icon, label, badge, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              onClick={() => setMobileMenu(false)}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <Icon size={19} strokeWidth={1.8} />
              <span>{label}</span>
              {badge && <i className="nav-badge">{unreadNotificationCount}</i>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-utility-links">
          <a className="intro-link" href="/product-intro.html" target="_blank" rel="noreferrer">
            <Sparkles size={16} />
            <span>了解 360智汇</span>
            <ChevronRight size={15} />
          </a>
          {user && (
            <NavLink className="points-purchase-link" to="/buy-points" onClick={() => setMobileMenu(false)}>
              <WalletCards size={17} />
              <span><strong>购买积分</strong><small>即时到账</small></span>
              <ChevronRight size={15} />
            </NavLink>
          )}
        </div>
        <div className="user-dock">
          {user ? (
            <>
              <Link className="avatar" to="/profile">{user.initials}</Link>
              <Link className="user-copy" to="/profile"><strong>{user.name}</strong><span>{points.toLocaleString()} 积分</span></Link>
              <Link to="/profile" aria-label="个人中心"><CircleUserRound size={19} /></Link>
            </>
          ) : (
            <>
              <span className="avatar">游</span>
              <div className="user-copy"><strong>访客浏览</strong><span>登录后可参与</span></div>
              <Link className="text-link" to="/login">登录</Link>
            </>
          )}
        </div>
      </aside>

      {mobileMenu && <button className="menu-scrim" aria-label="关闭菜单" onClick={() => setMobileMenu(false)} />}

      <main className="main-panel">
        <header className="mobile-header">
          <Link className="brand compact" to="/"><BrandLogo /></Link>
          <div className="mobile-actions">
            <button aria-label="搜索" onClick={() => navigate('/?focus=search')}><Search size={20} /></button>
            <button aria-label="菜单" onClick={() => setMobileMenu(!mobileMenu)}>{mobileMenu ? <X size={22} /> : <Menu size={22} />}</button>
          </div>
        </header>
        {isDetail && <div className="detail-topline" />}
        <Outlet />
      </main>

      <nav className="mobile-tabs">
        {nav.slice(0, 4).map(({ to, icon: Icon, label, exact }) => (
          <NavLink key={to} to={to} end={exact} className={({ isActive }) => (isActive ? 'active' : '')}>
            <Icon size={20} /><span>{label.replace('我的 ', '')}</span>
          </NavLink>
        ))}
      </nav>
      {toast && <div className="toast"><span>✓</span>{toast}</div>}
    </div>
  );
}
