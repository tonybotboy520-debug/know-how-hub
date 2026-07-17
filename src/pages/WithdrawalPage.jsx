import {
  ArrowLeft,
  Banknote,
  Check,
  ChevronRight,
  CircleHelp,
  Coins,
  History,
  Landmark,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemo } from '../state/DemoContext';

const POINTS_PER_YUAN = 10;
const WITHDRAW_UNIT = 20;
const FEE_RATE = 0.2;

const accounts = [
  { id: 'alipay', name: '支付宝', detail: '钟源 · 138****6821', icon: WalletCards },
  { id: 'bank', name: '银行卡', detail: '招商银行 · 尾号 3816', icon: Landmark },
];

const money = (value) => Number(value).toFixed(2);

export default function WithdrawalPage() {
  const navigate = useNavigate();
  const {
    points,
    setPoints,
    withdrawablePoints,
    setWithdrawablePoints,
    withdrawals,
    setWithdrawals,
    notify,
  } = useDemo();
  const availableIncome = Math.min(points, withdrawablePoints);
  const maxGross = Math.floor((availableIncome / POINTS_PER_YUAN) / WITHDRAW_UNIT) * WITHDRAW_UNIT;
  const options = useMemo(
    () => Array.from({ length: maxGross / WITHDRAW_UNIT }, (_, index) => (index + 1) * WITHDRAW_UNIT),
    [maxGross],
  );
  const [amount, setAmount] = useState(() => Math.min(maxGross, 40));
  const [account, setAccount] = useState('alipay');
  const [agreed, setAgreed] = useState(true);
  const [result, setResult] = useState(null);

  const gross = options.includes(amount) ? amount : 0;
  const pointsUsed = gross * POINTS_PER_YUAN;
  const fee = gross * FEE_RATE;
  const received = gross - fee;
  const remainingIncome = availableIncome - pointsUsed;

  const submit = () => {
    if (!gross || !agreed) return;
    const selectedAccount = accounts.find((item) => item.id === account);
    const record = {
      id: `WD-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${String(Date.now()).slice(-4)}`,
      date: new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()).replaceAll('/', '.'),
      points: pointsUsed,
      gross,
      fee,
      received,
      method: selectedAccount.name,
      status: '已到账',
    };
    setPoints((value) => Math.max(0, value - pointsUsed));
    setWithdrawablePoints((value) => Math.max(0, value - pointsUsed));
    setWithdrawals((items) => [record, ...items]);
    setResult({ ...record, account: selectedAccount.detail });
    notify(`提现完成，¥${money(received)} 已模拟到账`);
  };

  if (result) {
    return (
      <div className="withdrawal-page">
        <div className="withdraw-success">
          <div className="success-stamp"><Check size={31} strokeWidth={2.4} /></div>
          <span className="page-kicker">WITHDRAWAL COMPLETE</span>
          <h1>提现已完成</h1>
          <p>演示款项已发送至你的{result.method}账户</p>
          <div className="success-money"><span>实际到账</span><strong>¥{money(result.received)}</strong></div>
          <dl>
            <div><dt>提现积分</dt><dd>{result.points.toLocaleString()} 积分</dd></div>
            <div><dt>提现服务费</dt><dd>¥{money(result.fee)}</dd></div>
            <div><dt>收款账户</dt><dd>{result.account}</dd></div>
            <div><dt>提现单号</dt><dd>{result.id}</dd></div>
          </dl>
          <div className="withdraw-success-actions">
            <button onClick={() => navigate('/profile')}>返回个人中心</button>
            <button onClick={() => setResult(null)}>继续查看收益</button>
          </div>
          <small>当前为产品 Demo，不会产生真实资金转账。</small>
        </div>
      </div>
    );
  }

  return (
    <div className="withdrawal-page">
      <header className="withdrawal-header">
        <button onClick={() => navigate('/profile')}><ArrowLeft size={17} />个人中心</button>
        <div>
          <span className="page-kicker">CONTRIBUTOR PAYOUT</span>
          <h1>贡献收益提现</h1>
          <p>将被采纳贡献、Know-how 使用权分成和调用版税所得积分兑换为现金。</p>
        </div>
        <div className="withdrawal-policy"><ShieldCheck size={19} /><span><strong>收益积分专属</strong><small>购买所得积分不可提现</small></span></div>
      </header>

      <section className="income-overview">
        <div className="income-balance">
          <div className="income-label"><Coins size={18} /><span>可提现贡献收益</span></div>
          <strong>{availableIncome.toLocaleString()}<small>积分</small></strong>
          <p>按 Demo 兑换率约合 ¥{money(availableIncome / POINTS_PER_YUAN)}</p>
          <div className="income-separation">
            <span>账户总积分 <b>{points.toLocaleString()}</b></span>
            <span>非收益积分 <b>{Math.max(0, points - availableIncome).toLocaleString()}</b></span>
          </div>
        </div>
        <div className="withdrawable-now">
          <span>本次最多可提现</span>
          <strong>¥{maxGross}</strong>
          <p>{maxGross >= WITHDRAW_UNIT ? `按 ¥${WITHDRAW_UNIT} 的整数单位提现` : `还差 ${(WITHDRAW_UNIT * POINTS_PER_YUAN - availableIncome).toLocaleString()} 积分达到门槛`}</p>
          <i>10 PTS = ¥1 · DEMO RATE</i>
        </div>
        <div className="rule-rail">
          <div><b>01</b><span><strong>无需等待</strong><small>收益结算后即可申请</small></span></div>
          <div><b>02</b><span><strong>20 元一档</strong><small>不足一档继续留存</small></span></div>
          <div><b>03</b><span><strong>20% 服务费</strong><small>提交前清晰展示</small></span></div>
        </div>
      </section>

      <main className="withdrawal-content">
        <section className="withdrawal-form">
          <div className="withdraw-section-head">
            <span>01</span>
            <div><h2>选择提现金额</h2><p>仅显示当前收益可支持的 20 元整数档位</p></div>
          </div>
          {options.length > 0 ? (
            <div className="amount-options">
              {options.map((option) => (
                <button className={amount === option ? 'selected' : ''} key={option} onClick={() => setAmount(option)}>
                  <span>提现</span><strong>¥{option}</strong>{amount === option && <Check size={15} />}
                </button>
              ))}
            </div>
          ) : (
            <div className="withdraw-empty"><CircleHelp size={20} /><div><strong>暂未达到最低提现门槛</strong><p>贡献收益每达到 {WITHDRAW_UNIT * POINTS_PER_YUAN} 积分，可申请提现 ¥{WITHDRAW_UNIT}。</p></div></div>
          )}

          <div className="withdraw-section-head account-heading">
            <span>02</span>
            <div><h2>选择收款账户</h2><p>实名与收款账户规则仍待正式上线前确认</p></div>
          </div>
          <div className="account-options">
            {accounts.map(({ id, name, detail, icon: Icon }) => (
              <button className={account === id ? 'selected' : ''} key={id} onClick={() => setAccount(id)}>
                <i><Icon size={19} /></i>
                <span><strong>{name}</strong><small>{detail}</small></span>
                <em>{account === id && <Check size={14} />}</em>
              </button>
            ))}
          </div>

          <label className="withdraw-agreement">
            <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
            <span>我已确认提现金额、服务费及演示兑换规则</span>
          </label>
        </section>

        <aside className="withdrawal-summary">
          <div className="summary-title"><Banknote size={20} /><span><small>WITHDRAWAL SUMMARY</small><strong>提现明细</strong></span></div>
          <div className="summary-primary"><span>申请提现</span><strong>¥{money(gross)}</strong></div>
          <dl>
            <div><dt>扣除收益积分</dt><dd>-{pointsUsed.toLocaleString()}</dd></div>
            <div><dt>提现服务费（20%）</dt><dd>-¥{money(fee)}</dd></div>
            <div><dt>剩余收益积分</dt><dd>{Math.max(0, remainingIncome).toLocaleString()}</dd></div>
          </dl>
          <div className="summary-received"><span>实际到账</span><strong>¥{money(received)}</strong></div>
          <button disabled={!gross || !agreed} onClick={submit}>确认提现<ChevronRight size={18} /></button>
          <p><ShieldCheck size={14} />Demo 将立即模拟到账，不会发起真实转账。</p>
        </aside>
      </main>

      <section className="withdraw-history">
        <div className="history-heading"><div><span className="page-kicker">PAYOUT HISTORY</span><h2>提现记录</h2></div><History size={20} /></div>
        <div className="history-table">
          <div className="history-row history-labels"><span>日期 / 单号</span><span>提现积分</span><span>实际到账</span><span>方式</span><span>状态</span></div>
          {withdrawals.map((item) => (
            <div className="history-row" key={item.id}>
              <span><strong>{item.date}</strong><small>{item.id}</small></span>
              <span>{item.points.toLocaleString()}</span>
              <span><strong>¥{money(item.received)}</strong><small>含服务费 ¥{money(item.fee)}</small></span>
              <span>{item.method}</span>
              <span><i />{item.status}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
