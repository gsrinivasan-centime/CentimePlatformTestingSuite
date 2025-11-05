import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Paper,
  Typography,
  CircularProgress,
} from '@mui/material';
import {
  Assignment,
  AccountTree,
  RocketLaunch,
  SmartToy,
  PlayArrow,
  Assessment,
} from '@mui/icons-material';
import { testCasesAPI, modulesAPI, releasesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const NavigationTile = ({ title, value, subtitle, icon, color, gradient, onClick, children }) => (
  <Paper
    elevation={2}
    sx={{
      p: 4,
      height: '100%',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      background: gradient,
      color: '#1a1a1a',
      position: 'relative',
      overflow: 'hidden',
      border: '1px solid rgba(0, 0, 0, 0.08)',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: 4,
        border: '1px solid rgba(0, 0, 0, 0.12)',
      },
      '&::before': {
        content: '""',
        position: 'absolute',
        top: -30,
        right: -30,
        width: 100,
        height: 100,
        background: 'rgba(255, 255, 255, 0.4)',
        borderRadius: '50%',
      },
    }}
    onClick={onClick}
  >
    <Box sx={{ position: 'relative', zIndex: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            borderRadius: '12px',
            p: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          {icon}
        </Box>
      </Box>
      {children || (
        <>
          <Typography 
            variant="h3" 
            component="div" 
            fontWeight="700" 
            gutterBottom
            sx={{ color: '#1a1a1a', textShadow: '0 1px 2px rgba(255,255,255,0.5)' }}
          >
            {value}
          </Typography>
          <Typography 
            variant="h6" 
            gutterBottom 
            sx={{ 
              color: '#2c2c2c',
              fontWeight: 600,
              letterSpacing: '0.3px',
              textShadow: '0 1px 2px rgba(255,255,255,0.3)'
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography 
              variant="body2" 
              sx={{ 
                color: '#4a4a4a',
                mt: 1,
                fontWeight: 500,
                lineHeight: 1.5
              }}
            >
              {subtitle}
            </Typography>
          )}
        </>
      )}
    </Box>
  </Paper>
);

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTestCases: 0,
    totalModules: 0,
    upcomingReleases: 0,
    automatedTests: 0,
    lastRelease: null,
    nextRelease: null,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [testCases, modules, releases] = await Promise.all([
        testCasesAPI.getAll(),
        modulesAPI.getAll(),
        releasesAPI.getAll(),
      ]);

      // Count automated test cases
      const automatedTests = testCases.filter(
        (tc) => tc.automation_status === 'automated' || tc.automation_status === 'working'
      ).length;

      // Sort releases by release_date
      const sortedReleases = [...releases].sort((a, b) => {
        const dateA = a.release_date ? new Date(a.release_date) : new Date(0);
        const dateB = b.release_date ? new Date(b.release_date) : new Date(0);
        return dateB - dateA;
      });

      const now = new Date();
      
      // Find last completed release (release_date in the past and status is completed)
      const lastRelease = sortedReleases.find(r => {
        const releaseDate = r.release_date ? new Date(r.release_date) : null;
        return releaseDate && releaseDate < now && r.overall_status === 'completed';
      });

      // Find next upcoming release (release_date in the future or status is not completed)
      const nextRelease = sortedReleases.find(r => {
        const releaseDate = r.release_date ? new Date(r.release_date) : null;
        return (releaseDate && releaseDate >= now) || 
               (r.overall_status === 'in_progress' || r.overall_status === 'not_started');
      });

      // Count upcoming releases
      const upcomingReleases = releases.filter(
        (r) => r.overall_status === 'not_started' || r.overall_status === 'in_progress'
      ).length;

      setStats({
        totalTestCases: testCases.length,
        totalModules: modules.length,
        upcomingReleases: upcomingReleases,
        automatedTests: automatedTests,
        lastRelease: lastRelease,
        nextRelease: nextRelease,
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
      <Typography variant="h4" gutterBottom fontWeight="bold" sx={{ mb: 1 }}>
        Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Welcome back, {user?.full_name || user?.email}! Click on any tile to navigate.
      </Typography>

      <Grid container spacing={4} sx={{ mt: 1 }}>
        {/* 1. Total Test Cases */}
        <Grid item xs={12} sm={6} md={4}>
          <NavigationTile
            title="Total Test Cases"
            value={stats.totalTestCases}
            subtitle="View and manage all test cases"
            icon={<Assignment sx={{ fontSize: 40, color: '#5e72e4' }} />}
            gradient="linear-gradient(135deg, #e8eaf6 0%, #d1c4e9 100%)"
            onClick={() => navigate('/test-cases')}
          />
        </Grid>

        {/* 2. Modules */}
        <Grid item xs={12} sm={6} md={4}>
          <NavigationTile
            title="Modules"
            value={stats.totalModules}
            subtitle="Manage test modules and structure"
            icon={<AccountTree sx={{ fontSize: 40, color: '#ec407a' }} />}
            gradient="linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%)"
            onClick={() => navigate('/modules')}
          />
        </Grid>

        {/* 3. Release Management */}
        <Grid item xs={12} sm={6} md={4}>
          <NavigationTile
            icon={<RocketLaunch sx={{ fontSize: 40, color: '#26c6da' }} />}
            gradient="linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%)"
            onClick={() => navigate('/releases')}
          >
            <Typography 
              variant="h6" 
              gutterBottom 
              sx={{ 
                color: '#2c2c2c',
                fontWeight: 600,
                letterSpacing: '0.3px',
                textShadow: '0 1px 2px rgba(255,255,255,0.3)'
              }}
            >
              Release Management
            </Typography>
            
            {stats.lastRelease && (
              <Box sx={{ mb: 2, pb: 2, borderBottom: '1px solid rgba(0,0,0,0.12)' }}>
                <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 0.5, fontWeight: 500 }}>
                  Last Release
                </Typography>
                <Typography variant="body1" fontWeight="bold" sx={{ color: '#1a1a1a' }}>
                  {stats.lastRelease.version}
                </Typography>
                <Typography variant="caption" sx={{ color: '#666' }}>
                  {stats.lastRelease.release_date 
                    ? new Date(stats.lastRelease.release_date).toLocaleDateString()
                    : 'Date not set'}
                </Typography>
              </Box>
            )}
            
            {stats.nextRelease && (
              <Box>
                <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 0.5, fontWeight: 500 }}>
                  Upcoming Release
                </Typography>
                <Typography variant="body1" fontWeight="bold" sx={{ color: '#1a1a1a' }}>
                  {stats.nextRelease.version}
                </Typography>
                <Typography variant="caption" sx={{ color: '#666' }}>
                  {stats.nextRelease.release_date 
                    ? new Date(stats.nextRelease.release_date).toLocaleDateString()
                    : 'Date not set'}
                </Typography>
              </Box>
            )}

            {!stats.lastRelease && !stats.nextRelease && (
              <Typography variant="body2" sx={{ color: '#666' }}>
                No releases available
              </Typography>
            )}
          </NavigationTile>
        </Grid>

        {/* 4. Tests Automated */}
        <Grid item xs={12} sm={6} md={4}>
          <NavigationTile
            title="Tests Automated"
            value={stats.automatedTests}
            subtitle="View automated test cases"
            icon={<SmartToy sx={{ fontSize: 40, color: '#26a69a' }} />}
            gradient="linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%)"
            onClick={() => navigate('/test-cases')}
          />
        </Grid>

        {/* 5. Execute Tests */}
        <Grid item xs={12} sm={6} md={4}>
          <NavigationTile
            title="Execute Tests"
            value={<PlayArrow sx={{ fontSize: 50, color: '#1a1a1a' }} />}
            subtitle="Run and manage test executions"
            icon={<PlayArrow sx={{ fontSize: 40, color: '#ff7043' }} />}
            gradient="linear-gradient(135deg, #fff3e0 0%, #ffccbc 100%)"
            onClick={() => navigate('/executions')}
          />
        </Grid>

        {/* 6. Release Reports */}
        <Grid item xs={12} sm={6} md={4}>
          <NavigationTile
            title="Release Reports"
            value={<Assessment sx={{ fontSize: 50, color: '#1a1a1a' }} />}
            subtitle="View detailed test reports"
            icon={<Assessment sx={{ fontSize: 40, color: '#7e57c2' }} />}
            gradient="linear-gradient(135deg, #ede7f6 0%, #d1c4e9 100%)"
            onClick={() => navigate('/reports')}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
