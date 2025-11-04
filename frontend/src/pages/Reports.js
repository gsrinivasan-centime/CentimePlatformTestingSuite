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
  Divider
} from '@mui/material';
import {
  Download as DownloadIcon,
  PictureAsPdf as PdfIcon,
  Assessment as AssessmentIcon
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

      const response = await api.get(`/api/reports/summary?${params.toString()}`);
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
      const params = new URLSearchParams();
      params.append('release_id', selectedRelease);
      if (selectedModule) {
        params.append('module_id', selectedModule);
      }

      const response = await api.get(`/api/reports/pdf?${params.toString()}`, {
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
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Test Cases
                  </Typography>
                  <Typography variant="h4">{reportData.total_tests}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: 'success.light' }}>
                <CardContent>
                  <Typography color="white" gutterBottom>
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
                  <Typography color="white" gutterBottom>
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
                  <Typography color="white" gutterBottom>
                    Pass Rate
                  </Typography>
                  <Typography variant="h4" color="white">
                    {calculatePassRate(reportData.passed_tests, reportData.total_tests)}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Module-wise Summary */}
          {reportData.module_summary && reportData.module_summary.length > 0 && (
            <Paper sx={{ mb: 3 }}>
              <Box sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Module-wise Summary
                </Typography>
              </Box>
              <Divider />
              <TableContainer sx={{ overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 800, tableLayout: 'fixed' }}>
                  <TableHead>
                    <TableRow>
                      <ResizableTableCell minWidth={200} initialWidth={250} isHeader>Module</ResizableTableCell>
                      <ResizableTableCell minWidth={100} initialWidth={120} isHeader>Total Tests</ResizableTableCell>
                      <ResizableTableCell minWidth={100} initialWidth={120} isHeader>Passed</ResizableTableCell>
                      <ResizableTableCell minWidth={100} initialWidth={120} isHeader>Failed</ResizableTableCell>
                      <ResizableTableCell minWidth={100} initialWidth={120} isHeader>Pending</ResizableTableCell>
                      <ResizableTableCell minWidth={100} initialWidth={120} isHeader>Pass Rate</ResizableTableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData.module_summary.map((module) => (
                      <TableRow key={module.module_id}>
                        <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{module.module_name}</TableCell>
                        <TableCell align="center" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{module.total}</TableCell>
                        <TableCell align="center" sx={{ color: 'success.main', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {module.passed}
                        </TableCell>
                        <TableCell align="center" sx={{ color: 'error.main', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {module.failed}
                        </TableCell>
                        <TableCell align="center" sx={{ color: 'warning.main', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {module.pending}
                        </TableCell>
                        <TableCell align="center" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
