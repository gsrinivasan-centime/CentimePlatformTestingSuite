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
  Snackbar,
  Select,
  MenuItem,
  FormControl,
  TextField,
  TablePagination,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Sync as SyncIcon
} from '@mui/icons-material';
import api from '../../services/api';
import ResizableTableCell from '../../components/ResizableTableCell';

const StoriesView = ({ releaseId }) => {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedStories, setExpandedStories] = useState({});
  const [storyTestCases, setStoryTestCases] = useState({});
  const [loadingTestCases, setLoadingTestCases] = useState({});
  const [syncing, setSyncing] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Test case details dialog state
  const [selectedTestCase, setSelectedTestCase] = useState(null);
  const [testCaseDialogOpen, setTestCaseDialogOpen] = useState(false);
  
  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  
  // Filter state
  const [filters, setFilters] = useState({
    storyId: '',
    title: '',
    epicId: '',
    status: '',
    priority: '',
    assignee: ''
  });

  useEffect(() => {
    fetchStories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [releaseId]);

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

  // Filter handlers
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(0); // Reset to first page when filtering
  };

  // Pagination handlers
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Apply filters
  const filteredStories = stories.filter(story => {
    return (
      (!filters.storyId || story.story_id.toLowerCase().includes(filters.storyId.toLowerCase())) &&
      (!filters.title || story.title.toLowerCase().includes(filters.title.toLowerCase())) &&
      (!filters.epicId || (story.epic_id && story.epic_id.toLowerCase().includes(filters.epicId.toLowerCase()))) &&
      (!filters.status || story.status === filters.status) &&
      (!filters.priority || story.priority === filters.priority) &&
      (!filters.assignee || (story.assignee && story.assignee.toLowerCase().includes(filters.assignee.toLowerCase())))
    );
  });

  // Apply pagination
  const paginatedStories = filteredStories.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Get unique values for dropdowns
  const uniqueStatuses = [...new Set(stories.map(s => s.status))].filter(Boolean);
  const uniquePriorities = [...new Set(stories.map(s => s.priority))].filter(Boolean);

  const toggleStoryExpansion = async (storyId) => {
    const isCurrentlyExpanded = expandedStories[storyId];
    
    setExpandedStories(prev => ({
      ...prev,
      [storyId]: !prev[storyId]
    }));

    // Fetch test cases if expanding and not already loaded
    if (!isCurrentlyExpanded && !storyTestCases[storyId]) {
      try {
        setLoadingTestCases(prev => ({ ...prev, [storyId]: true }));
        const response = await api.get(`/jira-stories/${storyId}/test-cases`, {
          params: { release_id: releaseId }
        });
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

  const handleSyncTestCases = async () => {
    try {
      setSyncing(true);
      const response = await api.post(`/releases/${releaseId}/sync-story-test-cases`);
      await fetchStories(); // Refresh the stories list
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



  const handleExecutionStatusChange = async (testCaseId, newStatus, storyId) => {
    try {
      await api.patch(`/releases/${releaseId}/test-case/${testCaseId}/execution-status`, null, {
        params: { execution_status: newStatus }
      });
      
      // Update local state
      setStoryTestCases(prev => ({
        ...prev,
        [storyId]: prev[storyId].map(tc =>
          tc.id === testCaseId ? { ...tc, execution_status: newStatus } : tc
        )
      }));
      
      // Refresh stories to update statistics
      const response = await api.get(`/releases/${releaseId}/stories`);
      setStories(response.data.stories || []);
      
      setSnackbar({
        open: true,
        message: 'Execution status updated successfully',
        severity: 'success'
      });
    } catch (err) {
      console.error('Error updating execution status:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.detail || 'Failed to update execution status',
        severity: 'error'
      });
    }
  };

  const handleTestCaseClick = (testCase) => {
    setSelectedTestCase(testCase);
    setTestCaseDialogOpen(true);
  };

  const handleCloseTestCaseDialog = () => {
    setTestCaseDialogOpen(false);
    setSelectedTestCase(null);
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

      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table sx={{ width: '100%', tableLayout: 'fixed' }}>
          <TableHead>
            <TableRow>
              <ResizableTableCell minWidth={100} initialWidth={120} isHeader={true}>Story ID</ResizableTableCell>
              <ResizableTableCell minWidth={150} initialWidth={350} isHeader={true}>Title</ResizableTableCell>
              <ResizableTableCell minWidth={100} initialWidth={120} isHeader={true}>Epic ID</ResizableTableCell>
              <ResizableTableCell minWidth={100} initialWidth={120} isHeader={true}>Status</ResizableTableCell>
              <ResizableTableCell minWidth={80} initialWidth={100} isHeader={true}>Priority</ResizableTableCell>
              <ResizableTableCell minWidth={120} initialWidth={150} isHeader={true}>Assignee</ResizableTableCell>
              <ResizableTableCell minWidth={150} initialWidth={200} isHeader={true}>Test Progress</ResizableTableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <TextField
                  size="small"
                  placeholder="Filter..."
                  value={filters.storyId}
                  onChange={(e) => handleFilterChange('storyId', e.target.value)}
                  fullWidth
                />
              </TableCell>
              <TableCell>
                <TextField
                  size="small"
                  placeholder="Filter..."
                  value={filters.title}
                  onChange={(e) => handleFilterChange('title', e.target.value)}
                  fullWidth
                />
              </TableCell>
              <TableCell>
                <TextField
                  size="small"
                  placeholder="Filter..."
                  value={filters.epicId}
                  onChange={(e) => handleFilterChange('epicId', e.target.value)}
                  fullWidth
                />
              </TableCell>
              <TableCell>
                <Select
                  size="small"
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  displayEmpty
                  fullWidth
                >
                  <MenuItem value="">All</MenuItem>
                  {uniqueStatuses.map(status => (
                    <MenuItem key={status} value={status}>{status}</MenuItem>
                  ))}
                </Select>
              </TableCell>
              <TableCell>
                <Select
                  size="small"
                  value={filters.priority}
                  onChange={(e) => handleFilterChange('priority', e.target.value)}
                  displayEmpty
                  fullWidth
                >
                  <MenuItem value="">All</MenuItem>
                  {uniquePriorities.map(priority => (
                    <MenuItem key={priority} value={priority}>{priority}</MenuItem>
                  ))}
                </Select>
              </TableCell>
              <TableCell>
                <TextField
                  size="small"
                  placeholder="Filter..."
                  value={filters.assignee}
                  onChange={(e) => handleFilterChange('assignee', e.target.value)}
                  fullWidth
                />
              </TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedStories.map((story) => (
              <React.Fragment key={story.story_id}>
                <TableRow 
                  hover 
                  sx={{ cursor: 'pointer', '& td': { py: 1 } }}
                  onClick={(e) => {
                    // Don't toggle if clicking on the Story ID chip
                    if (e.target.closest('.story-id-chip')) return;
                    toggleStoryExpansion(story.story_id);
                  }}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Chip 
                      className="story-id-chip"
                      label={story.story_id} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {story.title}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {story.epic_id ? (
                      <Chip label={story.epic_id} size="small" color="secondary" variant="outlined" />
                    ) : '-'}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <Chip 
                      label={story.status || 'Unknown'} 
                      size="small" 
                      color={getStatusColor(story.status)} 
                    />
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <Chip 
                      label={story.priority || 'Medium'} 
                      size="small" 
                      color={getPriorityColor(story.priority)} 
                    />
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {story.assignee || '-'}
                  </TableCell>
                  <TableCell>
                    {story.test_stats && story.test_stats.total > 0 ? (
                      <Box sx={{ width: '100%' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            {story.test_stats.passed}/{story.test_stats.total}
                          </Typography>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              fontWeight: 'bold',
                              color: story.test_stats.completion_percentage === 100 ? 'success.main' : 'text.primary'
                            }}
                          >
                            {Math.round(story.test_stats.completion_percentage)}%
                          </Typography>
                        </Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={story.test_stats.completion_percentage} 
                          sx={{ 
                            height: 8, 
                            borderRadius: 4,
                            backgroundColor: 'grey.200',
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: story.test_stats.completion_percentage === 100 ? 'success.main' : 'primary.main'
                            }
                          }}
                        />
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        No tests
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={7} sx={{ p: 0 }}>
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
                                <TableCell sx={{ whiteSpace: 'nowrap' }}>Test ID</TableCell>
                                <TableCell sx={{ whiteSpace: 'nowrap' }}>Title</TableCell>
                                <TableCell sx={{ whiteSpace: 'nowrap' }}>Module</TableCell>
                                <TableCell sx={{ whiteSpace: 'nowrap' }}>Type</TableCell>
                                <TableCell sx={{ whiteSpace: 'nowrap' }}>Tag</TableCell>
                                <TableCell sx={{ whiteSpace: 'nowrap' }}>Sub-Module</TableCell>
                                <TableCell sx={{ whiteSpace: 'nowrap' }}>Feature</TableCell>
                                <TableCell sx={{ whiteSpace: 'nowrap' }}>Execution Status</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {storyTestCases[story.story_id].map((tc) => (
                                <TableRow key={tc.id}>
                                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                    <Chip
                                      label={tc.test_id}
                                      size="small"
                                      color="primary"
                                      variant="outlined"
                                      onClick={() => handleTestCaseClick(tc)}
                                      sx={{ cursor: 'pointer' }}
                                    />
                                  </TableCell>
                                  <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 300 }}>
                                    {tc.title}
                                  </TableCell>
                                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{tc.module_name}</TableCell>
                                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                    <Chip label={tc.test_type} size="small" />
                                  </TableCell>
                                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                    <Chip 
                                      label={tc.tag} 
                                      size="small" 
                                      color={tc.tag === 'ui' ? 'primary' : tc.tag === 'api' ? 'secondary' : 'default'}
                                    />
                                  </TableCell>
                                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{tc.sub_module || '-'}</TableCell>
                                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{tc.feature_section || '-'}</TableCell>
                                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                    <FormControl size="small" fullWidth>
                                      <Select
                                        value={tc.execution_status || 'Not Started'}
                                        onChange={(e) => handleExecutionStatusChange(tc.id, e.target.value, story.story_id)}
                                        sx={{
                                          minWidth: 130,
                                          '& .MuiSelect-select': {
                                            py: 0.5,
                                            fontSize: '0.875rem'
                                          }
                                        }}
                                      >
                                        <MenuItem value="Not Started">Not Started</MenuItem>
                                        <MenuItem value="In Progress">In Progress</MenuItem>
                                        <MenuItem value="Passed">Passed</MenuItem>
                                        <MenuItem value="Failed">Failed</MenuItem>
                                        <MenuItem value="Blocked">Blocked</MenuItem>
                                      </Select>
                                    </FormControl>
                                  </TableCell>
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
        <TablePagination
          component="div"
          count={filteredStories.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
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

      {/* Test Case Details Dialog */}
      <Dialog 
        open={testCaseDialogOpen} 
        onClose={handleCloseTestCaseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Test Case Details</DialogTitle>
        <DialogContent dividers>
          {selectedTestCase && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Test ID
              </Typography>
              <Typography variant="body1" paragraph>
                {selectedTestCase.test_id}
              </Typography>

              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Title
              </Typography>
              <Typography variant="body1" paragraph>
                {selectedTestCase.title}
              </Typography>

              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Module
              </Typography>
              <Typography variant="body1" paragraph>
                {selectedTestCase.module_name || '-'}
              </Typography>

              {selectedTestCase.sub_module && (
                <>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Sub-Module
                  </Typography>
                  <Typography variant="body1" paragraph>
                    {selectedTestCase.sub_module}
                  </Typography>
                </>
              )}

              {selectedTestCase.feature_section && (
                <>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Feature/Section
                  </Typography>
                  <Typography variant="body1" paragraph>
                    {selectedTestCase.feature_section}
                  </Typography>
                </>
              )}

              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Type
              </Typography>
              <Typography variant="body1" paragraph>
                {selectedTestCase.test_type}
              </Typography>

              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Tag
              </Typography>
              <Box mb={2}>
                <Chip
                  label={selectedTestCase.tag ? selectedTestCase.tag.toUpperCase() : 'UI'}
                  size="small"
                  color={
                    selectedTestCase.tag === 'api' ? 'success' : 
                    selectedTestCase.tag === 'hybrid' ? 'warning' : 
                    'info'
                  }
                />
              </Box>

              {selectedTestCase.tags && (
                <>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Additional Tags
                  </Typography>
                  <Box mb={2} sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {selectedTestCase.tags.split(',').map((tag, idx) => (
                      <Chip
                        key={idx}
                        label={tag.trim()}
                        size="small"
                        color={
                          tag.trim() === 'smoke' ? 'error' :
                          tag.trim() === 'regression' ? 'primary' :
                          tag.trim() === 'sanity' ? 'success' :
                          tag.trim() === 'integration' ? 'warning' :
                          tag.trim() === 'e2e' ? 'info' :
                          'default'
                        }
                      />
                    ))}
                  </Box>
                </>
              )}

              {selectedTestCase.test_type === 'automated' && (
                <>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Automation Status
                  </Typography>
                  <Chip
                    label={selectedTestCase.automation_status || 'working'}
                    size="small"
                    color={selectedTestCase.automation_status === 'broken' ? 'error' : 'success'}
                    sx={{ mb: 2 }}
                  />
                </>
              )}

              {selectedTestCase.execution_status && (
                <>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Execution Status
                  </Typography>
                  <Chip
                    label={selectedTestCase.execution_status}
                    size="small"
                    color={
                      selectedTestCase.execution_status === 'Passed' ? 'success' :
                      selectedTestCase.execution_status === 'Failed' ? 'error' :
                      selectedTestCase.execution_status === 'In Progress' ? 'info' :
                      selectedTestCase.execution_status === 'Blocked' ? 'warning' : 'default'
                    }
                    sx={{ mb: 2 }}
                  />
                </>
              )}

              {selectedTestCase.description && (
                <>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Description
                  </Typography>
                  <Typography variant="body1" paragraph>
                    {selectedTestCase.description}
                  </Typography>
                </>
              )}

              {selectedTestCase.preconditions && (
                <>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Preconditions
                  </Typography>
                  <Typography variant="body1" paragraph style={{ whiteSpace: 'pre-wrap' }}>
                    {selectedTestCase.preconditions}
                  </Typography>
                </>
              )}

              {selectedTestCase.steps_to_reproduce && (
                <>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Steps to Reproduce
                  </Typography>
                  <Typography variant="body1" paragraph style={{ whiteSpace: 'pre-wrap' }}>
                    {selectedTestCase.steps_to_reproduce}
                  </Typography>
                </>
              )}

              {selectedTestCase.expected_result && (
                <>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Expected Result
                  </Typography>
                  <Typography variant="body1" paragraph>
                    {selectedTestCase.expected_result}
                  </Typography>
                </>
              )}

              {selectedTestCase.scenario_examples && (() => {
                try {
                  const examples = JSON.parse(selectedTestCase.scenario_examples);
                  return (
                    <>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Scenario Examples / Parameters
                      </Typography>
                      <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              {examples.columns.map((col, idx) => (
                                <TableCell key={idx}>
                                  <Typography variant="body2" fontWeight="bold">
                                    {col}
                                  </Typography>
                                </TableCell>
                              ))}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {examples.rows.map((row, rowIdx) => (
                              <TableRow key={rowIdx}>
                                {row.map((cell, cellIdx) => (
                                  <TableCell key={cellIdx}>{cell}</TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </>
                  );
                } catch (e) {
                  return null;
                }
              })()}

              {selectedTestCase.jira_story_id && (
                <>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Linked Story
                  </Typography>
                  <Chip 
                    label={selectedTestCase.jira_story_id} 
                    size="small" 
                    color="secondary" 
                    variant="outlined"
                    sx={{ mb: 2 }}
                  />
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTestCaseDialog} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StoriesView;
