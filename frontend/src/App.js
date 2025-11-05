import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { setErrorHandler } from './services/api';
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import Dashboard from './pages/Dashboard';
import TestCases from './pages/TestCases';
import Executions from './pages/Executions';
import Reports from './pages/Reports';
import Modules from './pages/Modules';
import Releases from './pages/Releases';
import Users from './pages/Users';
import ReleaseDetail from './pages/ReleaseManagement/ReleaseDetail';

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

  useEffect(() => {
    // Set global error handler for all API calls
    setErrorHandler((message) => {
      showError(message);
    });
  }, [showError]);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
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
                <AdminRoute>
                  <Layout>
                    <Users />
                  </Layout>
                </AdminRoute>
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
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
