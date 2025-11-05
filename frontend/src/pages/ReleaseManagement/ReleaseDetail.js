import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Breadcrumbs,
  Link,
  Button,
  IconButton,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  AccountTree as TreeIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Article as ArticleIcon,
  Sync as SyncIcon
} from '@mui/icons-material';
import api, { jiraStoriesAPI } from '../../services/api';
import DashboardView from './DashboardView';
import TreeView from './TreeView';
import StoriesView from './StoriesView';
import ManageTestCasesDialog from './ManageTestCasesDialog';

const ReleaseDetail = () => {
  const { releaseId } = useParams();
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState(0);
  const [release, setRelease] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [syncingStories, setSyncingStories] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null);

  useEffect(() => {
    fetchReleaseDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [releaseId]);

  const fetchReleaseDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/releases/${releaseId}`);
      setRelease(response.data);
    } catch (err) {
      console.error('Error fetching release:', err);
      setError(err.response?.data?.detail || 'Failed to load release details');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    fetchReleaseDetails();
  };

  const handleSyncStories = async () => {
    if (!release) return;
    
    setSyncingStories(true);
    setSyncMessage(null);
    
    try {
      const response = await jiraStoriesAPI.syncByRelease(release.version);
      
      setSyncMessage({
        severity: 'success',
        text: `${response.message}. Created: ${response.created_count}, Updated: ${response.updated_count}`
      });
      
      // Refresh the page after a short delay to show the new stories
      setTimeout(() => {
        handleRefresh();
      }, 1500);
      
    } catch (err) {
      console.error('Error syncing stories:', err);
      setSyncMessage({
        severity: 'error',
        text: err.response?.data?.detail || 'Failed to sync stories from JIRA'
      });
    } finally {
      setSyncingStories(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button onClick={() => navigate('/releases')} sx={{ mt: 2 }}>
          Back to Releases
        </Button>
      </Box>
    );
  }

  if (!release) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">Release not found</Alert>
        <Button onClick={() => navigate('/releases')} sx={{ mt: 2 }}>
          Back to Releases
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Breadcrumbs sx={{ mb: 1.5 }}>
        <Link
          component="button"
          variant="body1"
          onClick={() => navigate('/releases')}
          sx={{ cursor: 'pointer', textDecoration: 'none' }}
        >
          Releases
        </Link>
        <Typography color="text.primary">{release.version}</Typography>
      </Breadcrumbs>

      {/* Tabs with Action Buttons */}
      <Paper sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 2 }}>
          <Tabs value={currentTab} onChange={handleTabChange}>
            <Tab 
              icon={<DashboardIcon />} 
              iconPosition="start" 
              label="Dashboard" 
            />
            <Tab 
              icon={<TreeIcon />} 
              iconPosition="start" 
              label="Test Cases Tree" 
            />
            <Tab 
              icon={<ArticleIcon />} 
              iconPosition="start" 
              label="Stories" 
            />
          </Tabs>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              color="secondary"
              size="small"
              startIcon={syncingStories ? <CircularProgress size={16} /> : <SyncIcon />}
              onClick={handleSyncStories}
              disabled={syncingStories}
            >
              {syncingStories ? 'Syncing...' : 'Sync Stories'}
            </Button>
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setManageDialogOpen(true)}
            >
              Add Test Cases
            </Button>
            <IconButton onClick={handleRefresh} color="primary" size="small">
              <RefreshIcon />
            </IconButton>
          </Box>
        </Box>
      </Paper>

      {/* Sync Message */}
      {syncMessage && (
        <Alert severity={syncMessage.severity} sx={{ mb: 2 }} onClose={() => setSyncMessage(null)}>
          {syncMessage.text}
        </Alert>
      )}

      {/* Tab Content */}
      <Box>
        {currentTab === 0 && (
          <DashboardView 
            releaseId={releaseId} 
            key={`dashboard-${refreshKey}`}
            onNavigateToTree={() => setCurrentTab(1)}
          />
        )}
        {currentTab === 1 && (
          <TreeView releaseId={releaseId} key={`tree-${refreshKey}`} />
        )}
        {currentTab === 2 && (
          <StoriesView releaseId={releaseId} key={`stories-${refreshKey}`} />
        )}
      </Box>

      {/* Manage Test Cases Dialog */}
      <ManageTestCasesDialog
        open={manageDialogOpen}
        onClose={() => setManageDialogOpen(false)}
        releaseId={releaseId}
        onSuccess={() => {
          setManageDialogOpen(false);
          handleRefresh();
        }}
      />
    </Box>
  );
};

export default ReleaseDetail;
