import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import MarketPage from './pages/MarketPage';
import TaskPage from './pages/TaskPage';
import CreateTaskPage from './pages/CreateTaskPage';
import ContributePage from './pages/ContributePage';
import KnowHowPage from './pages/KnowHowPage';
import WorkspacePage from './pages/WorkspacePage';
import AuthPage from './pages/AuthPage';
import ProfilePage from './pages/ProfilePage';
import PurchasePointsPage from './pages/PurchasePointsPage';
import { useDemo } from './state/DemoContext';

function Protected({ children }) {
  const { user } = useDemo();
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<MarketPage />} />
        <Route path="task/:taskId" element={<TaskPage />} />
        <Route path="know-how/:knowHowId" element={<KnowHowPage />} />
        <Route path="create-task" element={<Protected><CreateTaskPage /></Protected>} />
        <Route path="contribute/:taskId" element={<Protected><ContributePage /></Protected>} />
        <Route path="workspace/:section" element={<Protected><WorkspacePage /></Protected>} />
        <Route path="profile" element={<Protected><ProfilePage /></Protected>} />
        <Route path="buy-points" element={<Protected><PurchasePointsPage /></Protected>} />
      </Route>
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
