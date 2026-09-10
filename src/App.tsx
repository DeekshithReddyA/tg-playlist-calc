import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './layout/AppLayout';
import { api } from './lib/api';
import Home from './pages/Home';
import { PlanDetail } from './pages/my-plan/PlanDetail';
import { PlansList } from './pages/my-plan/PlansList';
import { ProfileSelect } from './pages/my-plan/ProfileSelect';

function App() {
  useEffect(() => {
    void api.warmup().catch(() => undefined);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/my-plan" element={<ProfileSelect />} />
          <Route path="/my-plan/profiles/:profileId" element={<PlansList />} />
          <Route path="/my-plan/plans/:planId" element={<PlanDetail />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
