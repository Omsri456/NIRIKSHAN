import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { WorksListPage } from '@/pages/WorksListPage';
import { WorkDetailPage } from '@/pages/WorkDetailPage';
import { HighRiskPage } from '@/pages/HighRiskPage';
import { InvestigationsListPage } from '@/pages/InvestigationsListPage';
import { InvestigationDetailPage } from '@/pages/InvestigationDetailPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="works" element={<WorksListPage />} />
            <Route path="works/:workId" element={<WorkDetailPage />} />
            <Route path="high-risk" element={<HighRiskPage />} />
            <Route path="investigations" element={<InvestigationsListPage />} />
            <Route path="investigations/:id" element={<InvestigationDetailPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
