import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LoginPage } from './pages/LoginPage';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { DatasetsPage } from './pages/DatasetsPage';
import { ViewerPage } from './pages/ViewerPage';
import { AnnotationsPage } from './pages/AnnotationsPage';
import { ModelsPage } from './pages/ModelsPage';
import { ExperimentsPage } from './pages/ExperimentsPage';
import { BenchmarksPage } from './pages/BenchmarksPage';
import { OptimizationPage } from './pages/OptimizationPage';
import { CardiacProfilePage } from './pages/CardiacProfilePage';
import { DeploymentsPage } from './pages/DeploymentsPage';
import { SettingsPage } from './pages/SettingsPage';
import { InferencePage } from './pages/InferencePage';
import { ReportsPage } from './pages/ReportsPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
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
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="datasets" element={<DatasetsPage />} />
              <Route path="viewer" element={<ViewerPage />} />
              <Route path="annotations" element={<AnnotationsPage />} />
              <Route path="models" element={<ModelsPage />} />
              <Route path="experiments" element={<ExperimentsPage />} />
              <Route path="benchmarks" element={<BenchmarksPage />} />
              <Route path="optimization" element={<OptimizationPage />} />
              <Route path="cardiac-profile" element={<CardiacProfilePage />} />
              <Route path="deployments" element={<DeploymentsPage />} />
              <Route path="inference" element={<InferencePage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
