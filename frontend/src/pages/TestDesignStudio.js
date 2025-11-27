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
  Collapse,
  Fab,
  Badge,
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
} from '@mui/icons-material';
import { stepCatalogAPI, featureFilesAPI, modulesAPI } from '../services/api';
import PublishPreviewModal from '../components/PublishPreviewModal';

const MAX_FILES_PER_USER = 5;

const TestDesignStudio = () => {
  // View state
  const [view, setView] = useState('dashboard'); // 'dashboard' or 'editor'
  
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
      
      const uploads = await featureFilesAPI.getAll({ status: 'published' });
      setRecentUploads(Array.isArray(uploads) ? uploads : []);
    } catch (error) {
      console.error('Error loading files:', error);
      setFeatureFiles([]);
      setRecentUploads([]);
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

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Dashboard actions
  const handleStartNew = () => {
    if (featureFiles.length >= MAX_FILES_PER_USER) {
      showSnackbar(`Maximum ${MAX_FILES_PER_USER} files allowed. Please delete or publish existing files.`, 'warning');
      return;
    }
    
    setCurrentFile(null);
    setFileName('');
    setFileDescription('');
    setSelectedModule('');
    setEditorContent('Feature: New Feature\n  As a user\n  I want to\n  So that\n\n  Scenario: Sample Scenario\n    Given \n    When \n    Then ');
    setView('editor');
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
      // Publish the file with scenario types
      const response = await featureFilesAPI.publish(fileToPublish.id, scenarioTypes);
      
      const testCasesCreated = response.test_cases_created || 0;
      if (testCasesCreated > 0) {
        showSnackbar(
          `File published successfully! Created ${testCasesCreated} test case(s).`,
          'success'
        );
      } else {
        showSnackbar('File published, but no test cases were created.', 'warning');
      }
      
      // Close modal and refresh
      setPublishModalOpen(false);
      setFileToPublish(null);
      setPublishPreviewData(null);
      await loadFeatureFiles();
    } catch (error) {
      console.error('Error publishing file:', error);
      showSnackbar(
        error.response?.data?.detail || 'Error publishing file',
        'error'
      );
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
        Create and manage your BDD feature files with reusable step catalog
      </Typography>

      {/* My Feature Files Section */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            My Feature Files ({featureFiles.length}/{MAX_FILES_PER_USER})
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleStartNew}
            disabled={featureFiles.length >= MAX_FILES_PER_USER || loading}
          >
            Start New Design
          </Button>
        </Box>

        {featureFiles.length >= MAX_FILES_PER_USER && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Maximum {MAX_FILES_PER_USER} files reached. Please delete or publish existing files to create new ones.
          </Alert>
        )}

        {featureFiles.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
            <DescriptionIcon sx={{ fontSize: 80, opacity: 0.3, mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No feature files yet
            </Typography>
            <Typography variant="body2" sx={{ mb: 3 }}>
              Start creating your first BDD scenario with reusable steps
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleStartNew}
              disabled={loading}
            >
              Create Your First Feature File
            </Button>
          </Box>
        ) : (
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            {/* List Header */}
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: '2fr 1.5fr 1fr 1fr 200px', 
              gap: 2, 
              p: 1.5, 
              bgcolor: 'grey.100',
              borderBottom: '1px solid',
              borderColor: 'divider',
              fontWeight: 'bold'
            }}>
              <Typography variant="subtitle2" fontWeight="bold">Name</Typography>
              <Typography variant="subtitle2" fontWeight="bold">Description</Typography>
              <Typography variant="subtitle2" fontWeight="bold">Module</Typography>
              <Typography variant="subtitle2" fontWeight="bold">Status</Typography>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ textAlign: 'center' }}>Actions</Typography>
            </Box>
            {/* List Items */}
            {featureFiles.map((file, index) => (
              <Box 
                key={file.id}
                sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: '2fr 1.5fr 1fr 1fr 200px', 
                  gap: 2, 
                  p: 1.5, 
                  alignItems: 'center',
                  borderBottom: index < featureFiles.length - 1 ? '1px solid' : 'none',
                  borderColor: 'divider',
                  '&:hover': { bgcolor: 'action.hover' }
                }}
              >
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
          </Box>
        )}
      </Paper>

      {/* Recently Uploaded Section */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          <CheckCircleIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
          Recently Uploaded ({recentUploads.length})
        </Typography>

        {recentUploads.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
            <Typography variant="body2">
              No published files yet. Publish feature files to see them here.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            {/* List Header */}
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: '2fr 1.5fr 1fr 150px', 
              gap: 2, 
              p: 1.5, 
              bgcolor: 'success.50',
              borderBottom: '1px solid',
              borderColor: 'divider',
              fontWeight: 'bold'
            }}>
              <Typography variant="subtitle2" fontWeight="bold">Name</Typography>
              <Typography variant="subtitle2" fontWeight="bold">Uploaded</Typography>
              <Typography variant="subtitle2" fontWeight="bold">Status</Typography>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ textAlign: 'center' }}>Actions</Typography>
            </Box>
            {/* List Items */}
            {recentUploads.map((upload, index) => (
              <Box 
                key={upload.id}
                sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: '2fr 1.5fr 1fr 150px', 
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
                <Typography variant="body2" color="text.secondary">
                  {new Date(upload.updated_at || upload.created_at).toLocaleDateString()}
                </Typography>
                <Box>
                  <Chip label="Published" color="success" size="small" />
                </Box>
                <Stack direction="row" spacing={0.5} justifyContent="center">
                  <Tooltip title="View">
                    <IconButton size="small" onClick={() => handleViewFile(upload)}>
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Restore to Draft">
                    <IconButton size="small" color="warning" onClick={() => handleRestore(upload)}>
                      <PublishIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Remove">
                    <IconButton size="small" color="error" onClick={() => handleDeleteUpload(upload.id)}>
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
      />
    </>
  );

  // ========== MAIN RENDER ==========
  return (
    <Box>
      {view === 'dashboard' ? renderDashboard() : view === 'view' ? renderViewMode() : renderEditor()}
      {renderDialogs()}
    </Box>
  );
};

export default TestDesignStudio;
