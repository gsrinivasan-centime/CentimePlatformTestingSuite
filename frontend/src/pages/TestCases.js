import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Autocomplete,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { testCasesAPI, modulesAPI } from '../services/api';
import ResizableTableCell from '../components/ResizableTableCell';
import ScenarioExamplesTable from '../components/ScenarioExamplesTable';
import { useToast } from '../context/ToastContext';

const TestCases = () => {
  const { showSuccess, showError } = useToast();
  const [testCases, setTestCases] = useState([]);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openBulkUploadDialog, setOpenBulkUploadDialog] = useState(false);
  const [selectedTestCase, setSelectedTestCase] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [formData, setFormData] = useState({
    test_id: '',
    title: '',
    description: '',
    test_type: 'manual',
    tag: 'ui',
    tags: [],  // NEW: Additional categorization tags (smoke, regression, etc.)
    module_id: '',
    sub_module: '',
    feature_section: '',
    automation_status: 'working',
    scenario_examples: null,  // NEW: JSON for scenario outline parameters
    steps_to_reproduce: '',
    expected_result: '',
    preconditions: '',
    test_data: '',
    automated_script_path: '',
  });
  
  // NEW: Hierarchy state for cascading dropdowns
  const [subModules, setSubModules] = useState([]);
  const [features, setFeatures] = useState([]);
  
  // NEW: Filter state
  const [filters, setFilters] = useState({
    module_id: '',
    sub_module: '',
    feature_section: '',
    test_type: '',
  });
  const [filterSubModules, setFilterSubModules] = useState([]);
  const [filterFeatures, setFilterFeatures] = useState([]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // NEW: Apply filters when they change
  useEffect(() => {
    if (modules.length > 0) {
      loadFilteredData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const loadData = async () => {
    try {
      const [testCasesData, modulesData] = await Promise.all([
        testCasesAPI.getAll(),
        modulesAPI.getAll(),
      ]);
      setTestCases(testCasesData);
      setModules(modulesData);
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };
  
  // NEW: Load filtered test cases
  const loadFilteredData = async () => {
    try {
      const params = {};
      if (filters.module_id) params.module_id = filters.module_id;
      if (filters.sub_module) params.sub_module = filters.sub_module;
      if (filters.feature_section) params.feature_section = filters.feature_section;
      if (filters.test_type) params.test_type = filters.test_type;
      
      const testCasesData = await testCasesAPI.getAll(params);
      setTestCases(testCasesData);
    } catch (err) {
      setError('Failed to load filtered data');
    }
  };
  
  // NEW: Load sub-modules for filter dropdown
  const loadFilterSubModules = async (moduleId) => {
    if (!moduleId) {
      setFilterSubModules([]);
      setFilterFeatures([]);
      return;
    }
    
    try {
      const options = await testCasesAPI.getHierarchyOptions(moduleId);
      setFilterSubModules(options);
      setFilterFeatures([]);
    } catch (err) {
      console.error('Failed to load filter sub-modules:', err);
      setFilterSubModules([]);
    }
  };

  // NEW: Load features for filter dropdown
  const loadFilterFeatures = async (moduleId, subModule) => {
    if (!moduleId || !subModule) {
      setFilterFeatures([]);
      return;
    }
    
    try {
      const options = await testCasesAPI.getHierarchyOptions(moduleId, subModule);
      setFilterFeatures(options);
    } catch (err) {
      console.error('Failed to load filter features:', err);
      setFilterFeatures([]);
    }
  };
  
  // NEW: Handle filter changes
  const handleFilterChange = async (e) => {
    const { name, value } = e.target;
    
    const newFilters = { ...filters, [name]: value };
    
    // Reset cascading filters
    if (name === 'module_id') {
      newFilters.sub_module = '';
      newFilters.feature_section = '';
      await loadFilterSubModules(value);
    } else if (name === 'sub_module') {
      newFilters.feature_section = '';
      await loadFilterFeatures(filters.module_id, value);
    }
    
    setFilters(newFilters);
  };
  
  // NEW: Clear all filters
  const handleClearFilters = () => {
    setFilters({
      module_id: '',
      sub_module: '',
      feature_section: '',
      test_type: '',
    });
    setFilterSubModules([]);
    setFilterFeatures([]);
  };

  // NEW: Load sub-modules when module is selected
  const loadSubModules = async (moduleId) => {
    if (!moduleId) {
      setSubModules([]);
      setFeatures([]);
      return;
    }
    
    try {
      const options = await testCasesAPI.getHierarchyOptions(moduleId);
      setSubModules(options);
      setFeatures([]);
    } catch (err) {
      console.error('Failed to load sub-modules:', err);
      setSubModules([]);
    }
  };

  // NEW: Load features when sub-module is selected
  const loadFeatures = async (moduleId, subModule) => {
    if (!moduleId || !subModule) {
      setFeatures([]);
      return;
    }
    
    try {
      const options = await testCasesAPI.getHierarchyOptions(moduleId, subModule);
      setFeatures(options);
    } catch (err) {
      console.error('Failed to load features:', err);
      setFeatures([]);
    }
  };

  const handleOpenDialog = async (testCase = null) => {
    if (testCase) {
      // Convert tags from comma-separated string to array for Autocomplete
      const tagsArray = testCase.tags 
        ? testCase.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
        : [];
      
      setFormData({
        ...testCase,
        tags: tagsArray
      });
      setSelectedTestCase(testCase);
      
      // Load hierarchy data for editing
      if (testCase.module_id) {
        await loadSubModules(testCase.module_id);
        if (testCase.sub_module) {
          await loadFeatures(testCase.module_id, testCase.sub_module);
        }
      }
    } else {
      // For new test cases, generate test_id based on default tag
      try {
        const response = await testCasesAPI.generateTestId('ui');
        setFormData({
          test_id: response.test_id,
          title: '',
          description: '',
          test_type: 'manual',
          tag: 'ui',
          tags: [],
          module_id: '',
          sub_module: '',
          feature_section: '',
          automation_status: 'working',
          scenario_examples: null,
          steps_to_reproduce: '',
          expected_result: '',
          preconditions: '',
          test_data: '',
          automated_script_path: '',
        });
      } catch (err) {
        console.error('Failed to generate test ID:', err);
        setFormData({
          test_id: '',
          title: '',
          description: '',
          test_type: 'manual',
          tag: 'ui',
          tags: [],
          module_id: '',
          sub_module: '',
          feature_section: '',
          automation_status: 'working',
          scenario_examples: null,
          steps_to_reproduce: '',
          expected_result: '',
          preconditions: '',
          test_data: '',
          automated_script_path: '',
        });
      }
      setSelectedTestCase(null);
      setSubModules([]);
      setFeatures([]);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedTestCase(null);
    setError('');
  };

  const handleViewTestCase = (testCase) => {
    setSelectedTestCase(testCase);
    setOpenViewDialog(true);
  };

  const handleChange = async (e) => {
    const { name, value } = e.target;
    
    setFormData({
      ...formData,
      [name]: value,
    });

    // NEW: Handle tag change - auto-generate test_id
    if (name === 'tag' && !selectedTestCase) {
      try {
        const response = await testCasesAPI.generateTestId(value);
        setFormData(prev => ({
          ...prev,
          [name]: value,
          test_id: response.test_id,
        }));
      } catch (err) {
        console.error('Failed to generate test ID:', err);
        setFormData(prev => ({
          ...prev,
          [name]: value,
        }));
      }
    }

    // NEW: Handle cascading dropdowns
    if (name === 'module_id') {
      // Reset sub-module and feature when module changes
      setFormData(prev => ({
        ...prev,
        [name]: value,
        sub_module: '',
        feature_section: '',
      }));
      await loadSubModules(value);
    } else if (name === 'sub_module') {
      // Reset feature when sub-module changes
      setFormData(prev => ({
        ...prev,
        [name]: value,
        feature_section: '',
      }));
      await loadFeatures(formData.module_id, value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      // Convert tags array to comma-separated string for backend
      const dataToSubmit = {
        ...formData,
        tags: Array.isArray(formData.tags) 
          ? formData.tags.join(',') 
          : formData.tags || ''
      };
      
      if (selectedTestCase) {
        await testCasesAPI.update(selectedTestCase.id, dataToSubmit);
        setSuccess('Test case updated successfully');
      } else {
        await testCasesAPI.create(dataToSubmit);
        setSuccess('Test case created successfully');
      }
      handleCloseDialog();
      loadData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Operation failed');
    }
  };

  const handleBulkUpload = async () => {
    if (!uploadFile) {
      showError('Please select a CSV file');
      return;
    }

    try {
      setUploadLoading(true);
      const formData = new FormData();
      formData.append('file', uploadFile);

      const response = await testCasesAPI.bulkUpload(formData);
      
      setOpenBulkUploadDialog(false);
      setUploadFile(null);
      
      if (response.failed > 0) {
        showError(`Bulk upload completed with errors. Created: ${response.created}, Failed: ${response.failed}`);
        if (response.errors && response.errors.length > 0) {
          console.error('Upload errors:', response.errors);
        }
      } else {
        showSuccess(`Successfully created ${response.created} test cases`);
      }
      
      await loadData();
    } catch (err) {
      showError(err.response?.data?.detail || 'Bulk upload failed');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    // Create sample CSV content
    const csvContent = `title,description,test_type,tag,tags,module_id,sub_module,feature_section,automation_status,scenario_examples,steps_to_reproduce,expected_result,preconditions,test_data
"Sample Test Case","Description of the test case",manual,ui,"smoke,regression",1,Sub-Module Name,Feature Name,,,"1. Step one\\n2. Step two","Expected result",Preconditions,"Test data"
"Payment Test with Scenarios","Test payment with different amounts",manual,ui,smoke,1,Payments,Validation,,"{""columns"": [""Amount"", ""Status""], ""rows"": [[""$0"", ""Invalid""], [""$10"", ""Valid"]]}","1. Enter amount\\n2. Submit","Should validate correctly","","See examples"`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'test_cases_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this test case?')) {
      try {
        await testCasesAPI.delete(id);
        setSuccess('Test case deleted successfully');
        loadData();
      } catch (err) {
        setError('Failed to delete test case');
      }
    }
  };

  const getModuleName = (moduleId) => {
    const module = modules.find((m) => m.id === moduleId);
    return module ? module.name : 'Unknown';
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          Test Cases
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => setOpenBulkUploadDialog(true)}
          >
            Bulk Upload
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            New Test Case
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* NEW: Filter Panel */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Filters
        </Typography>
        <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
          <TextField
            select
            label="Module"
            name="module_id"
            value={filters.module_id}
            onChange={handleFilterChange}
            sx={{ minWidth: 200 }}
            size="small"
          >
            <MenuItem value="">
              <em>All Modules</em>
            </MenuItem>
            {modules.map((module) => (
              <MenuItem key={module.id} value={module.id}>
                {module.name}
              </MenuItem>
            ))}
          </TextField>

          {filters.module_id && (
            <TextField
              select
              label="Sub-Module"
              name="sub_module"
              value={filters.sub_module}
              onChange={handleFilterChange}
              sx={{ minWidth: 200 }}
              size="small"
            >
              <MenuItem value="">
                <em>All Sub-Modules</em>
              </MenuItem>
              {filterSubModules.map((sm) => (
                <MenuItem key={sm.name} value={sm.name}>
                  {sm.name}
                </MenuItem>
              ))}
            </TextField>
          )}

          {filters.module_id && filters.sub_module && (
            <TextField
              select
              label="Feature/Section"
              name="feature_section"
              value={filters.feature_section}
              onChange={handleFilterChange}
              sx={{ minWidth: 200 }}
              size="small"
            >
              <MenuItem value="">
                <em>All Features</em>
              </MenuItem>
              {filterFeatures.map((f) => (
                <MenuItem key={f.name} value={f.name}>
                  {f.name}
                </MenuItem>
              ))}
            </TextField>
          )}

          <TextField
            select
            label="Test Type"
            name="test_type"
            value={filters.test_type}
            onChange={handleFilterChange}
            sx={{ minWidth: 150 }}
            size="small"
          >
            <MenuItem value="">
              <em>All Types</em>
            </MenuItem>
            <MenuItem value="manual">Manual</MenuItem>
            <MenuItem value="automated">Automated</MenuItem>
          </TextField>

          {(filters.module_id || filters.test_type) && (
            <Button
              variant="outlined"
              onClick={handleClearFilters}
              size="small"
            >
              Clear Filters
            </Button>
          )}
        </Box>
      </Paper>

      <Paper>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 1500, tableLayout: 'fixed' }}>
            <TableHead>
              <TableRow>
                <ResizableTableCell minWidth={120} initialWidth={120} isHeader>Test ID</ResizableTableCell>
                <ResizableTableCell minWidth={200} initialWidth={250} isHeader>Title</ResizableTableCell>
                <ResizableTableCell minWidth={150} initialWidth={150} isHeader>Module</ResizableTableCell>
                <ResizableTableCell minWidth={150} initialWidth={150} isHeader>Sub-Module</ResizableTableCell>
                <ResizableTableCell minWidth={150} initialWidth={150} isHeader>Feature</ResizableTableCell>
                <ResizableTableCell minWidth={100} initialWidth={100} isHeader>Type</ResizableTableCell>
                <ResizableTableCell minWidth={100} initialWidth={100} isHeader>Tag</ResizableTableCell>
                <ResizableTableCell minWidth={180} initialWidth={180} isHeader>Tags</ResizableTableCell>
                <ResizableTableCell minWidth={120} initialWidth={120} isHeader>Status</ResizableTableCell>
                <ResizableTableCell minWidth={150} initialWidth={150} isHeader>Actions</ResizableTableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {testCases
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((testCase) => (
                  <TableRow key={testCase.id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <Typography variant="body2" fontWeight="medium">
                        {testCase.test_id}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{testCase.title}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <Chip
                        label={getModuleName(testCase.module_id)}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {testCase.sub_module ? (
                        <Chip
                          label={testCase.sub_module}
                          size="small"
                          color="secondary"
                          variant="outlined"
                        />
                      ) : (
                        <Typography variant="body2" color="text.secondary">-</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {testCase.feature_section ? (
                        <Chip
                          label={testCase.feature_section}
                          size="small"
                          color="info"
                          variant="outlined"
                        />
                      ) : (
                        <Typography variant="body2" color="text.secondary">-</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <Chip
                        label={testCase.test_type}
                        size="small"
                        color={testCase.test_type === 'automated' ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <Chip
                        label={testCase.tag ? testCase.tag.toUpperCase() : 'UI'}
                        size="small"
                        color={
                          testCase.tag === 'api' ? 'success' : 
                          testCase.tag === 'hybrid' ? 'warning' : 
                          'info'
                        }
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {testCase.tags ? (
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {testCase.tags.split(',').map((tag, idx) => (
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
                      ) : (
                        <Typography variant="body2" color="text.secondary">-</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {testCase.test_type === 'automated' ? (
                        <Chip
                          label={testCase.automation_status || 'working'}
                          size="small"
                          color={testCase.automation_status === 'broken' ? 'error' : 'success'}
                          variant="outlined"
                        />
                      ) : (
                        <Typography variant="body2" color="text.secondary">-</Typography>
                      )}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <IconButton
                        size="small"
                        onClick={() => handleViewTestCase(testCase)}
                        color="info"
                      >
                        <ViewIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(testCase)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(testCase.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={testCases.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedTestCase ? 'Edit Test Case' : 'Create New Test Case'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <TextField
              fullWidth
              select
              label="Test Case Tag"
              name="tag"
              value={formData.tag}
              onChange={handleChange}
              margin="normal"
              required
              disabled={!!selectedTestCase}
              helperText={!selectedTestCase ? "Select tag to auto-generate Test ID" : ""}
            >
              <MenuItem value="ui">UI</MenuItem>
              <MenuItem value="api">API</MenuItem>
              <MenuItem value="hybrid">Hybrid</MenuItem>
            </TextField>
            
            <Autocomplete
              multiple
              freeSolo
              options={['smoke', 'regression', 'sanity', 'integration', 'e2e', 'performance']}
              value={formData.tags}
              onChange={(event, newValue) => {
                setFormData({ ...formData, tags: newValue });
              }}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    label={option}
                    {...getTagProps({ index })}
                    size="small"
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Additional Tags"
                  placeholder="Add tags like smoke, regression, etc."
                  margin="normal"
                  helperText="Select or type custom tags for categorization"
                />
              )}
            />
            
            <TextField
              fullWidth
              label="Test ID"
              name="test_id"
              value={formData.test_id}
              onChange={handleChange}
              margin="normal"
              required
              InputProps={{
                readOnly: !selectedTestCase,
              }}
              helperText={!selectedTestCase ? "Auto-generated based on tag" : ""}
              disabled={!!selectedTestCase}
            />
            <TextField
              fullWidth
              label="Title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              select
              label="Module"
              name="module_id"
              value={formData.module_id}
              onChange={handleChange}
              margin="normal"
              required
            >
              {modules.map((module) => (
                <MenuItem key={module.id} value={module.id}>
                  {module.name}
                </MenuItem>
              ))}
            </TextField>
            
            {/* NEW: Sub-Module Dropdown (cascading) */}
            {formData.module_id && (
              <TextField
                fullWidth
                select
                label="Sub-Module"
                name="sub_module"
                value={formData.sub_module}
                onChange={handleChange}
                margin="normal"
                helperText="Optional: Group tests by sub-module (e.g., Suppliers, Invoices)"
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {subModules.map((sm) => (
                  <MenuItem key={sm.name} value={sm.name}>
                    {sm.name} ({sm.feature_count} features)
                  </MenuItem>
                ))}
              </TextField>
            )}
            
            {/* NEW: Feature/Section Dropdown (cascading) */}
            {formData.module_id && formData.sub_module && (
              <TextField
                fullWidth
                select
                label="Feature/Section"
                name="feature_section"
                value={formData.feature_section}
                onChange={handleChange}
                margin="normal"
                helperText="Optional: Specify feature or section (e.g., Supplier Profile, List View)"
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {features.map((f) => (
                  <MenuItem key={f.name} value={f.name}>
                    {f.name} ({f.test_count} tests)
                  </MenuItem>
                ))}
              </TextField>
            )}
            
            <TextField
              fullWidth
              select
              label="Test Type"
              name="test_type"
              value={formData.test_type}
              onChange={handleChange}
              margin="normal"
              required
            >
              <MenuItem value="manual">Manual</MenuItem>
              <MenuItem value="automated">Automated</MenuItem>
            </TextField>
            
            {formData.test_type === 'automated' && (
              <TextField
                fullWidth
                select
                label="Automation Status"
                name="automation_status"
                value={formData.automation_status || 'working'}
                onChange={handleChange}
                margin="normal"
                required
              >
                <MenuItem value="working">Working</MenuItem>
                <MenuItem value="broken">Broken</MenuItem>
              </TextField>
            )}
            
            <TextField
              fullWidth
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              margin="normal"
              multiline
              rows={2}
            />
            <TextField
              fullWidth
              label="Preconditions"
              name="preconditions"
              value={formData.preconditions}
              onChange={handleChange}
              margin="normal"
              multiline
              rows={2}
            />
            <TextField
              fullWidth
              label="Steps to Reproduce"
              name="steps_to_reproduce"
              value={formData.steps_to_reproduce}
              onChange={handleChange}
              margin="normal"
              multiline
              rows={3}
            />
            <TextField
              fullWidth
              label="Expected Result"
              name="expected_result"
              value={formData.expected_result}
              onChange={handleChange}
              margin="normal"
              multiline
              rows={2}
            />
            
            <ScenarioExamplesTable
              value={formData.scenario_examples}
              onChange={(value) => setFormData({ ...formData, scenario_examples: value })}
            />
            
            <TextField
              fullWidth
              label="Test Data"
              name="test_data"
              value={formData.test_data}
              onChange={handleChange}
              margin="normal"
              multiline
              rows={2}
            />
            {formData.test_type === 'automated' && (
              <TextField
                fullWidth
                label="Automated Script Path"
                name="automated_script_path"
                value={formData.automated_script_path}
                onChange={handleChange}
                margin="normal"
                helperText="e.g., test_suite/ui_tests/test_login.py"
              />
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained">
              {selectedTestCase ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* View Dialog */}
      <Dialog
        open={openViewDialog}
        onClose={() => setOpenViewDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Test Case Details</DialogTitle>
        <DialogContent>
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
                {getModuleName(selectedTestCase.module_id)}
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
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenViewDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog 
        open={openBulkUploadDialog} 
        onClose={() => setOpenBulkUploadDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Bulk Upload Test Cases</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" paragraph>
              Upload a CSV file with test case data. The file should include the following columns:
            </Typography>
            <Typography variant="body2" component="div" sx={{ pl: 2, mb: 2 }}>
              • title (required)<br />
              • description<br />
              • test_type (required: manual or automated)<br />
              • tag (required: ui, api, or hybrid)<br />
              • module_id (required: numeric ID of the module)<br />
              • sub_module<br />
              • feature_section<br />
              • automation_status (working or broken)<br />
              • steps_to_reproduce<br />
              • expected_result<br />
              • preconditions<br />
              • test_data
            </Typography>
            
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadTemplate}
              fullWidth
              sx={{ mb: 3 }}
            >
              Download Template
            </Button>

            <Box
              sx={{
                border: '2px dashed',
                borderColor: 'primary.main',
                borderRadius: 2,
                p: 3,
                textAlign: 'center',
                bgcolor: 'background.default',
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
              onClick={() => document.getElementById('csv-upload').click()}
            >
              <input
                id="csv-upload"
                type="file"
                accept=".csv"
                style={{ display: 'none' }}
                onChange={(e) => setUploadFile(e.target.files[0])}
              />
              <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                {uploadFile ? uploadFile.name : 'Click to select CSV file'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                or drag and drop your file here
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenBulkUploadDialog(false);
            setUploadFile(null);
          }}>
            Cancel
          </Button>
          <Button
            onClick={handleBulkUpload}
            variant="contained"
            disabled={!uploadFile || uploadLoading}
          >
            {uploadLoading ? <CircularProgress size={24} /> : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TestCases;
