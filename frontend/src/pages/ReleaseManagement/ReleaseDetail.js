import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
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
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  AccountTree as TreeIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Article as ArticleIcon,
  Sync as SyncIcon,
  BugReport as BugReportIcon
} from '@mui/icons-material';
import api, { jiraStoriesAPI } from '../../services/api';
import DashboardView from './DashboardView';
import TreeView from './TreeView';
import StoriesView from './StoriesView';
import ReleaseIssuesView from './ReleaseIssuesView';
import ManageTestCasesDialog from './ManageTestCasesDialog';

// Tab name to index mapping for URL-based navigation
const TAB_MAP = {
  'dashboard': 0,
  'stories': 1,
  'modules': 2,
  'issues': 3
};
const TAB_NAMES = ['dashboard', 'stories', 'modules', 'issues'];

const ReleaseDetail = () => {
  const { releaseId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get tab from URL, default to 'dashboard'
  const tabFromUrl = searchParams.get('tab') || 'dashboard';
  const initialTab = TAB_MAP[tabFromUrl] !== undefined ? TAB_MAP[tabFromUrl] : 0;
  
  const [currentTab, setCurrentTab] = useState(initialTab);
  const [release, setRelease] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [syncingStories, setSyncingStories] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null);
  const [confirmSyncDialogOpen, setConfirmSyncDialogOpen] = useState(false);
  
  // Get filter params from URL for passing to child components
  const urlFilters = useMemo(() => ({
    status: searchParams.get('status'),
    assignee: searchParams.get('assignee'),
    search: searchParams.get('search'),
    ids: searchParams.get('ids')?.split(',').map(id => parseInt(id, 10)).filter(Boolean)
  }), [searchParams]);
  
  // Sync tab state with URL when URL changes externally (e.g., back button)
  useEffect(() => {
    const urlTab = searchParams.get('tab') || 'dashboard';
    const tabIndex = TAB_MAP[urlTab] !== undefined ? TAB_MAP[urlTab] : 0;
    if (tabIndex !== currentTab) {
      setCurrentTab(tabIndex);
    }
  }, [searchParams, currentTab]);

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
    // Update URL with new tab, preserving other params if needed
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', TAB_NAMES[newValue]);
    // Clear filters when changing tabs (they're tab-specific)
    newParams.delete('status');
    newParams.delete('assignee');
    newParams.delete('search');
    newParams.delete('ids');
    setSearchParams(newParams);
    setCurrentTab(newValue);
  };
  
  // Navigate to a specific tab programmatically (for DashboardView's "View Details" buttons)
  const navigateToTab = (tabName, filters = {}) => {
    const tabIndex = TAB_MAP[tabName];
    if (tabIndex !== undefined) {
      const newParams = new URLSearchParams();
      newParams.set('tab', tabName);
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          newParams.set(key, value);
        }
      });
      setSearchParams(newParams);
      setCurrentTab(tabIndex);
    }
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    fetchReleaseDetails();
  };

  const handleSyncStories = async () => {
    if (!release) return;

    // Open confirmation dialog
    setConfirmSyncDialogOpen(true);
  };

  const handleConfirmSync = async () => {
    setConfirmSyncDialogOpen(false);

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

  const handleCancelSync = () => {
    setConfirmSyncDialogOpen(false);
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
              icon={<ArticleIcon />}
              iconPosition="start"
              label="Stories"
            />
            <Tab
              icon={<TreeIcon />}
              iconPosition="start"
              label="Modules"
            />
            <Tab
              icon={<BugReportIcon />}
              iconPosition="start"
              label="Issues"
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
            onNavigateToTree={() => navigateToTab('modules')}
            onNavigateToTab={navigateToTab}
          />
        )}
        {currentTab === 1 && (
          <StoriesView 
            releaseId={releaseId} 
            key={`stories-${refreshKey}`}
            urlFilters={urlFilters}
          />
        )}
        {currentTab === 2 && (
          <TreeView releaseId={releaseId} key={`tree-${refreshKey}`} />
        )}
        {currentTab === 3 && (
          <ReleaseIssuesView
            releaseId={releaseId}
            releaseVersion={release?.version}
            key={`issues-${refreshKey}`}
            urlFilters={urlFilters}
          />
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

      {/* Confirm Sync Stories Dialog */}
      <Dialog
        open={confirmSyncDialogOpen}
        onClose={handleCancelSync}
        aria-labelledby="sync-dialog-title"
        aria-describedby="sync-dialog-description"
      >
        <DialogTitle id="sync-dialog-title">
          Confirm Sync Stories from JIRA
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="sync-dialog-description">
            This action will import all user stories from JIRA with Fix Version <strong>{release?.version}</strong>.
            <br /><br />
            Do you want to continue?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelSync} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleConfirmSync} variant="contained" color="primary" autoFocus>
            Continue
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReleaseDetail;
