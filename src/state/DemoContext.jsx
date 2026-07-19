import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { currentUser } from '../data';

const DemoContext = createContext(null);

const initialWithdrawals = [
  { id: 'WD-20260618-0821', date: '2026.06.18', points: 200, gross: 20, fee: 4, received: 16, method: '支付宝', status: '已到账' },
  { id: 'WD-20260502-0417', date: '2026.05.02', points: 400, gross: 40, fee: 8, received: 32, method: '银行卡', status: '已到账' },
];
const initialFollowedTasks = ['geo-visibility-baseline', 'vibe-sales-crm'];
const initialFollowedKnowHows = ['b2b-geo-visibility', 'enterprise-knowledge-governance'];
const initialSubmittedTasks = ['ai-presales-proposal'];
const initialContributionParticipantIncrements = {};

const read = (key, fallback) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
};

const readUser = () => {
  const savedUser = read('kh-user', currentUser);
  const isLegacyDemoUser = savedUser?.name === '林舟' && savedUser?.handle === '@linzhou';
  const usesLegacyProfile = savedUser?.bio?.includes('客户成功与服务流程设计') || savedUser?.tags?.includes('服务设计');
  return isLegacyDemoUser || usesLegacyProfile ? currentUser : savedUser;
};

export function DemoProvider({ children }) {
  const [user, setUser] = useState(readUser);
  const [points, setPoints] = useState(() => read('kh-points', currentUser.points));
  const [withdrawablePoints, setWithdrawablePoints] = useState(() => read('kh-withdrawable-points', 548));
  const [withdrawals, setWithdrawals] = useState(() => read('kh-withdrawals', initialWithdrawals));
  const [followedTasks, setFollowedTasks] = useState(() => read('kh-followed-tasks-v2', initialFollowedTasks));
  const [followedKnowHows, setFollowedKnowHows] = useState(() => read('kh-followed-knowhows-v2', initialFollowedKnowHows));
  const [createdTasks, setCreatedTasks] = useState(() => read('kh-created-tasks', []));
  const [createdKnowHows, setCreatedKnowHows] = useState(() => read('kh-created-knowhows', []));
  const [submittedTasks, setSubmittedTasks] = useState(() => read('kh-submitted-tasks-v2', initialSubmittedTasks));
  const [contributionParticipantIncrements, setContributionParticipantIncrements] = useState(() => read('kh-task-participant-increments', initialContributionParticipantIncrements));
  const [toast, setToast] = useState('');

  useEffect(() => localStorage.setItem('kh-user', JSON.stringify(user)), [user]);
  useEffect(() => localStorage.setItem('kh-points', JSON.stringify(points)), [points]);
  useEffect(() => localStorage.setItem('kh-withdrawable-points', JSON.stringify(withdrawablePoints)), [withdrawablePoints]);
  useEffect(() => localStorage.setItem('kh-withdrawals', JSON.stringify(withdrawals)), [withdrawals]);
  useEffect(() => localStorage.setItem('kh-followed-tasks-v2', JSON.stringify(followedTasks)), [followedTasks]);
  useEffect(() => localStorage.setItem('kh-followed-knowhows-v2', JSON.stringify(followedKnowHows)), [followedKnowHows]);
  useEffect(() => localStorage.setItem('kh-created-tasks', JSON.stringify(createdTasks)), [createdTasks]);
  useEffect(() => localStorage.setItem('kh-created-knowhows', JSON.stringify(createdKnowHows)), [createdKnowHows]);
  useEffect(() => localStorage.setItem('kh-submitted-tasks-v2', JSON.stringify(submittedTasks)), [submittedTasks]);
  useEffect(() => localStorage.setItem('kh-task-participant-increments', JSON.stringify(contributionParticipantIncrements)), [contributionParticipantIncrements]);

  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  };

  const toggleTaskFollow = (id) => {
    if (!user) return false;
    setFollowedTasks((items) => (items.includes(id) ? items.filter((item) => item !== id) : [...items, id]));
    notify(followedTasks.includes(id) ? '已取消关注任务' : '已关注任务进展');
    return true;
  };

  const toggleKnowHowFollow = (id) => {
    if (!user) return false;
    setFollowedKnowHows((items) => (items.includes(id) ? items.filter((item) => item !== id) : [...items, id]));
    notify(followedKnowHows.includes(id) ? '已取消关注 Know-how' : '已关注后续版本');
    return true;
  };

  const recordTaskContribution = (id) => {
    if (submittedTasks.includes(id)) return false;
    setSubmittedTasks((items) => [...items, id]);
    setContributionParticipantIncrements((items) => ({
      ...items,
      [id]: (Number(items[id]) || 0) + 1,
    }));
    return true;
  };

  const resetDemoData = () => {
    Object.keys(localStorage)
      .filter((key) => key.startsWith('kh-'))
      .forEach((key) => localStorage.removeItem(key));
    setUser(currentUser);
    setPoints(currentUser.points);
    setWithdrawablePoints(548);
    setWithdrawals(initialWithdrawals);
    setFollowedTasks(initialFollowedTasks);
    setFollowedKnowHows(initialFollowedKnowHows);
    setCreatedTasks([]);
    setCreatedKnowHows([]);
    setSubmittedTasks(initialSubmittedTasks);
    setContributionParticipantIncrements(initialContributionParticipantIncrements);
    notify('本地演示数据已清除，已恢复初始状态');
  };

  const value = useMemo(
    () => ({
      user,
      setUser,
      points,
      setPoints,
      withdrawablePoints,
      setWithdrawablePoints,
      withdrawals,
      setWithdrawals,
      followedTasks,
      followedKnowHows,
      createdTasks,
      setCreatedTasks,
      createdKnowHows,
      setCreatedKnowHows,
      submittedTasks,
      setSubmittedTasks,
      contributionParticipantIncrements,
      recordTaskContribution,
      toggleTaskFollow,
      toggleKnowHowFollow,
      resetDemoData,
      toast,
      notify,
    }),
    [user, points, withdrawablePoints, withdrawals, followedTasks, followedKnowHows, createdTasks, createdKnowHows, submittedTasks, contributionParticipantIncrements, toast],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export const useDemo = () => useContext(DemoContext);
