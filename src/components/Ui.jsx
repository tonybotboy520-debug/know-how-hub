import {
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LoaderCircle,
  Send,
  UsersRound,
} from 'lucide-react';
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

export function AgentComposer({
  value,
  onChange,
  onSubmit,
  onSuggest,
  loading = false,
  suggesting = false,
  placeholder = '输入你的回答…',
  error = '',
  onRetry,
}) {
  const submit = (event) => {
    event.preventDefault();
    if (!loading && !suggesting && value.trim()) onSubmit(value);
  };

  return (
    <div className="agent-composer-wrap">
      {error && (
        <div className="agent-error" role="alert">
          <span>{error}</span>
          {onRetry && <button type="button" onClick={onRetry}>重试</button>}
        </div>
      )}
      <form className="agent-composer" onSubmit={submit}>
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;

            if (event.metaKey || event.ctrlKey) {
              event.preventDefault();
              const input = event.currentTarget;
              const start = input.selectionStart;
              const end = input.selectionEnd;
              const nextValue = `${value.slice(0, start)}\n${value.slice(end)}`;
              onChange(nextValue);
              requestAnimationFrame(() => {
                input.focus();
                input.setSelectionRange(start + 1, start + 1);
              });
              return;
            }

            submit(event);
          }}
          placeholder={placeholder}
          rows="3"
          disabled={loading || suggesting}
          aria-label={placeholder}
        />
        <div>
          <span>Enter 发送</span>
          <div className="agent-composer-actions">
            {onSuggest && (
              <button
                type="button"
                className="agent-ai-button"
                disabled={loading || suggesting}
                onClick={onSuggest}
                aria-label="AI 帮我生成回答"
                title="AI 帮我生成回答草稿"
              >
                {suggesting ? <LoaderCircle className="agent-spinner" size={14} /> : 'AI'}
              </button>
            )}
            <button className="agent-send-button" type="submit" disabled={loading || suggesting || !value.trim()} aria-label="发送消息">
              {loading ? <LoaderCircle className="agent-spinner" size={17} /> : <Send size={17} />}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function HighlightedText({ text, query }) {
  const tokens = [...new Set(query.trim().split(/\s+/).filter(Boolean))]
    .sort((a, b) => b.length - a.length);
  if (!tokens.length) return text;
  const escapedTokens = tokens.map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const matcher = new RegExp(`(${escapedTokens.join('|')})`, 'gi');
  const exactMatcher = new RegExp(`^(?:${escapedTokens.join('|')})$`, 'i');
  return String(text).split(matcher).map((part, index) => (
    exactMatcher.test(part)
      ? <mark className="search-match" key={`${part}-${index}`}>{part}</mark>
      : part
  ));
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

export function TaskCard({ task, query = '' }) {
  return (
    <Link className="task-card reveal" to={`/task/${task.id}`}>
      <div className="task-card-top">
        <div className="task-card-status">
          <StatusPill status={task.status} />
          {task.isLocal && <span className="local-task-badge" title="本地创建（仅保存于当前浏览器）">new</span>}
        </div>
        <span className="task-updated">{task.updated}</span>
      </div>
      <h3><HighlightedText text={task.title} query={query} /></h3>
      <p><HighlightedText text={task.brief} query={query} /></p>
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

export function KnowHowCard({ item, query = '' }) {
  return (
    <Link className="know-card reveal" to={`/know-how/${item.id}`}>
      <div className="know-card-index">KH / {item.version}</div>
      <h3><HighlightedText text={item.title} query={query} /></h3>
      <p><HighlightedText text={item.summary} query={query} /></p>
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

export function Pagination({ page, totalPages, total, pageSize, onChange }) {
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <nav className="pagination" aria-label="列表分页">
      <span className="pagination-summary">正在显示 <strong>{start}–{end}</strong> / 共 {total} 条</span>
      <div className="pagination-pages">
        <button aria-label="上一页" disabled={page === 1} onClick={() => onChange(page - 1)}><ChevronLeft size={16} /></button>
        {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
          <button
            key={pageNumber}
            className={pageNumber === page ? 'active' : ''}
            aria-current={pageNumber === page ? 'page' : undefined}
            onClick={() => onChange(pageNumber)}
          >
            {String(pageNumber).padStart(2, '0')}
          </button>
        ))}
        <button aria-label="下一页" disabled={page === totalPages} onClick={() => onChange(page + 1)}><ChevronRight size={16} /></button>
      </div>
      <span className="pagination-page">PAGE {String(page).padStart(2, '0')} / {String(totalPages).padStart(2, '0')}</span>
    </nav>
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
