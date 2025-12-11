import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  TextField,
  Chip,
  InputAdornment,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Divider,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  Stack,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  ListItemIcon,
  Collapse,
  Fab,
  Badge,
  Menu,
} from '@mui/material';
import {
  Save as SaveIcon,
  Add as AddIcon,
  Search as SearchIcon,
  TrendingUp as TrendingUpIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Publish as PublishIcon,
  ArrowBack as BackIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Description as DescriptionIcon,
  CheckCircle as CheckCircleIcon,
  LibraryBooks as LibraryBooksIcon,
  Close as CloseIcon,
  Brightness4 as Brightness4Icon,
  Brightness7 as Brightness7Icon,
  WrapText as WrapTextIcon,
  Visibility as VisibilityIcon,
  HourglassEmpty as HourglassEmptyIcon,
  RateReview as RateReviewIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  Cancel as CancelIcon,
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
  TableChart as TableChartIcon,
  Send as SendIcon,
  ArrowDropDown as ArrowDropDownIcon,
  Code as CodeIcon,
  CompareArrows as CompareArrowsIcon,
  Undo as UndoIcon,
} from '@mui/icons-material';
import { stepCatalogAPI, featureFilesAPI, modulesAPI, testCasesAPI, csvWorkbooksAPI } from '../services/api';
import PublishPreviewModal from '../components/PublishPreviewModal';
import CsvUploadDialog from '../components/CsvUploadDialog';
import TestCaseDataGrid from '../components/TestCaseDataGrid';
import SimilarityCheckDialog from '../components/SimilarityCheckDialog';
import { validateAllRows, createEmptyRow, ROW_TYPES } from '../utils/csvParser';
import { useAuth } from '../context/AuthContext';

const MAX_FILES_PER_USER = 5;

const TestDesignStudio = () => {
  const { user } = useAuth();
  // View state: 'dashboard', 'editor' (feature file), 'view', or 'workbookEditor'
  const [view, setView] = useState('dashboard');
  
  // Editor state
  const [editorContent, setEditorContent] = useState('');
  const editorRef = useRef(null);
  
  // Step catalog state
  const [steps, setSteps] = useState([]);
  const [filteredSteps, setFilteredSteps] = useState([]);
  const [stats, setStats] = useState(null);
  const [catalogVisible, setCatalogVisible] = useState(false);
  
  // File management state
  const [featureFiles, setFeatureFiles] = useState([]);
  const [recentUploads, setRecentUploads] = useState([]);
  const [pendingApprovalFiles, setPendingApprovalFiles] = useState([]); // Files awaiting approval
  const [currentFile, setCurrentFile] = useState(null);
  
  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [topSearchQuery, setTopSearchQuery] = useState('');
  const [topSearchResults, setTopSearchResults] = useState([]);
  const [selectedStepType, setSelectedStepType] = useState('all');
  const [catalogDialogOpen, setCatalogDialogOpen] = useState(false);
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [newStepsDialogOpen, setNewStepsDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Form state
  const [fileName, setFileName] = useState('');
  const [fileDescription, setFileDescription] = useState('');
  const [selectedModule, setSelectedModule] = useState('');
  const [modules, setModules] = useState([]);
  
  // Detected new steps
  const [detectedNewSteps, setDetectedNewSteps] = useState([]);
  const [showNewStepBadge, setShowNewStepBadge] = useState(false);
  const detectionTimeoutRef = useRef(null);
  
  // Publish preview modal state
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishPreviewData, setPublishPreviewData] = useState(null);
  const [publishPreviewLoading, setPublishPreviewLoading] = useState(false);
  const [publishPreviewError, setPublishPreviewError] = useState(null);
  const [fileToPublish, setFileToPublish] = useState(null);
  
  // Bulk upload state
  const [openBulkUploadDialog, setOpenBulkUploadDialog] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [bulkUploadConfig, setBulkUploadConfig] = useState({
    module_id: '',
    sub_module: '',
    feature_section: '',
    test_type: 'automated',
    tag: 'ui'
  });
  const [bulkUploadSubModules, setBulkUploadSubModules] = useState([]);
  const [bulkUploadFeatures, setBulkUploadFeatures] = useState([]);
  
  // CSV Workbook upload state
  const [openCsvUploadDialog, setOpenCsvUploadDialog] = useState(false);
  const [csvWorkbooks, setCsvWorkbooks] = useState([]);
  const [pendingCsvWorkbooks, setPendingCsvWorkbooks] = useState([]);
  
  // Workbook Editor state (full-page editor like feature file IDE)
  const [currentWorkbook, setCurrentWorkbook] = useState(null);
  const [workbookRows, setWorkbookRows] = useState([]);
  const [workbookName, setWorkbookName] = useState('');
  const [workbookDescription, setWorkbookDescription] = useState('');
  const [workbookModuleId, setWorkbookModuleId] = useState('');
  const [workbookValidation, setWorkbookValidation] = useState(null);
  const [workbookSimilarityDialog, setWorkbookSimilarityDialog] = useState(false);
  const [workbookSimilarityLoading, setWorkbookSimilarityLoading] = useState(false);
  const [workbookSimilarityResults, setWorkbookSimilarityResults] = useState(null);
  
  // Dropdown menu anchors
  const [newDesignAnchorEl, setNewDesignAnchorEl] = useState(null);
  const [importAnchorEl, setImportAnchorEl] = useState(null);
  
  // Combined designs count for limit check
  const totalDesignsCount = featureFiles.length + csvWorkbooks.length;
  
  // Editor settings with localStorage persistence
  const [editorTheme, setEditorTheme] = useState(() => {
    return localStorage.getItem('testDesignStudio_theme') || 'light';
  });
  const [wordWrap, setWordWrap] = useState(() => {
    const saved = localStorage.getItem('testDesignStudio_wordWrap');
    return saved !== null ? saved === 'true' : true; // default to true
  });

  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadSteps(),
        loadFeatureFiles(),
        loadModules(),
        loadStats(),
        loadCsvWorkbooks(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      showSnackbar('Error loading data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadSteps = async () => {
    try {
      const data = await stepCatalogAPI.getAll();
      // API service already returns response.data
      const stepsArray = Array.isArray(data) ? data : [];
      setSteps(stepsArray);
      setFilteredSteps(stepsArray);
    } catch (error) {
      console.error('Error loading steps:', error);
      setSteps([]);
      setFilteredSteps([]);
    }
  };

  const loadFeatureFiles = async () => {
    try {
      const drafts = await featureFilesAPI.getAll({ status: 'draft' });
      setFeatureFiles(Array.isArray(drafts) ? drafts : []);
      
      // Load published feature files with type indicator
      const publishedFeatures = await featureFilesAPI.getAll({ status: 'published' });
      const featureUploads = (Array.isArray(publishedFeatures) ? publishedFeatures : []).map(f => ({
        ...f,
        fileType: 'feature'
      }));
      
      // Load approved CSV workbooks with type indicator
      const approvedWorkbooks = await csvWorkbooksAPI.getAll({ status: 'approved' });
      const workbookUploads = (Array.isArray(approvedWorkbooks) ? approvedWorkbooks : []).map(w => ({
        ...w,
        fileType: 'workbook'
      }));
      
      // Merge and sort by date (newest first)
      const allUploads = [...featureUploads, ...workbookUploads].sort((a, b) => {
        const dateA = new Date(a.updated_at || a.approved_at || a.created_at);
        const dateB = new Date(b.updated_at || b.approved_at || b.created_at);
        return dateB - dateA;
      });
      setRecentUploads(allUploads);
      
      // Load pending approval files
      const pending = await featureFilesAPI.getPendingApproval();
      setPendingApprovalFiles(Array.isArray(pending) ? pending : []);
    } catch (error) {
      console.error('Error loading files:', error);
      setFeatureFiles([]);
      setRecentUploads([]);
      setPendingApprovalFiles([]);
    }
  };

  const loadModules = async () => {
    try {
      const data = await modulesAPI.getAll();
      setModules(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading modules:', error);
      setModules([]);
    }
  };

  const loadStats = async () => {
    try {
      const data = await stepCatalogAPI.getStats();
      setStats(data || null);
    } catch (error) {
      console.error('Error loading stats:', error);
      setStats(null);
    }
  };

  const loadCsvWorkbooks = async () => {
    try {
      // Load user's draft workbooks
      const drafts = await csvWorkbooksAPI.getDrafts();
      setCsvWorkbooks(Array.isArray(drafts) ? drafts : []);
      
      // Load pending approval workbooks (for both testers and admins)
      // Backend returns: testers see their own, admins see all
      const pending = await csvWorkbooksAPI.getPendingApproval();
      setPendingCsvWorkbooks(Array.isArray(pending) ? pending : []);
    } catch (error) {
      console.error('Error loading CSV workbooks:', error);
      setCsvWorkbooks([]);
      setPendingCsvWorkbooks([]);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Dashboard actions
  // Professional BDD template with Scenario and Scenario Outline examples
  const DEFAULT_BDD_TEMPLATE = `Feature: User Authentication
  As a registered user
  I want to log in to the application
  So that I can access my account and protected features

  Background:
    Given the application is running
    And the database is available

  @smoke @login
  Scenario: Successful login with valid credentials
    Given I am on the login page
    When I enter username "testuser@example.com"
    And I enter password "SecurePass123"
    And I click the "Sign In" button
    Then I should be redirected to the dashboard
    And I should see a welcome message "Welcome, Test User"

  @regression @login
  Scenario Outline: Login validation with different user types
    Given I am on the login page
    When I enter username "<email>"
    And I enter password "<password>"
    And I click the "Sign In" button
    Then I should see the "<expected_result>" message
    And the user role should be "<role>"

    Examples:
      | email                  | password      | expected_result     | role    |
      | admin@example.com      | AdminPass123  | Welcome, Admin      | admin   |
      | tester@example.com     | TesterPass123 | Welcome, Tester     | tester  |
      | viewer@example.com     | ViewerPass123 | Welcome, Viewer     | viewer  |
      | invalid@example.com    | WrongPass     | Invalid credentials | none    |
`;

  const handleStartNew = () => {
    if (featureFiles.length >= MAX_FILES_PER_USER) {
      showSnackbar(`Maximum ${MAX_FILES_PER_USER} files allowed. Please delete or publish existing files.`, 'warning');
      return;
    }
    
    setCurrentFile(null);
    setFileName('');
    setFileDescription('');
    setSelectedModule('');
    setEditorContent(DEFAULT_BDD_TEMPLATE);
    setView('editor');
  };

  // ========== BULK UPLOAD HANDLERS ==========
  const loadBulkUploadSubModules = async (moduleId) => {
    if (!moduleId) {
      setBulkUploadSubModules([]);
      setBulkUploadFeatures([]);
      return;
    }
    
    try {
      const options = await testCasesAPI.getHierarchyOptions(moduleId);
      setBulkUploadSubModules(options);
      setBulkUploadFeatures([]);
    } catch (err) {
      console.error('Failed to load sub-modules:', err);
      setBulkUploadSubModules([]);
    }
  };

  const loadBulkUploadFeatures = async (moduleId, subModule) => {
    if (!moduleId || !subModule) {
      setBulkUploadFeatures([]);
      return;
    }
    
    try {
      const options = await testCasesAPI.getHierarchyOptions(moduleId, subModule);
      setBulkUploadFeatures(options);
    } catch (err) {
      console.error('Failed to load features:', err);
      setBulkUploadFeatures([]);
    }
  };

  const handleBulkUploadConfigChange = async (name, value) => {
    const newConfig = { ...bulkUploadConfig, [name]: value };
    
    // Reset cascading fields
    if (name === 'module_id') {
      newConfig.sub_module = '';
      newConfig.feature_section = '';
      await loadBulkUploadSubModules(value);
    } else if (name === 'sub_module') {
      newConfig.feature_section = '';
      await loadBulkUploadFeatures(bulkUploadConfig.module_id, value);
    }
    
    setBulkUploadConfig(newConfig);
  };

  const handleBulkUpload = async () => {
    if (!uploadFile) {
      showSnackbar('Please select a feature file', 'error');
      return;
    }

    if (!bulkUploadConfig.module_id) {
      showSnackbar('Please select a module', 'error');
      return;
    }

    try {
      setUploadLoading(true);
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('module_id', bulkUploadConfig.module_id);
      if (bulkUploadConfig.sub_module) {
        formData.append('sub_module', bulkUploadConfig.sub_module);
      }
      if (bulkUploadConfig.feature_section) {
        formData.append('feature_section', bulkUploadConfig.feature_section);
      }
      formData.append('test_type', bulkUploadConfig.test_type);
      formData.append('tag', bulkUploadConfig.tag);
      
      // Use the new bulk upload for approval endpoint
      const response = await featureFilesAPI.bulkUploadForApproval(formData);
      
      setOpenBulkUploadDialog(false);
      setUploadFile(null);
      setBulkUploadConfig({
        module_id: '',
        sub_module: '',
        feature_section: '',
        test_type: 'automated',
        tag: 'ui'
      });
      setBulkUploadSubModules([]);
      setBulkUploadFeatures([]);
      
      // Show success message about approval workflow
      showSnackbar(
        `Feature file uploaded with ${response.scenario_count} scenario(s). Awaiting admin approval before test cases are created.`,
        'success'
      );
      
      // Reload the data to show in pending approval section
      await loadInitialData();
    } catch (err) {
      showSnackbar(err.response?.data?.detail || 'Bulk upload failed', 'error');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDownloadFeatureTemplate = () => {
    const templateContent = DEFAULT_BDD_TEMPLATE;
    
    const blob = new Blob([templateContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_template.feature';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleEditFile = async (file) => {
    setCurrentFile(file);
    setFileName(file.name);
    setFileDescription(file.description || '');
    setSelectedModule(file.module_id || '');
    setEditorContent(file.content);
    setView('editor');
  };

  const handleViewFile = async (file) => {
    setCurrentFile(file);
    setFileName(file.name);
    setFileDescription(file.description || '');
    setSelectedModule(file.module_id || '');
    setEditorContent(file.content);
    setView('view'); // New view mode for read-only
  };

  const handleBackToDashboard = () => {
    setView('dashboard');
    setCurrentFile(null);
    setFileName('');
    setFileDescription('');
    setSelectedModule('');
    setEditorContent('');
    setTopSearchQuery('');
    setTopSearchResults([]);
  };

  const handleSaveDraft = async () => {
    if (!fileName.trim()) {
      showSnackbar('Please enter a file name', 'error');
      return;
    }

    setLoading(true);
    try {
      const fileData = {
        name: fileName,
        content: editorContent,
        description: fileDescription,
        module_id: selectedModule || null,
        status: 'draft',
      };

      if (currentFile) {
        await featureFilesAPI.update(currentFile.id, fileData);
        showSnackbar('File updated successfully', 'success');
      } else {
        await featureFilesAPI.create(fileData);
        showSnackbar('File saved successfully', 'success');
      }

      await loadFeatureFiles();
    } catch (error) {
      console.error('Error saving file:', error);
      showSnackbar('Error saving file', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (file) => {
    // Open the preview modal and load scenarios
    setFileToPublish(file);
    setPublishModalOpen(true);
    setPublishPreviewLoading(true);
    setPublishPreviewError(null);
    setPublishPreviewData(null);
    
    try {
      // Detect new steps before publishing
      const newSteps = detectNewSteps(file.content);
      if (newSteps.length > 0) {
        setDetectedNewSteps(newSteps);
        setShowNewStepBadge(true);
      }

      // Get preview of scenarios
      const preview = await featureFilesAPI.previewScenarios(file.id);
      setPublishPreviewData(preview);
    } catch (error) {
      console.error('Error loading publish preview:', error);
      setPublishPreviewError(
        error.response?.data?.detail || 'Error loading scenarios from feature file'
      );
    } finally {
      setPublishPreviewLoading(false);
    }
  };

  const handleConfirmPublish = async (scenarioTypes) => {
    if (!fileToPublish) return;
    
    try {
      // Submit the file for approval
      const response = await featureFilesAPI.publish(fileToPublish.id, scenarioTypes);
      
      if (response.requires_approval) {
        // File submitted for approval
        const isAdmin = user?.role === 'admin';
        if (isAdmin) {
          showSnackbar(
            'File added to Review Test Cases. Please approve it from there.',
            'info'
          );
        } else {
          showSnackbar(
            'File submitted for approval. An admin will review it soon.',
            'success'
          );
        }
      } else {
        // Already published (shouldn't happen normally)
        showSnackbar('File is already published.', 'info');
      }
      
      // Close modal and refresh
      setPublishModalOpen(false);
      setFileToPublish(null);
      setPublishPreviewData(null);
      await loadFeatureFiles();
    } catch (error) {
      console.error('Error publishing file:', error);
      showSnackbar(
        error.response?.data?.detail || 'Error submitting file for approval',
        'error'
      );
    }
  };

  // Handle approve (admin only)
  const handleApprove = async (file) => {
    setLoading(true);
    try {
      const response = await featureFilesAPI.approve(file.id);
      const testCasesCreated = response.test_cases_created || 0;
      showSnackbar(
        `File approved! Created ${testCasesCreated} test case(s).`,
        'success'
      );
      await loadFeatureFiles();
    } catch (error) {
      console.error('Error approving file:', error);
      showSnackbar(
        error.response?.data?.detail || 'Error approving file',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle reject (admin only)
  const handleReject = async (file) => {
    setLoading(true);
    try {
      await featureFilesAPI.reject(file.id, 'Needs revision');
      showSnackbar('File rejected and returned to draft.', 'warning');
      await loadFeatureFiles();
    } catch (error) {
      console.error('Error rejecting file:', error);
      showSnackbar(
        error.response?.data?.detail || 'Error rejecting file',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClosePublishModal = () => {
    setPublishModalOpen(false);
    setFileToPublish(null);
    setPublishPreviewData(null);
    setPublishPreviewError(null);
  };

  const handleRestore = async (file) => {
    setLoading(true);
    try {
      await featureFilesAPI.restore(file.id);
      showSnackbar('File restored to draft successfully', 'success');
      await loadFeatureFiles();
    } catch (error) {
      console.error('Error restoring file:', error);
      showSnackbar(
        error.response?.data?.detail || 'Error restoring file',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = async (file) => {
    setConfirmAction(() => async () => {
      setLoading(true);
      try {
        await featureFilesAPI.delete(file.id);
        showSnackbar('File deleted successfully', 'success');
        await loadFeatureFiles();
      } catch (error) {
        console.error('Error deleting file:', error);
        showSnackbar('Error deleting file', 'error');
      } finally {
        setLoading(false);
        setConfirmDialogOpen(false);
      }
    });
    setConfirmDialogOpen(true);
  };

  const handleDeleteUpload = async (uploadId) => {
    setConfirmAction(() => async () => {
      setLoading(true);
      try {
        await featureFilesAPI.delete(uploadId);
        showSnackbar('Upload removed from history', 'success');
        await loadFeatureFiles();
      } catch (error) {
        console.error('Error removing upload:', error);
        showSnackbar('Error removing upload', 'error');
      } finally {
        setLoading(false);
        setConfirmDialogOpen(false);
      }
    });
    setConfirmDialogOpen(true);
  };

  // CSV Workbook handlers
  const handleViewWorkbook = async (workbook) => {
    // Open workbook in view/edit mode - could navigate to a dedicated page or open a dialog
    // Open workbook for viewing in DataGrid (full-page editor)
    // Fetch full workbook content first
    setLoading(true);
    try {
      const fullWorkbook = await csvWorkbooksAPI.getById(workbook.id);
      setCurrentWorkbook(fullWorkbook);
      setWorkbookName(fullWorkbook.name || '');
      setWorkbookDescription(fullWorkbook.description || '');
      setWorkbookModuleId(fullWorkbook.module_id || '');
      // Parse content and ensure each row has an id
      let rows = fullWorkbook.content || [];
      rows = rows.map((row, index) => ({
        ...row,
        id: row.id || `row-${index}-${Date.now()}`,
      }));
      setWorkbookRows(rows);
      setWorkbookValidation(validateAllRows(rows));
      setView('workbookEditor');
    } catch (error) {
      console.error('Error loading workbook:', error);
      showSnackbar('Error loading workbook', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditWorkbook = async (workbook) => {
    // Open workbook for editing in DataGrid (full-page editor)
    // Fetch full workbook content first
    setLoading(true);
    try {
      const fullWorkbook = await csvWorkbooksAPI.getById(workbook.id);
      setCurrentWorkbook(fullWorkbook);
      setWorkbookName(fullWorkbook.name || '');
      setWorkbookDescription(fullWorkbook.description || '');
      setWorkbookModuleId(fullWorkbook.module_id || '');
      // Parse content and ensure each row has an id
      let rows = fullWorkbook.content || [];
      rows = rows.map((row, index) => ({
        ...row,
        id: row.id || `row-${index}-${Date.now()}`,
      }));
      setWorkbookRows(rows);
      setWorkbookValidation(validateAllRows(rows));
      setView('workbookEditor');
    } catch (error) {
      console.error('Error loading workbook:', error);
      showSnackbar('Error loading workbook', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Start a new workbook from scratch
  const handleStartNewWorkbook = () => {
    setCurrentWorkbook(null);
    setWorkbookName('');
    setWorkbookDescription('');
    setWorkbookModuleId('');
    // Initialize with one empty row
    const initialRows = [createEmptyRow(1)];
    setWorkbookRows(initialRows);
    setWorkbookValidation(null);
    setView('workbookEditor');
  };

  // Save workbook (create or update)
  const handleSaveWorkbook = async (submitForApproval = false) => {
    if (!workbookName.trim()) {
      showSnackbar('Please enter a workbook name', 'error');
      return;
    }
    
    if (!workbookModuleId) {
      showSnackbar('Please select a module', 'error');
      return;
    }
    
    if (workbookRows.length === 0) {
      showSnackbar('Please add at least one test case', 'error');
      return;
    }

    setLoading(true);
    try {
      let result;
      if (currentWorkbook?.id) {
        // Update existing workbook - use 'content' for update API
        const updateData = {
          name: workbookName.trim(),
          description: workbookDescription.trim() || null,
          content: workbookRows,
          module_id: parseInt(workbookModuleId),
        };
        result = await csvWorkbooksAPI.update(currentWorkbook.id, updateData);
        result.id = currentWorkbook.id; // Preserve ID from current workbook
        showSnackbar(`Workbook "${workbookName}" updated successfully`, 'success');
      } else {
        // Create new workbook - use 'csv_content' for create API
        const createData = {
          name: workbookName.trim(),
          description: workbookDescription.trim() || null,
          csv_content: JSON.stringify(workbookRows),
          module_id: parseInt(workbookModuleId),
        };
        result = await csvWorkbooksAPI.create(createData);
        setCurrentWorkbook(result);
        showSnackbar(`Workbook "${workbookName}" created successfully`, 'success');
      }

      // If submit for approval, trigger similarity analysis
      if (submitForApproval && result.id) {
        setWorkbookSimilarityLoading(true);
        setWorkbookSimilarityDialog(true);
        
        try {
          const similarityData = await csvWorkbooksAPI.analyzeSimilarity(result.id);
          
          // Transform backend response
          const duplicates = [];
          if (similarityData.results) {
            similarityData.results.forEach((row) => {
              if (row.similar_test_cases && row.similar_test_cases.length > 0) {
                row.similar_test_cases.forEach((similar) => {
                  duplicates.push({
                    new_test_case: { 
                      title: row.title || `Row ${row.row_index + 1}`,
                      row_index: row.row_index 
                    },
                    existing_test_case: {
                      id: similar.id,
                      test_id: similar.test_id,
                      title: similar.title,
                      module: similar.module,
                    },
                    similarity_score: similar.similarity / 100,
                  });
                });
              }
            });
          }
          
          setWorkbookSimilarityResults({
            similar_test_cases: duplicates,
            total_new: similarityData.total_test_cases || workbookRows.length,
            potential_duplicates: similarityData.potential_duplicates || 0,
            threshold: similarityData.threshold || 75,
            results: similarityData.results || [],
          });
        } catch (simError) {
          console.error('Similarity analysis error:', simError);
          setWorkbookSimilarityResults({ 
            similar_test_cases: [], 
            total_new: workbookRows.length,
            error: 'Could not analyze similarity. You may proceed anyway.'
          });
        } finally {
          setWorkbookSimilarityLoading(false);
        }
      }

      await loadCsvWorkbooks();
    } catch (error) {
      console.error('Error saving workbook:', error);
      showSnackbar(
        error.response?.data?.detail || 'Error saving workbook',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle similarity dialog confirm (submit for approval)
  const handleWorkbookSimilarityConfirm = async () => {
    if (!currentWorkbook?.id) return;
    
    setLoading(true);
    try {
      await csvWorkbooksAPI.submitForApproval(currentWorkbook.id);
      showSnackbar('Workbook submitted for approval successfully', 'success');
      setWorkbookSimilarityDialog(false);
      setWorkbookSimilarityResults(null);
      setView('dashboard');
      await loadCsvWorkbooks();
    } catch (error) {
      console.error('Error submitting workbook:', error);
      showSnackbar(
        error.response?.data?.detail || 'Error submitting workbook for approval',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle workbook validation change from DataGrid
  const handleWorkbookValidationChange = (updatedRows) => {
    const validation = validateAllRows(updatedRows);
    setWorkbookValidation(validation);
    setWorkbookRows(validation.validatedRows);
  };

  // Back to dashboard from workbook editor
  const handleBackFromWorkbookEditor = () => {
    // TODO: Confirm if there are unsaved changes
    setView('dashboard');
    setCurrentWorkbook(null);
    setWorkbookRows([]);
    setWorkbookName('');
    setWorkbookDescription('');
    setWorkbookModuleId('');
    setWorkbookValidation(null);
  };

  const handleDeleteWorkbook = async (workbook) => {
    setConfirmAction(() => async () => {
      setLoading(true);
      try {
        await csvWorkbooksAPI.delete(workbook.id);
        showSnackbar('Workbook deleted successfully', 'success');
        // Reload both workbooks and feature files (which populates recentUploads)
        await loadCsvWorkbooks();
        await loadFeatureFiles();
      } catch (error) {
        console.error('Error deleting workbook:', error);
        showSnackbar(
          error.response?.data?.detail || 'Error deleting workbook',
          'error'
        );
      } finally {
        setLoading(false);
        setConfirmDialogOpen(false);
      }
    });
    setConfirmDialogOpen(true);
  };

  const handleSubmitWorkbookForApproval = async (workbook) => {
    // First fetch full workbook and run similarity analysis
    setLoading(true);
    try {
      const fullWorkbook = await csvWorkbooksAPI.getById(workbook.id);
      setCurrentWorkbook(fullWorkbook);
      
      // Parse content for the similarity dialog
      let rows = fullWorkbook.content || [];
      rows = rows.map((row, index) => ({
        ...row,
        id: row.id || `row-${index}-${Date.now()}`,
      }));
      setWorkbookRows(rows);
      
      // Run similarity analysis
      setWorkbookSimilarityLoading(true);
      setWorkbookSimilarityDialog(true);
      
      try {
        const similarityData = await csvWorkbooksAPI.analyzeSimilarity(workbook.id);
        
        // Transform backend response
        const duplicates = [];
        if (similarityData.results) {
          similarityData.results.forEach((row) => {
            if (row.similar_test_cases && row.similar_test_cases.length > 0) {
              row.similar_test_cases.forEach((similar) => {
                duplicates.push({
                  new_test_case: { 
                    title: row.title || `Row ${row.row_index + 1}`,
                    row_index: row.row_index 
                  },
                  existing_test_case: {
                    id: similar.id,
                    test_id: similar.test_id,
                    title: similar.title,
                    module: similar.module,
                  },
                  similarity_score: similar.similarity / 100,
                });
              });
            }
          });
        }
        
        setWorkbookSimilarityResults({
          similar_test_cases: duplicates,
          total_new: similarityData.total_test_cases || rows.length,
          potential_duplicates: similarityData.potential_duplicates || 0,
          threshold: similarityData.threshold || 75,
          results: similarityData.results || [],
        });
      } catch (simError) {
        console.error('Similarity analysis error:', simError);
        setWorkbookSimilarityResults({ 
          similar_test_cases: [], 
          total_new: rows.length,
          error: 'Could not analyze similarity. You may proceed anyway.'
        });
      } finally {
        setWorkbookSimilarityLoading(false);
      }
    } catch (error) {
      console.error('Error loading workbook for approval:', error);
      showSnackbar(
        error.response?.data?.detail || 'Error loading workbook',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApproveWorkbook = async (workbook) => {
    setLoading(true);
    try {
      const response = await csvWorkbooksAPI.approve(workbook.id);
      const testCasesCreated = response.test_cases_created || 0;
      showSnackbar(
        `Workbook approved! Created ${testCasesCreated} test case(s).`,
        'success'
      );
      await loadCsvWorkbooks();
    } catch (error) {
      console.error('Error approving workbook:', error);
      showSnackbar(
        error.response?.data?.detail || 'Error approving workbook',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRejectWorkbook = async (workbook) => {
    setLoading(true);
    try {
      await csvWorkbooksAPI.reject(workbook.id, 'Needs revision');
      showSnackbar('Workbook rejected and returned to draft.', 'warning');
      await loadCsvWorkbooks();
    } catch (error) {
      console.error('Error rejecting workbook:', error);
      showSnackbar(
        error.response?.data?.detail || 'Error rejecting workbook',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  // Recall feature file (withdraw from approval)
  const handleRecallFeatureFile = async (file) => {
    setLoading(true);
    try {
      await featureFilesAPI.recall(file.id);
      showSnackbar('Feature file recalled and returned to draft.', 'success');
      await loadFeatureFiles();
    } catch (error) {
      console.error('Error recalling feature file:', error);
      showSnackbar(
        error.response?.data?.detail || 'Error recalling feature file',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  // Recall workbook (withdraw from approval)
  const handleRecallWorkbook = async (workbook) => {
    setLoading(true);
    try {
      await csvWorkbooksAPI.recall(workbook.id);
      showSnackbar('Workbook recalled and returned to draft.', 'success');
      await loadCsvWorkbooks();
    } catch (error) {
      console.error('Error recalling workbook:', error);
      showSnackbar(
        error.response?.data?.detail || 'Error recalling workbook',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  // View similarity results for reviewers (admins)
  const handleViewSimilarityResults = async (workbook) => {
    setLoading(true);
    try {
      const fullWorkbook = await csvWorkbooksAPI.getById(workbook.id);
      setCurrentWorkbook(fullWorkbook);
      setWorkbookName(fullWorkbook.name || '');
      
      // Parse content for the similarity dialog
      let rows = fullWorkbook.content || [];
      rows = rows.map((row, index) => ({
        ...row,
        id: row.id || `row-${index}-${Date.now()}`,
      }));
      setWorkbookRows(rows);
      
      // Run similarity analysis
      setWorkbookSimilarityLoading(true);
      setWorkbookSimilarityDialog(true);
      
      try {
        const similarityData = await csvWorkbooksAPI.analyzeSimilarity(workbook.id);
        
        // Transform backend response
        const duplicates = [];
        if (similarityData.results) {
          similarityData.results.forEach((row) => {
            if (row.similar_test_cases && row.similar_test_cases.length > 0) {
              row.similar_test_cases.forEach((similar) => {
                duplicates.push({
                  new_test_case: { 
                    title: row.title || `Row ${row.row_index + 1}`,
                    row_index: row.row_index 
                  },
                  existing_test_case: {
                    id: similar.id,
                    test_id: similar.test_id,
                    title: similar.title,
                    module: similar.module,
                  },
                  similarity_score: similar.similarity / 100,
                });
              });
            }
          });
        }
        
        setWorkbookSimilarityResults({
          similar_test_cases: duplicates,
          total_new: similarityData.total_test_cases || rows.length,
          potential_duplicates: similarityData.potential_duplicates || 0,
          threshold: similarityData.threshold || 75,
          results: similarityData.results || [],
          isReviewMode: true, // Flag to indicate this is for review only
        });
      } catch (simError) {
        console.error('Similarity analysis error:', simError);
        setWorkbookSimilarityResults({ 
          similar_test_cases: [], 
          total_new: rows.length,
          error: 'Could not analyze similarity.',
          isReviewMode: true,
        });
      } finally {
        setWorkbookSimilarityLoading(false);
      }
    } catch (error) {
      console.error('Error loading workbook similarity:', error);
      showSnackbar(
        error.response?.data?.detail || 'Error loading similarity results',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  // Step catalog functions
  const handleTopSearch = async (query) => {
    setTopSearchQuery(query);
    
    if (query.length < 1) {
      setTopSearchResults([]);
      return;
    }

    try {
      const data = await stepCatalogAPI.searchSuggestions(query, null, 20);
      console.log('Search results:', data); // Debug log
      // API service already returns response.data, so data is the array directly
      const results = Array.isArray(data) ? data : [];
      setTopSearchResults(results);
    } catch (error) {
      console.error('Error searching steps:', error);
      setTopSearchResults([]);
    }
  };

  const handleInsertStep = (stepText) => {
    if (editorRef.current) {
      const editor = editorRef.current;
      const selection = editor.getSelection();
      const id = { major: 1, minor: 1 };
      const text = `    ${stepText}\n`;
      const op = { identifier: id, range: selection, text: text, forceMoveMarkers: true };
      editor.executeEdits('insert-step', [op]);
      editor.focus();
      setTopSearchQuery('');
      setTopSearchResults([]);
    }
  };

  const detectNewSteps = (content) => {
    const lines = content.split('\n');
    const stepKeywords = ['Given', 'When', 'Then', 'And', 'But'];
    const existingStepTexts = (steps || []).map(s => s.step_text.toLowerCase());
    const newSteps = [];
    const seenSteps = new Set(); // Track steps already added to avoid duplicates

    lines.forEach(line => {
      const trimmed = line.trim();
      stepKeywords.forEach(keyword => {
        if (trimmed.startsWith(keyword)) {
          const stepText = trimmed.substring(keyword.length).trim();
          const stepLower = stepText.toLowerCase();
          
          // Only add if:
          // 1. Step text is not empty
          // 2. Not already in catalog
          // 3. Not already in our detected list
          if (stepText && 
              !existingStepTexts.includes(stepLower) && 
              !seenSteps.has(stepLower)) {
            seenSteps.add(stepLower);
            newSteps.push({
              step_type: keyword === 'And' || keyword === 'But' ? 'Given' : keyword,
              step_text: stepText,
              step_pattern: stepText,
              description: '',
              tags: '',
            });
          }
        }
      });
    });

    return newSteps;
  };

  const handleAddNewStepsToCatalog = async () => {
    setLoading(true);
    try {
      for (const step of detectedNewSteps) {
        await stepCatalogAPI.create(step);
      }
      showSnackbar(`${detectedNewSteps.length} new steps added to catalog`, 'success');
      await loadSteps();
      setNewStepsDialogOpen(false);
      setDetectedNewSteps([]);
      setShowNewStepBadge(false);
    } catch (error) {
      console.error('Error adding steps:', error);
      showSnackbar('Error adding steps to catalog', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStep = async (stepId, stepText) => {
    setConfirmAction(() => async () => {
      setLoading(true);
      try {
        await stepCatalogAPI.delete(stepId);
        showSnackbar('Step deleted from catalog', 'success');
        await loadSteps();
        await loadStats();
      } catch (error) {
        console.error('Error deleting step:', error);
        showSnackbar('Error deleting step', 'error');
      } finally {
        setLoading(false);
        setConfirmDialogOpen(false);
      }
    });
    setConfirmDialogOpen(true);
  };

  const handleToggleTheme = () => {
    const newTheme = editorTheme === 'light' ? 'dark' : 'light';
    setEditorTheme(newTheme);
    localStorage.setItem('testDesignStudio_theme', newTheme);
    
    // Apply theme to Monaco Editor if editor is mounted
    if (editorRef.current) {
      const monaco = window.monaco;
      if (monaco) {
        monaco.editor.setTheme(newTheme === 'dark' ? 'gherkinDarkTheme' : 'gherkinLightTheme');
      }
    }
  };

  const handleToggleWordWrap = () => {
    const newWordWrap = !wordWrap;
    setWordWrap(newWordWrap);
    localStorage.setItem('testDesignStudio_wordWrap', newWordWrap.toString());
    
    // Apply word wrap to Monaco Editor if editor is mounted
    if (editorRef.current) {
      editorRef.current.updateOptions({
        wordWrap: newWordWrap ? 'on' : 'off'
      });
    }
  };

  // Detect new steps as user types (debounced)
  const handleEditorContentChange = (value) => {
    setEditorContent(value);
    
    // Clear existing timeout
    if (detectionTimeoutRef.current) {
      clearTimeout(detectionTimeoutRef.current);
    }
    
    // Debounce detection by 2 seconds
    detectionTimeoutRef.current = setTimeout(() => {
      if (value && value.trim()) {
        const newSteps = detectNewSteps(value);
        if (newSteps.length > 0) {
          setDetectedNewSteps(newSteps);
          setShowNewStepBadge(true);
        } else {
          setDetectedNewSteps([]);
          setShowNewStepBadge(false);
        }
      }
    }, 2000);
  };

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    // Register Gherkin language
    monaco.languages.register({ id: 'gherkin' });

    // Define syntax highlighting
    monaco.languages.setMonarchTokensProvider('gherkin', {
      keywords: ['Feature', 'Scenario', 'Scenario Outline', 'Given', 'When', 'Then', 'And', 'But', 'Background', 'Examples'],
      tokenizer: {
        root: [
          [/@?\w+:/, 'keyword'],
          [/Given|When|Then|And|But/, 'keyword'],
          [/"[^"]*"/, 'string'],
          [/'[^']*'/, 'string'],
          [/#.*$/, 'comment'],
          [/\|/, 'delimiter'],
        ]
      }
    });

    // Define light theme
    monaco.editor.defineTheme('gherkinLightTheme', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '0000FF', fontStyle: 'bold' },
        { token: 'string', foreground: '008000' },
        { token: 'comment', foreground: '808080', fontStyle: 'italic' },
      ],
      colors: {}
    });

    // Define dark theme
    monaco.editor.defineTheme('gherkinDarkTheme', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '569CD6', fontStyle: 'bold' },
        { token: 'string', foreground: '4EC9B0' },
        { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
      ],
      colors: {
        'editor.background': '#1E1E1E',
        'editor.foreground': '#D4D4D4',
      }
    });

    monaco.editor.setTheme(editorTheme === 'dark' ? 'gherkinDarkTheme' : 'gherkinLightTheme');

    // Autocomplete provider
    monaco.languages.registerCompletionItemProvider('gherkin', {
      provideCompletionItems: async (model, position) => {
        const word = model.getWordUntilPosition(position);
        const line = model.getLineContent(position.lineNumber);
        const trimmedLine = line.trim();
        
        let stepType = null;
        if (trimmedLine.startsWith('Given')) stepType = 'Given';
        else if (trimmedLine.startsWith('When')) stepType = 'When';
        else if (trimmedLine.startsWith('Then')) stepType = 'Then';
        else if (trimmedLine.startsWith('And') || trimmedLine.startsWith('But')) {
          // Determine type from previous step
          for (let i = position.lineNumber - 1; i > 0; i--) {
            const prevLine = model.getLineContent(i).trim();
            if (prevLine.startsWith('Given')) { stepType = 'Given'; break; }
            if (prevLine.startsWith('When')) { stepType = 'When'; break; }
            if (prevLine.startsWith('Then')) { stepType = 'Then'; break; }
          }
        }

        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        };

        try {
          const query = word.word || '';
          const response = await stepCatalogAPI.searchSuggestions(query, stepType, 20);
          const suggestions = (response.data || []).map(step => ({
            label: step.step_text,
            kind: monaco.languages.CompletionItemKind.Snippet,
            detail: step.description || '',
            documentation: `Usage: ${step.usage_count} | Pattern: ${step.step_pattern || 'N/A'}`,
            insertText: step.step_text,
            range: range
          }));

          return { suggestions };
        } catch (error) {
          console.error('Error fetching autocomplete:', error);
          return { suggestions: [] };
        }
      }
    });
  };

  const filterSteps = () => {
    if (!steps || !Array.isArray(steps)) {
      setFilteredSteps([]);
      return;
    }

    let filtered = [...steps];

    if (selectedStepType !== 'all') {
      filtered = filtered.filter(s => s.step_type === selectedStepType);
    }

    if (searchQuery) {
      filtered = filtered.filter(s =>
        s.step_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.tags && s.tags.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    setFilteredSteps(filtered);
  };

  useEffect(() => {
    filterSteps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStepType, searchQuery, steps]);

  // ========== RENDER DASHBOARD ==========
  const renderDashboard = () => (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <DescriptionIcon fontSize="large" />
        Test Design Studio
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Create and manage test cases using BDD feature files or CSV workbooks with AI-powered similarity detection
      </Typography>

      {/* Combined My Designs Section */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            My Designs ({totalDesignsCount}/{MAX_FILES_PER_USER})
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {/* Import Dropdown Button */}
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              endIcon={<ArrowDropDownIcon />}
              onClick={(e) => setImportAnchorEl(e.currentTarget)}
              disabled={loading || totalDesignsCount >= MAX_FILES_PER_USER}
            >
              Import
            </Button>
            <Menu
              anchorEl={importAnchorEl}
              open={Boolean(importAnchorEl)}
              onClose={() => setImportAnchorEl(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <MenuItem onClick={() => { setOpenCsvUploadDialog(true); setImportAnchorEl(null); }}>
                <ListItemIcon><TableChartIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Import CSV Workbook</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => { setOpenBulkUploadDialog(true); setImportAnchorEl(null); }}>
                <ListItemIcon><CodeIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Import Feature File (.feature)</ListItemText>
              </MenuItem>
            </Menu>

            {/* New Design Dropdown Button */}
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              endIcon={<ArrowDropDownIcon />}
              onClick={(e) => setNewDesignAnchorEl(e.currentTarget)}
              disabled={loading || totalDesignsCount >= MAX_FILES_PER_USER}
            >
              New Design
            </Button>
            <Menu
              anchorEl={newDesignAnchorEl}
              open={Boolean(newDesignAnchorEl)}
              onClose={() => setNewDesignAnchorEl(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <MenuItem 
                onClick={() => { handleStartNew(); setNewDesignAnchorEl(null); }}
              >
                <ListItemIcon><CodeIcon fontSize="small" /></ListItemIcon>
                <ListItemText>New Feature File</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => { handleStartNewWorkbook(); setNewDesignAnchorEl(null); }}>
                <ListItemIcon><TableChartIcon fontSize="small" /></ListItemIcon>
                <ListItemText>New CSV Workbook</ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        </Box>

        {totalDesignsCount >= MAX_FILES_PER_USER && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Maximum {MAX_FILES_PER_USER} designs reached. Please delete or publish existing designs to create new ones.
          </Alert>
        )}

        {totalDesignsCount === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
            <DescriptionIcon sx={{ fontSize: 80, opacity: 0.3, mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No designs yet
            </Typography>
            <Typography variant="body2" sx={{ mb: 3 }}>
              Create a feature file or import a CSV workbook to get started
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="outlined"
                startIcon={<CodeIcon />}
                onClick={handleStartNew}
                disabled={loading}
              >
                New Feature File
              </Button>
              <Button
                variant="outlined"
                startIcon={<TableChartIcon />}
                onClick={() => setOpenCsvUploadDialog(true)}
                disabled={loading}
              >
                Import CSV
              </Button>
            </Box>
          </Box>
        ) : (
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            {/* List Header */}
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: '80px 2fr 1.5fr 1fr 1fr 180px', 
              gap: 2, 
              p: 1.5, 
              bgcolor: 'grey.100',
              borderBottom: '1px solid',
              borderColor: 'divider',
              fontWeight: 'bold'
            }}>
              <Typography variant="subtitle2" fontWeight="bold">Type</Typography>
              <Typography variant="subtitle2" fontWeight="bold">Name</Typography>
              <Typography variant="subtitle2" fontWeight="bold">Description / Module</Typography>
              <Typography variant="subtitle2" fontWeight="bold">Module</Typography>
              <Typography variant="subtitle2" fontWeight="bold">Status</Typography>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ textAlign: 'center' }}>Actions</Typography>
            </Box>
            {/* Combined List Items - Feature Files */}
            {featureFiles.map((file, index) => (
              <Box 
                key={`feature-${file.id}`}
                sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: '80px 2fr 1.5fr 1fr 1fr 180px', 
                  gap: 2, 
                  p: 1.5, 
                  alignItems: 'center',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  '&:hover': { bgcolor: 'action.hover' }
                }}
              >
                <Chip icon={<CodeIcon />} label="Feature" size="small" color="primary" variant="outlined" />
                <Box>
                  <Typography variant="body2" fontWeight="medium">
                    {file.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Created: {new Date(file.created_at).toLocaleDateString()}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis', 
                  whiteSpace: 'nowrap' 
                }}>
                  {file.description || 'No description'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {modules.find(m => m.id === file.module_id)?.name || 'None'}
                </Typography>
                <Box>
                  <Chip 
                    label={file.status === 'published' ? 'Published' : 'Draft'} 
                    color={file.status === 'published' ? 'success' : 'default'} 
                    size="small" 
                  />
                </Box>
                <Stack direction="row" spacing={0.5} justifyContent="center">
                  {file.status === 'published' ? (
                    <>
                      <Tooltip title="View">
                        <IconButton size="small" onClick={() => handleViewFile(file)}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Restore to Draft">
                        <IconButton size="small" color="warning" onClick={() => handleRestore(file)}>
                          <PublishIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </>
                  ) : (
                    <>
                      <Tooltip title="Edit">
                        <IconButton size="small" color="primary" onClick={() => handleEditFile(file)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Publish">
                        <IconButton size="small" color="success" onClick={() => handlePublish(file)}>
                          <PublishIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                  <Tooltip title="Delete">
                    <IconButton size="small" color="error" onClick={() => handleDeleteFile(file)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>
            ))}
            {/* Combined List Items - CSV Workbooks */}
            {csvWorkbooks.map((workbook, index) => (
              <Box 
                key={`workbook-${workbook.id}`}
                sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: '80px 2fr 1.5fr 1fr 1fr 180px', 
                  gap: 2, 
                  p: 1.5, 
                  alignItems: 'center',
                  borderBottom: index < csvWorkbooks.length - 1 ? '1px solid' : 'none',
                  borderColor: 'divider',
                  '&:hover': { bgcolor: 'action.hover' }
                }}
              >
                <Chip icon={<TableChartIcon />} label="CSV" size="small" color="secondary" variant="outlined" />
                <Box>
                  <Typography variant="body2" fontWeight="medium">
                    {workbook.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Created: {workbook.created_at ? new Date(workbook.created_at).toLocaleDateString() : '-'}
                  </Typography>
                  {workbook.status === 'rejected' && workbook.rejection_reason && (
                    <Typography variant="caption" color="error.main" display="block">
                      Rejected: {workbook.rejection_reason}
                    </Typography>
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis', 
                  whiteSpace: 'nowrap' 
                }}>
                  {workbook.description || 'No description'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {workbook.module_name || 'None'}
                </Typography>
                <Box>
                  <Chip 
                    label={workbook.status === 'draft' ? 'Draft' : workbook.status === 'pending_approval' ? 'Pending' : workbook.status === 'approved' ? 'Approved' : workbook.status === 'rejected' ? 'Rejected' : workbook.status} 
                    color={workbook.status === 'approved' ? 'success' : workbook.status === 'pending_approval' ? 'warning' : workbook.status === 'rejected' ? 'error' : 'default'} 
                    size="small" 
                  />
                </Box>
                <Stack direction="row" spacing={0.5} justifyContent="center">
                  <Tooltip title="View/Edit">
                    <IconButton size="small" color="primary" onClick={() => handleEditWorkbook(workbook)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {(workbook.status === 'draft' || workbook.status === 'rejected') && (
                    <Tooltip title="Submit for Approval">
                      <IconButton size="small" color="success" onClick={() => handleSubmitWorkbookForApproval(workbook)}>
                        <SendIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Delete">
                    <IconButton size="small" color="error" onClick={() => handleDeleteWorkbook(workbook)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>
            ))}
          </Box>
        )}
      </Paper>

      {/* Sent for Approval Section (for testers - shows their own pending files and workbooks) */}
      {user?.role !== 'admin' && (
        <Paper elevation={2} sx={{ p: 3, mb: 3, bgcolor: 'warning.50' }}>
          <Typography variant="h6" gutterBottom>
            <HourglassEmptyIcon sx={{ verticalAlign: 'middle', mr: 1, color: 'warning.main' }} />
            Sent for Approval ({pendingApprovalFiles.length + pendingCsvWorkbooks.length})
          </Typography>

          {pendingApprovalFiles.length === 0 && pendingCsvWorkbooks.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center', bgcolor: 'white', borderRadius: 1, border: '1px solid', borderColor: 'warning.light' }}>
              <Typography variant="body2" color="text.secondary">
                No items pending approval. When you submit feature files or CSV workbooks for publishing, they will appear here.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ border: '1px solid', borderColor: 'warning.light', borderRadius: 1 }}>
              {/* List Header */}
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: '80px 1.5fr 1.5fr 1fr 150px', 
                gap: 2, 
                p: 1.5, 
                bgcolor: 'warning.100',
                borderBottom: '1px solid',
                borderColor: 'warning.light',
                fontWeight: 'bold'
              }}>
                <Typography variant="subtitle2" fontWeight="bold">Type</Typography>
                <Typography variant="subtitle2" fontWeight="bold">Name</Typography>
                <Typography variant="subtitle2" fontWeight="bold">Submitted</Typography>
                <Typography variant="subtitle2" fontWeight="bold">Status</Typography>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ textAlign: 'center' }}>Actions</Typography>
              </Box>
              {/* List Items - Feature Files */}
              {pendingApprovalFiles.map((file, index) => (
                <Box 
                  key={`tester-feature-${file.id}`}
                  sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: '80px 1.5fr 1.5fr 1fr 150px', 
                    gap: 2, 
                    p: 1.5, 
                    alignItems: 'center',
                    bgcolor: 'white',
                    borderBottom: '1px solid',
                    borderColor: 'warning.light',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                >
                  <Chip icon={<CodeIcon />} label="Feature" size="small" color="primary" variant="outlined" />
                  <Typography variant="body2" fontWeight="medium">
                    {file.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {file.submitted_for_approval_at ? new Date(file.submitted_for_approval_at).toLocaleDateString() : '-'}
                  </Typography>
                  <Box>
                    <Chip label="Pending" color="warning" size="small" />
                  </Box>
                  <Stack direction="row" spacing={0.5} justifyContent="center">
                    <Tooltip title="View">
                      <IconButton size="small" onClick={() => handleViewFile(file)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Recall">
                      <IconButton size="small" color="secondary" onClick={() => handleRecallFeatureFile(file)}>
                        <UndoIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>
              ))}
              {/* List Items - CSV Workbooks */}
              {pendingCsvWorkbooks.map((workbook, index) => (
                <Box 
                  key={`tester-workbook-${workbook.id}`}
                  sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: '80px 1.5fr 1.5fr 1fr 150px', 
                    gap: 2, 
                    p: 1.5, 
                    alignItems: 'center',
                    bgcolor: 'white',
                    borderBottom: index < pendingCsvWorkbooks.length - 1 ? '1px solid' : 'none',
                    borderColor: 'warning.light',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                >
                  <Chip icon={<TableChartIcon />} label="CSV" size="small" color="secondary" variant="outlined" />
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {workbook.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {workbook.test_case_count || 0} test cases
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {workbook.submitted_for_approval_at ? new Date(workbook.submitted_for_approval_at).toLocaleDateString() : '-'}
                  </Typography>
                  <Box>
                    <Chip label="Pending" color="warning" size="small" />
                  </Box>
                  <Stack direction="row" spacing={0.5} justifyContent="center">
                    <Tooltip title="View">
                      <IconButton size="small" onClick={() => handleViewWorkbook(workbook)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="View Similarity">
                      <IconButton size="small" color="info" onClick={() => handleViewSimilarityResults(workbook)}>
                        <CompareArrowsIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Recall">
                      <IconButton size="small" color="secondary" onClick={() => handleRecallWorkbook(workbook)}>
                        <UndoIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>
              ))}
            </Box>
          )}
        </Paper>
      )}

      {/* Combined Review Section (for admins - shows all pending items) */}
      {user?.role === 'admin' && (
        <Paper elevation={2} sx={{ p: 3, mb: 3, bgcolor: 'info.50' }}>
          <Typography variant="h6" gutterBottom>
            <RateReviewIcon sx={{ verticalAlign: 'middle', mr: 1, color: 'info.main' }} />
            Pending Review ({pendingApprovalFiles.length + pendingCsvWorkbooks.length})
          </Typography>

          {pendingApprovalFiles.length === 0 && pendingCsvWorkbooks.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center', bgcolor: 'white', borderRadius: 1, border: '1px solid', borderColor: 'info.light' }}>
              <Typography variant="body2" color="text.secondary">
                No items pending review. When users submit designs for approval, they will appear here.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ border: '1px solid', borderColor: 'info.light', borderRadius: 1 }}>
              {/* List Header */}
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: '80px 1.5fr 1.5fr 1fr 1fr 180px', 
                gap: 2, 
                p: 1.5, 
                bgcolor: 'info.100',
                borderBottom: '1px solid',
                borderColor: 'info.light',
                fontWeight: 'bold'
              }}>
                <Typography variant="subtitle2" fontWeight="bold">Type</Typography>
                <Typography variant="subtitle2" fontWeight="bold">Name</Typography>
                <Typography variant="subtitle2" fontWeight="bold">Created By</Typography>
                <Typography variant="subtitle2" fontWeight="bold">Submitted</Typography>
                <Typography variant="subtitle2" fontWeight="bold">Status</Typography>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ textAlign: 'center' }}>Actions</Typography>
              </Box>
              {/* List Items - Feature Files */}
              {pendingApprovalFiles.map((file, index) => (
                <Box 
                  key={`review-feature-${file.id}`}
                  sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: '80px 1.5fr 1.5fr 1fr 1fr 180px', 
                    gap: 2, 
                    p: 1.5, 
                    alignItems: 'center',
                    bgcolor: 'white',
                    borderBottom: '1px solid',
                    borderColor: 'info.light',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                >
                  <Chip icon={<CodeIcon />} label="Feature" size="small" color="primary" variant="outlined" />
                  <Typography variant="body2" fontWeight="medium">
                    {file.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {file.creator_name || file.creator_email || 'Unknown'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {file.submitted_for_approval_at ? new Date(file.submitted_for_approval_at).toLocaleDateString() : '-'}
                  </Typography>
                  <Box>
                    <Chip label="Pending" color="warning" size="small" />
                  </Box>
                  <Stack direction="row" spacing={0.5} justifyContent="center">
                    <Tooltip title="View">
                      <IconButton size="small" onClick={() => handleViewFile(file)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Approve">
                      <IconButton size="small" color="success" onClick={() => handleApprove(file)}>
                        <CheckCircleOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Reject">
                      <IconButton size="small" color="error" onClick={() => handleReject(file)}>
                        <CancelIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>
              ))}
              {/* List Items - CSV Workbooks */}
              {pendingCsvWorkbooks.map((workbook, index) => (
                <Box 
                  key={`review-workbook-${workbook.id}`}
                  sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: '80px 1.5fr 1.5fr 1fr 1fr 180px', 
                    gap: 2, 
                    p: 1.5, 
                    alignItems: 'center',
                    bgcolor: 'white',
                    borderBottom: index < pendingCsvWorkbooks.length - 1 ? '1px solid' : 'none',
                    borderColor: 'info.light',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                >
                  <Chip icon={<TableChartIcon />} label="CSV" size="small" color="secondary" variant="outlined" />
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {workbook.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {workbook.test_case_count || 0} test cases • {workbook.description || 'No description'}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {workbook.creator_name || workbook.creator_email || 'Unknown'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {workbook.submitted_for_approval_at ? new Date(workbook.submitted_for_approval_at).toLocaleDateString() : '-'}
                  </Typography>
                  <Box>
                    <Chip label="Pending" color="warning" size="small" />
                  </Box>
                  <Stack direction="row" spacing={0.5} justifyContent="center">
                    <Tooltip title="View">
                      <IconButton size="small" onClick={() => handleViewWorkbook(workbook)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="View Similarity">
                      <IconButton size="small" color="info" onClick={() => handleViewSimilarityResults(workbook)}>
                        <CompareArrowsIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Approve">
                      <IconButton size="small" color="success" onClick={() => handleApproveWorkbook(workbook)}>
                        <CheckCircleOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Reject">
                      <IconButton size="small" color="error" onClick={() => handleRejectWorkbook(workbook)}>
                        <CancelIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>
              ))}
            </Box>
          )}
        </Paper>
      )}

      {/* Recently Uploaded Section */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          <CheckCircleIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
          Recently Published ({recentUploads.length})
        </Typography>

        {recentUploads.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
            <Typography variant="body2">
              No published files yet. Publish feature files or approve CSV workbooks to see them here.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            {/* List Header */}
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: '2fr 100px 1.5fr 1fr 150px', 
              gap: 2, 
              p: 1.5, 
              bgcolor: 'success.50',
              borderBottom: '1px solid',
              borderColor: 'divider',
              fontWeight: 'bold'
            }}>
              <Typography variant="subtitle2" fontWeight="bold">Name</Typography>
              <Typography variant="subtitle2" fontWeight="bold">Type</Typography>
              <Typography variant="subtitle2" fontWeight="bold">Published</Typography>
              <Typography variant="subtitle2" fontWeight="bold">Status</Typography>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ textAlign: 'center' }}>Actions</Typography>
            </Box>
            {/* List Items */}
            {recentUploads.map((upload, index) => (
              <Box 
                key={`${upload.fileType}-${upload.id}`}
                sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: '2fr 100px 1.5fr 1fr 150px', 
                  gap: 2, 
                  p: 1.5, 
                  alignItems: 'center',
                  bgcolor: 'grey.50',
                  borderBottom: index < recentUploads.length - 1 ? '1px solid' : 'none',
                  borderColor: 'divider',
                  '&:hover': { bgcolor: 'action.hover' }
                }}
              >
                <Typography variant="body2" fontWeight="medium">
                  {upload.name}
                </Typography>
                <Box>
                  <Chip 
                    label={upload.fileType === 'feature' ? 'Feature' : 'CSV'} 
                    size="small" 
                    variant="outlined"
                    color={upload.fileType === 'feature' ? 'primary' : 'secondary'}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {new Date(upload.updated_at || upload.approved_at || upload.created_at).toLocaleDateString()}
                </Typography>
                <Box>
                  <Chip label="Published" color="success" size="small" />
                </Box>
                <Stack direction="row" spacing={0.5} justifyContent="center">
                  <Tooltip title="View">
                    <IconButton size="small" onClick={() => upload.fileType === 'feature' ? handleViewFile(upload) : handleViewWorkbook(upload)}>
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {upload.fileType === 'feature' && (
                    <Tooltip title="Restore to Draft">
                      <IconButton size="small" color="warning" onClick={() => handleRestore(upload)}>
                        <PublishIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Remove">
                    <IconButton size="small" color="error" onClick={() => upload.fileType === 'feature' ? handleDeleteUpload(upload.id) : handleDeleteWorkbook(upload)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>
            ))}
          </Box>
        )}
      </Paper>

      {/* Quick Actions Section */}
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Quick Actions
        </Typography>
        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            startIcon={<LibraryBooksIcon />}
            onClick={() => setCatalogDialogOpen(true)}
          >
            Browse Step Catalog
          </Button>
          <Button
            variant="outlined"
            startIcon={<TrendingUpIcon />}
            onClick={() => setStatsDialogOpen(true)}
          >
            View Statistics
          </Button>
        </Stack>
      </Paper>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <CircularProgress />
        </Box>
      )}
    </Box>
  );

  // ========== RENDER EDITOR ==========
  const renderEditor = () => (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Bar */}
      <Paper elevation={1} sx={{ p: 2, borderRadius: 0 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <Tooltip title="Back to Dashboard">
              <IconButton onClick={handleBackToDashboard} color="primary">
                <BackIcon />
              </IconButton>
            </Tooltip>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              size="small"
              label="File Name"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              required
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              size="small"
              label="Description"
              value={fileDescription}
              onChange={(e) => setFileDescription(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Module</InputLabel>
              <Select
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
                label="Module"
              >
                <MenuItem value="">None</MenuItem>
                {modules.map((module) => (
                  <MenuItem key={module.id} value={module.id}>
                    {module.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item>
            <Button
              variant="outlined"
              startIcon={<SaveIcon />}
              onClick={handleSaveDraft}
              disabled={loading}
            >
              Save Draft
            </Button>
          </Grid>
          <Grid item>
            {currentFile && currentFile.status === 'published' ? (
              <Button
                variant="outlined"
                color="warning"
                startIcon={<PublishIcon />}
                onClick={() => handleRestore(currentFile)}
                disabled={loading}
              >
                Restore to Draft
              </Button>
            ) : (
              <Button
                variant="contained"
                startIcon={<PublishIcon />}
                onClick={() => currentFile && handlePublish(currentFile)}
                disabled={loading || !currentFile}
              >
                Publish
              </Button>
            )}
          </Grid>
          <Grid item>
            <Tooltip title={`Switch to ${editorTheme === 'light' ? 'dark' : 'light'} mode`}>
              <IconButton onClick={handleToggleTheme} color="primary">
                {editorTheme === 'light' ? <Brightness4Icon /> : <Brightness7Icon />}
              </IconButton>
            </Tooltip>
          </Grid>
          <Grid item>
            <Tooltip title={`Word wrap: ${wordWrap ? 'ON' : 'OFF'} (click to toggle)`}>
              <IconButton 
                onClick={handleToggleWordWrap} 
                color={wordWrap ? 'primary' : 'default'}
              >
                <WrapTextIcon />
              </IconButton>
            </Tooltip>
          </Grid>
        </Grid>

        {/* Search Bar */}
        <Box sx={{ mt: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search step catalog... (Type to find reusable steps)"
            value={topSearchQuery}
            onChange={(e) => handleTopSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: topSearchQuery && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => { setTopSearchQuery(''); setTopSearchResults([]); }}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          
          {/* Search Results Dropdown */}
          {topSearchResults && topSearchResults.length > 0 && (
            <Paper elevation={3} sx={{ mt: 1, maxHeight: 300, overflow: 'auto', position: 'absolute', zIndex: 1300, width: '90%' }}>
              <List dense>
                {topSearchResults.map((step) => (
                  <ListItemButton key={step.id} onClick={() => handleInsertStep(step.step_text)}>
                    <ListItemText
                      primary={step.step_text}
                      secondary={
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
                          <Chip label={step.step_type} size="small" color={
                            step.step_type === 'Given' ? 'primary' :
                            step.step_type === 'When' ? 'secondary' : 'success'
                          } />
                          <Typography variant="caption" color="text.secondary">
                            Used: {step.usage_count || 0} times
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItemButton>
                ))}
              </List>
            </Paper>
          )}
        </Box>
      </Paper>

      {/* Editor and Sidebar */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* Monaco Editor */}
        <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <Editor
            height="100%"
            defaultLanguage="gherkin"
            theme={editorTheme === 'dark' ? 'gherkinDarkTheme' : 'gherkinLightTheme'}
            value={editorContent}
            onChange={handleEditorContentChange}
            onMount={handleEditorDidMount}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              wordWrap: wordWrap ? 'on' : 'off',
              automaticLayout: true,
            }}
          />
          
          {/* Floating "Add New Steps" Button */}
          {showNewStepBadge && detectedNewSteps.length > 0 && (
            <Tooltip title={`${detectedNewSteps.length} new step(s) detected. Click to add to catalog.`}>
              <Fab
                color="secondary"
                size="medium"
                sx={{
                  position: 'absolute',
                  bottom: 20,
                  right: catalogVisible ? 420 : 20,
                  transition: 'right 0.3s',
                }}
                onClick={() => setNewStepsDialogOpen(true)}
              >
                <Badge badgeContent={detectedNewSteps.length} color="error">
                  <AddIcon />
                </Badge>
              </Fab>
            </Tooltip>
          )}
        </Box>

        {/* Collapsible Step Catalog Sidebar */}
        <Collapse orientation="horizontal" in={catalogVisible} timeout={300}>
          <Paper
            elevation={3}
            sx={{
              width: 400,
              height: '100%',
              overflowY: 'auto',
              borderLeft: '1px solid #ddd',
              position: 'relative',
            }}
          >
            <Box sx={{ p: 2, position: 'sticky', top: 0, bgcolor: 'background.paper', zIndex: 1, borderBottom: '1px solid #ddd' }}>
              <Typography variant="h6" gutterBottom>
                Step Catalog
              </Typography>
              
              <TextField
                fullWidth
                size="small"
                placeholder="Search steps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ mb: 1 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />

              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <Chip
                  label="All"
                  onClick={() => setSelectedStepType('all')}
                  color={selectedStepType === 'all' ? 'primary' : 'default'}
                  size="small"
                />
                <Chip
                  label="Given"
                  onClick={() => setSelectedStepType('Given')}
                  color={selectedStepType === 'Given' ? 'primary' : 'default'}
                  size="small"
                />
                <Chip
                  label="When"
                  onClick={() => setSelectedStepType('When')}
                  color={selectedStepType === 'When' ? 'secondary' : 'default'}
                  size="small"
                />
                <Chip
                  label="Then"
                  onClick={() => setSelectedStepType('Then')}
                  color={selectedStepType === 'Then' ? 'success' : 'default'}
                  size="small"
                />
              </Stack>

              {stats && (
                <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Catalog Statistics
                  </Typography>
                  <Typography variant="caption">
                    Total Steps: {stats.total_steps}
                  </Typography>
                  <br />
                  <Typography variant="caption">
                    Given: {stats.by_type?.given || 0} | When: {stats.by_type?.when || 0} | Then: {stats.by_type?.then || 0}
                  </Typography>
                </Box>
              )}
            </Box>

            <List dense>
              {filteredSteps && filteredSteps.length > 0 ? (
                filteredSteps.map((step) => (
                  <ListItem 
                    key={step.id} 
                    disablePadding
                    secondaryAction={
                      <Tooltip title="Delete step from catalog">
                        <IconButton 
                          edge="end" 
                          size="small" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteStep(step.id, step.step_text);
                          }}
                          sx={{ color: 'error.main' }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    }
                  >
                    <ListItemButton onClick={() => handleInsertStep(step.step_text)}>
                      <ListItemText
                        primary={step.step_text}
                        secondary={
                          <Box>
                            <Chip label={step.step_type} size="small" sx={{ mr: 1, mt: 0.5 }} />
                            {step.tags && (
                              <Typography variant="caption" color="text.secondary">
                                {step.tags}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                ))
              ) : (
                <ListItem>
                  <ListItemText
                    primary="No steps found"
                    secondary="Try adjusting your search or load the catalog"
                  />
                </ListItem>
              )}
            </List>
          </Paper>
        </Collapse>

        {/* Toggle Sidebar Button */}
        <Fab
          size="small"
          color="primary"
          sx={{
            position: 'absolute',
            right: catalogVisible ? 410 : 10,
            top: 20,
            zIndex: 1400,
            transition: 'right 0.3s',
          }}
          onClick={() => setCatalogVisible(!catalogVisible)}
        >
          {catalogVisible ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </Fab>
      </Box>
    </Box>
  );

  // ========== VIEW MODE (READ-ONLY) ==========
  const renderViewMode = () => (
    <Box>
      {/* Header */}
      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={handleBackToDashboard} color="primary">
              <BackIcon />
            </IconButton>
            <Typography variant="h5">
              {fileName} (Read-Only)
            </Typography>
            <Chip label="Published" color="success" size="small" />
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              color="warning"
              startIcon={<PublishIcon />}
              onClick={() => currentFile && handleRestore(currentFile)}
              disabled={loading}
            >
              Restore to Draft
            </Button>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => currentFile && handleEditFile(currentFile)}
              disabled={loading}
            >
              Edit (as Draft)
            </Button>
          </Box>
        </Box>

        {/* File Info */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            <strong>Description:</strong> {fileDescription || 'No description'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Module:</strong> {modules.find(m => m.id === selectedModule)?.name || 'None'}
          </Typography>
        </Box>
      </Paper>

      {/* Read-Only Editor */}
      <Box sx={{ position: 'relative', height: 'calc(100vh - 250px)', border: '1px solid #ddd' }}>
        <Editor
          height="100%"
          language="gherkin"
          theme={editorTheme === 'dark' ? 'gherkinDarkTheme' : 'gherkinLightTheme'}
          value={editorContent}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            wordWrap: wordWrap ? 'on' : 'off',
            automaticLayout: true,
            domReadOnly: true,
            renderValidationDecorations: 'off',
          }}
        />
      </Box>
    </Box>
  );

  // ========== WORKBOOK EDITOR (Full Page DataGrid) ==========
  const renderWorkbookEditor = () => {
    const isReadOnly = currentWorkbook?.status === 'approved' || currentWorkbook?.status === 'pending_approval';
    // Count only test case rows (excluding PARAMS and DATA rows)
    const testCaseCount = workbookRows.filter(r => {
      const rowType = r.rowType || 'test_case';
      return rowType === ROW_TYPES.TEST_CASE || rowType === 'normal' || rowType === 'test_case';
    }).length;
    
    return (
      <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
        {/* Top Bar */}
        <Paper elevation={1} sx={{ p: 2, borderRadius: 0 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item>
              <Tooltip title="Back to Dashboard">
                <IconButton onClick={handleBackFromWorkbookEditor} color="primary">
                  <BackIcon />
                </IconButton>
              </Tooltip>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                size="small"
                label="Workbook Name *"
                value={workbookName}
                onChange={(e) => setWorkbookName(e.target.value)}
                required
                disabled={isReadOnly}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                size="small"
                label="Description"
                value={workbookDescription}
                onChange={(e) => setWorkbookDescription(e.target.value)}
                disabled={isReadOnly}
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <FormControl fullWidth size="small" required>
                <InputLabel>Module *</InputLabel>
                <Select
                  value={workbookModuleId}
                  onChange={(e) => setWorkbookModuleId(e.target.value)}
                  label="Module *"
                  disabled={isReadOnly}
                >
                  <MenuItem value="">Select Module</MenuItem>
                  {modules.map((module) => (
                    <MenuItem key={module.id} value={module.id}>
                      {module.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {!isReadOnly && (
              <>
                <Grid item>
                  <Button
                    variant="outlined"
                    startIcon={<SaveIcon />}
                    onClick={() => handleSaveWorkbook(false)}
                    disabled={loading}
                  >
                    Save Draft
                  </Button>
                </Grid>
                <Grid item>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<SendIcon />}
                    onClick={() => handleSaveWorkbook(true)}
                    disabled={loading || !workbookName.trim() || !workbookModuleId}
                  >
                    Save & Submit
                  </Button>
                </Grid>
              </>
            )}
            {isReadOnly && (
              <Grid item>
                <Chip 
                  label={currentWorkbook?.status === 'approved' ? 'Approved' : 'Pending Approval'} 
                  color={currentWorkbook?.status === 'approved' ? 'success' : 'warning'}
                />
              </Grid>
            )}
          </Grid>
          
          {/* Validation Summary */}
          {workbookValidation && (
            <Box sx={{ mt: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Typography variant="body2">
                  <strong>Test Cases:</strong> {testCaseCount}
                </Typography>
                {workbookValidation.errorCount > 0 && (
                  <Alert severity="warning" sx={{ py: 0 }}>
                    {workbookValidation.errorCount} validation error(s)
                  </Alert>
                )}
                {workbookValidation.errorCount === 0 && testCaseCount > 0 && (
                  <Chip label="All rows valid" color="success" size="small" icon={<CheckCircleIcon />} />
                )}
              </Stack>
            </Box>
          )}
        </Paper>

        {/* DataGrid - Full Screen */}
        <Box sx={{ flexGrow: 1, p: 2 }}>
          <TestCaseDataGrid
            rows={workbookRows}
            setRows={setWorkbookRows}
            modules={modules}
            onValidationChange={handleWorkbookValidationChange}
            readOnly={isReadOnly}
          />
        </Box>
      </Box>
    );
  };

  // ========== DIALOGS ==========
  const renderDialogs = () => (
    <>
      {/* Catalog Browser Dialog */}
      <Dialog open={catalogDialogOpen} onClose={() => setCatalogDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Step Catalog Browser</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            size="small"
            placeholder="Search steps..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Chip
              label="All"
              onClick={() => setSelectedStepType('all')}
              color={selectedStepType === 'all' ? 'primary' : 'default'}
            />
            <Chip
              label="Given"
              onClick={() => setSelectedStepType('Given')}
              color={selectedStepType === 'Given' ? 'primary' : 'default'}
            />
            <Chip
              label="When"
              onClick={() => setSelectedStepType('When')}
              color={selectedStepType === 'When' ? 'secondary' : 'default'}
            />
            <Chip
              label="Then"
              onClick={() => setSelectedStepType('Then')}
              color={selectedStepType === 'Then' ? 'success' : 'default'}
            />
          </Stack>

          <List>
            {filteredSteps && filteredSteps.length > 0 ? (
              filteredSteps.map((step) => (
                <ListItem 
                  key={step.id}
                  secondaryAction={
                    <Tooltip title="Delete from catalog">
                      <IconButton 
                        edge="end" 
                        onClick={() => handleDeleteStep(step.id, step.step_text)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  }
                >
                  <ListItemText
                    primary={step.step_text}
                    secondary={
                      <>
                        <Chip label={step.step_type} size="small" sx={{ mr: 1 }} />
                        {step.description && (
                          <Typography variant="caption" color="text.secondary">
                            {step.description}
                          </Typography>
                        )}
                        <br />
                        <Typography variant="caption" color="text.secondary">
                          Used: {step.usage_count || 0} times
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
              ))
            ) : (
              <ListItem>
                <ListItemText primary="No steps found" secondary="Try adjusting your search or filters" />
              </ListItem>
            )}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCatalogDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Stats Dialog */}
      <Dialog open={statsDialogOpen} onClose={() => setStatsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Step Catalog Statistics</DialogTitle>
        <DialogContent>
          {stats && (
            <Box>
              <Typography variant="h4" gutterBottom>
                {stats.total_steps}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Total Reusable Steps
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                Steps by Type
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={4}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h5">{stats.by_type?.given || 0}</Typography>
                    <Typography variant="caption">Given</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={4}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h5">{stats.by_type?.when || 0}</Typography>
                    <Typography variant="caption">When</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={4}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h5">{stats.by_type?.then || 0}</Typography>
                    <Typography variant="caption">Then</Typography>
                  </Paper>
                </Grid>
              </Grid>

              {stats.most_used && stats.most_used.length > 0 && (
                <>
                  <Typography variant="subtitle2" gutterBottom>
                    Most Used Steps
                  </Typography>
                  <List dense>
                    {stats.most_used.slice(0, 5).map((step, index) => (
                      <ListItem key={step.id}>
                        <ListItemText
                          primary={`${index + 1}. ${step.step_text}`}
                          secondary={`Used ${step.usage_count} times`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* New Steps Detection Dialog */}
      <Dialog open={newStepsDialogOpen} onClose={() => setNewStepsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>New Steps Detected</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            We found {detectedNewSteps?.length || 0} new step(s) in your feature file. Would you like to add them to the catalog for reuse?
          </Alert>
          
          <List>
            {detectedNewSteps && detectedNewSteps.length > 0 ? (
              detectedNewSteps.map((step, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={step.step_text}
                    secondary={
                      <Chip label={step.step_type} size="small" />
                    }
                  />
                </ListItem>
              ))
            ) : (
              <ListItem>
                <ListItemText primary="No new steps detected" />
              </ListItem>
            )}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setNewStepsDialogOpen(false);
            setShowNewStepBadge(false);
            setDetectedNewSteps([]);
          }}>
            Skip for Now
          </Button>
          <Button variant="contained" onClick={handleAddNewStepsToCatalog} disabled={loading}>
            Add {detectedNewSteps?.length || 0} Step(s) to Catalog
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Dialog */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>Confirm Action</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to proceed with this action?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={confirmAction}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Publish Preview Modal */}
      <PublishPreviewModal
        open={publishModalOpen}
        onClose={handleClosePublishModal}
        previewData={publishPreviewData}
        loading={publishPreviewLoading}
        error={publishPreviewError}
        onPublish={handleConfirmPublish}
        fileId={fileToPublish?.id}
      />

      {/* Bulk Upload Dialog */}
      <Dialog 
        open={openBulkUploadDialog} 
        onClose={() => {
          setOpenBulkUploadDialog(false);
          setUploadFile(null);
          setBulkUploadConfig({
            module_id: '',
            sub_module: '',
            feature_section: '',
            test_type: 'automated',
            tag: 'ui'
          });
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Bulk Upload Feature File</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" paragraph>
              Upload a BDD Feature file (.feature) for approval. Once approved by an admin, 
              each scenario will become a test case with auto-generated test IDs.
            </Typography>
            
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
                Approval Required
              </Typography>
              <Typography variant="body2">
                Uploaded feature files require admin approval before test cases are created.
                You can track your pending uploads in the "Sent for Approval" section below.
              </Typography>
            </Alert>
            
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                ✓ Supports Gherkin syntax (Given/When/Then)<br />
                ✓ Scenarios converted to individual test cases<br />
                ✓ Scenario Outlines with Examples supported<br />
                ✓ Steps automatically extracted<br />
                ✓ Tags added: bdd, gherkin
              </Typography>
            </Alert>

            {/* Upload Configuration */}
            <Paper sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
              <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                Configuration:
              </Typography>
              <TextField
                select
                label="Module *"
                value={bulkUploadConfig.module_id}
                onChange={(e) => handleBulkUploadConfigChange('module_id', e.target.value)}
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
                value={bulkUploadConfig.sub_module}
                onChange={(e) => handleBulkUploadConfigChange('sub_module', e.target.value)}
                fullWidth
                margin="dense"
                disabled={!bulkUploadConfig.module_id || bulkUploadSubModules.length === 0}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {bulkUploadSubModules.map((subModule, index) => (
                  <MenuItem key={index} value={subModule.name || subModule}>
                    {subModule.name || subModule}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Feature (Optional)"
                value={bulkUploadConfig.feature_section}
                onChange={(e) => handleBulkUploadConfigChange('feature_section', e.target.value)}
                fullWidth
                margin="dense"
                disabled={!bulkUploadConfig.sub_module || bulkUploadFeatures.length === 0}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {bulkUploadFeatures.map((feature, index) => (
                  <MenuItem key={index} value={feature.name || feature}>
                    {feature.name || feature}
                  </MenuItem>
                ))}
              </TextField>
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid item xs={6}>
                  <TextField
                    select
                    label="Test Type"
                    value={bulkUploadConfig.test_type}
                    onChange={(e) => handleBulkUploadConfigChange('test_type', e.target.value)}
                    fullWidth
                    margin="dense"
                  >
                    <MenuItem value="automated">Automated</MenuItem>
                    <MenuItem value="manual">Manual</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    select
                    label="Tag"
                    value={bulkUploadConfig.tag}
                    onChange={(e) => handleBulkUploadConfigChange('tag', e.target.value)}
                    fullWidth
                    margin="dense"
                  >
                    <MenuItem value="ui">UI</MenuItem>
                    <MenuItem value="api">API</MenuItem>
                    <MenuItem value="hybrid">Hybrid</MenuItem>
                  </TextField>
                </Grid>
              </Grid>
            </Paper>

            {/* Download Template Button */}
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadFeatureTemplate}
              fullWidth
              sx={{ mb: 3 }}
            >
              Download Sample Feature Template
            </Button>

            {/* File Drop Zone */}
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
              onClick={() => document.getElementById('bulk-file-upload').click()}
            >
              <input
                id="bulk-file-upload"
                type="file"
                accept=".feature"
                style={{ display: 'none' }}
                onChange={(e) => setUploadFile(e.target.files[0])}
              />
              <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                {uploadFile 
                  ? uploadFile.name 
                  : 'Click to select Feature file'
                }
              </Typography>
              <Typography variant="body2" color="text.secondary">
                or drag and drop your .feature file here
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenBulkUploadDialog(false);
            setUploadFile(null);
            setBulkUploadConfig({
              module_id: '',
              sub_module: '',
              feature_section: '',
              test_type: 'automated',
              tag: 'ui'
            });
          }}>
            Cancel
          </Button>
          <Button
            onClick={handleBulkUpload}
            variant="contained"
            disabled={!uploadFile || !bulkUploadConfig.module_id || uploadLoading}
          >
            {uploadLoading ? <CircularProgress size={24} /> : 'Upload for Approval'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* CSV Workbook Upload Dialog */}
      <CsvUploadDialog
        open={openCsvUploadDialog}
        onClose={() => setOpenCsvUploadDialog(false)}
        onSuccess={(result) => {
          setSnackbar({
            open: true,
            message: `Workbook "${result.name}" saved successfully`,
            severity: 'success'
          });
          setOpenCsvUploadDialog(false);
          loadCsvWorkbooks(); // Reload workbooks list
        }}
      />

      {/* Workbook Similarity Check Dialog (used from dashboard and editor) */}
      <SimilarityCheckDialog
        open={workbookSimilarityDialog}
        onClose={() => {
          setWorkbookSimilarityDialog(false);
          setWorkbookSimilarityResults(null);
        }}
        similarityResults={workbookSimilarityResults}
        loading={workbookSimilarityLoading}
        onConfirm={handleWorkbookSimilarityConfirm}
        testCases={workbookRows
          .map((row, idx) => ({ ...row, rowIndex: idx }))
          .filter(row => {
            const rowType = row.rowType || 'test_case';
            return rowType === 'test_case' || rowType === 'normal' || rowType === ROW_TYPES.TEST_CASE;
          })
        }
        itemName={workbookName || 'Workbook'}
      />
    </>
  );

  // ========== MAIN RENDER ==========
  const renderMainView = () => {
    switch (view) {
      case 'dashboard':
        return renderDashboard();
      case 'view':
        return renderViewMode();
      case 'editor':
        return renderEditor();
      case 'workbookEditor':
        return renderWorkbookEditor();
      default:
        return renderDashboard();
    }
  };

  return (
    <Box>
      {renderMainView()}
      {renderDialogs()}
    </Box>
  );
};

export default TestDesignStudio;
