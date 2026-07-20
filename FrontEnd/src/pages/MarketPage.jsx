import { RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { knowHows, tasks } from '../data';
import { EmptyState, KnowHowCard, Pagination, SelectMenu, TaskCard } from '../components/Ui';
import { useDemo } from '../state/DemoContext';

const normalizeSearchText = (value) => String(value ?? '')
  .normalize('NFKC')
  .toLocaleLowerCase('zh-CN')
  .replace(/[\s\p{P}\p{S}]+/gu, '');

const matchesFuzzySearch = (fields, query) => {
  const terms = query
    .trim()
    .split(/\s+/)
    .map(normalizeSearchText)
    .filter(Boolean);
  if (!terms.length) return true;
  const searchableText = normalizeSearchText(fields.flat(Infinity).join(' '));
  return terms.every((term) => searchableText.includes(term));
};

export default function MarketPage() {
  const { user, createdTasks, resetDemoData } = useDemo();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const inputRef = useRef(null);
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('tasks');
  const [sort, setSort] = useState('最近更新');
  const [status, setStatus] = useState('全部状态');
  const [page, setPage] = useState(1);
  const [resetOpen, setResetOpen] = useState(false);
  const pageSize = 20;

  useEffect(() => {
    if (params.get('focus') === 'search') inputRef.current?.focus();
  }, [params]);

  useEffect(() => {
    setPage(1);
  }, [query, tab, sort, status]);

  const submitSearch = (event) => {
    event?.preventDefault();
    setQuery(searchInput.trim());
  };

  const clearSearch = () => {
    setSearchInput('');
    setQuery('');
    inputRef.current?.focus();
  };

  const useSuggestedSearch = (value) => {
    setSearchInput(value);
    setQuery(value);
  };

  const marketTasks = useMemo(() => {
    const localTasks = createdTasks.map((task) => ({
      ...task,
      brief: task.brief || task.description,
      tags: task.tags?.length ? task.tags : ['用户发布', '待匹配'],
      deadlineShort: task.deadlineShort || '新发布',
      participants: Number(task.participants) || 0,
      updated: task.updated || '刚刚',
      isLocal: true,
    }));
    return [...localTasks, ...tasks];
  }, [createdTasks]);

  const filteredTasks = useMemo(() => {
    return marketTasks
      .filter((task) => status === '全部状态' || task.status === status)
      .filter((task) => matchesFuzzySearch([
        task.title,
        task.brief,
      ], query))
      .sort((a, b) => (sort === '悬赏积分' ? b.reward - a.reward : 0));
  }, [marketTasks, query, sort, status]);

  const filteredKnowHows = useMemo(() => knowHows.filter((item) => matchesFuzzySearch([
    item.title,
    item.summary,
  ], query)), [query]);
  const activeItems = tab === 'tasks' ? filteredTasks : filteredKnowHows;
  const totalPages = Math.max(1, Math.ceil(activeItems.length / pageSize));
  const pageItems = activeItems.slice((page - 1) * pageSize, page * pageSize);

  const changePage = (nextPage) => {
    setPage(nextPage);
    window.requestAnimationFrame(() => document.querySelector('.market-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const confirmReset = () => {
    resetDemoData();
    setResetOpen(false);
    setSearchInput('');
    setQuery('');
    setStatus('全部状态');
    setSort('最近更新');
    setTab('tasks');
    setPage(1);
  };

  return (
    <div className="page market-page">
      <section className="market-hero">
        <div className="demo-reset-control">
          <button
            type="button"
            className="demo-reset-trigger"
            aria-expanded={resetOpen}
            onClick={() => setResetOpen((current) => !current)}
          >
            <RotateCcw size={12} />重置演示数据
          </button>
          {resetOpen && (
            <div className="demo-reset-confirm" role="dialog" aria-label="确认重置演示数据">
              <button className="demo-reset-close" type="button" aria-label="关闭" onClick={() => setResetOpen(false)}><X size={14} /></button>
              <strong>恢复初始 Mock 数据？</strong>
              <p>将清除当前浏览器中创建的任务、Know-how 及其他演示操作，初始内容不会受影响。</p>
              <div>
                <button type="button" onClick={() => setResetOpen(false)}>取消</button>
                <button type="button" onClick={confirmReset}>确认重置</button>
              </div>
            </div>
          )}
        </div>
        <div className="hero-layout">
          <div className="hero-copy">
            <h1>汇聚全球 <em>Know-how</em>，构建 AI 的专业大脑。</h1>
            <p>连接真实问题与全球实践者，通过 AI 访谈、萃取和验证，把分散在人脑与真实工作中的经验，转化为可复用、可迭代、可调用的专业能力。</p>
            <form className="market-search" role="search" onSubmit={submitSearch}>
              <Search size={20} />
              <input
                ref={inputRef}
                type="search"
                aria-label="搜索任务和 Know-how"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="搜索任务、Know-how、领域或实践方法…"
              />
              {searchInput.trim() && (
                <button className="market-search-clear" type="button" onClick={clearSearch} aria-label="清空搜索关键词">
                  <X size={16} />
                </button>
              )}
              <button type="submit"><Search size={17} />搜索 Know-how</button>
            </form>
            <div className="trending">
              <span>正在讨论</span>
              {['GEO 诊断', 'AI 知识库', '销售工具', 'AI 客服'].map((item) => (
                <button key={item} onClick={() => useSuggestedSearch(item)}>#{item}</button>
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
          filteredTasks.length ? <div className="task-grid">{pageItems.map((task) => <TaskCard key={task.id} task={task} query={query} />)}</div> :
            <EmptyState title="没有找到相符的任务" description="换一个关键词，或者把这个尚未被回答的问题发布出去。" action={<button className="primary-button" onClick={() => navigate(user ? '/create-task' : '/login')}>发布这个问题</button>} />
        )}
        {tab === 'knowhow' && (
          filteredKnowHows.length ? <div className="know-grid">{pageItems.map((item) => <KnowHowCard key={item.id} item={item} query={query} />)}</div> :
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
  const targetCount = knowHows.length;
  const contributionCount = knowHows.reduce((total, item) => total + (Number(item.contributors) || 0), 0);
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
  }, [targetCount]);

  return (
    <div className="knowledge-visual" aria-label={`共汇集 ${targetCount} 个 Know-how，累计来自 ${contributionCount} 人次贡献`}>
      <div className="knowledge-count">
        <span className="knowledge-count-label"><i />共汇集</span>
        <div className="knowledge-count-total">
          <strong aria-hidden="true">{displayCount}</strong>
          <p>个 Know-how</p>
        </div>
        <small>来自 {contributionCount} 人次贡献</small>
      </div>
    </div>
  );
}
