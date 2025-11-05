import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Collapse,
  Button,
  Snackbar
} from '@mui/material';
import {
  Sync as SyncIcon
} from '@mui/icons-material';
import api from '../../services/api';

const StoriesView = ({ releaseId }) => {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedStories, setExpandedStories] = useState({});
  const [storyTestCases, setStoryTestCases] = useState({});
  const [loadingTestCases, setLoadingTestCases] = useState({});
  const [syncing, setSyncing] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    const fetchStories = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await api.get(`/releases/${releaseId}/stories`);
        setStories(response.data.stories || []);
      } catch (err) {
        console.error('Error fetching stories:', err);
        setError(err.response?.data?.detail || 'Failed to load stories');
      } finally {
        setLoading(false);
      }
    };
    
    fetchStories();
  }, [releaseId]);

  const handleSyncTestCases = async () => {
    try {
      setSyncing(true);
      const response = await api.post(`/releases/${releaseId}/sync-story-test-cases`);
      setSnackbar({
        open: true,
        message: `Successfully synced ${response.data.linked_count} test cases from ${response.data.total_stories} stories`,
        severity: 'success'
      });
    } catch (err) {
      console.error('Error syncing test cases:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.detail || 'Failed to sync test cases',
        severity: 'error'
      });
    } finally {
      setSyncing(false);
    }
  };

  const toggleExpanded = async (storyId) => {
    const isCurrentlyExpanded = expandedStories[storyId];
    
    setExpandedStories(prev => ({
      ...prev,
      [storyId]: !prev[storyId]
    }));

    // Fetch test cases if expanding and not already loaded
    if (!isCurrentlyExpanded && !storyTestCases[storyId]) {
      try {
        setLoadingTestCases(prev => ({ ...prev, [storyId]: true }));
        const response = await api.get(`/jira-stories/${storyId}/test-cases`);
        setStoryTestCases(prev => ({
          ...prev,
          [storyId]: response.data.test_cases || []
        }));
      } catch (err) {
        console.error(`Error fetching test cases for story ${storyId}:`, err);
        setStoryTestCases(prev => ({ ...prev, [storyId]: [] }));
      } finally {
        setLoadingTestCases(prev => ({ ...prev, [storyId]: false }));
      }
    }
  };

  const getStatusColor = (status) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower.includes('done') || statusLower.includes('complete')) return 'success';
    if (statusLower.includes('progress')) return 'info';
    if (statusLower.includes('review')) return 'warning';
    return 'default';
  };

  const getPriorityColor = (priority) => {
    const priorityLower = priority?.toLowerCase() || '';
    if (priorityLower === 'high' || priorityLower === 'critical') return 'error';
    if (priorityLower === 'medium') return 'warning';
    if (priorityLower === 'low') return 'success';
    return 'default';
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
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!stories || stories.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No stories found for this release version. 
          <br />
          Stories will appear here automatically when they have a matching Fix Version in JIRA.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <Paper sx={{ mb: 2, p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6">
              Stories ({stories.length})
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Stories automatically linked based on JIRA Fix Version
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SyncIcon />}
            onClick={handleSyncTestCases}
            disabled={syncing}
          >
            {syncing ? 'Syncing...' : 'Sync Test Cases'}
          </Button>
        </Box>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Story ID</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Epic ID</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Assignee</TableCell>
              <TableCell>Release</TableCell>
              <TableCell>Updated</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {stories.map((story) => (
              <React.Fragment key={story.story_id}>
                <TableRow 
                  hover 
                  onClick={() => toggleExpanded(story.story_id)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Chip 
                      label={story.story_id} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {story.title}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {story.epic_id ? (
                      <Chip label={story.epic_id} size="small" color="secondary" variant="outlined" />
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={story.status || 'Unknown'} 
                      size="small" 
                      color={getStatusColor(story.status)} 
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={story.priority || 'Medium'} 
                      size="small" 
                      color={getPriorityColor(story.priority)} 
                    />
                  </TableCell>
                  <TableCell>{story.assignee || '-'}</TableCell>
                  <TableCell>
                    <Chip label={story.release} size="small" color="info" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(story.updated_at).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={8} sx={{ p: 0 }}>
                    <Collapse in={expandedStories[story.story_id]}>
                      <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Linked Test Cases
                        </Typography>
                        {loadingTestCases[story.story_id] ? (
                          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                            <CircularProgress size={24} />
                          </Box>
                        ) : storyTestCases[story.story_id]?.length > 0 ? (
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Test ID</TableCell>
                                <TableCell>Title</TableCell>
                                <TableCell>Module</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Tag</TableCell>
                                <TableCell>Sub-Module</TableCell>
                                <TableCell>Feature</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {storyTestCases[story.story_id].map((tc) => (
                                <TableRow key={tc.id}>
                                  <TableCell>{tc.test_id}</TableCell>
                                  <TableCell>{tc.title}</TableCell>
                                  <TableCell>{tc.module_name}</TableCell>
                                  <TableCell>
                                    <Chip label={tc.test_type} size="small" />
                                  </TableCell>
                                  <TableCell>
                                    <Chip 
                                      label={tc.tag} 
                                      size="small" 
                                      color={tc.tag === 'ui' ? 'primary' : tc.tag === 'api' ? 'secondary' : 'default'}
                                    />
                                  </TableCell>
                                  <TableCell>{tc.sub_module || '-'}</TableCell>
                                  <TableCell>{tc.feature_section || '-'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No test cases linked to this story
                          </Typography>
                        )}
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default StoriesView;
