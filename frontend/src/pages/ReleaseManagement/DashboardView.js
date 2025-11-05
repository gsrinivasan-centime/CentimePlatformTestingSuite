import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress
} from '@mui/material';
import {
  CheckCircle as PassedIcon,
  Cancel as FailedIcon,
  TrendingUp as TrendingIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { getReleaseDashboard } from '../../services/releaseManagementApi';

const COLORS = {
  passed: '#4caf50',
  failed: '#f44336',
  blocked: '#ff9800',
  not_started: '#9e9e9e',
  in_progress: '#2196f3',
  skipped: '#607d8b'
};

const DashboardView = ({ releaseId, onNavigateToTree }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboardData, setDashboardData] = useState(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getReleaseDashboard(releaseId);
      setDashboardData(response.data);
    } catch (err) {
      console.error('Error fetching dashboard:', err);
      setError(err.response?.data?.detail || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [releaseId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>;
  }

  if (!dashboardData) {
    return <Alert severity="info">No data available</Alert>;
  }

  return (
    <Box>
      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', height: '100%' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="body2" sx={{ fontSize: '0.85rem', mb: 0.5 }}>Total Test Cases</Typography>
              <Typography variant="h4" sx={{ fontWeight: 600 }}>{dashboardData.total_test_cases}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)', color: 'white', height: '100%' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" sx={{ fontSize: '0.85rem', mb: 0.5 }}>Passed</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>{dashboardData.passed}</Typography>
                </Box>
                <PassedIcon sx={{ fontSize: 32, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #f44336 0%, #e91e63 100%)', color: 'white', height: '100%' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" sx={{ fontSize: '0.85rem', mb: 0.5 }}>Failed</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>{dashboardData.failed}</Typography>
                </Box>
                <FailedIcon sx={{ fontSize: 32, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)', color: 'white', height: '100%' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" sx={{ fontSize: '0.85rem', mb: 0.5 }}>Pass Rate</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>{dashboardData.pass_rate}%</Typography>
                </Box>
                <TrendingIcon sx={{ fontSize: 32, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Module Statistics Table */}
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
          <Typography variant="h6">Module Statistics</Typography>
        </Box>
        <TableContainer sx={{ maxHeight: 400 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>Module</TableCell>
                <TableCell align="center">Total</TableCell>
                <TableCell align="center">Passed</TableCell>
                <TableCell align="center">Failed</TableCell>
                <TableCell align="center">Blocked</TableCell>
                <TableCell align="center">Not Started</TableCell>
                <TableCell align="center">In Progress</TableCell>
                <TableCell align="center">Pass Rate</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dashboardData.module_stats.map((module) => (
                <TableRow key={module.module_id} hover>
                  <TableCell>
                    <Typography 
                      variant="body2" 
                      fontWeight="bold"
                      sx={{ 
                        color: 'primary.main',
                        cursor: 'pointer',
                        '&:hover': {
                          textDecoration: 'underline'
                        }
                      }}
                      onClick={() => onNavigateToTree && onNavigateToTree()}
                    >
                      {module.module_name}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">{module.total}</TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={module.passed} 
                      size="small" 
                      sx={{ bgcolor: COLORS.passed, color: 'white', minWidth: 40 }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={module.failed} 
                      size="small" 
                      sx={{ bgcolor: COLORS.failed, color: 'white', minWidth: 40 }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={module.blocked} 
                      size="small" 
                      sx={{ bgcolor: COLORS.blocked, color: 'white', minWidth: 40 }}
                    />
                  </TableCell>
                  <TableCell align="center">{module.not_started}</TableCell>
                  <TableCell align="center">{module.in_progress}</TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={module.pass_rate} 
                        sx={{ 
                          flexGrow: 1, 
                          height: 8, 
                          borderRadius: 4,
                          bgcolor: '#e0e0e0',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: module.pass_rate >= 80 ? COLORS.passed : module.pass_rate >= 50 ? COLORS.blocked : COLORS.failed
                          }
                        }}
                      />
                      <Typography variant="body2" sx={{ minWidth: 45 }}>
                        {module.pass_rate.toFixed(1)}%
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Critical Issues */}
      {dashboardData.critical_issues && dashboardData.critical_issues.length > 0 && (
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <WarningIcon color="error" />
            <Typography variant="h6">Critical Issues (Failed/Blocked)</Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {dashboardData.critical_issues.map((issue, index) => (
              <Alert key={index} severity="error" variant="outlined">
                {issue}
              </Alert>
            ))}
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default DashboardView;
