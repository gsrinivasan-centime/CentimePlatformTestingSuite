import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  LinearProgress,
  Alert
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  CheckCircle as PassIcon,
  Cancel as FailIcon,
  HourglassEmpty as PendingIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import api from '../services/api';
import ResizableTableCell from '../components/ResizableTableCell';

const Executions = () => {
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedExecution, setSelectedExecution] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [executeDialogOpen, setExecuteDialogOpen] = useState(false);
  
  // For new execution
  const [testCases, setTestCases] = useState([]);
  const [releases, setReleases] = useState([]);
  const [selectedTestCases, setSelectedTestCases] = useState([]);
  const [selectedRelease, setSelectedRelease] = useState('');
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    fetchExecutions();
    fetchTestCases();
    fetchReleases();
  }, []);

  const fetchExecutions = async () => {
    setLoading(true);
    try {
      const response = await api.get('/executions');
      setExecutions(response.data);
    } catch (error) {
      console.error('Error fetching executions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTestCases = async () => {
    try {
      const response = await api.get('/test-cases');
      setTestCases(response.data);
    } catch (error) {
      console.error('Error fetching test cases:', error);
    }
  };

  const fetchReleases = async () => {
    try {
      const response = await api.get('/releases');
      setReleases(response.data);
    } catch (error) {
      console.error('Error fetching releases:', error);
    }
  };

  const handleExecuteTests = async () => {
    if (selectedTestCases.length === 0 || !selectedRelease) {
      alert('Please select test cases and a release');
      return;
    }

    setExecuting(true);
    try {
      await api.post('/executions/execute', {
        test_case_ids: selectedTestCases,
        release_id: selectedRelease
      });
      
      setExecuteDialogOpen(false);
      setSelectedTestCases([]);
      setSelectedRelease('');
      fetchExecutions();
      alert('Test execution started successfully!');
    } catch (error) {
      console.error('Error executing tests:', error);
      alert('Failed to execute tests: ' + (error.response?.data?.detail || error.message));
    } finally {
      setExecuting(false);
    }
  };

  const handleViewDetails = (execution) => {
    setSelectedExecution(execution);
    setDetailsOpen(true);
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'pass':
        return <PassIcon color="success" />;
      case 'fail':
        return <FailIcon color="error" />;
      case 'pending':
        return <PendingIcon color="warning" />;
      default:
        return <ErrorIcon color="disabled" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pass':
        return 'success';
      case 'fail':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const calculateStats = () => {
    const total = executions.length;
    const passed = executions.filter(e => e.status?.toLowerCase() === 'pass').length;
    const failed = executions.filter(e => e.status?.toLowerCase() === 'fail').length;
    const pending = executions.filter(e => e.status?.toLowerCase() === 'pending').length;
    
    return { total, passed, failed, pending };
  };

  const stats = calculateStats();

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Test Executions
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchExecutions}
            sx={{ mr: 2 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<PlayIcon />}
            onClick={() => setExecuteDialogOpen(true)}
          >
            Execute Tests
          </Button>
        </Box>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Executions
              </Typography>
              <Typography variant="h4">{stats.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Passed
              </Typography>
              <Typography variant="h4" color="success.main">{stats.passed}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Failed
              </Typography>
              <Typography variant="h4" color="error.main">{stats.failed}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Pending
              </Typography>
              <Typography variant="h4" color="warning.main">{stats.pending}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Executions Table */}
      <Paper>
        {loading && <LinearProgress />}
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 1200, tableLayout: 'fixed' }}>
            <TableHead>
              <TableRow>
                <ResizableTableCell minWidth={100} initialWidth={120} isHeader>Execution ID</ResizableTableCell>
                <ResizableTableCell minWidth={200} initialWidth={250} isHeader>Test Case</ResizableTableCell>
                <ResizableTableCell minWidth={120} initialWidth={140} isHeader>Release</ResizableTableCell>
                <ResizableTableCell minWidth={120} initialWidth={140} isHeader>Status</ResizableTableCell>
                <ResizableTableCell minWidth={150} initialWidth={180} isHeader>Executed By</ResizableTableCell>
                <ResizableTableCell minWidth={180} initialWidth={200} isHeader>Executed At</ResizableTableCell>
                <ResizableTableCell minWidth={100} initialWidth={120} isHeader>Duration</ResizableTableCell>
                <ResizableTableCell minWidth={100} initialWidth={120} isHeader>Actions</ResizableTableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {executions
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((execution) => (
                  <TableRow 
                    key={execution.id} 
                    hover
                    onClick={() => handleViewDetails(execution)}
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      }
                    }}
                  >
                    <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{execution.id}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{execution.test_case?.title || 'N/A'}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{execution.release?.version || 'N/A'}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <Chip
                        icon={getStatusIcon(execution.status)}
                        label={execution.status || 'Unknown'}
                        color={getStatusColor(execution.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{execution.executed_by?.name || 'System'}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {execution.executed_at 
                        ? new Date(execution.executed_at).toLocaleString()
                        : 'N/A'}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatDuration(execution.duration)}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(execution);
                          }}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              {executions.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography variant="body2" color="textSecondary" sx={{ py: 3 }}>
                      No test executions found. Click "Execute Tests" to run tests.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={executions.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Execute Tests Dialog */}
      <Dialog 
        open={executeDialogOpen} 
        onClose={() => setExecuteDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Execute Tests</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Select Release</InputLabel>
              <Select
                value={selectedRelease}
                onChange={(e) => setSelectedRelease(e.target.value)}
                label="Select Release"
              >
                {releases.map((release) => (
                  <MenuItem key={release.id} value={release.id}>
                    {release.version} - {release.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Select Test Cases</InputLabel>
              <Select
                multiple
                value={selectedTestCases}
                onChange={(e) => setSelectedTestCases(e.target.value)}
                label="Select Test Cases"
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => {
                      const tc = testCases.find(t => t.id === value);
                      return <Chip key={value} label={tc?.test_case_id || value} size="small" />;
                    })}
                  </Box>
                )}
              >
                {testCases.map((tc) => (
                  <MenuItem key={tc.id} value={tc.id}>
                    {tc.test_case_id} - {tc.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedTestCases.length > 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                {selectedTestCases.length} test case(s) selected
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExecuteDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleExecuteTests}
            disabled={executing || selectedTestCases.length === 0 || !selectedRelease}
            startIcon={<PlayIcon />}
          >
            {executing ? 'Executing...' : 'Execute'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Execution Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Execution Details</DialogTitle>
        <DialogContent>
          {selectedExecution && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Execution ID
                  </Typography>
                  <Typography variant="body1">{selectedExecution.id}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Status
                  </Typography>
                  <Chip
                    icon={getStatusIcon(selectedExecution.status)}
                    label={selectedExecution.status}
                    color={getStatusColor(selectedExecution.status)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Test Case
                  </Typography>
                  <Typography variant="body1">
                    {selectedExecution.test_case?.test_case_id} - {selectedExecution.test_case?.title}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Release
                  </Typography>
                  <Typography variant="body1">
                    {selectedExecution.release?.version} - {selectedExecution.release?.name}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Executed By
                  </Typography>
                  <Typography variant="body1">
                    {selectedExecution.executed_by?.name || 'System'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Executed At
                  </Typography>
                  <Typography variant="body1">
                    {selectedExecution.executed_at 
                      ? new Date(selectedExecution.executed_at).toLocaleString()
                      : 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Duration
                  </Typography>
                  <Typography variant="body1">
                    {formatDuration(selectedExecution.duration)}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Error Message
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50', mt: 1 }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {selectedExecution.error_message || 'No errors'}
                    </Typography>
                  </Paper>
                </Grid>
                {selectedExecution.log_file && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Log File
                    </Typography>
                    <Typography variant="body2">{selectedExecution.log_file}</Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Executions;
