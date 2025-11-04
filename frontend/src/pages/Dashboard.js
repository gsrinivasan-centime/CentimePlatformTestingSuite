import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CircularProgress,
} from '@mui/material';
import {
  Assignment,
  CheckCircle,
  Error,
  PendingActions,
  AccountTree,
} from '@mui/icons-material';
import { testCasesAPI, modulesAPI, executionsAPI, releasesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const StatCard = ({ title, value, icon, color }) => (
  <Card>
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography color="textSecondary" gutterBottom variant="body2">
            {title}
          </Typography>
          <Typography variant="h4" component="div">
            {value}
          </Typography>
        </Box>
        <Box
          sx={{
            backgroundColor: color,
            borderRadius: '50%',
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTestCases: 0,
    totalModules: 0,
    totalReleases: 0,
    recentExecutions: [],
    passedTests: 0,
    failedTests: 0,
    pendingTests: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [testCases, modules, releases, executions] = await Promise.all([
        testCasesAPI.getAll(),
        modulesAPI.getAll(),
        releasesAPI.getAll(),
        executionsAPI.getAll(),
      ]);

      const passed = executions.filter((e) => e.status === 'pass').length;
      const failed = executions.filter((e) => e.status === 'fail').length;
      const pending = executions.filter((e) => e.status === 'pending').length;

      setStats({
        totalTestCases: testCases.length,
        totalModules: modules.length,
        totalReleases: releases.length,
        recentExecutions: executions.slice(0, 10),
        passedTests: passed,
        failedTests: failed,
        pendingTests: pending,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Welcome back, {user?.full_name || user?.email}!
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Test Cases"
            value={stats.totalTestCases}
            icon={<Assignment sx={{ color: 'white' }} />}
            color="primary.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Modules"
            value={stats.totalModules}
            icon={<AccountTree sx={{ color: 'white' }} />}
            color="info.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Passed Tests"
            value={stats.passedTests}
            icon={<CheckCircle sx={{ color: 'white' }} />}
            color="success.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Failed Tests"
            value={stats.failedTests}
            icon={<Error sx={{ color: 'white' }} />}
            color="error.main"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Test Execution Summary
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography>Passed</Typography>
                <Typography fontWeight="bold" color="success.main">
                  {stats.passedTests}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography>Failed</Typography>
                <Typography fontWeight="bold" color="error.main">
                  {stats.failedTests}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography>Pending</Typography>
                <Typography fontWeight="bold" color="warning.main">
                  {stats.pendingTests}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography fontWeight="bold">Total</Typography>
                <Typography fontWeight="bold">
                  {stats.passedTests + stats.failedTests + stats.pendingTests}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Quick Stats
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography>Total Releases</Typography>
                <Typography fontWeight="bold">{stats.totalReleases}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography>Test Cases</Typography>
                <Typography fontWeight="bold">{stats.totalTestCases}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography>Modules</Typography>
                <Typography fontWeight="bold">{stats.totalModules}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography>Pass Rate</Typography>
                <Typography fontWeight="bold" color="success.main">
                  {stats.passedTests + stats.failedTests > 0
                    ? Math.round(
                        (stats.passedTests / (stats.passedTests + stats.failedTests)) * 100
                      )
                    : 0}
                  %
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Recent Test Executions
        </Typography>
        {stats.recentExecutions.length === 0 ? (
          <Typography color="text.secondary" sx={{ mt: 2 }}>
            No test executions yet. Start executing tests to see results here.
          </Typography>
        ) : (
          <Box sx={{ mt: 2 }}>
            {stats.recentExecutions.map((execution, index) => (
              <Box
                key={execution.id}
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                py={1.5}
                borderBottom={index < stats.recentExecutions.length - 1 ? 1 : 0}
                borderColor="divider"
              >
                <Box>
                  <Typography variant="body2" fontWeight="medium">
                    Test Case ID: {execution.test_case_id}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(execution.executed_at).toLocaleString()}
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  fontWeight="bold"
                  color={
                    execution.status === 'pass'
                      ? 'success.main'
                      : execution.status === 'fail'
                      ? 'error.main'
                      : 'warning.main'
                  }
                  sx={{ textTransform: 'uppercase' }}
                >
                  {execution.status}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default Dashboard;
