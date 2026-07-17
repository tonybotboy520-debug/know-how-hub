import {
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Coins,
  Gift,
  QrCode,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemo } from '../state/DemoContext';

const plans = [
  {
    id: 'monthly',
    eyebrow: '1 MONTH',
    name: '月度方案',
    description: '适合先体验一次完整悬赏流程',
    price: 99,
    basePoints: 1000,
    bonusPoints: 0,
    totalPoints: 1000,
    saving: 0,
    accessMonths: 1,
    callMultiplier: 1,
    callTier: '基础调用次数',
    autoUpdate: false,
  },
  {
    id: 'half-year',
    eyebrow: '6 MONTHS',
    name: '半年方案',
    description: '适合持续沉淀团队方法与流程',
    price: 499,
    basePoints: 6000,
    bonusPoints: 800,
    totalPoints: 6800,
    saving: 95,
    accessMonths: 6,
    callMultiplier: 5,
    callTier: '进阶调用次数',
    autoUpdate: true,
  },
  {
    id: 'annual',
    eyebrow: '12 MONTHS',
    name: '年度方案',
    description: '适合把 Know-how 建设纳入年度计划',
    price: 899,
    basePoints: 12000,
    bonusPoints: 2600,
    totalPoints: 14600,
    saving: 289,
    accessMonths: 12,
    callMultiplier: 20,
    callTier: '高额度调用次数',
    autoUpdate: true,
    privateKnowHow: true,
    recommended: true,
  },
];

const paymentMethods = [
  { id: 'alipay', label: '支付宝', description: '扫码或使用支付宝余额', icon: QrCode },
  { id: 'wechat', label: '微信支付', description: '使用微信扫码完成支付', icon: WalletCards },
  { id: 'company', label: '对公转账', description: '适合企业采购，可申请发票', icon: Building2 },
];

export default function PurchasePointsPage() {
  const navigate = useNavigate();
  const { points, setPoints, notify } = useDemo();
  const [selectedId, setSelectedId] = useState('annual');
  const [paymentMethod, setPaymentMethod] = useState('alipay');
  const [agreed, setAgreed] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [completedPlan, setCompletedPlan] = useState(null);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedId) || plans[0],
    [selectedId],
  );

  const completePayment = () => {
    if (!agreed || processing) return;
    setProcessing(true);
    window.setTimeout(() => {
      setPoints((current) => current + selectedPlan.totalPoints);
      setCompletedPlan(selectedPlan);
      setProcessing(false);
      notify(`${selectedPlan.totalPoints.toLocaleString()} 积分已到账`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 850);
  };

  if (completedPlan) {
    return (
      <div className="page purchase-page purchase-success-page">
        <section className="purchase-success">
          <div className="success-orbit"><CheckCircle2 size={42} /></div>
          <span className="page-kicker">PAYMENT COMPLETE / 支付完成</span>
          <h1>积分已经到账</h1>
          <p>本次购买的 {completedPlan.totalPoints.toLocaleString()} 积分已加入你的账户，可以立即用于发布悬赏或购买 Know-how。</p>
          <div className="success-receipt">
            <div><span>购买方案</span><strong>{completedPlan.name}</strong></div>
            <div><span>支付金额</span><strong>¥{completedPlan.price}</strong></div>
            <div><span>到账积分</span><strong>{completedPlan.totalPoints.toLocaleString()}</strong></div>
            <div><span>当前余额</span><strong>{points.toLocaleString()} 积分</strong></div>
          </div>
          <div className="success-actions">
            <button className="primary-button" onClick={() => navigate('/create-task')}>发布 Know-how 任务<ArrowRight size={17} /></button>
            <button className="outline-button" onClick={() => navigate('/')}>返回任务市场</button>
          </div>
          <button className="purchase-again" onClick={() => setCompletedPlan(null)}>继续购买积分</button>
        </section>
      </div>
    );
  }

  return (
    <div className="page purchase-page">
      <header className="purchase-hero">
        <div className="purchase-hero-copy">
          <span className="page-kicker">POINTS STORE / 积分购买</span>
          <h1>把预算变成<br /><em>可执行的实践知识</em></h1>
          <p>使用人民币购买平台积分。进入 Know-how Hub 后，购买内容、发布悬赏和贡献结算都只使用积分。</p>
          <div className="purchase-promises">
            <span><ShieldCheck size={16} />一次性支付</span>
            <span><Check size={16} />不自动续费</span>
            <span><ReceiptText size={16} />支持企业发票</span>
          </div>
        </div>
        <div className="balance-ticket">
          <div className="ticket-top"><Coins size={20} /><span>当前可用积分</span></div>
          <strong>{points.toLocaleString()}</strong>
          <p>积分到账后，可立即用于所有平台内交易。</p>
          <i>KNOW-HOW HUB · PTS</i>
        </div>
      </header>

      <main className="purchase-content">
        <section className="plans-section">
          <div className="purchase-section-head">
            <div><span className="page-kicker">01 / CHOOSE A PLAN</span><h2>选择积分方案</h2></div>
            <p>购买周期越长，现金单价越低，额外赠送积分越多。</p>
          </div>
          <div className="plans-grid">
            {plans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                className={`plan-card ${selectedId === plan.id ? 'selected' : ''} ${plan.recommended ? 'recommended' : ''}`}
                onClick={() => setSelectedId(plan.id)}
                aria-pressed={selectedId === plan.id}
              >
                <div className="plan-card-top">
                  <span>{plan.eyebrow}</span>
                  <i>{selectedId === plan.id && <Check size={13} />}</i>
                </div>
                <div className="plan-title-row">
                  <h3>{plan.name}</h3>
                  {plan.recommended && <span className="plan-value-tag">最划算</span>}
                </div>
                <p>{plan.description}</p>
                <div className="plan-price"><small>¥</small><strong>{plan.price}</strong><span>/ 次</span></div>
                <ol className="plan-services">
                  <li className="points-service">
                    <i>01</i>
                    <span>平台积分{plan.bonusPoints > 0 && <small>含赠送 {plan.bonusPoints.toLocaleString()}</small>}</span>
                    <strong>{plan.totalPoints.toLocaleString()} <small>PTS</small></strong>
                  </li>
                  <li>
                    <i>02</i>
                    <span>AI Skill 使用权</span>
                    <strong>{plan.accessMonths} 个月</strong>
                  </li>
                  <li>
                    <i>03</i>
                    <span>{plan.callTier}</span>
                    <strong className="quota-value">{plan.callMultiplier}× <small>基础额度</small></strong>
                  </li>
                  <li>
                    <i>04</i>
                    <span>超额调用</span>
                    <strong>可继续使用积分</strong>
                  </li>
                  {plan.autoUpdate && (
                    <li>
                      <i>05</i>
                      <span>版本更新</span>
                      <strong>自动更新至最新</strong>
                    </li>
                  )}
                  {plan.privateKnowHow && (
                    <li className="private-service">
                      <i>06</i>
                      <span>任务成果私有化<small>开启时扣积分</small></span>
                      <strong>仅企业可见</strong>
                    </li>
                  )}
                </ol>
                <div className="plan-foot">
                  <span>一次性支付 · 不自动续费</span>
                  {plan.saving > 0 && <b className="plan-saving"><span>立省</span><strong>¥{plan.saving}</strong></b>}
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="checkout-layout">
          <div className="purchase-value-panel">
            <span className="page-kicker">02 / PUT POINTS TO WORK</span>
            <h2>积分可以用来做什么？</h2>
            <div className="value-list">
              <article><span><Sparkles size={19} /></span><div><strong>发布全新悬赏</strong><p>让领域实践者贡献真实经验，由 Agent 萃取为可复用 Know-how。</p></div></article>
              <article><span><Coins size={19} /></span><div><strong>购买已有 Know-how</strong><p>按积分价格获得 AI Skill 远程调用权，直接接入自己的 AI 工作流。</p></div></article>
              <article><span><Gift size={19} /></span><div><strong>迭代已有版本</strong><p>围绕信息缺口、适用边界或新场景发起定向补充，让知识持续生长。</p></div></article>
            </div>
            <div className="purchase-note"><ShieldCheck size={18} /><p><strong>人民币只用于购买积分。</strong>平台内的悬赏、购买和贡献分配均以积分结算，积分暂不支持提现。</p></div>
          </div>

          <aside className="order-card">
            <div className="order-heading"><div><span>ORDER SUMMARY</span><h2>确认订单</h2></div><ReceiptText size={22} /></div>
            <div className="order-plan">
              <div><strong>{selectedPlan.name}</strong><span>{selectedPlan.description}</span></div>
              <b>¥{selectedPlan.price}</b>
            </div>
            <div className="order-ledger">
              <div><span>基础积分</span><strong>{selectedPlan.basePoints.toLocaleString()}</strong></div>
              <div><span>赠送积分</span><strong className={selectedPlan.bonusPoints ? 'bonus' : ''}>+{selectedPlan.bonusPoints.toLocaleString()}</strong></div>
              <div className="order-total"><span>本次到账</span><strong>{selectedPlan.totalPoints.toLocaleString()} <small>积分</small></strong></div>
            </div>

            <fieldset className="payment-methods">
              <legend>支付方式</legend>
              {paymentMethods.map(({ id, label, description, icon: Icon }) => (
                <label key={id} className={paymentMethod === id ? 'selected' : ''}>
                  <input type="radio" name="payment" value={id} checked={paymentMethod === id} onChange={() => setPaymentMethod(id)} />
                  <span className="payment-icon"><Icon size={17} /></span>
                  <span><strong>{label}</strong><small>{description}</small></span>
                  <i>{paymentMethod === id && <Check size={12} />}</i>
                </label>
              ))}
            </fieldset>

            <label className="agreement-check">
              <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
              <span>我已了解积分用途与演示支付规则</span>
            </label>
            <button className="pay-button" disabled={!agreed || processing} onClick={completePayment}>
              <span>{processing ? '正在完成支付…' : `支付 ¥${selectedPlan.price}`}</span>
              {!processing && <ArrowRight size={18} />}
            </button>
            <p className="demo-payment-note">演示支付不会产生真实扣款，点击后将模拟积分到账。</p>
          </aside>
        </section>
      </main>
    </div>
  );
}
