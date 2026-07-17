import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { currentUser } from '../data';

const DemoContext = createContext(null);

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
  return isLegacyDemoUser ? currentUser : savedUser;
};

export function DemoProvider({ children }) {
  const [user, setUser] = useState(readUser);
  const [points, setPoints] = useState(() => read('kh-points', currentUser.points));
  const [followedTasks, setFollowedTasks] = useState(() => read('kh-followed-tasks', ['saas-onboarding', 'factory-vision']));
  const [followedKnowHows, setFollowedKnowHows] = useState(() => read('kh-followed-knowhows', ['vision-inspection', 'interview-research']));
  const [createdTasks, setCreatedTasks] = useState(() => read('kh-created-tasks', []));
  const [submittedTasks, setSubmittedTasks] = useState(() => read('kh-submitted-tasks', ['factory-vision']));
  const [toast, setToast] = useState('');

  useEffect(() => localStorage.setItem('kh-user', JSON.stringify(user)), [user]);
  useEffect(() => localStorage.setItem('kh-points', JSON.stringify(points)), [points]);
  useEffect(() => localStorage.setItem('kh-followed-tasks', JSON.stringify(followedTasks)), [followedTasks]);
  useEffect(() => localStorage.setItem('kh-followed-knowhows', JSON.stringify(followedKnowHows)), [followedKnowHows]);
  useEffect(() => localStorage.setItem('kh-created-tasks', JSON.stringify(createdTasks)), [createdTasks]);
  useEffect(() => localStorage.setItem('kh-submitted-tasks', JSON.stringify(submittedTasks)), [submittedTasks]);

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

  const value = useMemo(
    () => ({
      user,
      setUser,
      points,
      setPoints,
      followedTasks,
      followedKnowHows,
      createdTasks,
      setCreatedTasks,
      submittedTasks,
      setSubmittedTasks,
      toggleTaskFollow,
      toggleKnowHowFollow,
      toast,
      notify,
    }),
    [user, points, followedTasks, followedKnowHows, createdTasks, submittedTasks, toast],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export const useDemo = () => useContext(DemoContext);
