import React, { useState, useEffect, useCallback } from 'react';
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
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
  Collapse,
  Alert,
  Snackbar,
  Select,
  FormControl,
  InputLabel,
  Checkbox,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TablePagination,
  Tooltip,
  Grid,
  Divider,
  Card,
  CardContent,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Link as LinkIcon,
  LinkOff as LinkOffIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { jiraStoriesAPI, testCasesAPI, modulesAPI } from '../services/api';
import ResizableTableCell from '../components/ResizableTableCell';

const Stories = () => {
  const [stories, setStories] = useState([]);
  const [testCases, setTestCases] = useState([]);
  const [modules, setModules] = useState([]);
  const [expandedStory, setExpandedStory] = useState(null);
  const [storyTestCases, setStoryTestCases] = useState({});
  const [openDialog, setOpenDialog] = useState(false);
  const [openLinkDialog, setOpenLinkDialog] = useState(false);
  const [openTestCaseViewDialog, setOpenTestCaseViewDialog] = useState(false);
  const [selectedStory, setSelectedStory] = useState(null);
  const [selectedTestCaseForView, setSelectedTestCaseForView] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [importMode, setImportMode] = useState('manual'); // 'manual' or 'url'
  const [storyUrl, setStoryUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [formData, setFormData] = useState({
    story_id: '',
    epic_id: '',
    title: '',
    description: '',
    status: 'To Do',
    priority: 'Medium',
    assignee: '',
    release: '',
  });
  const [selectedTestCases, setSelectedTestCases] = useState([]);
  const [filters, setFilters] = useState({
    module: '',
    subModule: '',
    feature: '',
    testType: '',
    testStatus: '',
  });
  const [columnFilters, setColumnFilters] = useState({
    storyId: '',
    title: '',
    epicId: '',
    status: '',
    priority: '',
    assignee: '',
    release: '',
  });
  const [expandedModules, setExpandedModules] = useState({});
  const [loading, setLoading] = useState(false);
  const [refetchingStories, setRefetchingStories] = useState({});
  const [loadingTestCases, setLoadingTestCases] = useState({});
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const statusOptions = ['To Do', 'In Progress', 'In Review', 'Done', 'Blocked'];
  const priorityOptions = ['Low', 'Medium', 'High', 'Critical'];

  const showSnackbar = useCallback((message, severity) => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const fetchStories = useCallback(async () => {
    setLoading(true);
    try {
      const response = await jiraStoriesAPI.getAll();
      console.log('Stories API response:', response);
      // API returns array directly in response.data
      setStories(Array.isArray(response.data) ? response.data : response);
    } catch (error) {
      console.error('Error fetching stories:', error);
      showSnackbar('Failed to fetch stories', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  const fetchTestCases = useCallback(async () => {
    try {
      const response = await testCasesAPI.getAll();
      console.log('Test cases API response:', response);
      const cases = Array.isArray(response.data) ? response.data : response;
      setTestCases(cases);
    } catch (error) {
      console.error('Error fetching test cases:', error);
    }
  }, []);

  const fetchModules = useCallback(async () => {
    try {
      const response = await modulesAPI.getAll();
      setModules(Array.isArray(response.data) ? response.data : response);
    } catch (error) {
      console.error('Error fetching modules:', error);
    }
  }, []);



  useEffect(() => {
    fetchStories();
    fetchTestCases();
    fetchModules();
  }, [fetchStories, fetchTestCases, fetchModules]);

  const fetchStoryTestCases = async (storyId) => {
    setLoadingTestCases(prev => ({ ...prev, [storyId]: true }));
    try {
      const response = await jiraStoriesAPI.getTestCases(storyId);
      console.log('Story test cases response:', response);
      // Backend returns {story: {...}, test_cases: [...]}
      const testCases = response.data?.test_cases || response.test_cases || [];
      setStoryTestCases(prev => ({ ...prev, [storyId]: testCases }));
    } catch (error) {
      console.error('Error fetching story test cases:', error);
    } finally {
      setLoadingTestCases(prev => ({ ...prev, [storyId]: false }));
    }
  };

  const handleExpandStory = (storyId) => {
    if (expandedStory === storyId) {
      setExpandedStory(null);
    } else {
      setExpandedStory(storyId);
      if (!storyTestCases[storyId]) {
        fetchStoryTestCases(storyId);
      }
    }
  };

  const handleImportFromUrl = async () => {
    if (!storyUrl.trim()) {
      showSnackbar('Please enter a story URL or story ID', 'error');
      return;
    }

    setIsImporting(true);
    try {
      const response = await jiraStoriesAPI.importFromJira(storyUrl);
      
      if (response.success && response.story) {
        // Populate form with imported data
        setFormData({
          story_id: response.story.story_id || '',
          epic_id: response.story.epic_id || '',
          title: response.story.title || '',
          description: response.story.description || '',
          status: response.story.status || 'To Do',
          priority: response.story.priority || 'Medium',
          assignee: response.story.assignee || '',
          release: response.story.release || '',
        });
        
        // Switch to manual mode so user can edit if needed
        setImportMode('manual');
        showSnackbar('Story details imported successfully from JIRA!', 'success');
      }
    } catch (error) {
      console.error('Error importing story:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to import story from JIRA. Please check your URL and JIRA configuration.';
      showSnackbar(errorMessage, 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const handleOpenDialog = (story = null) => {
    if (story) {
      setSelectedStory(story);
      setImportMode('manual');
      setStoryUrl('');
      setFormData({
        story_id: story.story_id || '',
        epic_id: story.epic_id || '',
        title: story.title || '',
        description: story.description || '',
        status: story.status || 'To Do',
        priority: story.priority || 'Medium',
        assignee: story.assignee || '',
        release: story.release || '',
      });
    } else {
      setSelectedStory(null);
      setImportMode('manual');
      setStoryUrl('');
      setFormData({
        story_id: '',
        epic_id: '',
        title: '',
        description: '',
        status: 'To Do',
        priority: 'Medium',
        assignee: '',
        release: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedStory(null);
  };

  const handleViewTestCase = (testCase) => {
    setSelectedTestCaseForView(testCase);
    setOpenTestCaseViewDialog(true);
  };

  const getModuleName = (moduleId) => {
    const module = modules.find(m => m.id === moduleId);
    return module ? module.name : 'N/A';
  };

  const handleOpenLinkDialog = (story) => {
    setSelectedStory(story);
    const linkedTestCaseIds = (storyTestCases[story.story_id] || []).map(tc => tc.id);
    setSelectedTestCases(linkedTestCaseIds);
    setFilters({
      module: '',
      subModule: '',
      feature: '',
      testType: '',
      testStatus: '',
    });
    setOpenLinkDialog(true);
  };

  const handleCloseLinkDialog = () => {
    setOpenLinkDialog(false);
    setSelectedStory(null);
    setSelectedTestCases([]);
    setExpandedModules({});
    setFilters({
      module: '',
      subModule: '',
      feature: '',
      testType: '',
      testStatus: '',
    });
  };

  const handleModuleToggle = (moduleId) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  const handleTestCaseToggle = (testCaseId) => {
    setSelectedTestCases(prev => {
      if (prev.includes(testCaseId)) {
        return prev.filter(id => id !== testCaseId);
      } else {
        return [...prev, testCaseId];
      }
    });
  };

  const handleSelectAll = (moduleId) => {
    const moduleTestCases = getFilteredTestCases().filter(tc => tc.module_id === moduleId);
    const moduleTestCaseIds = moduleTestCases.map(tc => tc.id);
    
    const allSelected = moduleTestCaseIds.every(id => selectedTestCases.includes(id));
    
    if (allSelected) {
      setSelectedTestCases(prev => prev.filter(id => !moduleTestCaseIds.includes(id)));
    } else {
      setSelectedTestCases(prev => [...new Set([...prev, ...moduleTestCaseIds])]);
    }
  };

  const getFilteredTestCases = () => {
    let filtered = testCases;
    
    if (filters.module) {
      filtered = filtered.filter(tc => tc.module_id === parseInt(filters.module));
    }
    
    if (filters.subModule) {
      filtered = filtered.filter(tc => tc.sub_module === filters.subModule);
    }
    
    if (filters.feature) {
      filtered = filtered.filter(tc => tc.feature_section === filters.feature);
    }
    
    if (filters.testType) {
      filtered = filtered.filter(tc => tc.test_type === filters.testType);
    }
    
    if (filters.testStatus) {
      filtered = filtered.filter(tc => tc.test_status === filters.testStatus);
    }
    
    return filtered;
  };

  const groupTestCasesByModule = () => {
    const filtered = getFilteredTestCases();
    const grouped = {};
    
    filtered.forEach(tc => {
      if (!grouped[tc.module_id]) {
        const module = modules.find(m => m.id === tc.module_id);
        grouped[tc.module_id] = {
          module: module || { id: tc.module_id, name: 'Unknown' },
          testCases: []
        };
      }
      grouped[tc.module_id].testCases.push(tc);
    });
    
    return grouped;
  };

  const handleSubmit = async () => {
    try {
      if (selectedStory) {
        await jiraStoriesAPI.update(selectedStory.story_id, formData);
        showSnackbar('Story updated successfully', 'success');
      } else {
        await jiraStoriesAPI.create(formData);
        showSnackbar('Story created successfully', 'success');
      }
      fetchStories();
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving story:', error);
      showSnackbar(error.response?.data?.detail || 'Failed to save story', 'error');
    }
  };

  const handleDelete = async (storyId) => {
    if (!window.confirm('Are you sure you want to delete this story?')) return;
    
    try {
      await jiraStoriesAPI.delete(storyId);
      showSnackbar('Story deleted successfully', 'success');
      fetchStories();
    } catch (error) {
      console.error('Error deleting story:', error);
      showSnackbar(error.response?.data?.detail || 'Failed to delete story', 'error');
    }
  };

  const handleRefetchStory = async (storyId) => {
    try {
      setRefetchingStories(prev => ({ ...prev, [storyId]: true }));
      const response = await jiraStoriesAPI.refetchFromJira(storyId);
      if (response.success) {
        showSnackbar('Story re-fetched successfully from JIRA', 'success');
        fetchStories();
        fetchStoryTestCases(storyId);
      } else {
        showSnackbar(response.message || 'Failed to re-fetch story', 'error');
      }
    } catch (error) {
      console.error('Error re-fetching story:', error);
      showSnackbar(error.response?.data?.detail || 'Failed to re-fetch story from JIRA', 'error');
    } finally {
      setRefetchingStories(prev => ({ ...prev, [storyId]: false }));
    }
  };

  const handleLinkTestCases = async () => {
    try {
      const currentLinked = (storyTestCases[selectedStory.story_id] || []).map(tc => tc.id);
      const toLink = selectedTestCases.filter(id => !currentLinked.includes(id));
      const toUnlink = currentLinked.filter(id => !selectedTestCases.includes(id));

      // Link new test cases
      for (const testCaseId of toLink) {
        await jiraStoriesAPI.linkTestCase(selectedStory.story_id, testCaseId);
      }

      // Unlink removed test cases
      for (const testCaseId of toUnlink) {
        await jiraStoriesAPI.unlinkTestCase(selectedStory.story_id, testCaseId);
      }

      showSnackbar('Test cases updated successfully', 'success');
      fetchStoryTestCases(selectedStory.story_id);
      fetchStories(); // Refresh stories to update test case count
      handleCloseLinkDialog();
    } catch (error) {
      console.error('Error linking test cases:', error);
      showSnackbar(error.response?.data?.detail || 'Failed to update test cases', 'error');
    }
  };

  const handleUnlinkTestCase = async (storyId, testCaseId, testCaseTitle) => {
    if (!window.confirm(`Are you sure you want to unlink test case "${testCaseTitle}" from this story?`)) {
      return;
    }

    try {
      await jiraStoriesAPI.unlinkTestCase(storyId, testCaseId);
      showSnackbar('Test case unlinked successfully', 'success');
      fetchStoryTestCases(storyId);
      fetchStories(); // Refresh stories to update test case count
    } catch (error) {
      console.error('Error unlinking test case:', error);
      showSnackbar(error.response?.data?.detail || 'Failed to unlink test case', 'error');
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const getStatusColor = (status) => {
    const colors = {
      'To Do': 'default',
      'In Progress': 'primary',
      'In Review': 'warning',
      'Done': 'success',
      'Blocked': 'error',
    };
    return colors[status] || 'default';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'Low': 'success',
      'Medium': 'info',
      'High': 'warning',
      'Critical': 'error',
    };
    return colors[priority] || 'default';
  };

  const handleColumnFilterChange = (field, value) => {
    setColumnFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const filteredStories = stories.filter(story => {
    return (
      (!columnFilters.storyId || story.story_id?.toLowerCase().includes(columnFilters.storyId.toLowerCase())) &&
      (!columnFilters.title || story.title?.toLowerCase().includes(columnFilters.title.toLowerCase())) &&
      (!columnFilters.epicId || story.epic_id?.toLowerCase().includes(columnFilters.epicId.toLowerCase())) &&
      (!columnFilters.status || story.status === columnFilters.status) &&
      (!columnFilters.priority || story.priority === columnFilters.priority) &&
      (!columnFilters.assignee || story.assignee?.toLowerCase().includes(columnFilters.assignee.toLowerCase())) &&
      (!columnFilters.release || story.release?.toLowerCase().includes(columnFilters.release.toLowerCase()))
    );
  });

  // Paginated stories
  const paginatedStories = filteredStories.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const [syncingAllStories, setSyncingAllStories] = useState(false);
  const [confirmSyncDialogOpen, setConfirmSyncDialogOpen] = useState(false);

  const handleSyncAllStories = async () => {
    // Open confirmation dialog
    setConfirmSyncDialogOpen(true);
  };

  const handleConfirmSyncAllStories = async () => {
    setConfirmSyncDialogOpen(false);

    setSyncingAllStories(true);
    try {
      const response = await jiraStoriesAPI.syncAllStories();
      
      if (response.success) {
        let message = response.message;
        
        // Add details about unlinked releases if any
        if (response.unlinked_releases && response.unlinked_releases.length > 0) {
          const unlinkedCount = response.unlinked_releases.length;
          message += `\n\nUnlinked ${unlinkedCount} test case(s) from releases due to fix version changes.`;
        }
        
        showSnackbar(message, 'success');
        
        // Refresh the stories list
        await fetchStories();
      } else {
        showSnackbar('Failed to sync stories', 'error');
      }
    } catch (error) {
      console.error('Error syncing stories:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to sync stories from JIRA';
      showSnackbar(errorMessage, 'error');
    } finally {
      setSyncingAllStories(false);
    }
  };

  const handleCancelSyncAllStories = () => {
    setConfirmSyncDialogOpen(false);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Story Management</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleSyncAllStories}
            disabled={syncingAllStories}
          >
            {syncingAllStories ? 'Syncing...' : 'Sync Stories'}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Story
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      ) : (
      <Paper>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 1200, tableLayout: 'fixed' }}>
            <TableHead>
              <TableRow>
                <ResizableTableCell minWidth={130} initialWidth={130} isHeader>Story ID</ResizableTableCell>
                <ResizableTableCell minWidth={250} initialWidth={300} isHeader>Title</ResizableTableCell>
                <ResizableTableCell minWidth={130} initialWidth={130} isHeader>Epic ID</ResizableTableCell>
                <ResizableTableCell minWidth={120} initialWidth={120} isHeader>Status</ResizableTableCell>
                <ResizableTableCell minWidth={100} initialWidth={100} isHeader>Priority</ResizableTableCell>
                <ResizableTableCell minWidth={150} initialWidth={150} isHeader>Assignee</ResizableTableCell>
                <ResizableTableCell minWidth={120} initialWidth={120} isHeader>Release</ResizableTableCell>
                <ResizableTableCell minWidth={100} initialWidth={100} isHeader>Test Cases</ResizableTableCell>
                <ResizableTableCell minWidth={150} initialWidth={150} isHeader>Actions</ResizableTableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ width: 130, minWidth: 130, maxWidth: 130, p: 1 }}>
                  <TextField
                    size="small"
                    placeholder="Story ID"
                    value={columnFilters.storyId}
                    onChange={(e) => handleColumnFilterChange('storyId', e.target.value)}
                    variant="outlined"
                    fullWidth
                  />
                </TableCell>
                <TableCell sx={{ width: 300, minWidth: 250, maxWidth: 300, p: 1 }}>
                  <TextField
                    size="small"
                    placeholder="Title"
                    value={columnFilters.title}
                    onChange={(e) => handleColumnFilterChange('title', e.target.value)}
                    variant="outlined"
                    fullWidth
                  />
                </TableCell>
                <TableCell sx={{ width: 130, minWidth: 130, maxWidth: 130, p: 1 }}>
                  <TextField
                    size="small"
                    placeholder="Epic ID"
                    value={columnFilters.epicId}
                    onChange={(e) => handleColumnFilterChange('epicId', e.target.value)}
                    variant="outlined"
                    fullWidth
                  />
                </TableCell>
                <TableCell sx={{ width: 120, minWidth: 120, maxWidth: 120, p: 1 }}>
                  <Select
                    size="small"
                    value={columnFilters.status}
                    onChange={(e) => handleColumnFilterChange('status', e.target.value)}
                    displayEmpty
                    fullWidth
                  >
                    <MenuItem value="">All</MenuItem>
                    {statusOptions.map(status => (
                      <MenuItem key={status} value={status}>{status}</MenuItem>
                    ))}
                  </Select>
                </TableCell>
                <TableCell sx={{ width: 100, minWidth: 100, maxWidth: 100, p: 1 }}>
                  <Select
                    size="small"
                    value={columnFilters.priority}
                    onChange={(e) => handleColumnFilterChange('priority', e.target.value)}
                    displayEmpty
                    fullWidth
                  >
                    <MenuItem value="">All</MenuItem>
                    {priorityOptions.map(priority => (
                      <MenuItem key={priority} value={priority}>{priority}</MenuItem>
                    ))}
                  </Select>
                </TableCell>
                <TableCell sx={{ width: 150, minWidth: 150, maxWidth: 150, p: 1 }}>
                  <TextField
                    size="small"
                    placeholder="Assignee"
                    value={columnFilters.assignee}
                    onChange={(e) => handleColumnFilterChange('assignee', e.target.value)}
                    variant="outlined"
                    fullWidth
                  />
                </TableCell>
                <TableCell sx={{ width: 120, minWidth: 120, maxWidth: 120, p: 1 }}>
                  <TextField
                    size="small"
                    placeholder="Release"
                    value={columnFilters.release}
                    onChange={(e) => handleColumnFilterChange('release', e.target.value)}
                    variant="outlined"
                    fullWidth
                  />
                </TableCell>
                <TableCell sx={{ width: 100, minWidth: 100, maxWidth: 100 }}></TableCell>
                <TableCell sx={{ width: 150, minWidth: 150, maxWidth: 150 }}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedStories && paginatedStories.length > 0 ? paginatedStories.map((story) => (
                <React.Fragment key={story.story_id}>
                  <TableRow 
                    hover
                    sx={{ 
                      cursor: 'pointer',
                      '& > td:not(:first-child)': {
                        cursor: 'pointer'
                      }
                    }}
                    onClick={() => handleExpandStory(story.story_id)}
                  >
                    <TableCell 
                      sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Chip 
                        label={story.story_id} 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                        component="a"
                        href={`https://centime.atlassian.net/browse/${story.story_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        clickable
                        sx={{ cursor: 'pointer' }}
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
                      <Chip label={story.status} size="small" color={getStatusColor(story.status)} />
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <Chip label={story.priority} size="small" color={getPriorityColor(story.priority)} />
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {story.assignee || '-'}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {story.release || '-'}
                    </TableCell>
                    <TableCell align="center" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <Chip 
                        label={story.test_case_count || 0} 
                        size="small" 
                        color="info"
                      />
                    </TableCell>
                    <TableCell 
                      align="center" 
                      sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <IconButton 
                        size="small" 
                        color="info" 
                        onClick={() => handleRefetchStory(story.story_id)}
                        disabled={refetchingStories[story.story_id]}
                        title="Re-fetch from JIRA"
                      >
                        {refetchingStories[story.story_id] ? <CircularProgress size={20} /> : <RefreshIcon />}
                      </IconButton>
                      <Tooltip title="Link test cases">
                        <IconButton size="small" color="primary" onClick={() => handleOpenLinkDialog(story)}>
                          <LinkIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit story details">
                        <IconButton size="small" color="primary" onClick={() => handleOpenDialog(story)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete story">
                        <IconButton size="small" color="error" onClick={() => handleDelete(story.story_id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                <TableRow>
                  <TableCell colSpan={9} sx={{ p: 0 }}>
                    <Collapse in={expandedStory === story.story_id}>
                      <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Linked Test Cases
                        </Typography>
                        {loadingTestCases[story.story_id] ? (
                          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                            <CircularProgress size={30} />
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
                                <TableCell>Actions</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {storyTestCases[story.story_id].map((tc) => (
                                <TableRow key={tc.id}>
                                  <TableCell>
                                    <Chip 
                                      label={tc.test_id} 
                                      size="small" 
                                      color="primary"
                                      clickable
                                      onClick={() => handleViewTestCase(tc)}
                                      sx={{ cursor: 'pointer' }}
                                    />
                                  </TableCell>
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
                                  <TableCell>
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => handleUnlinkTestCase(story.story_id, tc.id, tc.test_id)}
                                      title="Unlink test case"
                                    >
                                      <LinkOffIcon fontSize="small" />
                                    </IconButton>
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
            )) : (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No stories found. Create your first story to get started!
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
          count={filteredStories.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
      )}

      {/* Create/Edit Story Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{selectedStory ? 'Edit Story' : 'Add New Story'}</DialogTitle>
        <DialogContent>
          {!selectedStory && (
            <Box sx={{ mb: 3, mt: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Import Method
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Button
                  variant={importMode === 'manual' ? 'contained' : 'outlined'}
                  onClick={() => setImportMode('manual')}
                  fullWidth
                >
                  Manual Entry
                </Button>
                <Button
                  variant={importMode === 'url' ? 'contained' : 'outlined'}
                  onClick={() => setImportMode('url')}
                  fullWidth
                >
                  Import from URL
                </Button>
              </Box>
              
              {importMode === 'url' && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    label="Story URL (JIRA, Azure DevOps, etc.)"
                    value={storyUrl}
                    onChange={(e) => setStoryUrl(e.target.value)}
                    placeholder="https://your-jira.atlassian.net/browse/STORY-123"
                    fullWidth
                  />
                  <Button
                    variant="contained"
                    onClick={handleImportFromUrl}
                    disabled={isImporting || !storyUrl.trim()}
                  >
                    {isImporting ? 'Importing...' : 'Import'}
                  </Button>
                </Box>
              )}
            </Box>
          )}
          
          <Box sx={{ display: 'grid', gap: 2, mt: 1 }}>
            <TextField
              label="Story ID"
              value={formData.story_id}
              onChange={(e) => setFormData({ ...formData, story_id: e.target.value })}
              required
              disabled={!!selectedStory || importMode === 'url'}
              fullWidth
            />
            <TextField
              label="Epic ID"
              value={formData.epic_id}
              onChange={(e) => setFormData({ ...formData, epic_id: e.target.value })}
              fullWidth
            />
            <TextField
              label="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                label="Status"
              >
                {statusOptions.map((status) => (
                  <MenuItem key={status} value={status}>{status}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                label="Priority"
              >
                {priorityOptions.map((priority) => (
                  <MenuItem key={priority} value={priority}>{priority}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Assignee"
              value={formData.assignee}
              onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
              fullWidth
            />
            <TextField
              label="Release"
              value={formData.release}
              onChange={(e) => setFormData({ ...formData, release: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {selectedStory ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Link Test Cases Dialog */}
      <Dialog open={openLinkDialog} onClose={handleCloseLinkDialog} maxWidth="lg" fullWidth>
        <DialogTitle>
          Link Test Cases to {selectedStory?.story_id}
          <Typography variant="body2" color="text.secondary">
            Select test cases to link to this story
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3, mt: 1 }}>
            {/* Filters */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Filter by Module</InputLabel>
                <Select
                  value={filters.module}
                  label="Filter by Module"
                  onChange={(e) => {
                    setFilters({
                      ...filters,
                      module: e.target.value,
                      subModule: '',
                      feature: '',
                    });
                  }}
                >
                  <MenuItem value="">All Modules</MenuItem>
                  {modules.map(module => (
                    <MenuItem key={module.id} value={module.id}>{module.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              {filters.module && (() => {
                const subModules = [...new Set(testCases
                  .filter(tc => tc.module_id === parseInt(filters.module))
                  .map(tc => tc.sub_module)
                  .filter(Boolean))];
                return subModules.length > 0 && (
                  <FormControl fullWidth>
                    <InputLabel>Filter by Sub-Module</InputLabel>
                    <Select
                      value={filters.subModule}
                      label="Filter by Sub-Module"
                      onChange={(e) => {
                        setFilters({
                          ...filters,
                          subModule: e.target.value,
                          feature: '',
                        });
                      }}
                    >
                      <MenuItem value="">All Sub-Modules</MenuItem>
                      {subModules.map(sm => (
                        <MenuItem key={sm} value={sm}>{sm}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                );
              })()}

              {filters.module && (() => {
                const features = [...new Set(testCases
                  .filter(tc => tc.module_id === parseInt(filters.module))
                  .filter(tc => !filters.subModule || tc.sub_module === filters.subModule)
                  .map(tc => tc.feature_section)
                  .filter(Boolean))];
                return features.length > 0 && (
                  <FormControl fullWidth>
                    <InputLabel>Filter by Feature</InputLabel>
                    <Select
                      value={filters.feature}
                      label="Filter by Feature"
                      onChange={(e) => setFilters({ ...filters, feature: e.target.value })}
                    >
                      <MenuItem value="">All Features</MenuItem>
                      {features.map(feature => (
                        <MenuItem key={feature} value={feature}>{feature}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                );
              })()}
            </Box>

            {/* Selection Summary */}
            <Box sx={{ mb: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>{selectedTestCases.length}</strong> test case(s) selected
              </Typography>
            </Box>

            {/* Test Cases by Module */}
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box>
                {Object.keys(groupTestCasesByModule()).length === 0 ? (
                  <Alert severity="info">No test cases found. Please create test cases first.</Alert>
                ) : (
                  Object.values(groupTestCasesByModule()).map(({ module, testCases: moduleTestCases }) => (
                    <Accordion 
                      key={module.id}
                      expanded={expandedModules[module.id] || false}
                      onChange={() => handleModuleToggle(module.id)}
                    >
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                          <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                            {module.name}
                          </Typography>
                          <Chip 
                            label={`${moduleTestCases.filter(tc => selectedTestCases.includes(tc.id)).length} / ${moduleTestCases.length} selected`}
                            size="small"
                            color="primary"
                          />
                          <Button
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectAll(module.id);
                            }}
                          >
                            {moduleTestCases.every(tc => selectedTestCases.includes(tc.id)) ? 'Deselect All' : 'Select All'}
                          </Button>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <TableContainer component={Paper} variant="outlined">
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell padding="checkbox" sx={{ width: 50 }}>Select</TableCell>
                                <TableCell>Test ID</TableCell>
                                <TableCell>Title</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Tag</TableCell>
                                <TableCell>Sub-Module</TableCell>
                                <TableCell>Feature</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {moduleTestCases.map(testCase => (
                                <TableRow 
                                  key={testCase.id} 
                                  hover
                                  sx={{ cursor: 'pointer' }}
                                >
                                  <TableCell 
                                    padding="checkbox"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTestCaseToggle(testCase.id);
                                    }}
                                  >
                                    <Checkbox
                                      checked={selectedTestCases.includes(testCase.id)}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        handleTestCaseToggle(testCase.id);
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </TableCell>
                                  <TableCell onClick={() => handleTestCaseToggle(testCase.id)}>
                                    {testCase.test_id}
                                  </TableCell>
                                  <TableCell onClick={() => handleTestCaseToggle(testCase.id)}>
                                    <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                                      {testCase.title}
                                    </Typography>
                                  </TableCell>
                                  <TableCell onClick={() => handleTestCaseToggle(testCase.id)}>
                                    <Chip label={testCase.test_type} size="small" />
                                  </TableCell>
                                  <TableCell onClick={() => handleTestCaseToggle(testCase.id)}>
                                    <Chip 
                                      label={testCase.tag} 
                                      size="small"
                                      color={
                                        testCase.tag === 'ui' ? 'primary' :
                                        testCase.tag === 'api' ? 'secondary' :
                                        'default'
                                      }
                                    />
                                  </TableCell>
                                  <TableCell onClick={() => handleTestCaseToggle(testCase.id)}>
                                    {testCase.sub_module || '-'}
                                  </TableCell>
                                  <TableCell onClick={() => handleTestCaseToggle(testCase.id)}>
                                    {testCase.feature_section || '-'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </AccordionDetails>
                    </Accordion>
                  ))
                )}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseLinkDialog}>Cancel</Button>
          <Button 
            onClick={handleLinkTestCases} 
            variant="contained" 
            color="primary"
            disabled={loading || selectedTestCases.length === 0}
            startIcon={<LinkIcon />}
          >
            Link {selectedTestCases.length > 0 ? `${selectedTestCases.length} ` : ''}Test Case(s)
          </Button>
        </DialogActions>
      </Dialog>

      {/* Test Case View Dialog */}
      <Dialog
        open={openTestCaseViewDialog}
        onClose={() => setOpenTestCaseViewDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', py: 2 }}>
          Test Case Details
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedTestCaseForView && (
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
                        {selectedTestCaseForView.test_id}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Type
                      </Typography>
                      <Chip
                        label={selectedTestCaseForView.test_type}
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
                        {selectedTestCaseForView.title}
                      </Typography>
                    </Grid>
                    {selectedTestCaseForView.description && (
                      <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Description
                        </Typography>
                        <Typography variant="body2">
                          {selectedTestCaseForView.description}
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
                        {selectedTestCaseForView.module_name || getModuleName(selectedTestCaseForView.module_id)}
                      </Typography>
                    </Grid>
                    {selectedTestCaseForView.sub_module && (
                      <Grid item xs={12} sm={4}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Sub-Module
                        </Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {selectedTestCaseForView.sub_module}
                        </Typography>
                      </Grid>
                    )}
                    {selectedTestCaseForView.feature_section && (
                      <Grid item xs={12} sm={4}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Feature/Section
                        </Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {selectedTestCaseForView.feature_section}
                        </Typography>
                      </Grid>
                    )}
                    <Grid item xs={12} sm={4}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Tag
                      </Typography>
                      <Chip
                        label={selectedTestCaseForView.tag ? selectedTestCaseForView.tag.toUpperCase() : 'UI'}
                        size="small"
                        color={
                          selectedTestCaseForView.tag === 'api' ? 'success' : 
                          selectedTestCaseForView.tag === 'hybrid' ? 'warning' : 
                          'info'
                        }
                      />
                    </Grid>
                    {selectedTestCaseForView.test_type === 'automated' && (
                      <Grid item xs={12} sm={4}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Automation Status
                        </Typography>
                        <Chip
                          label={selectedTestCaseForView.automation_status || 'working'}
                          size="small"
                          color={selectedTestCaseForView.automation_status === 'broken' ? 'error' : 'success'}
                        />
                      </Grid>
                    )}
                    {selectedTestCaseForView.tags && (
                      <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                          Additional Tags
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {selectedTestCaseForView.tags.split(',').map((tag, idx) => (
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
              {selectedTestCaseForView.preconditions && (
                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      Preconditions
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Paper elevation={0} sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                      <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                        {selectedTestCaseForView.preconditions}
                      </Typography>
                    </Paper>
                  </CardContent>
                </Card>
              )}

              {selectedTestCaseForView.steps_to_reproduce && (
                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      Steps to Reproduce
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Paper elevation={0} sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                      <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                        {selectedTestCaseForView.steps_to_reproduce}
                      </Typography>
                    </Paper>
                  </CardContent>
                </Card>
              )}

              {selectedTestCaseForView.expected_result && (
                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      Expected Result
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Paper elevation={0} sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                      <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                        {selectedTestCaseForView.expected_result}
                      </Typography>
                    </Paper>
                  </CardContent>
                </Card>
              )}

              {selectedTestCaseForView.scenario_examples && (() => {
                try {
                  const examples = JSON.parse(selectedTestCaseForView.scenario_examples);
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
          <Button onClick={() => setOpenTestCaseViewDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Sync All Stories Dialog */}
      <Dialog
        open={confirmSyncDialogOpen}
        onClose={handleCancelSyncAllStories}
        aria-labelledby="sync-all-dialog-title"
        aria-describedby="sync-all-dialog-description"
      >
        <DialogTitle id="sync-all-dialog-title">
          Confirm Sync Stories from JIRA
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="sync-all-dialog-description">
            This action will only sync the status and details of all already imported user stories.
            <br /><br />
            Do you want to continue?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelSyncAllStories} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleConfirmSyncAllStories} variant="contained" color="primary" autoFocus>
            Continue
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Stories;
