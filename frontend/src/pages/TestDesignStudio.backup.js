import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
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
  Badge,
  Card,
  CardContent,
  Divider,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  Stack,
} from '@mui/material';
import {
  Save as SaveIcon,
  FolderOpen as OpenIcon,
  Add as AddIcon,
  Search as SearchIcon,
  Code as CodeIcon,
  Description as DescriptionIcon,
  TrendingUp as TrendingUpIcon,
  FilterList as FilterIcon,
  ContentCopy as CopyIcon,
  Download as DownloadIcon,
  Publish as PublishIcon,
} from '@mui/icons-material';
import { stepCatalogAPI, featureFilesAPI, modulesAPI } from '../services/api';

const STEP_TYPES = ['Given', 'When', 'Then', 'And', 'But'];

const DEFAULT_FEATURE_TEMPLATE = `Feature: [Feature Name]
  As a [role]
  I want [feature]
  So that [benefit]

  Background:
    Given [common precondition]
  
  Scenario: [Scenario Name]
    Given [initial context]
    When [event occurs]
    Then [outcome]
    And [another outcome]

  Scenario Outline: [Parameterized Scenario]
    Given I have "<item>"
    When I "<action>" it
    Then I should see "<result>"
    
    Examples:
      | item    | action | result  |
      | invoice | create | success |
      | payment | process| success |
`;

const TestDesignStudio = () => {
  // State Management
  const [editorContent, setEditorContent] = useState(DEFAULT_FEATURE_TEMPLATE);
  const [catalogDrawerOpen, setCatalogDrawerOpen] = useState(true);
  const [steps, setSteps] = useState([]);
  const [filteredSteps, setFilteredSteps] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStepType, setSelectedStepType] = useState('all');
  const [stats, setStats] = useState(null);
  const [featureFiles, setFeatureFiles] = useState([]);
  const [currentFile, setCurrentFile] = useState(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [fileNameInput, setFileNameInput] = useState('');
  const [fileDescription, setFileDescription] = useState('');
  const [selectedModule, setSelectedModule] = useState('');
  const [modules, setModules] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState(false);
  const [addStepDialogOpen, setAddStepDialogOpen] = useState(false);
  const [newStep, setNewStep] = useState({
    step_type: 'Given',
    step_text: '',
    step_pattern: '',
    description: '',
    tags: '',
  });
  
  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  // Fetch initial data
  useEffect(() => {
    fetchSteps();
    fetchStats();
    fetchFeatureFiles();
    fetchModules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter steps based on search and type
  useEffect(() => {
    let filtered = steps;
    
    if (selectedStepType !== 'all') {
      filtered = filtered.filter(step => step.step_type === selectedStepType);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(step => 
        step.step_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (step.description && step.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    setFilteredSteps(filtered);
  }, [steps, searchQuery, selectedStepType]);

  const fetchSteps = async () => {
    try {
      const data = await stepCatalogAPI.getAll({ sort_by: 'usage_count', order: 'desc' });
      setSteps(data);
    } catch (error) {
      showSnackbar('Error fetching steps', 'error');
    }
  };

  const fetchStats = async () => {
    try {
      const data = await stepCatalogAPI.getStats();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchFeatureFiles = async () => {
    try {
      const data = await featureFilesAPI.getAll();
      setFeatureFiles(data);
    } catch (error) {
      showSnackbar('Error fetching feature files', 'error');
    }
  };

  const fetchModules = async () => {
    try {
      const data = await modulesAPI.getAll();
      setModules(data);
    } catch (error) {
      console.error('Error fetching modules:', error);
    }
  };

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    // Configure Gherkin language
    monaco.languages.register({ id: 'gherkin' });
    
    // Set Gherkin syntax highlighting
    monaco.languages.setMonarchTokensProvider('gherkin', {
      keywords: [
        'Feature', 'Background', 'Scenario', 'Scenario Outline', 'Examples',
        'Given', 'When', 'Then', 'And', 'But', 'Rule'
      ],
      tokenizer: {
        root: [
          [/@?[a-zA-Z][\w$]*/, {
            cases: {
              '@keywords': 'keyword',
              '@default': 'identifier'
            }
          }],
          [/".*?"/, 'string'],
          [/'.*?'/, 'string'],
          [/<.*?>/, 'variable'],
          [/#.*$/, 'comment'],
          [/\|/, 'delimiter'],
        ]
      }
    });
    
    // Set theme
    monaco.editor.defineTheme('gherkinTheme', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '0000FF', fontStyle: 'bold' },
        { token: 'string', foreground: '008000' },
        { token: 'variable', foreground: 'FF0000' },
        { token: 'comment', foreground: '808080', fontStyle: 'italic' },
      ],
      colors: {
        'editor.foreground': '#000000',
      }
    });
    
    monaco.editor.setTheme('gherkinTheme');
    
    // Register autocomplete provider
    monaco.languages.registerCompletionItemProvider('gherkin', {
      provideCompletionItems: async (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        };
        
        const lineContent = model.getLineContent(position.lineNumber).trim();
        const stepType = lineContent.split(' ')[0];
        
        if (['Given', 'When', 'Then', 'And', 'But'].includes(stepType)) {
          try {
            const suggestions = await stepCatalogAPI.searchSuggestions(word.word || 'a', stepType, 20);
            
            return {
              suggestions: suggestions.map(step => ({
                label: step.step_text,
                kind: monaco.languages.CompletionItemKind.Snippet,
                detail: `${step.step_type} - Used ${step.usage_count} times`,
                documentation: step.description || '',
                insertText: step.step_text,
                range: range
              }))
            };
          } catch (error) {
            console.error('Autocomplete error:', error);
            return { suggestions: [] };
          }
        }
        
        return { suggestions: [] };
      }
    });
  };

  const insertStepAtCursor = (stepText) => {
    if (editorRef.current) {
      const editor = editorRef.current;
      const selection = editor.getSelection();
      const id = { major: 1, minor: 1 };
      const text = `    ${stepText}\n`;
      const op = { identifier: id, range: selection, text: text, forceMoveMarkers: true };
      editor.executeEdits('insert-step', [op]);
      editor.focus();
      
      showSnackbar('Step inserted!', 'success');
    }
  };

  const handleSaveFile = async () => {
    if (!fileNameInput.trim()) {
      showSnackbar('Please enter a file name', 'warning');
      return;
    }
    
    setLoading(true);
    try {
      const data = {
        name: fileNameInput,
        content: editorContent,
        description: fileDescription,
        module_id: selectedModule || null,
        status: 'draft'
      };
      
      if (currentFile) {
        await featureFilesAPI.update(currentFile.id, data);
        showSnackbar('Feature file updated successfully!', 'success');
      } else {
        const newFile = await featureFilesAPI.create(data);
        setCurrentFile(newFile);
        showSnackbar('Feature file saved successfully!', 'success');
      }
      
      fetchFeatureFiles();
      setSaveDialogOpen(false);
      setFileNameInput('');
      setFileDescription('');
    } catch (error) {
      showSnackbar('Error saving file: ' + (error.response?.data?.detail || error.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadFile = async (file) => {
    setEditorContent(file.content);
    setCurrentFile(file);
    setLoadDialogOpen(false);
    showSnackbar(`Loaded: ${file.name}`, 'success');
  };

  const handlePublishFile = async () => {
    if (!currentFile) {
      showSnackbar('Please save the file first', 'warning');
      return;
    }
    
    try {
      await featureFilesAPI.publish(currentFile.id);
      showSnackbar('Feature file published!', 'success');
      fetchFeatureFiles();
      setCurrentFile({ ...currentFile, status: 'published' });
    } catch (error) {
      showSnackbar('Error publishing file', 'error');
    }
  };

  const handleDownload = () => {
    const blob = new Blob([editorContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentFile?.name || 'feature-file'}.feature`;
    link.click();
    URL.revokeObjectURL(url);
    showSnackbar('Feature file downloaded!', 'success');
  };

  const handleAddStep = async () => {
    if (!newStep.step_text.trim()) {
      showSnackbar('Please enter step text', 'warning');
      return;
    }
    
    setLoading(true);
    try {
      await stepCatalogAPI.create(newStep);
      showSnackbar('Step added to catalog!', 'success');
      fetchSteps();
      setAddStepDialogOpen(false);
      setNewStep({
        step_type: 'Given',
        step_text: '',
        step_pattern: '',
        description: '',
        tags: '',
      });
    } catch (error) {
      showSnackbar('Error adding step', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const getStepTypeColor = (type) => {
    switch (type) {
      case 'Given': return 'primary';
      case 'When': return 'warning';
      case 'Then': return 'success';
      case 'And': return 'info';
      case 'But': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 100px)' }}>
      {/* Step Catalog Sidebar */}
      <Drawer
        variant="persistent"
        anchor="right"
        open={catalogDrawerOpen}
        sx={{
          width: 400,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 400,
            position: 'relative',
            height: '100%',
            boxSizing: 'border-box',
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CodeIcon color="primary" />
              Step Catalog
            </Typography>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setAddStepDialogOpen(true)}
              variant="contained"
            >
              Add Step
            </Button>
          </Box>
          
          {/* Statistics Cards */}
          {stats && (
            <Grid container spacing={1} sx={{ mb: 2 }}>
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="caption" color="text.secondary">Total Steps</Typography>
                    <Typography variant="h4">{stats.total_steps}</Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <Chip label={`Given: ${stats.by_type.given}`} size="small" color="primary" />
                      <Chip label={`When: ${stats.by_type.when}`} size="small" color="warning" />
                      <Chip label={`Then: ${stats.by_type.then}`} size="small" color="success" />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
          
          {/* Search and Filter */}
          <TextField
            fullWidth
            size="small"
            placeholder="Search steps..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 1 }}
          />
          
          <Box sx={{ display: 'flex', gap: 0.5, mb: 2, flexWrap: 'wrap' }}>
            <Chip
              label="All"
              size="small"
              color={selectedStepType === 'all' ? 'primary' : 'default'}
              onClick={() => setSelectedStepType('all')}
            />
            {STEP_TYPES.map(type => (
              <Chip
                key={type}
                label={type}
                size="small"
                color={selectedStepType === type ? getStepTypeColor(type) : 'default'}
                onClick={() => setSelectedStepType(type)}
              />
            ))}
          </Box>
          
          <Divider sx={{ mb: 1 }} />
          
          {/* Steps List */}
          <List sx={{ maxHeight: 'calc(100vh - 450px)', overflow: 'auto' }}>
            {filteredSteps.map((step) => (
              <ListItem
                key={step.id}
                disablePadding
                secondaryAction={
                  <Tooltip title="Insert">
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={() => insertStepAtCursor(step.step_text)}
                    >
                      <CopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                }
              >
                <ListItemButton onClick={() => insertStepAtCursor(step.step_text)}>
                  <ListItemText
                    primary={
                      <Box>
                        <Chip
                          label={step.step_type}
                          size="small"
                          color={getStepTypeColor(step.step_type)}
                          sx={{ mr: 1, mb: 0.5 }}
                        />
                        <Typography variant="body2" component="span">
                          {step.step_text}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 0.5 }}>
                        {step.description && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {step.description}
                          </Typography>
                        )}
                        <Badge badgeContent={step.usage_count} color="primary" sx={{ mr: 2 }}>
                          <TrendingUpIcon fontSize="small" color="action" />
                        </Badge>
                      </Box>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Main Editor Area */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Toolbar */}
        <Paper elevation={1} sx={{ p: 1.5, mb: 1, borderRadius: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                Test Design Studio
              </Typography>
              {currentFile && (
                <Chip
                  label={currentFile.name}
                  color="primary"
                  size="small"
                  icon={<DescriptionIcon />}
                />
              )}
              {currentFile?.status === 'published' && (
                <Chip label="Published" color="success" size="small" />
              )}
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                startIcon={<OpenIcon />}
                onClick={() => setLoadDialogOpen(true)}
                variant="outlined"
                size="small"
              >
                Load
              </Button>
              <Button
                startIcon={<SaveIcon />}
                onClick={() => setSaveDialogOpen(true)}
                variant="outlined"
                size="small"
              >
                Save
              </Button>
              {currentFile && currentFile.status === 'draft' && (
                <Button
                  startIcon={<PublishIcon />}
                  onClick={handlePublishFile}
                  variant="contained"
                  color="success"
                  size="small"
                >
                  Publish
                </Button>
              )}
              <Button
                startIcon={<DownloadIcon />}
                onClick={handleDownload}
                variant="outlined"
                size="small"
              >
                Export .feature
              </Button>
              <Tooltip title="Toggle Catalog">
                <IconButton
                  onClick={() => setCatalogDrawerOpen(!catalogDrawerOpen)}
                  color={catalogDrawerOpen ? 'primary' : 'default'}
                >
                  <FilterIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Paper>

        {/* Editor */}
        <Paper elevation={2} sx={{ flexGrow: 1, overflow: 'hidden' }}>
          <Editor
            height="100%"
            language="gherkin"
            value={editorContent}
            onChange={(value) => setEditorContent(value || '')}
            onMount={handleEditorDidMount}
            theme="vs"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              wordWrap: 'on',
              automaticLayout: true,
              suggestOnTriggerCharacters: true,
              quickSuggestions: true,
              tabSize: 2,
            }}
          />
        </Paper>
      </Box>

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Save Feature File</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="File Name"
              value={fileNameInput}
              onChange={(e) => setFileNameInput(e.target.value)}
              fullWidth
              placeholder="e.g., invoice-creation.feature"
              helperText="Enter a descriptive name for your feature file"
            />
            <TextField
              label="Description"
              value={fileDescription}
              onChange={(e) => setFileDescription(e.target.value)}
              fullWidth
              multiline
              rows={2}
              placeholder="Brief description of what this feature tests"
            />
            <FormControl fullWidth>
              <InputLabel>Module (Optional)</InputLabel>
              <Select
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
                label="Module (Optional)"
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {modules.map(module => (
                  <MenuItem key={module.id} value={module.id}>{module.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSaveFile}
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
          >
            {currentFile ? 'Update' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Load Dialog */}
      <Dialog open={loadDialogOpen} onClose={() => setLoadDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Load Feature File</DialogTitle>
        <DialogContent>
          <List>
            {featureFiles.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                No saved feature files found. Create your first one!
              </Typography>
            ) : (
              featureFiles.map(file => (
                <ListItem
                  key={file.id}
                  button
                  onClick={() => handleLoadFile(file)}
                  divider
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <DescriptionIcon fontSize="small" color="primary" />
                        <Typography variant="body1">{file.name}</Typography>
                        <Chip
                          label={file.status}
                          size="small"
                          color={file.status === 'published' ? 'success' : 'default'}
                        />
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography variant="caption" display="block">
                          {file.description || 'No description'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Updated: {new Date(file.updated_at).toLocaleDateString()}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
              ))
            )}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLoadDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Add Step Dialog */}
      <Dialog open={addStepDialogOpen} onClose={() => setAddStepDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Step to Catalog</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Step Type</InputLabel>
              <Select
                value={newStep.step_type}
                onChange={(e) => setNewStep({ ...newStep, step_type: e.target.value })}
                label="Step Type"
              >
                {STEP_TYPES.map(type => (
                  <MenuItem key={type} value={type}>{type}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Step Text"
              value={newStep.step_text}
              onChange={(e) => setNewStep({ ...newStep, step_text: e.target.value })}
              fullWidth
              required
              placeholder="e.g., I am logged in as an admin"
            />
            <TextField
              label="Step Pattern (Optional)"
              value={newStep.step_pattern}
              onChange={(e) => setNewStep({ ...newStep, step_pattern: e.target.value })}
              fullWidth
              placeholder="e.g., I am logged in as a {role}"
              helperText="Use {parameter} for parameterized steps"
            />
            <TextField
              label="Description"
              value={newStep.description}
              onChange={(e) => setNewStep({ ...newStep, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
              placeholder="What does this step do?"
            />
            <TextField
              label="Tags (comma-separated)"
              value={newStep.tags}
              onChange={(e) => setNewStep({ ...newStep, tags: e.target.value })}
              fullWidth
              placeholder="e.g., authentication, login, user"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddStepDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleAddStep}
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
          >
            Add Step
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TestDesignStudio;
