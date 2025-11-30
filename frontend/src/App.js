import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { LoadingProvider, useLoading } from './context/LoadingContext';
import { setErrorHandler, setLoadingHandlers } from './services/api';
import { ProtectedRoute, AdminRoute, ViewableRoute } from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import TestDesignStudio from './pages/TestDesignStudio';
import TestCases from './pages/TestCases';
import Executions from './pages/Executions';
import Reports from './pages/Reports';
import Modules from './pages/Modules';
import Releases from './pages/Releases';
import Users from './pages/Users';
import Stories from './pages/Stories';
import Issues from './pages/Issues';
import ReleaseDetail from './pages/ReleaseManagement/ReleaseDetail';
import ApplicationSettings from './pages/ApplicationSettings';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

function AppContent() {
  const { showError } = useToast();
  const { startLoading, stopLoading } = useLoading();

  useEffect(() => {
    // Set global error handler for all API calls
    setErrorHandler((message) => {
      showError(message);
    });
    // Set global loading handlers for all API calls
    setLoadingHandlers(startLoading, stopLoading);
  }, [showError, startLoading, stopLoading]);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/test-design-studio"
          element={
            <ProtectedRoute>
              <Layout>
                <TestDesignStudio />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/test-cases"
          element={
            <ProtectedRoute>
              <Layout>
                <TestCases />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/executions"
          element={
            <ProtectedRoute>
              <Layout>
                <Executions />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <Layout>
                <Reports />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/modules"
          element={
            <AdminRoute>
              <Layout>
                <Modules />
              </Layout>
            </AdminRoute>
          }
        />
        <Route
          path="/stories"
          element={
            <ProtectedRoute>
              <Layout>
                <Stories />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/releases"
          element={
            <ProtectedRoute>
              <Layout>
                <Releases />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/issues"
          element={
            <ProtectedRoute>
              <Layout>
                <Issues />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/releases/:releaseId"
          element={
            <ProtectedRoute>
              <Layout>
                <ReleaseDetail />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ViewableRoute>
              <Layout>
                <Users />
              </Layout>
            </ViewableRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ViewableRoute>
              <Layout>
                <ApplicationSettings />
              </Layout>
            </ViewableRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <ToastProvider>
          <LoadingProvider>
            <AppContent />
          </LoadingProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
