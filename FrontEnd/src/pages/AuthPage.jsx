import { ArrowRight, Check, Eye, EyeOff, Mail, Phone, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { currentUser } from '../data';
import { useDemo } from '../state/DemoContext';
import BrandLogo from '../components/BrandLogo';

export default function AuthPage({ mode }) {
  const register = mode === 'register';
  const navigate = useNavigate();
  const { setUser, setPoints, notify } = useDemo();
  const [method, setMethod] = useState('phone');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ account: '', code: '', password: '', name: '' });
  const update = (key, value) => setForm((item) => ({ ...item, [key]: value }));

  const submit = (event) => {
    event.preventDefault();
    setLoading(true);
    window.setTimeout(() => {
      setUser({ ...currentUser, name: register && form.name ? form.name : currentUser.name, initials: register && form.name ? form.name.slice(0, 1) : currentUser.initials });
      if (register) setPoints(800);
      notify(register ? '注册成功，800 初始积分已到账' : '欢迎回来');
      navigate('/');
    }, 700);
  };

  return (
    <div className="auth-page">
      <aside className="auth-story">
        <Link className="brand inverse" to="/"><BrandLogo /></Link>
        <div className="auth-story-copy">
          <span className="page-kicker">KNOWLEDGE, IN PRACTICE</span>
          <h1>真正有用的知识，<br />往往藏在<em>做过的人</em>那里。</h1>
          <p>让问题找到实践者，让经验经过 AI 的访谈、萃取与验证，成为下一次可以直接使用的答案。</p>
        </div>
        <div className="auth-quote"><Sparkles size={18} /><p>“不是告诉你是什么，<br />而是陪你把事情做成。”</p><span>KNOW-HOW HUB / 2026</span></div>
      </aside>
      <main className="auth-form-wrap">
        <Link className="mobile-auth-brand" to="/"><BrandLogo /></Link>
        <div className="auth-form">
          <span className="page-kicker">{register ? 'CREATE ACCOUNT' : 'WELCOME BACK'}</span>
          <h2>{register ? '加入实践知识网络' : '登录 Know-how Hub'}</h2>
          <p>{register ? '注册即可获得足够发布一个基础任务的初始积分。' : '继续提出问题、贡献经验，或查看你关注的进展。'}</p>
          <div className="auth-method">
            <button className={method === 'phone' ? 'active' : ''} onClick={() => setMethod('phone')}><Phone size={16} />手机号</button>
            <button className={method === 'email' ? 'active' : ''} onClick={() => setMethod('email')}><Mail size={16} />邮箱</button>
          </div>
          <form onSubmit={submit}>
            {register && <label><span>昵称</span><input value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="大家会怎样称呼你" required /></label>}
            <label><span>{method === 'phone' ? '手机号' : '邮箱'}</span><input type={method === 'phone' ? 'tel' : 'email'} value={form.account} onChange={(event) => update('account', event.target.value)} placeholder={method === 'phone' ? '请输入手机号' : 'name@example.com'} required /></label>
            {register ? (
              <label><span>验证码</span><div className="code-field"><input value={form.code} onChange={(event) => update('code', event.target.value)} placeholder="6 位验证码" required /><button type="button" onClick={() => update('code', '246810')}>获取验证码</button></div></label>
            ) : (
              <label><span>密码</span><div className="password-field"><input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(event) => update('password', event.target.value)} placeholder="请输入密码" required /><button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
            )}
            <button className="primary-button large" type="submit" disabled={loading}>{loading ? '请稍候…' : register ? '创建账号' : '登录'}<ArrowRight size={17} /></button>
          </form>
          <div className="auth-switch">{register ? '已有账号？' : '第一次来到这里？'} <Link to={register ? '/login' : '/register'}>{register ? '直接登录' : '创建账号'}</Link></div>
          {!register && <button className="demo-login" onClick={() => { setUser(currentUser); navigate('/'); }}><Check size={15} />使用演示账号一键登录</button>}
          <Link className="guest-link" to="/">暂不登录，先浏览公开内容</Link>
        </div>
      </main>
    </div>
  );
}
