import { ArrowRight, ChevronLeft, ChevronRight, Search, Sparkles, SlidersHorizontal } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { knowHows, tasks } from '../data';
import { EmptyState, KnowHowCard, SelectMenu, TaskCard } from '../components/Ui';
import { useDemo } from '../state/DemoContext';

export default function MarketPage() {
  const { user } = useDemo();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('tasks');
  const [sort, setSort] = useState('最近更新');
  const [status, setStatus] = useState('全部状态');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    if (params.get('focus') === 'search') inputRef.current?.focus();
  }, [params]);

  useEffect(() => {
    setPage(1);
  }, [query, tab, sort, status]);

  const filteredTasks = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return tasks
      .filter((task) => status === '全部状态' || task.status === status)
      .filter((task) => !normalized || `${task.title}${task.brief}${task.tags.join('')}`.toLowerCase().includes(normalized))
      .sort((a, b) => (sort === '悬赏积分' ? b.reward - a.reward : 0));
  }, [query, sort, status]);

  const filteredKnowHows = knowHows.filter((item) => {
    const normalized = query.trim().toLowerCase();
    return !normalized || `${item.title}${item.summary}${item.tags.join('')}`.toLowerCase().includes(normalized);
  });
  const activeItems = tab === 'tasks' ? filteredTasks : filteredKnowHows;
  const totalPages = Math.max(1, Math.ceil(activeItems.length / pageSize));
  const pageItems = activeItems.slice((page - 1) * pageSize, page * pageSize);

  const changePage = (nextPage) => {
    setPage(nextPage);
    window.requestAnimationFrame(() => document.querySelector('.market-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  return (
    <div className="page market-page">
      <section className="market-hero">
        <div className="hero-layout">
          <div className="hero-copy">
            <h1>汇聚全球 <em>Know-how</em>，构建 AI 的专业大脑。</h1>
            <p>连接真实问题与全球实践者，通过 AI 访谈、萃取和验证，把分散在人脑与真实工作中的经验，转化为可复用、可迭代、可调用的专业能力。</p>
            <div className="market-search">
              <Search size={20} />
              <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索一个问题、领域或实践方法…" />
              <span className="search-hint">⌘ K</span>
              <button onClick={() => navigate(user ? '/create-task' : '/login')}><Sparkles size={17} />问任务 Agent<ArrowRight size={17} /></button>
            </div>
            <div className="trending">
              <span>正在讨论</span>
              {['GEO 诊断', 'AI 知识库', '销售工具', 'AI 客服'].map((item) => (
                <button key={item} onClick={() => setQuery(item)}>#{item}</button>
              ))}
            </div>
          </div>
          <EvolvingKnowHowStat />
        </div>
      </section>

      <section className="market-content">
        <div className="section-head">
          <div>
            <div className="content-tabs">
              <button className={tab === 'tasks' ? 'active' : ''} onClick={() => setTab('tasks')}>任务 <span>{filteredTasks.length}</span></button>
              <button className={tab === 'knowhow' ? 'active' : ''} onClick={() => setTab('knowhow')}>Know-how <span>{filteredKnowHows.length}</span></button>
            </div>
            <p>{query ? `“${query}” 的搜索结果` : tab === 'tasks' ? '来自不同领域的真实问题，等待实践者贡献方法。' : '已经被萃取、验证并持续迭代的实践知识。'}</p>
          </div>
          {tab === 'tasks' && (
            <div className="filters">
              <SelectMenu
                ariaLabel="筛选任务状态"
                value={status}
                options={['全部状态', '征集中', '萃取中', '已完成', '部分完成', '未完成']}
                onChange={setStatus}
                icon={<SlidersHorizontal size={16} />}
              />
              <SelectMenu
                ariaLabel="任务排序方式"
                value={sort}
                options={['最近更新', '悬赏积分']}
                onChange={setSort}
              />
            </div>
          )}
        </div>

        {tab === 'tasks' && (
          filteredTasks.length ? <div className="task-grid">{pageItems.map((task) => <TaskCard key={task.id} task={task} />)}</div> :
            <EmptyState title="没有找到相符的任务" description="换一个关键词，或者把这个尚未被回答的问题发布出去。" action={<button className="primary-button" onClick={() => navigate(user ? '/create-task' : '/login')}>发布这个问题</button>} />
        )}
        {tab === 'knowhow' && (
          filteredKnowHows.length ? <div className="know-grid">{pageItems.map((item) => <KnowHowCard key={item.id} item={item} />)}</div> :
            <EmptyState title="还没有相符的 Know-how" description="这可能正是一个值得发起的实践问题。" action={<button className="primary-button" onClick={() => navigate(user ? '/create-task' : '/login')}>发起悬赏</button>} />
        )}
        {activeItems.length > 0 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            total={activeItems.length}
            pageSize={pageSize}
            onChange={changePage}
          />
        )}
      </section>
    </div>
  );
}

function EvolvingKnowHowStat() {
  const targetCount = 46;
  const [displayCount, setDisplayCount] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayCount(targetCount);
      return undefined;
    }

    const duration = 850;
    let animationFrame;
    let startTimer;
    let startTime;

    const tick = (time) => {
      if (!startTime) startTime = time;
      const progress = Math.min((time - startTime) / duration, 1);
      const easedProgress = 1 - ((1 - progress) ** 3);
      setDisplayCount(Math.min(targetCount, Math.floor(easedProgress * targetCount)));

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(tick);
      } else {
        setDisplayCount(targetCount);
      }
    };

    startTimer = window.setTimeout(() => {
      animationFrame = window.requestAnimationFrame(tick);
    }, 120);

    return () => {
      window.clearTimeout(startTimer);
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <div className="knowledge-visual" aria-label="46 个 Know-how 正在持续思考、吸收与生长">
      <img className="knowledge-orbits" src="/assets/knowledge-orbits-transparent.png" alt="" aria-hidden="true" />
      <div className="knowledge-network" aria-hidden="true">
        <img className="network-state" src="/assets/knowledge-network-static-transparent.png" alt="" />
      </div>
      <div className="knowledge-count">
        <span><i />正在思考</span>
        <strong aria-hidden="true">{displayCount}</strong>
        <p>个 Know-how</p>
      </div>
      <span className="knowledge-evolution" aria-hidden="true">吸收 · 连接 · 进化</span>
    </div>
  );
}

function Pagination({ page, totalPages, total, pageSize, onChange }) {
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
