import { ArrowUpRight, Check, ChevronDown, Clock3, UsersRound } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

export const statusTone = {
  征集中: 'active',
  萃取中: 'extracting',
  已完成: 'complete',
  部分完成: 'partial',
  未完成: 'failed',
  草稿: 'draft',
};

export function StatusPill({ status }) {
  return <span className={`status-pill ${statusTone[status] || 'draft'}`}><i />{status}</span>;
}

export function Tag({ children }) {
  return <span className="tag">{children}</span>;
}

export function Avatar({ text, size = 'normal' }) {
  return <span className={`avatar avatar-${size}`}>{text}</span>;
}

export function SelectMenu({
  value,
  options,
  onChange,
  icon = null,
  ariaLabel = '选择选项',
  compact = false,
}) {
  const items = [...new Set(options)];
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(Math.max(0, items.indexOf(value)));

  useEffect(() => {
    const closeFromOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };

    document.addEventListener('pointerdown', closeFromOutside);
    return () => document.removeEventListener('pointerdown', closeFromOutside);
  }, []);

  useEffect(() => {
    setActiveIndex(Math.max(0, items.indexOf(value)));
  }, [value]);

  const choose = (item) => {
    onChange(item);
    setOpen(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => {
        const direction = event.key === 'ArrowDown' ? 1 : -1;
        return (current + direction + items.length) % items.length;
      });
      return;
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex(event.key === 'Home' ? 0 : items.length - 1);
      return;
    }

    if ((event.key === 'Enter' || event.key === ' ') && open) {
      event.preventDefault();
      choose(items[activeIndex]);
    }
  };

  return (
    <div ref={rootRef} className={`select-menu ${open ? 'open' : ''} ${compact ? 'compact' : ''}`}>
      <button
        type="button"
        className="select-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleKeyDown}
      >
        {icon}
        <span>{value}</span>
        <ChevronDown className="select-chevron" size={14} />
      </button>
      {open && (
        <div className="select-options" role="listbox" aria-label={ariaLabel}>
          {items.map((item, index) => (
            <button
              type="button"
              role="option"
              aria-selected={item === value}
              className={`select-option ${item === value ? 'selected' : ''} ${index === activeIndex ? 'active' : ''}`}
              key={item}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(item)}
            >
              <span>{item}</span>
              {item === value ? <Check size={14} /> : <i />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function TaskCard({ task }) {
  return (
    <Link className="task-card reveal" to={`/task/${task.id}`}>
      <div className="task-card-top">
        <StatusPill status={task.status} />
        <span className="task-updated">{task.updated}</span>
      </div>
      <h3>{task.title}</h3>
      <p>{task.brief}</p>
      <div className="tag-row">{task.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}</div>
      <div className="task-card-base">
        <div className="reward"><strong>{task.reward}</strong><span>积分悬赏</span></div>
        <div className="card-metrics">
          <span><Clock3 size={15} />{task.deadlineShort}</span>
          <span><UsersRound size={15} />{task.participants} 人贡献</span>
          <ArrowUpRight size={18} className="card-arrow" />
        </div>
      </div>
      {task.baseVersion && <div className="version-link">基于 {task.baseVersion} 继续迭代</div>}
    </Link>
  );
}

export function KnowHowCard({ item }) {
  return (
    <Link className="know-card reveal" to={`/know-how/${item.id}`}>
      <div className="know-card-index">KH / {item.version}</div>
      <h3>{item.title}</h3>
      <p>{item.summary}</p>
      <div className="tag-row">{item.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}</div>
      <div className="know-card-footer">
        <span>{item.status}</span>
        <span>{item.contributors} 位贡献者</span>
        <span>{item.updated}更新</span>
        <ArrowUpRight size={17} />
      </div>
    </Link>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="empty-state">
      <span className="empty-mark">∅</span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function SkeletonBlock() {
  return (
    <div className="skeleton-card">
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}
