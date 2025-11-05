import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  Alert,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as PassedIcon,
  Cancel as FailedIcon,
  Block as BlockedIcon,
  HourglassEmpty as NotStartedIcon,
  PlayArrow as InProgressIcon,
  SkipNext as SkippedIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { getReleaseTreeView, updateReleaseTestCase, removeTestCaseFromRelease } from '../../services/releaseManagementApi';
import { testCasesAPI } from '../../services/api';
import ResizableTableCell from '../../components/ResizableTableCell';

const STATUS_COLORS = {
  passed: '#4caf50',
  failed: '#f44336',
  blocked: '#ff9800',
  not_started: '#9e9e9e',
  in_progress: '#2196f3',
  skipped: '#607d8b'
};

const STATUS_ICONS = {
  passed: <PassedIcon />,
  failed: <FailedIcon />,
  blocked: <BlockedIcon />,
  not_started: <NotStartedIcon />,
  in_progress: <InProgressIcon />,
  skipped: <SkippedIcon />
};

const TreeView = ({ releaseId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [treeData, setTreeData] = useState(null);
  const [expandedModules, setExpandedModules] = useState({});
  const [expandedSubModules, setExpandedSubModules] = useState({});
  const [expandedFeatures, setExpandedFeatures] = useState({});
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedTestCase, setSelectedTestCase] = useState(null);
  const [fullTestCaseDetails, setFullTestCaseDetails] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [updateFormData, setUpdateFormData] = useState({
    execution_status: '',
    comments: '',
    bug_ids: '',
    priority: ''
  });

  useEffect(() => {
    fetchTreeView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [releaseId]);

  const fetchTreeView = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getReleaseTreeView(releaseId);
      setTreeData(response.data);
      
      // Auto-expand all modules
      const modulesExpanded = {};
      response.data.modules.forEach(module => {
        modulesExpanded[module.id] = true;
      });
      setExpandedModules(modulesExpanded);
    } catch (err) {
      console.error('Error fetching tree view:', err);
      setError(err.response?.data?.detail || 'Failed to load tree data');
    } finally {
      setLoading(false);
    }
  };

  const handleModuleToggle = (moduleId) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  const handleSubModuleToggle = (subModuleId) => {
    setExpandedSubModules(prev => ({
      ...prev,
      [subModuleId]: !prev[subModuleId]
    }));
  };

  const handleFeatureToggle = (featureId) => {
    setExpandedFeatures(prev => ({
      ...prev,
      [featureId]: !prev[featureId]
    }));
  };

  const handleEditTestCase = (testCase) => {
    setSelectedTestCase(testCase);
    setUpdateFormData({
      execution_status: testCase.execution_status,
      comments: testCase.comments || '',
      bug_ids: testCase.bug_ids || '',
      priority: testCase.priority || 'medium'
    });
    setUpdateDialogOpen(true);
  };

  const handleCloseUpdateDialog = () => {
    setUpdateDialogOpen(false);
    setSelectedTestCase(null);
    setUpdateFormData({
      execution_status: '',
      comments: '',
      bug_ids: '',
      priority: ''
    });
  };

  const handleUpdateTestCase = async () => {
    try {
      await updateReleaseTestCase(releaseId, selectedTestCase.id, updateFormData);
      handleCloseUpdateDialog();
      fetchTreeView(); // Refresh data
    } catch (err) {
      console.error('Error updating test case:', err);
      alert(err.response?.data?.detail || 'Failed to update test case');
    }
  };

  const handleDeleteTestCase = (testCase) => {
    setSelectedTestCase(testCase);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedTestCase(null);
  };

  const handleConfirmDelete = async () => {
    try {
      setDeleteLoading(true);
      await removeTestCaseFromRelease(releaseId, selectedTestCase.id);
      handleCloseDeleteDialog();
      fetchTreeView(); // Refresh data
    } catch (err) {
      console.error('Error deleting test case:', err);
      alert(err.response?.data?.detail || 'Failed to remove test case from release');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleViewTestCase = async (testCase) => {
    setSelectedTestCase(testCase);
    setViewDialogOpen(true);
    setViewLoading(true);
    try {
      // Fetch full test case details from test cases API using the test case id
      const fullDetails = await testCasesAPI.getById(testCase.id);
      setFullTestCaseDetails(fullDetails);
    } catch (err) {
      console.error('Error fetching test case details:', err);
      // If fetch fails, we'll show what we have from the tree view
      setFullTestCaseDetails(null);
    } finally {
      setViewLoading(false);
    }
  };

  const handleCloseViewDialog = () => {
    setViewDialogOpen(false);
    setSelectedTestCase(null);
    setFullTestCaseDetails(null);
  };

  const renderStats = (stats) => {
    const total = stats.total || 0;
    if (total === 0) return null;

    const passed = stats.passed || 0;
    const passRate = (passed / total * 100).toFixed(0);

    return (
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <Chip label={`${passed}/${total}`} size="small" color="primary" />
        <LinearProgress 
          variant="determinate" 
          value={parseFloat(passRate)} 
          sx={{ 
            width: 100, 
            height: 8, 
            borderRadius: 4,
            bgcolor: '#e0e0e0',
            '& .MuiLinearProgress-bar': {
              bgcolor: passRate >= 80 ? STATUS_COLORS.passed : passRate >= 50 ? STATUS_COLORS.blocked : STATUS_COLORS.failed
            }
          }}
        />
        <Typography variant="body2">{passRate}%</Typography>
      </Box>
    );
  };

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

  if (!treeData || !treeData.modules || treeData.modules.length === 0) {
    return <Alert severity="info">No test cases found in this release</Alert>;
  }

  return (
    <Box>
      {/* Modules */}
      {treeData.modules.map((module) => (
        <Accordion 
          key={module.id} 
          expanded={expandedModules[module.id] || false}
          onChange={() => handleModuleToggle(module.id)}
          sx={{ mb: 1 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
              <Typography variant="h6" sx={{ flexGrow: 1 }}>{module.name}</Typography>
              {renderStats(module.stats)}
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            {/* Sub-Modules */}
            {module.sub_modules.map((subModule) => (
              <Accordion 
                key={subModule.id}
                expanded={expandedSubModules[subModule.id] || false}
                onChange={() => handleSubModuleToggle(subModule.id)}
                sx={{ mb: 1 }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>{subModule.name}</Typography>
                    {renderStats(subModule.stats)}
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  {/* Features */}
                  {subModule.features.map((feature) => (
                    <Accordion 
                      key={feature.id}
                      expanded={expandedFeatures[feature.id] !== false}
                      onChange={() => handleFeatureToggle(feature.id)}
                      sx={{ mb: 1, '&:before': { display: 'none' } }}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        sx={{ 
                          bgcolor: '#f5f5f5',
                          minHeight: 48,
                          '&.Mui-expanded': { minHeight: 48 }
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                          <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>{feature.name}</Typography>
                          {renderStats(feature.stats)}
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        {/* Test Cases Table */}
                        <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
                        <Table size="small" sx={{ minWidth: 1400, tableLayout: 'fixed' }}>
                          <TableHead>
                            <TableRow>
                              <ResizableTableCell minWidth={120} initialWidth={120} isHeader>Test ID</ResizableTableCell>
                              <ResizableTableCell minWidth={200} initialWidth={300} isHeader>Title</ResizableTableCell>
                              <ResizableTableCell minWidth={130} initialWidth={150} isHeader align="center">Status</ResizableTableCell>
                              <ResizableTableCell minWidth={100} initialWidth={110} isHeader align="center">Priority</ResizableTableCell>
                              <ResizableTableCell minWidth={120} initialWidth={140} isHeader>Executed By</ResizableTableCell>
                              <ResizableTableCell minWidth={150} initialWidth={170} isHeader>Execution Date</ResizableTableCell>
                              <ResizableTableCell minWidth={150} initialWidth={200} isHeader>Comments</ResizableTableCell>
                              <ResizableTableCell minWidth={100} initialWidth={120} isHeader>Bug IDs</ResizableTableCell>
                              <ResizableTableCell minWidth={100} initialWidth={120} isHeader align="center">Actions</ResizableTableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {feature.test_cases.map((testCase) => (
                              <TableRow 
                                key={testCase.id} 
                                hover
                                onClick={() => handleViewTestCase(testCase)}
                                sx={{ 
                                  cursor: 'pointer',
                                  '&:hover': {
                                    backgroundColor: 'action.hover',
                                  }
                                }}
                              >
                                <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  <Typography 
                                    variant="body2" 
                                    fontWeight="medium"
                                    sx={{
                                      color: 'primary.main',
                                    }}
                                  >
                                    {testCase.test_id}
                                  </Typography>
                                </TableCell>
                                <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  <Tooltip title={testCase.title}>
                                    <span>{testCase.title}</span>
                                  </Tooltip>
                                </TableCell>
                                <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                                  <Chip 
                                    icon={STATUS_ICONS[testCase.execution_status]}
                                    label={testCase.execution_status.replace('_', ' ').toUpperCase()}
                                    size="small"
                                    sx={{ 
                                      bgcolor: STATUS_COLORS[testCase.execution_status],
                                      color: 'white',
                                      '& .MuiChip-icon': { color: 'white' }
                                    }}
                                  />
                                </TableCell>
                                <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                                  <Chip 
                                    label={testCase.priority || 'medium'}
                                    size="small"
                                    color={
                                      testCase.priority === 'high' ? 'error' : 
                                      testCase.priority === 'low' ? 'default' : 
                                      'warning'
                                    }
                                  />
                                </TableCell>
                                <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {testCase.executed_by || '-'}
                                </TableCell>
                                <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {testCase.execution_date 
                                    ? new Date(testCase.execution_date).toLocaleString()
                                    : '-'}
                                </TableCell>
                                <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  <Tooltip title={testCase.comments || ''}>
                                    <span>{testCase.comments || '-'}</span>
                                  </Tooltip>
                                </TableCell>
                                <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {testCase.bug_ids || '-'}
                                </TableCell>
                                <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                                  <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', alignItems: 'center' }}>
                                    <Tooltip title="View Details">
                                      <IconButton 
                                        size="small" 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleViewTestCase(testCase);
                                        }}
                                        color="info"
                                      >
                                        <ViewIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Edit Status">
                                      <IconButton 
                                        size="small" 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditTestCase(testCase);
                                        }}
                                        color="primary"
                                      >
                                        <EditIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Remove from Release">
                                      <IconButton 
                                        size="small" 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteTestCase(testCase);
                                        }}
                                        color="error"
                                      >
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </AccordionDetails>
              </Accordion>
            ))}
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Update Test Case Dialog */}
      <Dialog open={updateDialogOpen} onClose={handleCloseUpdateDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Update Test Case Execution</DialogTitle>
        <DialogContent>
          {selectedTestCase && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {selectedTestCase.test_id}: {selectedTestCase.title}
              </Typography>
              
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Execution Status</InputLabel>
                <Select
                  value={updateFormData.execution_status}
                  label="Execution Status"
                  onChange={(e) => setUpdateFormData({ ...updateFormData, execution_status: e.target.value })}
                >
                  <MenuItem value="not_started">Not Started</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="passed">Passed</MenuItem>
                  <MenuItem value="failed">Failed</MenuItem>
                  <MenuItem value="blocked">Blocked</MenuItem>
                  <MenuItem value="skipped">Skipped</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={updateFormData.priority}
                  label="Priority"
                  onChange={(e) => setUpdateFormData({ ...updateFormData, priority: e.target.value })}
                >
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Comments"
                multiline
                rows={3}
                value={updateFormData.comments}
                onChange={(e) => setUpdateFormData({ ...updateFormData, comments: e.target.value })}
                sx={{ mt: 2 }}
              />

              <TextField
                fullWidth
                label="Bug IDs (comma-separated)"
                value={updateFormData.bug_ids}
                onChange={(e) => setUpdateFormData({ ...updateFormData, bug_ids: e.target.value })}
                placeholder="BUG-123, BUG-456"
                sx={{ mt: 2 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUpdateDialog}>Cancel</Button>
          <Button onClick={handleUpdateTestCase} variant="contained" color="primary">
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Remove Test Case from Release</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="body1" gutterBottom>
              Are you sure you want to remove this test case from the release?
            </Typography>
            {selectedTestCase && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Test ID:</strong> {selectedTestCase.test_id}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  <strong>Title:</strong> {selectedTestCase.title}
                </Typography>
              </Box>
            )}
            <Typography variant="body2" color="error" sx={{ mt: 2 }}>
              This action will remove the test case from this release but will not delete the test case itself.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} disabled={deleteLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDelete} 
            variant="contained" 
            color="error"
            disabled={deleteLoading}
            startIcon={deleteLoading ? <CircularProgress size={20} /> : null}
          >
            {deleteLoading ? 'Removing...' : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Test Case Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={handleCloseViewDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Test Case Details</DialogTitle>
        <DialogContent>
          {viewLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
              <CircularProgress />
            </Box>
          ) : fullTestCaseDetails ? (
            <Box sx={{ pt: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Test ID
              </Typography>
              <Typography variant="body1" paragraph>
                {fullTestCaseDetails.test_id}
              </Typography>

              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Title
              </Typography>
              <Typography variant="body1" paragraph>
                {fullTestCaseDetails.title}
              </Typography>

              {fullTestCaseDetails.description && (
                <>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Description
                  </Typography>
                  <Typography variant="body1" paragraph>
                    {fullTestCaseDetails.description}
                  </Typography>
                </>
              )}

              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Type
              </Typography>
              <Typography variant="body1" paragraph>
                {fullTestCaseDetails.test_type}
              </Typography>

              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Tag
              </Typography>
              <Box mb={2}>
                <Chip
                  label={fullTestCaseDetails.tag ? fullTestCaseDetails.tag.toUpperCase() : 'UI'}
                  size="small"
                  color={
                    fullTestCaseDetails.tag === 'api' ? 'success' : 
                    fullTestCaseDetails.tag === 'hybrid' ? 'warning' : 
                    'info'
                  }
                  variant="outlined"
                />
              </Box>

              {fullTestCaseDetails.tags && (
                <>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Additional Tags
                  </Typography>
                  <Box mb={2} sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {fullTestCaseDetails.tags.split(',').map((tag, idx) => (
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

              {fullTestCaseDetails.test_type === 'automated' && (
                <>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Automation Status
                  </Typography>
                  <Chip
                    label={fullTestCaseDetails.automation_status || 'working'}
                    size="small"
                    color={fullTestCaseDetails.automation_status === 'broken' ? 'error' : 'success'}
                    sx={{ mb: 2 }}
                  />
                </>
              )}

              {fullTestCaseDetails.preconditions && (
                <>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Preconditions
                  </Typography>
                  <Typography variant="body1" paragraph style={{ whiteSpace: 'pre-wrap' }}>
                    {fullTestCaseDetails.preconditions}
                  </Typography>
                </>
              )}

              {fullTestCaseDetails.steps_to_reproduce && (
                <>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Steps to Reproduce
                  </Typography>
                  <Typography variant="body1" paragraph style={{ whiteSpace: 'pre-wrap' }}>
                    {fullTestCaseDetails.steps_to_reproduce}
                  </Typography>
                </>
              )}

              {fullTestCaseDetails.expected_result && (
                <>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Expected Result
                  </Typography>
                  <Typography variant="body1" paragraph>
                    {fullTestCaseDetails.expected_result}
                  </Typography>
                </>
              )}

              {fullTestCaseDetails.scenario_examples && (() => {
                try {
                  const examples = JSON.parse(fullTestCaseDetails.scenario_examples);
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

              {selectedTestCase && (
                <>
                  <Typography variant="h6" sx={{ mt: 3, mb: 2, color: 'primary.main' }}>
                    Release Execution Details
                  </Typography>

                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Execution Status
                  </Typography>
                  <Box mb={2}>
                    <Chip 
                      icon={STATUS_ICONS[selectedTestCase.execution_status]}
                      label={selectedTestCase.execution_status.replace('_', ' ').toUpperCase()}
                      size="small"
                      sx={{ 
                        bgcolor: STATUS_COLORS[selectedTestCase.execution_status],
                        color: 'white',
                        '& .MuiChip-icon': { color: 'white' }
                      }}
                    />
                  </Box>

                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Priority
                  </Typography>
                  <Box mb={2}>
                    <Chip 
                      label={selectedTestCase.priority || 'medium'}
                      size="small"
                      color={
                        selectedTestCase.priority === 'high' ? 'error' : 
                        selectedTestCase.priority === 'low' ? 'default' : 
                        'warning'
                      }
                    />
                  </Box>

                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Executed By
                  </Typography>
                  <Typography variant="body1" paragraph>
                    {selectedTestCase.executed_by || '-'}
                  </Typography>

                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Execution Date
                  </Typography>
                  <Typography variant="body1" paragraph>
                    {selectedTestCase.execution_date 
                      ? new Date(selectedTestCase.execution_date).toLocaleString()
                      : '-'}
                  </Typography>

                  {selectedTestCase.comments && (
                    <>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Execution Comments
                      </Typography>
                      <Typography variant="body1" paragraph style={{ whiteSpace: 'pre-wrap' }}>
                        {selectedTestCase.comments}
                      </Typography>
                    </>
                  )}

                  {selectedTestCase.bug_ids && (
                    <>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Bug IDs
                      </Typography>
                      <Typography variant="body1" paragraph>
                        {selectedTestCase.bug_ids}
                      </Typography>
                    </>
                  )}
                </>
              )}
            </Box>
          ) : (
            <Box sx={{ pt: 2 }}>
              <Alert severity="error">Failed to load test case details</Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseViewDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TreeView;
