import {
  ArrowLeft,
  BadgeCheck,
  BookOpenText,
  Check,
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
import { Avatar, SelectMenu, Tag } from '../components/Ui';
import { useDemo } from '../state/DemoContext';

const detailTracks = {
  geo: {
    core: '可信 GEO 的起点不是批量生产内容，而是固定用户问题、品牌事实、可信信源与测量基线。只有每次变化都可追溯，团队才能判断品牌是否真的被 AI 正确理解和推荐。',
    points: [['4 类', '用户意图层级'], ['3 轮', '最低重复测试'], ['100%', '品牌事实可追溯']],
    checklistTitle: 'GEO 四阶段执行检查表',
    checklist: [
      ['阶段 01', '明确业务目标并冻结测试问题集', '品牌负责人 + 数据分析'],
      ['阶段 02', '整理品牌事实、证据与可信信源', '产品市场 + 内容运营'],
      ['阶段 03', '跨平台测试、记录引用与异常', 'GEO 运营 + 数据分析'],
      ['阶段 04', '复测、归因并连接有效商机', '市场运营 + 销售运营'],
    ],
    sections: [
      { id: 'baseline', number: '01', title: '先冻结问题集与测量基线', lead: '如果每轮测试的问题、平台和时间窗口都不同，任何可见度变化都无法解释。', content: ['问题集按品牌认知、需求判断、方案对比和采购决策四层组织。每道问题记录目标用户、测试目的、期望出现的品牌事实以及不应出现的越界表达。', '首次测试同步保存模型名称、版本、时间、完整回答、推荐位置和引用来源。后续只有在问题集版本明确升级时才能更换样本。'], source: '来自 GEO 策略、搜索营销与数据分析角色的共同实践' },
      { id: 'facts', number: '02', title: '让每一条品牌结论都有事实与证据', lead: '大模型能否正确理解品牌，取决于公开信息是否清晰、一致且可交叉验证。', content: ['将产品能力、适用对象、资质、案例、服务范围和限制条件拆成独立事实单元，每项绑定负责人、证据链接、生效时间和失效时间。', '不同渠道出现冲突时不直接覆盖，应先确认权威来源，再同步更新知识库、自有页面和外部可信信源，并保留修改记录。'], source: '主要来自品牌策略、产品市场和知识库运营贡献者' },
      { id: 'measure', number: '03', title: '把可见度变化连接到真实业务结果', lead: '提及次数只是过程信号，最终还要看品牌是否被正确理解并带来有效行动。', content: ['监测至少包含品牌提及率、推荐位置、事实准确率、引用质量和回答情感五类指标，连续复测后再判断趋势。', '当可见度发生变化时，对照内容发布时间、信源收录、平台版本和同期活动；同时通过来源标记观察咨询、留资和有效商机，避免把自然波动当成优化成果。'], source: '来自增长分析、销售运营与 GEO 交付团队的交叉验证' },
    ],
    sourceTitle: '8 位贡献者的实践被本版本采纳',
    sourceText: '关键结论覆盖品牌策略、内容生产、信源分发、数据测量和销售归因，角色之间的交叉印证程度较高。',
    conflictTitle: '关于“推荐位置”的计算方式仍有分歧',
    conflictText: '部分团队按第一次出现位置计分，另一些团队按回答中的推荐强度计分。本版本保留两项指标，不合并成单一排名。',
  },
  marketing: {
    core: 'AI 营销不能只追求生成速度。稳定产出来自清晰的受众和目标、经过确认的品牌事实、分层审核机制，以及能够回流到下一轮内容生产的真实投放数据。',
    points: [['1 份', '品牌事实源'], ['4 层', '内容审核机制'], ['2 轮', '最低实验周期']],
    checklistTitle: 'AI 营销内容上线检查表',
    checklist: [['阶段 01', '锁定受众、场景和转化目标', '市场策略'], ['阶段 02', '整理产品事实和品牌表达边界', '产品市场'], ['阶段 03', '批量生成、去重与合规复核', '内容 + 法务'], ['阶段 04', '小流量测试并回收数据', '媒介 + 增长']],
    sections: [
      { id: 'baseline', number: '01', title: '先写清受众与业务目标', lead: '没有明确目标的批量生成，只会制造更多相似内容。', content: ['每个内容任务先确定目标人群、所处决策阶段、希望解决的问题和唯一行动目标，再选择文章、广告、落地页或销售物料等形式。', '产品事实必须来自统一资料源，生成提示中同时写入禁止承诺、敏感表述和需要保留的关键术语。'], source: '来自品牌、产品市场和增长团队的共同方法' },
      { id: 'facts', number: '02', title: '分层筛选而不是逐条人工重写', lead: '审核机制需要优先拦截事实错误和品牌风险，再评价创意表现。', content: ['第一层检查事实与合规，第二层检查品牌语气，第三层检查内容差异度，最后才评估点击和转化潜力。任何事实来源不明的内容都不进入投放池。', '对于批量创意，先用规则和模型去重，再由人工集中评审少量候选，保留淘汰原因作为下一轮生成约束。'], source: '主要来自创意、法务与广告运营贡献者' },
      { id: 'measure', number: '03', title: '让投放结果回到内容工作流', lead: '一次点击率高不代表方法可复用，需要观察后续行为和多轮稳定性。', content: ['实验只改变一个关键变量，并为每个版本保留素材、提示、受众和投放配置。至少完成两轮测试后再固化模板。', '复盘同时查看点击、有效停留、留资质量和销售反馈，把高价值表达沉淀进品牌内容库，把失败样本转成新的禁止规则。'], source: '来自媒介投放、销售运营与数据分析角色的验证' },
    ],
    sourceTitle: '7 位贡献者的内容被本版本采用',
    sourceText: '覆盖品牌、创意、媒介、法务和销售反馈，能够同时解释生成效率与业务质量。',
    conflictTitle: '创意差异度与品牌统一之间需要平衡',
    conflictText: '部分贡献者更强调统一模板，另一些更重视渠道原生表达。本版本建议固定品牌事实与语气，开放结构和创意形式。',
  },
  sales: {
    core: '销售工具的核心不是功能数量，而是让客户、商机、动作和责任保持一致。先统一对象与状态，再自动化高频且规则稳定的动作，才能真正提升一线效率。',
    points: [['5 个', '最小核心对象'], ['1 人', '每个状态负责人'], ['7 天', '首次使用验证']],
    checklistTitle: '销售工具落地检查表',
    checklist: [['阶段 01', '梳理对象、字段和现有流程', '销售运营'], ['阶段 02', '定义状态、权限和异常回退', '业务 + 产品'], ['阶段 03', '小团队试用并修正字段', '销售试点组'], ['阶段 04', '上线自动化与数据看板', '销售运营 + 技术']],
    sections: [
      { id: 'baseline', number: '01', title: '从业务对象和状态开始设计', lead: '先回答团队究竟在管理什么，再决定页面和功能。', content: ['最小对象通常包括客户、联系人、线索、商机和跟进动作。每个字段都应对应一个明确业务判断，没有使用场景的字段不进入首版。', '状态变化必须有进入条件、负责人和退出条件。销售不能靠自由文本表达关键状态，管理者也不能只凭印象判断项目健康度。'], source: '来自销售一线、销售运营和售前团队的共同经验' },
      { id: 'facts', number: '02', title: '只自动化规则稳定的高频动作', lead: '自动化的价值是减少遗漏，不是隐藏业务判断。', content: ['线索分配、超时提醒、报价审批和跟进任务适合优先自动化；客户归属争议、特殊折扣和高风险承诺必须保留人工确认。', '每次自动动作都要记录触发条件、执行结果和回退入口，让业务人员知道系统为什么这样处理。'], source: '主要来自渠道管理、销售系统和业务财务贡献者' },
      { id: 'measure', number: '03', title: '用一线使用验证系统是否有效', lead: '如果销售为了完成填报而维护另一份表格，系统就没有真正进入工作流。', content: ['先选一个小团队运行七天，观察重复录入、字段空缺、状态停滞和提醒关闭情况，再决定是否扩展功能。', '看板同时呈现商机推进、数据完整度和自动化失败，复盘时优先删除无用字段，而不是持续增加管理要求。'], source: '来自销售负责人和销售运营团队的试点反馈' },
    ],
    sourceTitle: '9 位贡献者的销售实践被采纳',
    sourceText: '案例覆盖直销、渠道、售前和业务财务，关键状态与权限规则得到多角色验证。',
    conflictTitle: '关于必填字段数量存在分歧',
    conflictText: '管理者希望获得更多信息，一线销售更看重录入效率。本版本以是否触发后续动作作为字段保留标准。',
  },
  knowledge: {
    core: '企业知识库的效果首先取决于内容治理、权限和责任机制，其次才是模型参数。高风险问题必须明确证据来源、转人工条件和拒答边界。',
    points: [['1 人', '每类知识责任人'], ['4 层', '问答诊断链路'], ['0 条', '无来源高风险回答']],
    checklistTitle: '企业知识库治理检查表',
    checklist: [['阶段 01', '盘点知识源、权限和责任人', '知识运营'], ['阶段 02', '清洗、去重、分级并建立版本', '内容治理'], ['阶段 03', '建立标准问题集与失败分类', '产品 + 业务'], ['阶段 04', '上线监测并持续补洞', '运营 + 客服']],
    sections: [
      { id: 'baseline', number: '01', title: '先治理知识，再接入模型', lead: '把所有文档直接导入，只会让过期和冲突信息更快地传播。', content: ['每份知识必须标记来源、权限、责任人、生效时间和有效期；重复或冲突内容先确定权威版本，再进入可检索范围。', '敏感知识按最小权限开放，文档继承原系统权限时要验证群组、离职和跨部门场景，不能只测试管理员账号。'], source: '来自知识工程、内容治理和信息安全角色的共同实践' },
      { id: 'facts', number: '02', title: '把问答失败定位到具体环节', lead: '回答不好不一定是模型问题，必须区分知识缺失、解析、检索、排序和生成。', content: ['标准问题集同时保存正确答案、证据片段、允许表达和禁止表达。测试时逐步检查文档能否解析、证据能否召回、排序是否正确以及回答是否忠于证据。', '对于信息不足的问题，系统应优先追问；高风险或证据冲突时转人工，不能通过更强提示强行生成答案。'], source: '主要来自 RAG 工程、客服产品与合规贡献者' },
      { id: 'measure', number: '03', title: '让真实会话持续推动知识补洞', lead: '知识库不是一次性建设项目，而是随产品和业务变化持续维护的运营系统。', content: ['对未命中、低置信度、转人工和用户负反馈会话进行聚类，区分应补文档、改切片、调检索还是修改业务规则。', '每次知识更新都重新运行受影响的问题集，并记录新旧版本差异；产品变更时先更新知识，再对外发布新能力。'], source: '来自客服运营、产品和知识库管理员的长期使用反馈' },
    ],
    sourceTitle: '10 位知识与客服角色的实践被采纳',
    sourceText: '内容覆盖知识治理、RAG 评测、客服接管和安全权限，关键原则具有较强一致性。',
    conflictTitle: '知识切片粒度不存在统一答案',
    conflictText: '贡献者在固定长度和语义结构之间存在分歧。本版本建议按文档类型建立不同策略，并以真实问题集验证。',
  },
  operations: {
    core: '企业 AI 产品运营的目标不是提高调用量，而是让客户持续完成可验证的业务任务，并把失败样本转化为产品、知识和流程改进。',
    points: [['30 天', '首轮客户激活'], ['5 类', '核心运营指标'], ['1 周', '失败样本复盘']],
    checklistTitle: '企业 AI 产品运营检查表',
    checklist: [['阶段 01', '选择首个可验证业务场景', '客户负责人'], ['阶段 02', '完成数据、权限和管理员准备', '交付团队'], ['阶段 03', '监测使用、质量、成本与风险', '产品运营'], ['阶段 04', '复盘失败并进入版本迭代', '产品 + 研发']],
    sections: [
      { id: 'baseline', number: '01', title: '先让客户完成一个可验证结果', lead: '首次激活不追求覆盖所有功能，而要尽快证明一个真实业务场景的价值。', content: ['共同选择范围可控、数据可得、负责人明确的首个场景，写清成功标准、最晚验证时间和人工兜底方式。', '上线前完成知识、权限、系统连接和管理员培训，任何关键条件缺失都不进入正式使用计时。'], source: '来自企业交付、客户运营和产品负责人的共同经验' },
      { id: 'facts', number: '02', title: '同时观察使用、质量、成本和风险', lead: '调用次数增长可能掩盖失败率、人工接管和单位成本上升。', content: ['看板至少包含活跃使用、任务完成率、失败原因、人工接管、响应成本和风险事件，按客户和场景分层查看。', '失败样本必须绑定业务后果和处理状态，避免只统计技术错误而忽略用户放弃、答案无用和流程未完成。'], source: '主要来自智能体运营、数据分析和客户成功角色' },
      { id: 'measure', number: '03', title: '把客户声音变成明确的迭代输入', lead: '销售异议、客服问题和使用失败必须进入同一问题池。', content: ['所有问题统一关联客户、场景、频次、影响和证据，先区分个性需求、知识缺口、产品缺陷和流程问题，再确定责任团队。', '每周复盘最高影响问题，处理结果回传给销售和客户；只有经过真实客户验证的改进才标记为完成。'], source: '来自产品运营、销售、客服和研发团队的闭环实践' },
    ],
    sourceTitle: '8 位产品与运营贡献者的内容被采纳',
    sourceText: '案例覆盖客户激活、智能体运营、成本监控和需求闭环，关键指标可直接用于企业 AI 产品。',
    conflictTitle: '调用量是否应作为核心目标仍有争议',
    conflictText: '本版本将调用量视为使用信号，不作为单独成功指标；必须与任务完成率和客户业务结果同时判断。',
  },
};

export default function KnowHowPage() {
  const { knowHowId } = useParams();
  const navigate = useNavigate();
  const { user, followedKnowHows, toggleKnowHowFollow, notify } = useDemo();
  const item = knowHows.find((entry) => entry.id === knowHowId) || knowHows[0];
  const detail = detailTracks[item.track] || detailTracks.geo;
  const sections = detail.sections;
  const [version, setVersion] = useState(item.version);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([
    { name: '梁知远', initials: '梁', time: '2 小时前', text: `第 3 节的复测方法很实用。我们在“${item.tags[0]}”项目中也会保留完整变更记录，避免把口径变化误判为效果提升。` },
    { name: '沈知行', initials: '沈', time: '昨天', text: '建议继续补充跨部门责任边界：事实、规则和系统配置发生冲突时，必须明确由谁做最终确认。' },
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
        <div><span>当前版本</span><SelectMenu compact ariaLabel="选择 Know-how 版本" value={version} options={[item.version, 'v0.9']} onChange={setVersion} /></div>
        <div><span>贡献者</span><strong><UsersRound size={16} />{item.contributors} 位</strong></div>
        <div><span>质量状态</span><strong><BadgeCheck size={16} />{item.status} · {item.confidence}</strong></div>
        <div><span>来源</span>{sourceTask ? <Link to={`/task/${sourceTask.id}`}><Link2 size={15} />查看悬赏任务</Link> : <strong>自由创建</strong>}</div>
      </div>

      <div className="knowhow-body">
        <aside className="toc">
          <span>本页目录</span>
          {sections.map((section) => <a key={section.id} href={`#${section.id}`}><i>{section.number}</i>{section.title}</a>)}
          <a href="#checklist"><i>04</i>{detail.checklistTitle}</a>
          <a href="#sources"><i>05</i>来源与冲突</a>
          <div className="toc-actions">
            <button onClick={() => navigate('/create-task')}><GitBranch size={16} />基于此版本发起迭代</button>
            <button onClick={() => notify('历史版本面板已打开')}><History size={16} />查看版本历史</button>
          </div>
        </aside>
        <article className="knowhow-article">
          <section className="executive-summary">
            <span><Sparkles size={17} />核心结论</span>
            <p>{detail.core}</p>
            <div className="summary-points">{detail.points.map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
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
            <h2>{detail.checklistTitle}</h2>
            <div className="week-list">
              {detail.checklist.map(([week, task, owner]) => <div key={week}><strong>{week}</strong><span>{task}</span><em>{owner}</em></div>)}
            </div>
          </section>
          <section className="content-section sources-section" id="sources">
            <span className="content-number">05</span>
            <h2>来源、冲突与信息缺口</h2>
            <div className="source-box"><BadgeCheck size={19} /><div><strong>{detail.sourceTitle}</strong><p>{detail.sourceText}</p></div></div>
            <div className="source-box conflict"><CircleAlert size={19} /><div><strong>{detail.conflictTitle}</strong><p>{detail.conflictText}</p></div></div>
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
