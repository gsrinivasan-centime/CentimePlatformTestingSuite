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
  ToggleButton,
  ToggleButtonGroup,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Select,
  Tabs,
  Tab,
  Grid,
  Divider,
  Card,
  CardContent,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
  ViewList as ViewListIcon,
  AccountTree as TreeViewIcon,
  ExpandMore as ExpandMoreIcon,
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
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadFileType, setUploadFileType] = useState('csv'); // 'csv' or 'feature'
  const [featureUploadConfig, setFeatureUploadConfig] = useState({
    module_id: '',
    sub_module: '',
    feature_section: '',
    test_type: 'automated',
    tag: 'ui'
  });
  const [featureUploadSubModules, setFeatureUploadSubModules] = useState([]);
  const [featureUploadFeatures, setFeatureUploadFeatures] = useState([]);
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
    jira_story_id: '',  // JIRA story ID (e.g., CTP-1234)
    jira_epic_id: '',   // JIRA epic ID (e.g., CTP-100)
    jira_labels: '',    // JIRA labels (comma-separated)
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
    test_id: '',
    title: '',
    module_id: '',
    sub_module: '',
    feature_section: '',
    test_type: '',
  });
  const [filterSubModules, setFilterSubModules] = useState([]);
  const [filterFeatures, setFilterFeatures] = useState([]);

  // View toggle state
  const [viewType, setViewType] = useState('list'); // 'list' or 'tree'
  const [hierarchyData, setHierarchyData] = useState(null);
  const [expandedModules, setExpandedModules] = useState({});
  
  // Expanded test case accordion state
  const [expandedTestCase, setExpandedTestCase] = useState(null);
  const [expandedSubModules, setExpandedSubModules] = useState({});
  const [expandedFeatures, setExpandedFeatures] = useState({});

  // Test type tab state
  const [testTypeTab, setTestTypeTab] = useState('all'); // 'all', 'ui', 'api'

  // Inline editing state
  const [editingCell, setEditingCell] = useState(null); // { testCaseId, field }
  const [editValue, setEditValue] = useState('');

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

  // Helper function to reload data respecting current filters
  const reloadData = () => {
    const hasFilters = filters.module_id || filters.sub_module || filters.feature_section || filters.test_type;
    if (hasFilters) {
      loadFilteredData();
    } else {
      loadData();
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

  // NEW: Load sub-modules for feature upload
  const loadFeatureUploadSubModules = async (moduleId) => {
    if (!moduleId) {
      setFeatureUploadSubModules([]);
      setFeatureUploadFeatures([]);
      return;
    }
    
    try {
      const options = await testCasesAPI.getHierarchyOptions(moduleId);
      setFeatureUploadSubModules(options);
      setFeatureUploadFeatures([]);
    } catch (err) {
      console.error('Failed to load feature upload sub-modules:', err);
      setFeatureUploadSubModules([]);
    }
  };

  // NEW: Load features for feature upload
  const loadFeatureUploadFeatures = async (moduleId, subModule) => {
    if (!moduleId || !subModule) {
      setFeatureUploadFeatures([]);
      return;
    }
    
    try {
      const options = await testCasesAPI.getHierarchyOptions(moduleId, subModule);
      setFeatureUploadFeatures(options);
    } catch (err) {
      console.error('Failed to load feature upload features:', err);
      setFeatureUploadFeatures([]);
    }
  };

  // NEW: Handle feature upload config changes
  const handleFeatureUploadConfigChange = async (name, value) => {
    const newConfig = { ...featureUploadConfig, [name]: value };
    
    // Reset cascading fields
    if (name === 'module_id') {
      newConfig.sub_module = '';
      newConfig.feature_section = '';
      await loadFeatureUploadSubModules(value);
    } else if (name === 'sub_module') {
      newConfig.feature_section = '';
      await loadFeatureUploadFeatures(featureUploadConfig.module_id, value);
    }
    
    setFeatureUploadConfig(newConfig);
  };

  // Build hierarchy from flat test cases list
  const buildHierarchy = () => {
    const hierarchy = {};
    
    testCases.forEach(testCase => {
      const moduleId = testCase.module_id;
      const moduleName = getModuleName(moduleId);
      const subModule = testCase.sub_module || 'Uncategorized';
      const feature = testCase.feature_section || 'No Feature';
      
      if (!hierarchy[moduleId]) {
        hierarchy[moduleId] = {
          id: moduleId,
          name: moduleName,
          subModules: {}
        };
      }
      
      if (!hierarchy[moduleId].subModules[subModule]) {
        hierarchy[moduleId].subModules[subModule] = {
          name: subModule,
          features: {}
        };
      }
      
      if (!hierarchy[moduleId].subModules[subModule].features[feature]) {
        hierarchy[moduleId].subModules[subModule].features[feature] = {
          name: feature,
          testCases: []
        };
      }
      
      hierarchy[moduleId].subModules[subModule].features[feature].testCases.push(testCase);
    });
    
    setHierarchyData(hierarchy);
  };

  // Toggle handlers for tree view
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

  const handleViewTypeChange = (event, newView) => {
    if (newView !== null) {
      setViewType(newView);
      if (newView === 'tree') {
        buildHierarchy();
        // Start with all collapsed
        setExpandedModules({});
        setExpandedSubModules({});
        setExpandedFeatures({});
      }
    }
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

  // View dialog is kept for backward compatibility but not used in main UI
  // const handleViewTestCase = (testCase) => {
  //   setSelectedTestCase(testCase);
  //   setOpenViewDialog(true);
  // };

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
      showError(`Please select a ${uploadFileType === 'csv' ? 'CSV' : 'Feature'} file`);
      return;
    }

    // Validate feature file upload configuration
    if (uploadFileType === 'feature') {
      if (!featureUploadConfig.module_id) {
        showError('Please select a module for feature file upload');
        return;
      }
    }

    try {
      setUploadLoading(true);
      const formData = new FormData();
      formData.append('file', uploadFile);

      let response;
      if (uploadFileType === 'csv') {
        response = await testCasesAPI.bulkUpload(formData);
      } else {
        // Feature file upload with additional parameters
        formData.append('module_id', featureUploadConfig.module_id);
        if (featureUploadConfig.sub_module) {
          formData.append('sub_module', featureUploadConfig.sub_module);
        }
        if (featureUploadConfig.feature_section) {
          formData.append('feature_section', featureUploadConfig.feature_section);
        }
        formData.append('test_type', featureUploadConfig.test_type);
        formData.append('tag', featureUploadConfig.tag);
        
        response = await testCasesAPI.bulkUploadFeature(formData);
      }
      
      setOpenBulkUploadDialog(false);
      setUploadFile(null);
      setUploadFileType('csv');
      setFeatureUploadConfig({
        module_id: '',
        sub_module: '',
        feature_section: '',
        test_type: 'automated',
        tag: 'ui'
      });
      setFeatureUploadSubModules([]);
      setFeatureUploadFeatures([]);
      
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
        reloadData();
      } catch (err) {
        setError('Failed to delete test case');
      }
    }
  };

  const getModuleName = (moduleId) => {
    const module = modules.find((m) => m.id === moduleId);
    return module ? module.name : 'Unknown';
  };

  // Tag options for dropdown
  const tagOptions = ['smoke', 'regression', 'sanity', 'integration', 'e2e', 'performance'];

  // Inline editing handlers
  const handleCellClick = (testCase, field, e) => {
    e.stopPropagation(); // Prevent row click
    setEditingCell({ testCaseId: testCase.id, field });
    
    // Set initial value based on field
    if (field === 'tags') {
      // Convert comma-separated string to array for Autocomplete
      const tagsArray = testCase.tags ? testCase.tags.split(',').map(t => t.trim()) : [];
      setEditValue(tagsArray);
    } else {
      setEditValue(testCase[field] || '');
    }
  };

  const handleInlineEditChange = async (testCase, field, newValue) => {
    // For Select dropdowns (test_type, tag, automation_status), save immediately on change
    // Check if value actually changed
    let oldValue = testCase[field] || '';
    
    if (oldValue === newValue) {
      // No change, just close the editor
      setEditingCell(null);
      setEditValue('');
      return;
    }

    try {
      const updateData = {
        ...testCase,
        [field]: newValue
      };

      await testCasesAPI.update(testCase.id, updateData);
      showSuccess(`${field} updated successfully`);
      reloadData();
      setEditingCell(null);
      setEditValue('');
    } catch (err) {
      showError(`Failed to update ${field}`);
    }
  };

  const handleInlineEdit = async (testCase, field, newValue) => {
    // For tags (Autocomplete), save on blur
    // Check if value actually changed
    let oldValue = testCase[field] || '';
    
    if (field === 'tags') {
      // For tags, convert both to comparable formats
      const oldTags = oldValue ? oldValue.split(',').map(t => t.trim()).sort().join(',') : '';
      const newTags = Array.isArray(newValue) ? newValue.sort().join(',') : newValue;
      
      if (oldTags === newTags) {
        // No change, just close the editor
        setEditingCell(null);
        setEditValue('');
        return;
      }
    }

    try {
      // Prepare update data
      const updateData = {
        ...testCase,
        [field]: newValue
      };

      // For tags field, ensure it's a string
      if (field === 'tags') {
        updateData.tags = Array.isArray(newValue) ? newValue.join(',') : newValue;
      }

      await testCasesAPI.update(testCase.id, updateData);
      showSuccess(`${field} updated successfully`);
      reloadData();
      setEditingCell(null);
      setEditValue('');
    } catch (err) {
      showError(`Failed to update ${field}`);
    }
  };

  const handleInlineEditCancel = () => {
    setEditingCell(null);
    setEditValue('');
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
        <Typography variant="h4" component="h1">
          Test Case Management
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

      {/* Test Type Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs 
          value={testTypeTab} 
          onChange={(e, newValue) => {
            setTestTypeTab(newValue);
            setPage(0); // Reset to first page when changing tabs
          }}
          aria-label="test type tabs"
        >
          <Tab 
            label={`All Tests (${testCases.length})`} 
            value="all" 
          />
          <Tab 
            label={`UI Tests (${testCases.filter(tc => tc.tag === 'ui' || tc.tag === 'hybrid').length})`} 
            value="ui" 
          />
          <Tab 
            label={`API Tests (${testCases.filter(tc => tc.tag === 'api').length})`} 
            value="api" 
          />
        </Tabs>
      </Box>

      {/* View Toggle */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <ToggleButtonGroup
          value={viewType}
          exclusive
          onChange={handleViewTypeChange}
          aria-label="view type"
          size="small"
        >
          <ToggleButton value="list" aria-label="list view">
            <ViewListIcon sx={{ mr: 0.5 }} fontSize="small" />
            All Test Cases
          </ToggleButton>
          <ToggleButton value="tree" aria-label="tree view">
            <TreeViewIcon sx={{ mr: 0.5 }} fontSize="small" />
            By Module
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {viewType === 'list' ? (
        /* List View */
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
              {/* Filter Row */}
              <TableRow>
                <TableCell>
                  <TextField
                    size="small"
                    placeholder="Filter..."
                    value={filters.test_id}
                    onChange={(e) => setFilters({ ...filters, test_id: e.target.value })}
                    fullWidth
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    placeholder="Filter..."
                    value={filters.title}
                    onChange={(e) => setFilters({ ...filters, title: e.target.value })}
                    fullWidth
                  />
                </TableCell>
                <TableCell>
                  <Select
                    size="small"
                    value={filters.module_id}
                    onChange={handleFilterChange}
                    name="module_id"
                    displayEmpty
                    fullWidth
                  >
                    <MenuItem value="">
                      <em>All</em>
                    </MenuItem>
                    {modules.map((module) => (
                      <MenuItem key={module.id} value={module.id}>
                        {module.name}
                      </MenuItem>
                    ))}
                  </Select>
                </TableCell>
                <TableCell>
                  <Select
                    size="small"
                    value={filters.sub_module}
                    onChange={handleFilterChange}
                    name="sub_module"
                    displayEmpty
                    fullWidth
                    disabled={!filters.module_id}
                  >
                    <MenuItem value="">
                      <em>All</em>
                    </MenuItem>
                    {filterSubModules.map((sm) => (
                      <MenuItem key={sm.name} value={sm.name}>
                        {sm.name}
                      </MenuItem>
                    ))}
                  </Select>
                </TableCell>
                <TableCell>
                  <Select
                    size="small"
                    value={filters.feature_section}
                    onChange={handleFilterChange}
                    name="feature_section"
                    displayEmpty
                    fullWidth
                    disabled={!filters.module_id || !filters.sub_module}
                  >
                    <MenuItem value="">
                      <em>All</em>
                    </MenuItem>
                    {filterFeatures.map((f) => (
                      <MenuItem key={f.name} value={f.name}>
                        {f.name}
                      </MenuItem>
                    ))}
                  </Select>
                </TableCell>
                <TableCell>
                  <Select
                    size="small"
                    value={filters.test_type}
                    onChange={handleFilterChange}
                    name="test_type"
                    displayEmpty
                    fullWidth
                  >
                    <MenuItem value="">
                      <em>All</em>
                    </MenuItem>
                    <MenuItem value="manual">Manual</MenuItem>
                    <MenuItem value="automated">Automated</MenuItem>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select
                    size="small"
                    value={filters.tag || ''}
                    onChange={(e) => setFilters({ ...filters, tag: e.target.value })}
                    displayEmpty
                    fullWidth
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="ui">UI</MenuItem>
                    <MenuItem value="api">API</MenuItem>
                    <MenuItem value="hybrid">Hybrid</MenuItem>
                  </Select>
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    placeholder="Filter tags..."
                    value={filters.tags || ''}
                    onChange={(e) => setFilters({ ...filters, tags: e.target.value })}
                    fullWidth
                  />
                </TableCell>
                <TableCell>
                  <Select
                    size="small"
                    value={filters.automation_status || ''}
                    onChange={(e) => setFilters({ ...filters, automation_status: e.target.value })}
                    displayEmpty
                    fullWidth
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="working">Working</MenuItem>
                    <MenuItem value="broken">Broken</MenuItem>
                  </Select>
                </TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {testCases
                .filter((testCase) => {
                  // Filter by test type tab
                  if (testTypeTab === 'ui' && testCase.tag !== 'ui' && testCase.tag !== 'hybrid') {
                    return false;
                  }
                  if (testTypeTab === 'api' && testCase.tag !== 'api') {
                    return false;
                  }
                  
                  // Client-side filtering for test_id and title
                  if (filters.test_id && !testCase.test_id.toLowerCase().includes(filters.test_id.toLowerCase())) {
                    return false;
                  }
                  if (filters.title && !testCase.title.toLowerCase().includes(filters.title.toLowerCase())) {
                    return false;
                  }
                  
                  // Filter by tag
                  if (filters.tag && filters.tag !== 'all' && testCase.tag !== filters.tag) {
                    return false;
                  }
                  
                  // Filter by tags (text search)
                  if (filters.tags && testCase.tags && !testCase.tags.toLowerCase().includes(filters.tags.toLowerCase())) {
                    return false;
                  }
                  
                  // Filter by automation status (only for automated tests)
                  if (filters.automation_status && filters.automation_status !== 'all') {
                    if (testCase.test_type === 'automated' && testCase.automation_status !== filters.automation_status) {
                      return false;
                    }
                  }
                  
                  return true;
                })
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((testCase) => (
                  <React.Fragment key={testCase.id}>
                  <TableRow 
                    hover
                    sx={{ 
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      }
                    }}
                  >
                    <TableCell 
                      sx={{ 
                        whiteSpace: 'nowrap', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        cursor: 'pointer'
                      }}
                      onClick={() => setExpandedTestCase(expandedTestCase === testCase.id ? null : testCase.id)}
                    >
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
                    <TableCell 
                      sx={{ 
                        whiteSpace: 'nowrap', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        cursor: 'pointer'
                      }}
                      onClick={() => setExpandedTestCase(expandedTestCase === testCase.id ? null : testCase.id)}
                    >
                      {testCase.title}
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        whiteSpace: 'nowrap', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        cursor: 'pointer'
                      }}
                      onClick={() => setExpandedTestCase(expandedTestCase === testCase.id ? null : testCase.id)}
                    >
                      <Chip
                        label={getModuleName(testCase.module_id)}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        whiteSpace: 'nowrap', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        cursor: 'pointer'
                      }}
                      onClick={() => setExpandedTestCase(expandedTestCase === testCase.id ? null : testCase.id)}
                    >
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
                    <TableCell 
                      sx={{ 
                        whiteSpace: 'nowrap', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        cursor: 'pointer'
                      }}
                      onClick={() => setExpandedTestCase(expandedTestCase === testCase.id ? null : testCase.id)}
                    >
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
                    <TableCell 
                      sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                      onClick={(e) => handleCellClick(testCase, 'test_type', e)}
                    >
                      {editingCell?.testCaseId === testCase.id && editingCell?.field === 'test_type' ? (
                        <Select
                          open={true}
                          value={editValue}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            setEditValue(newValue);
                            handleInlineEditChange(testCase, 'test_type', newValue);
                          }}
                          onClose={() => {
                            // Always cancel on close - onChange will have already saved if a selection was made
                            setTimeout(() => handleInlineEditCancel(), 0);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') handleInlineEditCancel();
                          }}
                          size="small"
                          autoFocus
                          sx={{ minWidth: 100 }}
                        >
                          <MenuItem value="manual">Manual</MenuItem>
                          <MenuItem value="automated">Automated</MenuItem>
                        </Select>
                      ) : (
                        <Chip
                          label={testCase.test_type}
                          size="small"
                          color={testCase.test_type === 'automated' ? 'success' : 'default'}
                        />
                      )}
                    </TableCell>
                    <TableCell 
                      sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                      onClick={(e) => handleCellClick(testCase, 'tag', e)}
                    >
                      {editingCell?.testCaseId === testCase.id && editingCell?.field === 'tag' ? (
                        <Select
                          open={true}
                          value={editValue}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            setEditValue(newValue);
                            handleInlineEditChange(testCase, 'tag', newValue);
                          }}
                          onClose={() => {
                            // Always cancel on close - onChange will have already saved if a selection was made
                            setTimeout(() => handleInlineEditCancel(), 0);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') handleInlineEditCancel();
                          }}
                          size="small"
                          autoFocus
                          sx={{ minWidth: 100 }}
                        >
                          <MenuItem value="ui">UI</MenuItem>
                          <MenuItem value="api">API</MenuItem>
                          <MenuItem value="hybrid">Hybrid</MenuItem>
                        </Select>
                      ) : (
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
                      )}
                    </TableCell>
                    <TableCell 
                      sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                      onClick={(e) => {
                        // Only open editor if not already editing
                        if (!(editingCell?.testCaseId === testCase.id && editingCell?.field === 'tags')) {
                          handleCellClick(testCase, 'tags', e);
                        }
                      }}
                    >
                      {editingCell?.testCaseId === testCase.id && editingCell?.field === 'tags' ? (
                        <Box onClick={(e) => e.stopPropagation()}>
                          <Autocomplete
                            multiple
                            options={tagOptions}
                            value={editValue}
                            onChange={(event, newValue) => {
                              setEditValue(newValue);
                            }}
                            onBlur={() => {
                              // Save when focus leaves the component
                              handleInlineEdit(testCase, 'tags', editValue);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') {
                                e.stopPropagation();
                                handleInlineEditCancel();
                              }
                              if (e.key === 'Enter' && !e.target.value) {
                                // If Enter is pressed and input is empty, save and close
                                e.preventDefault();
                                handleInlineEdit(testCase, 'tags', editValue);
                              }
                            }}
                            freeSolo
                            disableCloseOnSelect
                            size="small"
                            sx={{ minWidth: 180 }}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                autoFocus
                                placeholder="Select tags"
                              />
                            )}
                          />
                        </Box>
                      ) : testCase.tags ? (
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
                    <TableCell 
                      sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                      onClick={(e) => testCase.test_type === 'automated' && handleCellClick(testCase, 'automation_status', e)}
                    >
                      {testCase.test_type === 'automated' ? (
                        editingCell?.testCaseId === testCase.id && editingCell?.field === 'automation_status' ? (
                          <Select
                            open={true}
                            value={editValue}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              setEditValue(newValue);
                              handleInlineEditChange(testCase, 'automation_status', newValue);
                            }}
                            onClose={() => {
                              // Always cancel on close - onChange will have already saved if a selection was made
                              setTimeout(() => handleInlineEditCancel(), 0);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') handleInlineEditCancel();
                            }}
                            size="small"
                            autoFocus
                            sx={{ minWidth: 120 }}
                          >
                            <MenuItem value="working">Working</MenuItem>
                            <MenuItem value="broken">Broken</MenuItem>
                          </Select>
                        ) : (
                          <Chip
                            label={testCase.automation_status || 'working'}
                            size="small"
                            color={testCase.automation_status === 'broken' ? 'error' : 'success'}
                            variant="outlined"
                          />
                        )
                      ) : (
                        <Typography variant="body2" color="text.secondary">-</Typography>
                      )}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedTestCase(expandedTestCase === testCase.id ? null : testCase.id);
                        }}
                        color={expandedTestCase === testCase.id ? 'primary' : 'default'}
                        title="View Details"
                      >
                        <ExpandMoreIcon 
                          sx={{
                            transform: expandedTestCase === testCase.id ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.3s'
                          }}
                        />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDialog(testCase);
                        }}
                        color="primary"
                        title="Edit"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(testCase.id);
                        }}
                        color="error"
                        title="Delete"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                  
                  {/* Accordion Row for Details */}
                  {expandedTestCase === testCase.id && (
                    <TableRow>
                      <TableCell colSpan={10} sx={{ py: 0, px: 0, border: 0 }}>
                        <Box sx={{ bgcolor: 'grey.50', p: 3 }}>
                          {/* Preconditions */}
                          {testCase.preconditions && (
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="subtitle2" color="primary" gutterBottom fontWeight="bold">
                                Preconditions
                              </Typography>
                              <Paper elevation={0} sx={{ bgcolor: 'white', p: 2, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                                <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                                  {testCase.preconditions}
                                </Typography>
                              </Paper>
                            </Box>
                          )}
                          
                          {/* Steps to Reproduce */}
                          {testCase.steps_to_reproduce && (
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="subtitle2" color="primary" gutterBottom fontWeight="bold">
                                Steps to Reproduce
                              </Typography>
                              <Paper elevation={0} sx={{ bgcolor: 'white', p: 2, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                                <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                                  {testCase.steps_to_reproduce}
                                </Typography>
                              </Paper>
                            </Box>
                          )}
                          
                          {/* Expected Result */}
                          {testCase.expected_result && (
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="subtitle2" color="primary" gutterBottom fontWeight="bold">
                                Expected Result
                              </Typography>
                              <Paper elevation={0} sx={{ bgcolor: 'white', p: 2, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                                <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                                  {testCase.expected_result}
                                </Typography>
                              </Paper>
                            </Box>
                          )}
                          
                          {/* Scenario Examples / Parameters */}
                          {testCase.scenario_examples && (() => {
                            try {
                              const examples = JSON.parse(testCase.scenario_examples);
                              return (
                                <Box>
                                  <Typography variant="subtitle2" color="primary" gutterBottom fontWeight="bold">
                                    Scenario Examples / Parameters
                                  </Typography>
                                  <TableContainer 
                                    component={Paper} 
                                    variant="outlined" 
                                    sx={{ 
                                      bgcolor: 'white',
                                      maxWidth: '100%',
                                      overflowX: 'auto',
                                      '&::-webkit-scrollbar': {
                                        height: '8px',
                                      },
                                      '&::-webkit-scrollbar-track': {
                                        backgroundColor: 'grey.100',
                                        borderRadius: '4px',
                                      },
                                      '&::-webkit-scrollbar-thumb': {
                                        backgroundColor: 'grey.400',
                                        borderRadius: '4px',
                                        '&:hover': {
                                          backgroundColor: 'grey.500',
                                        },
                                      },
                                    }}
                                  >
                                    <Table size="small" sx={{ minWidth: 'max-content' }}>
                                      <TableHead>
                                        <TableRow sx={{ bgcolor: 'primary.light' }}>
                                          {examples.columns.map((col, idx) => (
                                            <TableCell 
                                              key={idx}
                                              sx={{ 
                                                fontWeight: 'bold',
                                                minWidth: 120,
                                                color: 'primary.contrastText',
                                                whiteSpace: 'nowrap'
                                              }}
                                            >
                                              {col}
                                            </TableCell>
                                          ))}
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {examples.rows.map((row, rowIdx) => (
                                          <TableRow key={rowIdx} hover>
                                            {row.map((cell, cellIdx) => (
                                              <TableCell key={cellIdx} sx={{ whiteSpace: 'nowrap' }}>
                                                <Typography variant="body2">{cell}</Typography>
                                              </TableCell>
                                            ))}
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </TableContainer>
                                </Box>
                              );
                            } catch (e) {
                              console.error('Error parsing scenario_examples:', e);
                              return null;
                            }
                          })()}
                          
                          {!testCase.preconditions && !testCase.steps_to_reproduce && !testCase.expected_result && !testCase.scenario_examples && (
                            <Typography variant="body2" color="text.secondary" textAlign="center">
                              No additional details available
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                  </React.Fragment>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={testCases.filter((testCase) => {
            // Filter by test type tab
            if (testTypeTab === 'ui' && testCase.tag !== 'ui' && testCase.tag !== 'hybrid') {
              return false;
            }
            if (testTypeTab === 'api' && testCase.tag !== 'api') {
              return false;
            }
            
            if (filters.test_id && !testCase.test_id.toLowerCase().includes(filters.test_id.toLowerCase())) {
              return false;
            }
            if (filters.title && !testCase.title.toLowerCase().includes(filters.title.toLowerCase())) {
              return false;
            }
            return true;
          }).length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
        </Paper>
      ) : (
        /* Tree View */
        <Box>
          {hierarchyData && Object.values(hierarchyData).map((module) => (
            <Accordion 
              key={module.id}
              expanded={expandedModules[module.id] === true}
              onChange={() => handleModuleToggle(module.id)}
              sx={{ mb: 2 }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{ bgcolor: '#e3f2fd' }}
              >
                <Typography variant="h6" sx={{ flexGrow: 1 }}>{module.name}</Typography>
                <Chip label={`${Object.values(module.subModules).reduce((sum, sm) => sum + Object.values(sm.features).reduce((fsum, f) => fsum + f.testCases.filter(tc => {
                  if (testTypeTab === 'ui' && tc.tag !== 'ui' && tc.tag !== 'hybrid') return false;
                  if (testTypeTab === 'api' && tc.tag !== 'api') return false;
                  if (filters.test_id && !tc.test_id.toLowerCase().includes(filters.test_id.toLowerCase())) return false;
                  if (filters.title && !tc.title.toLowerCase().includes(filters.title.toLowerCase())) return false;
                  if (filters.tag && filters.tag !== 'all' && tc.tag !== filters.tag) return false;
                  if (filters.tags && tc.tags && !tc.tags.toLowerCase().includes(filters.tags.toLowerCase())) return false;
                  if (filters.automation_status && filters.automation_status !== 'all' && tc.test_type === 'automated' && tc.automation_status !== filters.automation_status) return false;
                  return true;
                }).length, 0), 0)} tests`} size="small" />
              </AccordionSummary>
              <AccordionDetails>
                {Object.entries(module.subModules).map(([subModuleName, subModule]) => (
                  <Accordion 
                    key={`${module.id}-${subModuleName}`}
                    expanded={expandedSubModules[`${module.id}-${subModuleName}`] === true}
                    onChange={() => handleSubModuleToggle(`${module.id}-${subModuleName}`)}
                    sx={{ mb: 1 }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      sx={{ bgcolor: '#f5f5f5' }}
                    >
                      <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>{subModuleName}</Typography>
                      <Chip label={`${Object.values(subModule.features).reduce((sum, f) => sum + f.testCases.filter(tc => {
                        if (testTypeTab === 'ui' && tc.tag !== 'ui' && tc.tag !== 'hybrid') return false;
                        if (testTypeTab === 'api' && tc.tag !== 'api') return false;
                        if (filters.test_id && !tc.test_id.toLowerCase().includes(filters.test_id.toLowerCase())) return false;
                        if (filters.title && !tc.title.toLowerCase().includes(filters.title.toLowerCase())) return false;
                        if (filters.tag && filters.tag !== 'all' && tc.tag !== filters.tag) return false;
                        if (filters.tags && tc.tags && !tc.tags.toLowerCase().includes(filters.tags.toLowerCase())) return false;
                        if (filters.automation_status && filters.automation_status !== 'all' && tc.test_type === 'automated' && tc.automation_status !== filters.automation_status) return false;
                        return true;
                      }).length, 0)} tests`} size="small" />
                    </AccordionSummary>
                    <AccordionDetails>
                      {Object.entries(subModule.features).map(([featureName, feature]) => (
                        <Accordion 
                          key={`${module.id}-${subModuleName}-${featureName}`}
                          expanded={expandedFeatures[`${module.id}-${subModuleName}-${featureName}`] === true}
                          onChange={() => handleFeatureToggle(`${module.id}-${subModuleName}-${featureName}`)}
                          sx={{ mb: 1, '&:before': { display: 'none' } }}
                        >
                          <AccordionSummary
                            expandIcon={<ExpandMoreIcon />}
                            sx={{ 
                              bgcolor: '#fafafa',
                              minHeight: 48,
                              '&.Mui-expanded': { minHeight: 48 }
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                              <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>{featureName}</Typography>
                              <Chip label={`${feature.testCases.filter(tc => {
                                if (testTypeTab === 'ui' && tc.tag !== 'ui' && tc.tag !== 'hybrid') return false;
                                if (testTypeTab === 'api' && tc.tag !== 'api') return false;
                                if (filters.test_id && !tc.test_id.toLowerCase().includes(filters.test_id.toLowerCase())) return false;
                                if (filters.title && !tc.title.toLowerCase().includes(filters.title.toLowerCase())) return false;
                                if (filters.tag && filters.tag !== 'all' && tc.tag !== filters.tag) return false;
                                if (filters.tags && tc.tags && !tc.tags.toLowerCase().includes(filters.tags.toLowerCase())) return false;
                                if (filters.automation_status && filters.automation_status !== 'all' && tc.test_type === 'automated' && tc.automation_status !== filters.automation_status) return false;
                                return true;
                              }).length} tests`} size="small" color="primary" variant="outlined" />
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails>
                            <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
                              <Table size="small" sx={{ minWidth: 1500, tableLayout: 'fixed' }}>
                                <TableHead>
                                  <TableRow>
                                    <ResizableTableCell minWidth={120} initialWidth={120} isHeader>Test ID</ResizableTableCell>
                                    <ResizableTableCell minWidth={200} initialWidth={300} isHeader>Title</ResizableTableCell>
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
                                  {feature.testCases
                                    .filter((testCase) => {
                                      // Filter by test type tab
                                      if (testTypeTab === 'ui' && testCase.tag !== 'ui' && testCase.tag !== 'hybrid') {
                                        return false;
                                      }
                                      if (testTypeTab === 'api' && testCase.tag !== 'api') {
                                        return false;
                                      }
                                      
                                      // Client-side filtering for test_id and title
                                      if (filters.test_id && !testCase.test_id.toLowerCase().includes(filters.test_id.toLowerCase())) {
                                        return false;
                                      }
                                      if (filters.title && !testCase.title.toLowerCase().includes(filters.title.toLowerCase())) {
                                        return false;
                                      }
                                      
                                      // Filter by tag
                                      if (filters.tag && filters.tag !== 'all' && testCase.tag !== filters.tag) {
                                        return false;
                                      }
                                      
                                      // Filter by tags (text search)
                                      if (filters.tags && testCase.tags && !testCase.tags.toLowerCase().includes(filters.tags.toLowerCase())) {
                                        return false;
                                      }
                                      
                                      // Filter by automation status (only for automated tests)
                                      if (filters.automation_status && filters.automation_status !== 'all') {
                                        if (testCase.test_type === 'automated' && testCase.automation_status !== filters.automation_status) {
                                          return false;
                                        }
                                      }
                                      
                                      return true;
                                    })
                                    .map((testCase) => (
                                    <React.Fragment key={testCase.id}>
                                    <TableRow 
                                      hover
                                      sx={{ 
                                        '&:hover': {
                                          backgroundColor: 'action.hover',
                                        }
                                      }}
                                    >
                                      <TableCell 
                                        sx={{ 
                                          whiteSpace: 'nowrap', 
                                          overflow: 'hidden', 
                                          textOverflow: 'ellipsis',
                                          cursor: 'pointer'
                                        }}
                                        onClick={() => setExpandedTestCase(expandedTestCase === testCase.id ? null : testCase.id)}
                                      >
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
                                      <TableCell 
                                        sx={{ 
                                          whiteSpace: 'nowrap', 
                                          overflow: 'hidden', 
                                          textOverflow: 'ellipsis',
                                          cursor: 'pointer'
                                        }}
                                        onClick={() => setExpandedTestCase(expandedTestCase === testCase.id ? null : testCase.id)}
                                      >
                                        {testCase.title}
                                      </TableCell>
                                      <TableCell 
                                        sx={{ 
                                          whiteSpace: 'nowrap', 
                                          overflow: 'hidden', 
                                          textOverflow: 'ellipsis',
                                          cursor: 'pointer'
                                        }}
                                        onClick={() => setExpandedTestCase(expandedTestCase === testCase.id ? null : testCase.id)}
                                      >
                                        <Chip
                                          label={getModuleName(testCase.module_id)}
                                          size="small"
                                          color="primary"
                                          variant="outlined"
                                        />
                                      </TableCell>
                                      <TableCell 
                                        sx={{ 
                                          whiteSpace: 'nowrap', 
                                          overflow: 'hidden', 
                                          textOverflow: 'ellipsis',
                                          cursor: 'pointer'
                                        }}
                                        onClick={() => setExpandedTestCase(expandedTestCase === testCase.id ? null : testCase.id)}
                                      >
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
                                      <TableCell 
                                        sx={{ 
                                          whiteSpace: 'nowrap', 
                                          overflow: 'hidden', 
                                          textOverflow: 'ellipsis',
                                          cursor: 'pointer'
                                        }}
                                        onClick={() => setExpandedTestCase(expandedTestCase === testCase.id ? null : testCase.id)}
                                      >
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
                                      <TableCell 
                                        sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCellClick(testCase, 'test_type', e);
                                        }}
                                      >
                                        {editingCell?.testCaseId === testCase.id && editingCell?.field === 'test_type' ? (
                                          <Select
                                            open={true}
                                            value={editValue}
                                            onChange={(e) => {
                                              const newValue = e.target.value;
                                              setEditValue(newValue);
                                              handleInlineEditChange(testCase, 'test_type', newValue);
                                            }}
                                            onClose={() => {
                                              // Always cancel on close - onChange will have already saved if a selection was made
                                              setTimeout(() => handleInlineEditCancel(), 0);
                                            }}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Escape') handleInlineEditCancel();
                                            }}
                                            size="small"
                                            autoFocus
                                            sx={{ minWidth: 100 }}
                                          >
                                            <MenuItem value="manual">Manual</MenuItem>
                                            <MenuItem value="automated">Automated</MenuItem>
                                          </Select>
                                        ) : (
                                          <Chip
                                            label={testCase.test_type}
                                            size="small"
                                            color={testCase.test_type === 'automated' ? 'success' : 'default'}
                                          />
                                        )}
                                      </TableCell>
                                      <TableCell 
                                        sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCellClick(testCase, 'tag', e);
                                        }}
                                      >
                                        {editingCell?.testCaseId === testCase.id && editingCell?.field === 'tag' ? (
                                          <Select
                                            open={true}
                                            value={editValue}
                                            onChange={(e) => {
                                              const newValue = e.target.value;
                                              setEditValue(newValue);
                                              handleInlineEditChange(testCase, 'tag', newValue);
                                            }}
                                            onClose={() => {
                                              // Always cancel on close - onChange will have already saved if a selection was made
                                              setTimeout(() => handleInlineEditCancel(), 0);
                                            }}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Escape') handleInlineEditCancel();
                                            }}
                                            size="small"
                                            autoFocus
                                            sx={{ minWidth: 100 }}
                                          >
                                            <MenuItem value="ui">UI</MenuItem>
                                            <MenuItem value="api">API</MenuItem>
                                            <MenuItem value="hybrid">Hybrid</MenuItem>
                                          </Select>
                                        ) : (
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
                                        )}
                                      </TableCell>
                                      <TableCell 
                                        sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          // Only open editor if not already editing
                                          if (!(editingCell?.testCaseId === testCase.id && editingCell?.field === 'tags')) {
                                            handleCellClick(testCase, 'tags', e);
                                          }
                                        }}
                                      >
                                        {editingCell?.testCaseId === testCase.id && editingCell?.field === 'tags' ? (
                                          <Box onClick={(e) => e.stopPropagation()}>
                                            <Autocomplete
                                              multiple
                                              options={tagOptions}
                                              value={editValue}
                                              onChange={(event, newValue) => {
                                                setEditValue(newValue);
                                              }}
                                              onBlur={() => {
                                                // Save when focus leaves the component
                                                handleInlineEdit(testCase, 'tags', editValue);
                                              }}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Escape') {
                                                  e.stopPropagation();
                                                  handleInlineEditCancel();
                                                }
                                                if (e.key === 'Enter' && !e.target.value) {
                                                  // If Enter is pressed and input is empty, save and close
                                                  e.preventDefault();
                                                  handleInlineEdit(testCase, 'tags', editValue);
                                                }
                                              }}
                                              freeSolo
                                              disableCloseOnSelect
                                              size="small"
                                              sx={{ minWidth: 180 }}
                                              renderInput={(params) => (
                                                <TextField
                                                  {...params}
                                                  autoFocus
                                                  placeholder="Select tags"
                                                />
                                              )}
                                            />
                                          </Box>
                                        ) : testCase.tags ? (
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
                                      <TableCell 
                                        sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (testCase.test_type === 'automated') {
                                            handleCellClick(testCase, 'automation_status', e);
                                          }
                                        }}
                                      >
                                        {testCase.test_type === 'automated' ? (
                                          editingCell?.testCaseId === testCase.id && editingCell?.field === 'automation_status' ? (
                                            <Select
                                              open={true}
                                              value={editValue}
                                              onChange={(e) => {
                                                const newValue = e.target.value;
                                                setEditValue(newValue);
                                                handleInlineEditChange(testCase, 'automation_status', newValue);
                                              }}
                                              onClose={() => {
                                                // Always cancel on close - onChange will have already saved if a selection was made
                                                setTimeout(() => handleInlineEditCancel(), 0);
                                              }}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Escape') handleInlineEditCancel();
                                              }}
                                              size="small"
                                              autoFocus
                                              sx={{ minWidth: 120 }}
                                              >
                                              <MenuItem value="working">Working</MenuItem>
                                              <MenuItem value="broken">Broken</MenuItem>
                                            </Select>
                                          ) : (
                                            <Chip
                                              label={testCase.automation_status || 'working'}
                                              size="small"
                                              color={testCase.automation_status === 'broken' ? 'error' : 'success'}
                                              variant="outlined"
                                            />
                                          )
                                        ) : (
                                          <Typography variant="body2" color="text.secondary">-</Typography>
                                        )}
                                      </TableCell>
                                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end', alignItems: 'center' }}>
                                          <IconButton
                                            size="small"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setExpandedTestCase(expandedTestCase === testCase.id ? null : testCase.id);
                                            }}
                                            color={expandedTestCase === testCase.id ? 'primary' : 'default'}
                                            title="View Details"
                                          >
                                            <ExpandMoreIcon 
                                              sx={{
                                                transform: expandedTestCase === testCase.id ? 'rotate(180deg)' : 'rotate(0deg)',
                                                transition: 'transform 0.3s'
                                              }}
                                            />
                                          </IconButton>
                                          <IconButton
                                            size="small"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleOpenDialog(testCase);
                                            }}
                                            color="primary"
                                            title="Edit"
                                          >
                                            <EditIcon />
                                          </IconButton>
                                          <IconButton
                                            size="small"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDelete(testCase.id);
                                            }}
                                            color="error"
                                            title="Delete"
                                          >
                                            <DeleteIcon />
                                          </IconButton>
                                        </Box>
                                      </TableCell>
                                    </TableRow>
                                    
                                    {/* Accordion Row for Details */}
                                    {expandedTestCase === testCase.id && (
                                      <TableRow>
                                        <TableCell colSpan={10} sx={{ py: 0, px: 0, border: 0 }}>
                                          <Box sx={{ bgcolor: 'grey.50', p: 3 }}>
                                            {/* Preconditions */}
                                            {testCase.preconditions && (
                                              <Box sx={{ mb: 2 }}>
                                                <Typography variant="subtitle2" color="primary" gutterBottom fontWeight="bold">
                                                  Preconditions
                                                </Typography>
                                                <Paper elevation={0} sx={{ bgcolor: 'white', p: 2, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                                                  <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                                                    {testCase.preconditions}
                                                  </Typography>
                                                </Paper>
                                              </Box>
                                            )}
                                            
                                            {/* Steps to Reproduce */}
                                            {testCase.steps_to_reproduce && (
                                              <Box sx={{ mb: 2 }}>
                                                <Typography variant="subtitle2" color="primary" gutterBottom fontWeight="bold">
                                                  Steps to Reproduce
                                                </Typography>
                                                <Paper elevation={0} sx={{ bgcolor: 'white', p: 2, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                                                  <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                                                    {testCase.steps_to_reproduce}
                                                  </Typography>
                                                </Paper>
                                              </Box>
                                            )}
                                            
                                            {/* Expected Result */}
                                            {testCase.expected_result && (
                                              <Box sx={{ mb: 2 }}>
                                                <Typography variant="subtitle2" color="primary" gutterBottom fontWeight="bold">
                                                  Expected Result
                                                </Typography>
                                                <Paper elevation={0} sx={{ bgcolor: 'white', p: 2, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                                                  <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                                                    {testCase.expected_result}
                                                  </Typography>
                                                </Paper>
                                              </Box>
                                            )}
                                            
                                            {/* Scenario Examples / Parameters */}
                                            {testCase.scenario_examples && (() => {
                                              try {
                                                const examples = JSON.parse(testCase.scenario_examples);
                                                return (
                                                  <Box>
                                                    <Typography variant="subtitle2" color="primary" gutterBottom fontWeight="bold">
                                                      Scenario Examples / Parameters
                                                    </Typography>
                                                    <TableContainer 
                                                      component={Paper} 
                                                      variant="outlined" 
                                                      sx={{ 
                                                        bgcolor: 'white',
                                                        maxWidth: '100%',
                                                        overflowX: 'auto',
                                                        '&::-webkit-scrollbar': {
                                                          height: '8px',
                                                        },
                                                        '&::-webkit-scrollbar-track': {
                                                          backgroundColor: 'grey.100',
                                                          borderRadius: '4px',
                                                        },
                                                        '&::-webkit-scrollbar-thumb': {
                                                          backgroundColor: 'grey.400',
                                                          borderRadius: '4px',
                                                          '&:hover': {
                                                            backgroundColor: 'grey.500',
                                                          },
                                                        },
                                                      }}
                                                    >
                                                      <Table size="small" sx={{ minWidth: 'max-content' }}>
                                                        <TableHead>
                                                          <TableRow sx={{ bgcolor: 'primary.light' }}>
                                                            {examples.columns.map((col, idx) => (
                                                              <TableCell 
                                                                key={idx}
                                                                sx={{ 
                                                                  fontWeight: 'bold',
                                                                  minWidth: 120,
                                                                  color: 'primary.contrastText',
                                                                  whiteSpace: 'nowrap'
                                                                }}
                                                              >
                                                                {col}
                                                              </TableCell>
                                                            ))}
                                                          </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                          {examples.rows.map((row, rowIdx) => (
                                                            <TableRow key={rowIdx} hover>
                                                              {row.map((cell, cellIdx) => (
                                                                <TableCell key={cellIdx} sx={{ whiteSpace: 'nowrap' }}>
                                                                  <Typography variant="body2">{cell}</Typography>
                                                                </TableCell>
                                                              ))}
                                                            </TableRow>
                                                          ))}
                                                        </TableBody>
                                                      </Table>
                                                    </TableContainer>
                                                  </Box>
                                                );
                                              } catch (e) {
                                                console.error('Error parsing scenario_examples:', e);
                                                return null;
                                              }
                                            })()}
                                            
                                            {!testCase.preconditions && !testCase.steps_to_reproduce && !testCase.expected_result && !testCase.scenario_examples && (
                                              <Typography variant="body2" color="text.secondary" textAlign="center">
                                                No additional details available
                                              </Typography>
                                            )}
                                          </Box>
                                        </TableCell>
                                      </TableRow>
                                    )}
                                    </React.Fragment>
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
      )}

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
              label="JIRA Story ID"
              name="jira_story_id"
              value={formData.jira_story_id}
              onChange={handleChange}
              margin="normal"
              placeholder="e.g., CTP-1234"
              helperText="Link this test case to a JIRA story"
            />
            
            <TextField
              fullWidth
              label="JIRA Epic ID"
              name="jira_epic_id"
              value={formData.jira_epic_id}
              onChange={handleChange}
              margin="normal"
              placeholder="e.g., CTP-100"
              helperText="Optional: Link to JIRA epic"
            />
            
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
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', py: 2 }}>
          Test Case Details
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedTestCase && (
            <Box>
              {/* Basic Info Card */}
              <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    Basic Information
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Test ID
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {selectedTestCase.test_id}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Type
                      </Typography>
                      <Chip
                        label={selectedTestCase.test_type}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Title
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {selectedTestCase.title}
                      </Typography>
                    </Grid>
                    {selectedTestCase.description && (
                      <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Description
                        </Typography>
                        <Typography variant="body2">
                          {selectedTestCase.description}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Card>

              {/* Module & Classification Card */}
              <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    Module & Classification
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Module
                      </Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {getModuleName(selectedTestCase.module_id)}
                      </Typography>
                    </Grid>
                    {selectedTestCase.sub_module && (
                      <Grid item xs={12} sm={4}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Sub-Module
                        </Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {selectedTestCase.sub_module}
                        </Typography>
                      </Grid>
                    )}
                    {selectedTestCase.feature_section && (
                      <Grid item xs={12} sm={4}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Feature/Section
                        </Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {selectedTestCase.feature_section}
                        </Typography>
                      </Grid>
                    )}
                    <Grid item xs={12} sm={4}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Tag
                      </Typography>
                      <Chip
                        label={selectedTestCase.tag ? selectedTestCase.tag.toUpperCase() : 'UI'}
                        size="small"
                        color={
                          selectedTestCase.tag === 'api' ? 'success' : 
                          selectedTestCase.tag === 'hybrid' ? 'warning' : 
                          'info'
                        }
                      />
                    </Grid>
                    {selectedTestCase.test_type === 'automated' && (
                      <Grid item xs={12} sm={4}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Automation Status
                        </Typography>
                        <Chip
                          label={selectedTestCase.automation_status || 'working'}
                          size="small"
                          color={selectedTestCase.automation_status === 'broken' ? 'error' : 'success'}
                        />
                      </Grid>
                    )}
                    {selectedTestCase.tags && (
                      <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                          Additional Tags
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
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
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Card>

              {/* Test Execution Details */}
              {selectedTestCase.preconditions && (
                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      Preconditions
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Paper elevation={0} sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                      <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                        {selectedTestCase.preconditions}
                      </Typography>
                    </Paper>
                  </CardContent>
                </Card>
              )}

              {selectedTestCase.steps_to_reproduce && (
                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      Steps to Reproduce
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Paper elevation={0} sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                      <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                        {selectedTestCase.steps_to_reproduce}
                      </Typography>
                    </Paper>
                  </CardContent>
                </Card>
              )}

              {selectedTestCase.expected_result && (
                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      Expected Result
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Paper elevation={0} sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                      <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                        {selectedTestCase.expected_result}
                      </Typography>
                    </Paper>
                  </CardContent>
                </Card>
              )}

              {selectedTestCase.scenario_examples && (() => {
                try {
                  const examples = JSON.parse(selectedTestCase.scenario_examples);
                  return (
                    <Card variant="outlined" sx={{ mb: 2 }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom color="primary">
                          Scenario Examples / Parameters
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <TableContainer component={Paper} variant="outlined">
                          <Table size="small" sx={{ tableLayout: 'fixed' }}>
                            <TableHead>
                              <TableRow>
                                {examples.columns.map((col, idx) => (
                                  <ResizableTableCell 
                                    key={idx}
                                    minWidth={100}
                                    initialWidth={150}
                                    isHeader
                                  >
                                    {col}
                                  </ResizableTableCell>
                                ))}
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {examples.rows.map((row, rowIdx) => (
                                <TableRow key={rowIdx} hover>
                                  {row.map((cell, cellIdx) => (
                                    <TableCell key={cellIdx}>
                                      <Typography variant="body2">{cell}</Typography>
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </CardContent>
                    </Card>
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
        onClose={() => {
          setOpenBulkUploadDialog(false);
          setUploadFile(null);
          setUploadFileType('csv');
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Bulk Upload Test Cases</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {/* File Type Toggle */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Select Upload Type:
              </Typography>
              <ToggleButtonGroup
                value={uploadFileType}
                exclusive
                onChange={(e, newType) => {
                  if (newType !== null) {
                    setUploadFileType(newType);
                    setUploadFile(null);
                  }
                }}
                fullWidth
              >
                <ToggleButton value="csv">CSV File</ToggleButton>
                <ToggleButton value="feature">BDD Feature File</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {/* CSV Instructions */}
            {uploadFileType === 'csv' && (
              <>
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
                  Download CSV Template
                </Button>
              </>
            )}

            {/* Feature File Instructions */}
            {uploadFileType === 'feature' && (
              <>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Upload a BDD Feature file (.feature) containing Scenarios and Scenario Outlines. 
                  Test IDs will be automatically generated for each scenario.
                </Typography>
                <Typography variant="body2" component="div" sx={{ pl: 2, mb: 2 }}>
                  ✓ Supports Gherkin syntax<br />
                  ✓ Scenarios converted to individual test cases<br />
                  ✓ Scenario Outlines with Examples supported<br />
                  ✓ Steps automatically extracted<br />
                  ✓ Tags added: bdd, gherkin
                </Typography>

                {/* Feature Upload Configuration */}
                <Paper sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Configuration:
                  </Typography>
                  <TextField
                    select
                    label="Module *"
                    value={featureUploadConfig.module_id}
                    onChange={(e) => handleFeatureUploadConfigChange('module_id', e.target.value)}
                    fullWidth
                    margin="dense"
                    required
                  >
                    {modules.map((module) => (
                      <MenuItem key={module.id} value={module.id}>
                        {module.name}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    label="Sub-Module (Optional)"
                    value={featureUploadConfig.sub_module}
                    onChange={(e) => handleFeatureUploadConfigChange('sub_module', e.target.value)}
                    fullWidth
                    margin="dense"
                    disabled={!featureUploadConfig.module_id || featureUploadSubModules.length === 0}
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {featureUploadSubModules.map((subModule, index) => (
                      <MenuItem key={index} value={subModule.name || subModule}>
                        {subModule.name || subModule}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    label="Feature (Optional)"
                    value={featureUploadConfig.feature_section}
                    onChange={(e) => handleFeatureUploadConfigChange('feature_section', e.target.value)}
                    fullWidth
                    margin="dense"
                    disabled={!featureUploadConfig.sub_module || featureUploadFeatures.length === 0}
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {featureUploadFeatures.map((feature, index) => (
                      <MenuItem key={index} value={feature.name || feature}>
                        {feature.name || feature}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    label="Test Type"
                    value={featureUploadConfig.test_type}
                    onChange={(e) => handleFeatureUploadConfigChange('test_type', e.target.value)}
                    fullWidth
                    margin="dense"
                  >
                    <MenuItem value="automated">Automated</MenuItem>
                    <MenuItem value="manual">Manual</MenuItem>
                  </TextField>
                  <TextField
                    select
                    label="Tag"
                    value={featureUploadConfig.tag}
                    onChange={(e) => handleFeatureUploadConfigChange('tag', e.target.value)}
                    fullWidth
                    margin="dense"
                  >
                    <MenuItem value="ui">UI</MenuItem>
                    <MenuItem value="api">API</MenuItem>
                    <MenuItem value="hybrid">Hybrid</MenuItem>
                  </TextField>
                </Paper>
              </>
            )}

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
              onClick={() => document.getElementById('file-upload').click()}
            >
              <input
                id="file-upload"
                type="file"
                accept={uploadFileType === 'csv' ? '.csv' : '.feature'}
                style={{ display: 'none' }}
                onChange={(e) => setUploadFile(e.target.files[0])}
              />
              <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                {uploadFile 
                  ? uploadFile.name 
                  : `Click to select ${uploadFileType === 'csv' ? 'CSV' : 'Feature'} file`
                }
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
            setUploadFileType('csv');
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
