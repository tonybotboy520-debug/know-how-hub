import {
  ArrowLeft,
  BadgeCheck,
  BookOpenText,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  GitBranch,
  History,
  Link2,
  MessageCircle,
  Quote,
  Share2,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { knowHows, tasks } from '../data';
import { Avatar, Tag } from '../components/Ui';
import { useDemo } from '../state/DemoContext';

const sections = [
  {
    id: 'choose',
    number: '01',
    title: '先选一条“容易学会”的线',
    lead: '第一次试点的目标不是证明 AI 可以替代多少人，而是建立一套团队能重复使用的落地方法。',
    content: [
      '用四个维度给候选产线打分：缺陷是否肉眼可分、外观与良品差异是否稳定、现场光学条件能否控制、工艺人员是否愿意持续反馈。不要先选产量最高或人工成本最高的线。',
      '首线优先选择缺陷种类 3–8 种、产品姿态相对固定、过去三个月有稳定缺陷样本的工序。透明、强反光、随机堆叠或缺陷极少的对象，会显著增加第一次试点的不确定性。',
    ],
    source: '主要来自许博、蒋工；与 Mina 的数据覆盖建议相互印证',
  },
  {
    id: 'sample',
    number: '02',
    title: '按缺陷机制建立样本账本',
    lead: '样本数量不是越多越好。首先要知道每一张图为什么会成为良品或缺陷。',
    content: [
      '建立“缺陷机制 × 产品型号 × 班次 × 设备状态”的采样矩阵，原图必须保留采集时间与工况。训练集、验证集和验收集按时间段隔离，避免同一批次的近似图片泄漏。',
      '对稀缺缺陷，不用简单复制或只做图像增强来制造数量感。可以先让模型做辅助筛查，但验收集里必须保留真实发生的缺陷。',
    ],
    source: '主要来自 Mina、罗西；2 位贡献者对最小样本量存在不同意见',
  },
  {
    id: 'contract',
    number: '03',
    title: '把验收写成业务后果',
    lead: '单独承诺“准确率 99%”没有意义。验收必须明确在哪些工况、对哪些缺陷、错一次会造成什么。',
    content: [
      '分别定义关键缺陷漏检率、一般缺陷漏检率、误剔率、单件推理时间和不可判定比例。验收时连续覆盖至少两个完整生产班次，并包含换料、换线和设备保养后的波动。',
      '合同中写清样本增补责任、现场光学变化的边界、模型版本回滚方式，以及 AI 不可判定时如何转人工。先约定一段影子运行期，再决定是否与剔除机构联动。',
    ],
    source: '主要来自蒋工、许博、姚其；相关条款被 4 位贡献者独立提及',
  },
];

export default function KnowHowPage() {
  const { knowHowId } = useParams();
  const navigate = useNavigate();
  const { user, followedKnowHows, toggleKnowHowFollow, notify } = useDemo();
  const item = knowHows.find((entry) => entry.id === knowHowId) || knowHows[0];
  const [version, setVersion] = useState(item.version);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([
    { name: '段启', initials: '段', time: '2 小时前', text: '第 3 节的影子运行期很有用。我们实践里至少需要覆盖一次换线，否则上线后误剔会明显上升。' },
    { name: '许博', initials: '许', time: '昨天', text: '补充一个边界：如果缺陷本身需要触觉或内部成像才能判断，就不适合从普通 2D 视觉开始。' },
  ]);
  const followed = followedKnowHows.includes(item.id);
  const sourceTask = tasks.find((task) => task.id === item.sourceTask);

  const follow = () => {
    if (!user) return navigate('/login');
    toggleKnowHowFollow(item.id);
  };
  const postComment = () => {
    if (!user) return navigate('/login');
    if (!comment.trim()) return;
    setComments([{ name: user.name, initials: user.initials, time: '刚刚', text: comment.trim() }, ...comments]);
    setComment('');
    notify('评论已发布到当前版本');
  };

  return (
    <div className="page knowhow-page">
      <div className="detail-nav">
        <button className="back-button" onClick={() => navigate(-1)}><ArrowLeft size={17} />返回</button>
        <div>
          <button className="icon-button" onClick={() => notify('链接已复制')}><Share2 size={17} /></button>
          <button className={`outline-button ${followed ? 'selected' : ''}`} onClick={follow}>{followed ? <Check size={16} /> : <BookOpenText size={16} />}{followed ? '已关注' : '关注更新'}</button>
        </div>
      </div>
      <header className="knowhow-hero">
        <div className="knowhow-stamp">KNOW<br />HOW<span>{version}</span></div>
        <div className="knowhow-title">
          <div className="eyebrow-row"><span className="verified"><BadgeCheck size={15} />萃取成果</span><span>最后更新于 2026 年 7 月 15 日</span></div>
          <h1>{item.title}</h1>
          <p>{item.summary}</p>
          <div className="tag-row">{item.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}</div>
        </div>
      </header>

      <div className="knowhow-meta-bar">
        <div><span>当前版本</span><label><select value={version} onChange={(event) => setVersion(event.target.value)}><option>{item.version}</option><option>v0.9</option></select><ChevronDown size={14} /></label></div>
        <div><span>贡献者</span><strong><UsersRound size={16} />{item.contributors} 位</strong></div>
        <div><span>质量状态</span><strong><BadgeCheck size={16} />{item.status} · {item.confidence}</strong></div>
        <div><span>来源</span>{sourceTask ? <Link to={`/task/${sourceTask.id}`}><Link2 size={15} />查看悬赏任务</Link> : <strong>自由创建</strong>}</div>
      </div>

      <div className="knowhow-body">
        <aside className="toc">
          <span>本页目录</span>
          {sections.map((section) => <a key={section.id} href={`#${section.id}`}><i>{section.number}</i>{section.title}</a>)}
          <a href="#checklist"><i>04</i>8 周落地检查表</a>
          <a href="#sources"><i>05</i>来源与冲突</a>
          <div className="toc-actions">
            <button onClick={() => navigate('/create-task')}><GitBranch size={16} />基于此版本发起迭代</button>
            <button onClick={() => notify('历史版本面板已打开')}><History size={16} />查看版本历史</button>
          </div>
        </aside>
        <article className="knowhow-article">
          <section className="executive-summary">
            <span><Sparkles size={17} />核心结论</span>
            <p>第一次视觉质检试点，真正要验证的不是模型最高准确率，而是工厂能否持续提供可解释的数据、明确错误代价，并在现场变化时知道由谁处理。</p>
            <div className="summary-points"><div><strong>8 周</strong><span>建议试点周期</span></div><div><strong>3–8 种</strong><span>首线缺陷范围</span></div><div><strong>2 班次</strong><span>最低连续验收</span></div></div>
          </section>
          {sections.map((section) => (
            <section className="content-section" id={section.id} key={section.id}>
              <span className="content-number">{section.number}</span>
              <h2>{section.title}</h2>
              <p className="content-lead">{section.lead}</p>
              {section.content.map((text) => <p key={text}>{text}</p>)}
              <div className="source-note"><Quote size={15} /><span>{section.source}</span><button>查看原始贡献<ChevronRight size={13} /></button></div>
            </section>
          ))}
          <section className="content-section" id="checklist">
            <span className="content-number">04</span>
            <h2>8 周落地检查表</h2>
            <div className="week-list">
              {[
                ['第 1 周', '选线与现场光学预检', '工艺负责人 + 项目负责人'],
                ['第 2–3 周', '建立缺陷字典与采样矩阵', '质检员 + 数据标注方'],
                ['第 4–5 周', '训练、错误分析与补样', '方案商 + 工艺团队'],
                ['第 6 周', '离线验收与边界确认', '双方项目负责人'],
                ['第 7–8 周', '影子运行、换线测试与交接', '产线班组 + 设备团队'],
              ].map(([week, task, owner]) => <div key={week}><strong>{week}</strong><span>{task}</span><em>{owner}</em></div>)}
            </div>
          </section>
          <section className="content-section sources-section" id="sources">
            <span className="content-number">05</span>
            <h2>来源、冲突与信息缺口</h2>
            <div className="source-box"><BadgeCheck size={19} /><div><strong>7 位贡献者的内容被采纳</strong><p>关键结论来自工艺、算法、项目交付和供应商管理等不同角色，交叉印证程度较高。</p></div></div>
            <div className="source-box conflict"><CircleAlert size={19} /><div><strong>关于最低样本量存在分歧</strong><p>两位贡献者建议每类不少于 300 张，另三位认为应以工况覆盖为准。本版本保留后者，并提示对极少发生缺陷采用人工复核。</p></div></div>
          </section>
          <section className="comments-section">
            <div className="comments-head"><div><span className="page-kicker">COMMENTS / VERSION {version}</span><h2>使用反馈与补充</h2></div><span>{comments.length} 条评论</span></div>
            <div className="comment-compose"><Avatar text={user?.initials || '游'} /><textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder={user ? '分享你在实际使用中的发现…' : '登录后参与评论'} disabled={!user} /><button onClick={postComment}>发布</button></div>
            <div className="comment-list">{comments.map((entry, index) => <div className="comment" key={`${entry.name}-${index}`}><Avatar text={entry.initials} /><div><strong>{entry.name}<span>{entry.time}</span></strong><p>{entry.text}</p><button><MessageCircle size={14} />回复</button></div></div>)}</div>
          </section>
        </article>
      </div>
    </div>
  );
}
