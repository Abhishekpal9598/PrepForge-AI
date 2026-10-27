import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Error Boundary for Production Fault Tolerance
import { ErrorBoundary } from './components/ErrorBoundary';

// Global State Provider
import { AuthProvider } from './context/AuthContext';

// Layouts
import { PublicLayout } from './layouts/PublicLayout';
import { DashboardLayout } from './layouts/DashboardLayout';

// Route Guards
import { ProtectedRoute } from './components/ProtectedRoute';

// Public Pages
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { NotFoundPage } from './pages/NotFoundPage';

// Authenticated Workstation & Dashboard Pages
import { DashboardPage } from './pages/DashboardPage';
import { MockInterviewsPage } from './pages/MockInterviewsPage';
import { ResumeAnalyzerPage } from './pages/ResumeAnalyzerPage';
import { JobMatchPage } from './pages/JobMatchPage';
import { QuestionBankPage } from './pages/QuestionBankPage';
import { InterviewHistoryPage } from './pages/InterviewHistoryPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ApplicationsPage } from './pages/ApplicationsPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';

/**
 * PrepForge AI - Master Application Router
 * Provides unified authentication context, route guarding, alias resolution,
 * and seamless navigation across public and workstation layouts.
 */
export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
          {/* Public Website Routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Route>

          {/* Authenticated Dashboard & Workstation Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/mock-interviews" element={<MockInterviewsPage />} />
              <Route path="/mock-interview" element={<Navigate to="/mock-interviews" replace />} />
              
              <Route path="/resume-analyzer" element={<ResumeAnalyzerPage />} />
              <Route path="/resume-analysis" element={<Navigate to="/resume-analyzer" replace />} />
              <Route path="/resumes" element={<Navigate to="/resume-analyzer" replace />} />

              <Route path="/job-match" element={<JobMatchPage />} />
              <Route path="/job-analysis" element={<Navigate to="/job-match" replace />} />

              <Route path="/question-bank" element={<QuestionBankPage />} />
              <Route path="/interview-history" element={<InterviewHistoryPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/applications" element={<ApplicationsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/security" element={<Navigate to="/settings?tab=security" replace />} />
            </Route>
          </Route>

          {/* 404 Catch-All Route */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </ErrorBoundary>
  );
}

export default App;
