import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
} from '@mui/material';
import {
  Download as DownloadIcon,
  PictureAsPdf as PdfIcon,
  Assessment as AssessmentIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import api from '../services/api';
import ResizableTableCell from '../components/ResizableTableCell';

const Reports = () => {
  const [loading, setLoading] = useState(false);
  const [modules, setModules] = useState([]);
  const [releases, setReleases] = useState([]);
  const [selectedModule, setSelectedModule] = useState('');
  const [selectedRelease, setSelectedRelease] = useState('');
  const [reportData, setReportData] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchModules();
    fetchReleases();
  }, []);

  const fetchModules = async () => {
    try {
      const response = await api.get('/modules');
      setModules(response.data);
    } catch (error) {
      console.error('Error fetching modules:', error);
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

  const fetchReportData = async () => {
    if (!selectedRelease) {
      alert('Please select a release');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('release_id', selectedRelease);
      if (selectedModule) {
        params.append('module_id', selectedModule);
      }

      const response = await api.get(`/reports/summary?${params.toString()}`);
      setReportData(response.data);
    } catch (error) {
      console.error('Error fetching report data:', error);
      alert('Failed to fetch report data: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!selectedRelease) {
      alert('Please select a release');
      return;
    }

    setDownloading(true);
    try {
      const response = await api.get(`/reports/pdf/${selectedRelease}`, {
        responseType: 'blob'
      });

      // Create a blob URL and trigger download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `test-report-${selectedRelease}-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF report: ' + (error.response?.data?.detail || error.message));
    } finally {
      setDownloading(false);
    }
  };

  const calculatePassRate = (passed, total) => {
    if (total === 0) return 0;
    return ((passed / total) * 100).toFixed(1);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Test Reports
        </Typography>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={handleDownloadPDF}
          disabled={!selectedRelease || downloading}
        >
          {downloading ? 'Downloading...' : 'Download PDF Report'}
        </Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Generate Report
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Release *</InputLabel>
              <Select
                value={selectedRelease}
                onChange={(e) => setSelectedRelease(e.target.value)}
                label="Release *"
              >
                <MenuItem value="">
                  <em>Select Release</em>
                </MenuItem>
                {releases.map((release) => (
                  <MenuItem key={release.id} value={release.id}>
                    {release.version} - {release.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Module (Optional)</InputLabel>
              <Select
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
                label="Module (Optional)"
              >
                <MenuItem value="">
                  <em>All Modules</em>
                </MenuItem>
                {modules.map((module) => (
                  <MenuItem key={module.id} value={module.id}>
                    {module.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <Button
              variant="contained"
              startIcon={<AssessmentIcon />}
              onClick={fetchReportData}
              disabled={!selectedRelease || loading}
              fullWidth
              sx={{ height: 56 }}
            >
              {loading ? 'Loading...' : 'Generate Report'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Report Summary */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && reportData && (
        <>
          {/* Statistics Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Total Test Cases
                  </Typography>
                  <Typography variant="h4">{reportData.total_tests}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: 'success.light' }}>
                <CardContent>
                  <Typography color="white" gutterBottom variant="body2">
                    Passed
                  </Typography>
                  <Typography variant="h4" color="white">
                    {reportData.passed_tests}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: 'error.light' }}>
                <CardContent>
                  <Typography color="white" gutterBottom variant="body2">
                    Failed
                  </Typography>
                  <Typography variant="h4" color="white">
                    {reportData.failed_tests}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: 'primary.light' }}>
                <CardContent>
                  <Typography color="white" gutterBottom variant="body2">
                    Pass Rate
                  </Typography>
                  <Typography variant="h4" color="white">
                    {calculatePassRate(reportData.passed_tests, reportData.total_tests)}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: 'warning.light' }}>
                <CardContent>
                  <Typography color="white" gutterBottom variant="body2">
                    Blocked
                  </Typography>
                  <Typography variant="h4" color="white">
                    {reportData.blocked_tests || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: 'info.light' }}>
                <CardContent>
                  <Typography color="white" gutterBottom variant="body2">
                    In Progress
                  </Typography>
                  <Typography variant="h4" color="white">
                    {reportData.in_progress_tests || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: 'grey.400' }}>
                <CardContent>
                  <Typography color="white" gutterBottom variant="body2">
                    Not Started
                  </Typography>
                  <Typography variant="h4" color="white">
                    {reportData.not_started_tests || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: 'grey.600' }}>
                <CardContent>
                  <Typography color="white" gutterBottom variant="body2">
                    Skipped
                  </Typography>
                  <Typography variant="h4" color="white">
                    {reportData.skipped_tests || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Module-wise Summary */}
          {reportData.module_summary && reportData.module_summary.length > 0 && (
            <>
              <Paper sx={{ mb: 3 }}>
                <Box sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Module-wise Summary
                  </Typography>
                </Box>
                <Divider />
                <TableContainer sx={{ overflowX: 'auto' }}>
                  <Table size="small" sx={{ minWidth: 900, tableLayout: 'fixed' }}>
                    <TableHead>
                      <TableRow>
                        <ResizableTableCell minWidth={200} initialWidth={250} isHeader>Module</ResizableTableCell>
                        <ResizableTableCell minWidth={80} initialWidth={100} isHeader>Total</ResizableTableCell>
                        <ResizableTableCell minWidth={80} initialWidth={100} isHeader>Passed</ResizableTableCell>
                        <ResizableTableCell minWidth={80} initialWidth={100} isHeader>Failed</ResizableTableCell>
                        <ResizableTableCell minWidth={80} initialWidth={100} isHeader>Blocked</ResizableTableCell>
                        <ResizableTableCell minWidth={80} initialWidth={100} isHeader>In Progress</ResizableTableCell>
                        <ResizableTableCell minWidth={80} initialWidth={100} isHeader>Not Started</ResizableTableCell>
                        <ResizableTableCell minWidth={80} initialWidth={100} isHeader>Pass Rate</ResizableTableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reportData.module_summary.map((module) => (
                        <TableRow key={module.module_id}>
                          <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{module.module_name}</TableCell>
                          <TableCell align="center">{module.total}</TableCell>
                          <TableCell align="center" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                            {module.passed}
                          </TableCell>
                          <TableCell align="center" sx={{ color: 'error.main', fontWeight: 'bold' }}>
                            {module.failed}
                          </TableCell>
                          <TableCell align="center" sx={{ color: 'warning.main', fontWeight: 'bold' }}>
                            {module.blocked}
                          </TableCell>
                          <TableCell align="center" sx={{ color: 'info.main', fontWeight: 'bold' }}>
                            {module.in_progress}
                          </TableCell>
                          <TableCell align="center" sx={{ color: 'grey.600' }}>
                            {module.not_started}
                          </TableCell>
                          <TableCell align="center">
                            <Typography
                              variant="body2"
                              sx={{
                                color: parseFloat(calculatePassRate(module.passed, module.total)) >= 80
                                  ? 'success.main'
                                  : 'error.main',
                                fontWeight: 'bold'
                              }}
                            >
                              {calculatePassRate(module.passed, module.total)}%
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>

              {/* Detailed Test Cases by Module, Sub-Module, and Feature */}
              <Paper sx={{ mb: 3 }}>
                <Box sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Detailed Test Cases by Module
                  </Typography>
                </Box>
                <Divider />
                <Box sx={{ p: 2 }}>
                  {reportData.module_summary.map((module) => (
                    <Accordion key={module.module_id} sx={{ mb: 1 }}>
                      <AccordionSummary 
                        expandIcon={<ExpandMoreIcon />}
                        sx={{ bgcolor: '#e3f2fd' }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                          <Typography variant="subtitle1" fontWeight="bold" sx={{ flexGrow: 1 }}>
                            {module.module_name}
                          </Typography>
                          <Chip label={`${module.total} tests`} size="small" />
                          <Chip label={`${module.passed} passed`} size="small" color="success" />
                          <Chip label={`${module.failed} failed`} size="small" color="error" />
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        {module.sub_modules && module.sub_modules.map((subModule, smIdx) => (
                          <Accordion key={smIdx} sx={{ mb: 1 }}>
                            <AccordionSummary 
                              expandIcon={<ExpandMoreIcon />}
                              sx={{ bgcolor: '#f5f5f5' }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                                <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                                  {subModule.name}
                                </Typography>
                                <Chip label={`${subModule.total} tests`} size="small" variant="outlined" />
                              </Box>
                            </AccordionSummary>
                            <AccordionDetails>
                              {subModule.features && subModule.features.map((feature, fIdx) => (
                                <Accordion key={fIdx} sx={{ mb: 1 }}>
                                  <AccordionSummary 
                                    expandIcon={<ExpandMoreIcon />}
                                    sx={{ bgcolor: '#fafafa', minHeight: 40, '&.Mui-expanded': { minHeight: 40 } }}
                                  >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                                      <Typography variant="body2" sx={{ flexGrow: 1 }}>
                                        {feature.name}
                                      </Typography>
                                      <Chip 
                                        label={`${feature.test_cases.length} tests`} 
                                        size="small" 
                                        color="primary" 
                                        variant="outlined" 
                                      />
                                    </Box>
                                  </AccordionSummary>
                                  <AccordionDetails>
                                    <TableContainer>
                                      <Table size="small">
                                        <TableHead>
                                          <TableRow>
                                            <TableCell>Test ID</TableCell>
                                            <TableCell>Title</TableCell>
                                            <TableCell>Type</TableCell>
                                            <TableCell>Priority</TableCell>
                                            <TableCell>Status</TableCell>
                                            <TableCell>Execution Date</TableCell>
                                            <TableCell>Comments</TableCell>
                                          </TableRow>
                                        </TableHead>
                                        <TableBody>
                                          {feature.test_cases.map((testCase) => (
                                            <TableRow key={testCase.id}>
                                              <TableCell>{testCase.test_id}</TableCell>
                                              <TableCell>{testCase.title}</TableCell>
                                              <TableCell>
                                                <Chip 
                                                  label={testCase.test_type} 
                                                  size="small" 
                                                  variant="outlined"
                                                />
                                              </TableCell>
                                              <TableCell>
                                                <Chip 
                                                  label={testCase.priority || 'N/A'} 
                                                  size="small"
                                                  color={
                                                    testCase.priority === 'high' ? 'error' :
                                                    testCase.priority === 'medium' ? 'warning' :
                                                    'default'
                                                  }
                                                  variant="outlined"
                                                />
                                              </TableCell>
                                              <TableCell>
                                                <Chip 
                                                  label={testCase.execution_status.replace('_', ' ').toUpperCase()} 
                                                  size="small"
                                                  color={
                                                    testCase.execution_status === 'passed' ? 'success' :
                                                    testCase.execution_status === 'failed' ? 'error' :
                                                    testCase.execution_status === 'in_progress' ? 'info' :
                                                    testCase.execution_status === 'blocked' ? 'warning' :
                                                    'default'
                                                  }
                                                />
                                              </TableCell>
                                              <TableCell>
                                                {testCase.execution_date 
                                                  ? new Date(testCase.execution_date).toLocaleString()
                                                  : 'N/A'}
                                              </TableCell>
                                              <TableCell>
                                                {testCase.comments || '-'}
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
                </Box>
              </Paper>
            </>
          )}

          {/* Failed Tests Detail */}
          {reportData.failed_test_details && reportData.failed_test_details.length > 0 && (
            <Paper>
              <Box sx={{ p: 2, bgcolor: 'error.light' }}>
                <Typography variant="h6" color="white">
                  Failed Test Cases
                </Typography>
              </Box>
              <Divider />
              <TableContainer sx={{ overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 900, tableLayout: 'fixed' }}>
                  <TableHead>
                    <TableRow>
                      <ResizableTableCell minWidth={120} initialWidth={140} isHeader>Test Case ID</ResizableTableCell>
                      <ResizableTableCell minWidth={200} initialWidth={250} isHeader>Title</ResizableTableCell>
                      <ResizableTableCell minWidth={150} initialWidth={180} isHeader>Module</ResizableTableCell>
                      <ResizableTableCell minWidth={300} initialWidth={350} isHeader>Error Message</ResizableTableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData.failed_test_details.map((test) => (
                      <TableRow key={test.test_case_id}>
                        <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{test.test_case_id}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{test.title}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{test.module_name}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <Typography variant="body2" color="error">
                            {test.error_message || 'No error message'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}

          {reportData.total_tests === 0 && (
            <Alert severity="info">
              No test executions found for the selected release and module.
            </Alert>
          )}
        </>
      )}

      {!loading && !reportData && (
        <Paper sx={{ p: 5, textAlign: 'center' }}>
          <PdfIcon sx={{ fontSize: 80, color: 'grey.400', mb: 2 }} />
          <Typography variant="h6" color="textSecondary" gutterBottom>
            No Report Generated
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Select a release and click "Generate Report" to view test execution summary
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default Reports;
