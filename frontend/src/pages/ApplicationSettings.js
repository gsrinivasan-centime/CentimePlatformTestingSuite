import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Slider,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Button,
  Alert,
  Snackbar,
  Chip,
  Grid,
  Divider,
  CircularProgress,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Speed as SpeedIcon,
  Psychology as PsychologyIcon,
  Storage as StorageIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  CloudDownload as CloudDownloadIcon,
  SmartToy as SmartToyIcon,
  Token as TokenIcon,
  AccessTime as AccessTimeIcon,
  Cached as CachedIcon
} from '@mui/icons-material';
import api from '../services/api';

const ApplicationSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [populatingEmbeddings, setPopulatingEmbeddings] = useState(false);
  const [embeddingProgress, setEmbeddingProgress] = useState(null); // {processed, total, progress_percent, message}
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [canEdit, setCanEdit] = useState(false);  // Only super admin can edit
  const pollIntervalRef = useRef(null);
  
  // Settings state
  const [threshold, setThreshold] = useState(75);
  const [selectedModel, setSelectedModel] = useState('');
  const [supportedModels, setSupportedModels] = useState({});
  const [modelsStatus, setModelsStatus] = useState({});
  const [embeddingStats, setEmbeddingStats] = useState(null);
  
  // Smart Search / LLM settings state
  const [smartSearchSettings, setSmartSearchSettings] = useState(null);
  const [loadingSmartSearch, setLoadingSmartSearch] = useState(false);
  const [savingSmartSearch, setSavingSmartSearch] = useState(false);
  
  // Editable smart search settings
  const [minSimilarity, setMinSimilarity] = useState(50);
  const [minConfidence, setMinConfidence] = useState(50);
  const [cacheTTL, setCacheTTL] = useState(60);
  const [maxResults, setMaxResults] = useState(50);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/settings');
      
      setThreshold(response.data.similarity_threshold);
      setSelectedModel(response.data.embedding_model);
      setSupportedModels(response.data.supported_models || {});
      setModelsStatus(response.data.models_status || {});
      setEmbeddingStats(response.data.embedding_stats || null);
      setCanEdit(response.data.can_edit || false);
      
      // Fetch smart search settings for all users (read-only)
      fetchSmartSearchSettings();
    } catch (err) {
      showSnackbar('Failed to load settings: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchSmartSearchSettings = async () => {
    try {
      setLoadingSmartSearch(true);
      const response = await api.get('/search/settings');
      setSmartSearchSettings(response.data);
      
      // Populate editable fields from settings
      if (response.data?.llm_settings) {
        const settings = response.data.llm_settings;
        setMinSimilarity(Math.round((settings.min_similarity_threshold || 0.5) * 100));
        setMinConfidence(Math.round((settings.min_confidence_threshold || 0.5) * 100));
        setCacheTTL(settings.cache_ttl_seconds || 60);
        setMaxResults(settings.max_results || 50);
      }
    } catch (err) {
      console.error('Failed to load smart search settings:', err);
      // Don't show error for non-super-admins
    } finally {
      setLoadingSmartSearch(false);
    }
  };
  
  const saveSmartSearchSettings = async () => {
    try {
      setSavingSmartSearch(true);
      await api.put('/search/settings', {
        min_similarity_threshold: minSimilarity / 100,
        min_confidence_threshold: minConfidence / 100,
        cache_ttl_seconds: cacheTTL,
        max_results: maxResults
      });
      showSnackbar('Smart search settings saved successfully!', 'success');
      // Refresh settings to confirm
      fetchSmartSearchSettings();
    } catch (err) {
      showSnackbar('Failed to save smart search settings: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setSavingSmartSearch(false);
    }
  };

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      
      const response = await api.put('/settings', {
        similarity_threshold: threshold,
        embedding_model: selectedModel
      });
      
      showSnackbar('Settings saved successfully!', 'success');
      
      if (response.data.warnings) {
        setTimeout(() => {
          showSnackbar(response.data.warnings.join(' '), 'warning');
        }, 1500);
      }
      
      fetchSettings();
    } catch (err) {
      showSnackbar('Failed to save settings: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePopulateEmbeddings = async (regenerateAll = false) => {
    try {
      setPopulatingEmbeddings(true);
      
      const response = await api.post('/settings/populate-embeddings', {
        regenerate_all: regenerateAll
      });
      
      const data = response.data;
      
      if (data.status === 'started') {
        showSnackbar(`Started processing ${data.total} test cases. Progress will be shown below.`, 'info');
        // Start polling for status
        startStatusPolling();
      } else if (data.status === 'already_running') {
        showSnackbar(data.message, 'warning');
        // Resume polling
        startStatusPolling();
      } else if (data.status === 'completed') {
        showSnackbar(data.message, 'success');
        setPopulatingEmbeddings(false);
        fetchSettings();
      }
    } catch (err) {
      showSnackbar('Failed to populate embeddings: ' + (err.response?.data?.detail || err.message), 'error');
      setPopulatingEmbeddings(false);
    }
  };

  const startStatusPolling = () => {
    // Clear any existing interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    
    // Poll every 2 seconds
    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await api.get('/settings/embedding-population-status');
        const status = response.data;
        
        setEmbeddingProgress(status);
        
        if (!status.is_running) {
          // Processing complete
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
          setPopulatingEmbeddings(false);
          showSnackbar(status.message || 'Embedding population completed', 'success');
          fetchSettings();
        }
      } catch (err) {
        console.error('Failed to poll embedding status:', err);
      }
    }, 2000);
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Check if there's already a running task on mount
  useEffect(() => {
    const checkRunningTask = async () => {
      try {
        const response = await api.get('/settings/embedding-population-status');
        const status = response.data;
        if (status.is_running) {
          setPopulatingEmbeddings(true);
          setEmbeddingProgress(status);
          startStatusPolling();
        }
      } catch (err) {
        // Ignore - endpoint may not exist or not authenticated yet
      }
    };
    
    if (!loading) {
      checkRunningTask();
    }
  }, [loading]);

  const getModelStatusChip = (modelName) => {
    const status = modelsStatus[modelName];
    if (!status) return null;
    
    const statusConfig = {
      loaded: { color: 'success', label: 'Active', icon: <CheckCircleIcon fontSize="small" /> },
      downloaded: { color: 'info', label: 'Ready', icon: <CloudDownloadIcon fontSize="small" /> },
      loading: { color: 'warning', label: 'Loading...', icon: <CircularProgress size={14} /> },
      not_downloaded: { color: 'default', label: 'Not Downloaded', icon: null },
      error: { color: 'error', label: 'Error', icon: <WarningIcon fontSize="small" /> }
    };
    
    const config = statusConfig[status.status] || statusConfig.not_downloaded;
    
    return (
      <Chip
        icon={config.icon}
        label={config.label}
        color={config.color}
        size="small"
        variant={status.status === 'loaded' ? 'filled' : 'outlined'}
      />
    );
  };

  const thresholdMarks = [
    { value: 0, label: '0%' },
    { value: 25, label: '25%' },
    { value: 50, label: '50%' },
    { value: 75, label: '75%' },
    { value: 100, label: '100%' }
  ];

  const getThresholdColor = (value) => {
    if (value < 50) return 'success';
    if (value < 75) return 'warning';
    return 'error';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: 2 }}>
        <CircularProgress size={48} />
        <Typography variant="body1" color="text.secondary">Loading settings...</Typography>
      </Box>
    );
  }

  const embeddingCoverage = embeddingStats 
    ? Math.round((embeddingStats.with_embeddings / embeddingStats.total_test_cases) * 100) || 0
    : 0;

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <SettingsIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" fontWeight="bold">Application Settings</Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Configure similarity analysis and embedding settings for test case duplicate detection
        </Typography>
        {!canEdit && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <strong>View Only Mode</strong> - Only the super administrator can modify these settings.
          </Alert>
        )}
      </Box>

      <Grid container spacing={3}>
        {/* Similarity Settings Card */}
        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ height: '100%' }}>
            <CardHeader
              avatar={<SpeedIcon color="primary" />}
              title="Similarity Settings"
              titleTypographyProps={{ variant: 'h6', fontWeight: 'bold' }}
            />
            <Divider />
            <CardContent>
              {/* Threshold Slider */}
              <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight="medium">
                    Similarity Threshold
                  </Typography>
                  <Chip 
                    label={`${threshold}%`} 
                    color={getThresholdColor(threshold)}
                    size="medium"
                    sx={{ fontWeight: 'bold', minWidth: 60 }}
                  />
                </Box>
                
                <Slider
                  value={threshold}
                  onChange={(e, val) => setThreshold(val)}
                  min={0}
                  max={100}
                  marks={thresholdMarks}
                  valueLabelDisplay="auto"
                  disabled={!canEdit}
                  sx={{
                    '& .MuiSlider-thumb': {
                      width: 24,
                      height: 24,
                    },
                    '& .MuiSlider-track': {
                      height: 8,
                    },
                    '& .MuiSlider-rail': {
                      height: 8,
                    }
                  }}
                />
                
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Test cases with similarity above this threshold will be flagged as potential duplicates 
                  during publish preview.
                </Typography>
              </Box>

              {/* Model Selection */}
              <Box>
                <Typography variant="subtitle1" fontWeight="medium" sx={{ mb: 2 }}>
                  Embedding Model
                </Typography>
                
                <FormControl component="fieldset" fullWidth disabled={!canEdit}>
                  <RadioGroup
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                  >
                    {Object.entries(supportedModels).map(([modelName, config]) => (
                      <Paper
                        key={modelName}
                        elevation={selectedModel === modelName ? 3 : 1}
                        sx={{
                          p: 2,
                          mb: 2,
                          cursor: canEdit ? 'pointer' : 'default',
                          border: selectedModel === modelName ? 2 : 1,
                          borderColor: selectedModel === modelName ? 'primary.main' : 'divider',
                          borderRadius: 2,
                          transition: 'all 0.2s ease',
                          opacity: canEdit ? 1 : 0.7,
                          '&:hover': canEdit ? {
                            borderColor: 'primary.light',
                            boxShadow: 2
                          } : {}
                        }}
                        onClick={() => canEdit && setSelectedModel(modelName)}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <FormControlLabel
                            value={modelName}
                            control={<Radio />}
                            label={
                              <Box>
                                <Typography variant="subtitle2" fontWeight="bold">
                                  {config.display_name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {config.description}
                                </Typography>
                              </Box>
                            }
                            sx={{ m: 0, flexGrow: 1 }}
                          />
                          {getModelStatusChip(modelName)}
                        </Box>
                      </Paper>
                    ))}
                  </RadioGroup>
                </FormControl>
              </Box>

              {/* Save Button */}
              {canEdit && (
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                  onClick={handleSaveSettings}
                  disabled={saving}
                  sx={{ mt: 3 }}
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </Button>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Embedding Statistics Card */}
        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ height: '100%' }}>
            <CardHeader
              avatar={<StorageIcon color="primary" />}
              title="Embedding Statistics"
              titleTypographyProps={{ variant: 'h6', fontWeight: 'bold' }}
              action={
                <Tooltip title="Refresh statistics">
                  <IconButton onClick={fetchSettings}>
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              }
            />
            <Divider />
            <CardContent>
              {embeddingStats && (
                <>
                  {/* Coverage Progress */}
                  <Box sx={{ mb: 4 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle2">Embedding Coverage</Typography>
                      <Typography variant="subtitle2" fontWeight="bold" color="primary">
                        {embeddingCoverage}%
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={embeddingCoverage} 
                      sx={{ 
                        height: 10, 
                        borderRadius: 5,
                        backgroundColor: 'grey.200',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 5
                        }
                      }} 
                    />
                  </Box>

                  {/* Stats Grid */}
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={4}>
                      <Paper 
                        elevation={0} 
                        sx={{ 
                          p: 2, 
                          textAlign: 'center', 
                          bgcolor: 'primary.50', 
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'primary.100'
                        }}
                      >
                        <Typography variant="h4" fontWeight="bold" color="primary.main">
                          {embeddingStats.total_test_cases}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">Total</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={4}>
                      <Paper 
                        elevation={0} 
                        sx={{ 
                          p: 2, 
                          textAlign: 'center', 
                          bgcolor: 'success.50', 
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'success.100'
                        }}
                      >
                        <Typography variant="h4" fontWeight="bold" color="success.main">
                          {embeddingStats.with_embeddings}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">With Embeddings</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={4}>
                      <Paper 
                        elevation={0} 
                        sx={{ 
                          p: 2, 
                          textAlign: 'center', 
                          bgcolor: 'warning.50', 
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'warning.100'
                        }}
                      >
                        <Typography variant="h4" fontWeight="bold" color="warning.main">
                          {embeddingStats.without_embeddings}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">Missing</Typography>
                      </Paper>
                    </Grid>
                  </Grid>

                  {/* Embeddings by Model Table */}
                  {Object.keys(embeddingStats.by_model || {}).length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>Embeddings by Model</Typography>
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ bgcolor: 'grey.50' }}>
                              <TableCell>Model</TableCell>
                              <TableCell align="right">Count</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {Object.entries(embeddingStats.by_model).map(([model, count]) => (
                              <TableRow key={model}>
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {model}
                                    {model === selectedModel && (
                                      <Chip label="Current" size="small" color="primary" />
                                    )}
                                  </Box>
                                </TableCell>
                                <TableCell align="right">{count}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}

                  {/* Warning for mismatched */}
                  {embeddingStats.mismatched_count > 0 && (
                    <Alert severity="warning" sx={{ mb: 3 }}>
                      <strong>{embeddingStats.mismatched_count}</strong> test cases have embeddings 
                      from a different model. Regenerate for consistent results.
                    </Alert>
                  )}

                  {/* Action Buttons - Only visible to super admin */}
                  {canEdit && (
                    <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column' }}>
                      {(embeddingStats.without_embeddings > 0 || embeddingStats.mismatched_count > 0) && (
                        <Button
                          variant="outlined"
                          color="primary"
                          startIcon={populatingEmbeddings ? <CircularProgress size={20} /> : <PsychologyIcon />}
                          onClick={() => handlePopulateEmbeddings(false)}
                          disabled={populatingEmbeddings}
                          fullWidth
                        >
                          {populatingEmbeddings 
                            ? 'Generating...' 
                            : `Generate Missing (${embeddingStats.without_embeddings + embeddingStats.mismatched_count})`
                          }
                        </Button>
                      )}
                      
                      <Button
                        variant="outlined"
                        color="warning"
                        startIcon={populatingEmbeddings ? <CircularProgress size={20} /> : <RefreshIcon />}
                        onClick={() => handlePopulateEmbeddings(true)}
                        disabled={populatingEmbeddings}
                        fullWidth
                      >
                        {populatingEmbeddings 
                          ? 'Regenerating...' 
                          : `Regenerate All (${embeddingStats.total_test_cases})`
                        }
                      </Button>

                      {/* Progress Display */}
                      {populatingEmbeddings && embeddingProgress && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {embeddingProgress.message || 'Processing embeddings...'}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ flex: 1 }}>
                              <LinearProgress 
                                variant="determinate" 
                                value={embeddingProgress.progress_percent || 0} 
                                sx={{ height: 8, borderRadius: 4 }}
                              />
                            </Box>
                            <Typography variant="body2" fontWeight="bold">
                              {Math.round(embeddingProgress.progress_percent || 0)}%
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            {embeddingProgress.processed || 0} / {embeddingProgress.total || 0} processed
                            {embeddingProgress.errors > 0 && (
                              <span style={{ color: 'red', marginLeft: 8 }}>
                                ({embeddingProgress.errors} errors)
                              </span>
                            )}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Smart Search / LLM Settings - Read-only for all users */}
        <Grid item xs={12}>
          <Card elevation={3}>
            <CardHeader
              avatar={<SmartToyIcon color="primary" />}
              title="Smart Search Settings"
              titleTypographyProps={{ variant: 'h6', fontWeight: 'bold' }}
              subheader={smartSearchSettings?.can_edit ? "LLM configuration and token usage statistics" : "LLM configuration and token usage statistics (read-only)"}
              action={
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {smartSearchSettings?.can_edit && (
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={savingSmartSearch ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                      onClick={saveSmartSearchSettings}
                      disabled={savingSmartSearch || loadingSmartSearch}
                    >
                      {savingSmartSearch ? 'Saving...' : 'Save'}
                    </Button>
                  )}
                  <IconButton onClick={fetchSmartSearchSettings} disabled={loadingSmartSearch}>
                    <RefreshIcon />
                  </IconButton>
                </Box>
              }
            />
              <Divider />
              <CardContent>
                {loadingSmartSearch ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : smartSearchSettings ? (
                  <Grid container spacing={3}>
                    {/* LLM Configuration */}
                    <Grid item xs={12} md={4}>
                      <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                          <PsychologyIcon color="primary" />
                          <Typography variant="subtitle1" fontWeight="bold">
                            LLM Configuration
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">Model</Typography>
                            <Chip 
                              label={smartSearchSettings.llm_settings?.model_name || 'N/A'} 
                              size="small" 
                              color="primary"
                            />
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">Temperature</Typography>
                            <Typography variant="body2" fontWeight="medium">
                              {smartSearchSettings.llm_settings?.temperature}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">Max Output Tokens</Typography>
                            <Typography variant="body2" fontWeight="medium">
                              {smartSearchSettings.llm_settings?.max_output_tokens}
                            </Typography>
                          </Box>
                          
                          {/* Editable Settings for Super Admin */}
                          {smartSearchSettings?.can_edit ? (
                            <>
                              <Divider sx={{ my: 1 }} />
                              <Typography variant="caption" color="primary" fontWeight="bold">
                                Configurable Settings
                              </Typography>
                              
                              <Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Typography variant="body2" color="text.secondary">
                                    Min Similarity
                                  </Typography>
                                  <Chip label={`${minSimilarity}%`} size="small" color="secondary" />
                                </Box>
                                <Slider
                                  value={minSimilarity}
                                  onChange={(e, val) => setMinSimilarity(val)}
                                  min={10}
                                  max={90}
                                  step={5}
                                  marks={[
                                    { value: 10, label: '10%' },
                                    { value: 50, label: '50%' },
                                    { value: 90, label: '90%' }
                                  ]}
                                  valueLabelDisplay="auto"
                                  size="small"
                                />
                                <Typography variant="caption" color="text.secondary">
                                  Minimum semantic similarity score for search results
                                </Typography>
                              </Box>
                              
                              <Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Typography variant="body2" color="text.secondary">
                                    Min Confidence
                                  </Typography>
                                  <Chip label={`${minConfidence}%`} size="small" color="secondary" />
                                </Box>
                                <Slider
                                  value={minConfidence}
                                  onChange={(e, val) => setMinConfidence(val)}
                                  min={10}
                                  max={90}
                                  step={5}
                                  marks={[
                                    { value: 10, label: '10%' },
                                    { value: 50, label: '50%' },
                                    { value: 90, label: '90%' }
                                  ]}
                                  valueLabelDisplay="auto"
                                  size="small"
                                />
                                <Typography variant="caption" color="text.secondary">
                                  Minimum LLM confidence to proceed with navigation
                                </Typography>
                              </Box>
                              
                              <Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Typography variant="body2" color="text.secondary">
                                    Cache TTL
                                  </Typography>
                                  <Chip label={`${cacheTTL}s`} size="small" color="info" />
                                </Box>
                                <Slider
                                  value={cacheTTL}
                                  onChange={(e, val) => setCacheTTL(val)}
                                  min={30}
                                  max={3600}
                                  step={30}
                                  marks={[
                                    { value: 60, label: '1m' },
                                    { value: 300, label: '5m' },
                                    { value: 900, label: '15m' },
                                    { value: 1800, label: '30m' },
                                    { value: 3600, label: '1h' }
                                  ]}
                                  valueLabelDisplay="auto"
                                  valueLabelFormat={(v) => v >= 60 ? `${Math.floor(v/60)}m ${v%60}s` : `${v}s`}
                                  size="small"
                                />
                                <Typography variant="caption" color="text.secondary">
                                  How long to cache LLM responses (30s - 1 hour)
                                </Typography>
                              </Box>
                              
                              <Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Typography variant="body2" color="text.secondary">
                                    Max Results
                                  </Typography>
                                  <Chip label={maxResults} size="small" color="info" />
                                </Box>
                                <Slider
                                  value={maxResults}
                                  onChange={(e, val) => setMaxResults(val)}
                                  min={10}
                                  max={200}
                                  step={10}
                                  marks={[
                                    { value: 10, label: '10' },
                                    { value: 50, label: '50' },
                                    { value: 100, label: '100' },
                                    { value: 200, label: '200' }
                                  ]}
                                  valueLabelDisplay="auto"
                                  size="small"
                                />
                                <Typography variant="caption" color="text.secondary">
                                  Maximum number of results to return from search
                                </Typography>
                              </Box>
                            </>
                          ) : (
                            <>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="text.secondary">Cache TTL</Typography>
                                <Typography variant="body2" fontWeight="medium">
                                  {smartSearchSettings.llm_settings?.cache_ttl_seconds}s
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="text.secondary">Min Similarity</Typography>
                                <Typography variant="body2" fontWeight="medium">
                                  {((smartSearchSettings.llm_settings?.min_similarity_threshold || 0.5) * 100).toFixed(0)}%
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="text.secondary">Confidence Threshold</Typography>
                                <Typography variant="body2" fontWeight="medium">
                                  {(smartSearchSettings.llm_settings?.min_confidence_threshold * 100).toFixed(0)}%
                                </Typography>
                              </Box>
                            </>
                          )}
                        </Box>
                      </Paper>
                    </Grid>

                    {/* Token Usage Statistics */}
                    <Grid item xs={12} md={8}>
                      <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                          <TokenIcon color="primary" />
                          <Typography variant="subtitle1" fontWeight="bold">
                            Token Usage Statistics
                          </Typography>
                        </Box>
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ bgcolor: 'grey.50' }}>
                                <TableCell>Period</TableCell>
                                <TableCell align="right">Queries</TableCell>
                                <TableCell align="right">Input Tokens</TableCell>
                                <TableCell align="right">Output Tokens</TableCell>
                                <TableCell align="right">Total Tokens</TableCell>
                                <TableCell align="right">Cache Rate</TableCell>
                                <TableCell align="right">Avg Response</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {['usage_today', 'usage_week', 'usage_month'].map((period) => {
                                const usage = smartSearchSettings[period];
                                if (!usage) return null;
                                const periodLabel = period === 'usage_today' ? 'Today' : 
                                                   period === 'usage_week' ? 'This Week' : 'This Month';
                                return (
                                  <TableRow key={period} hover>
                                    <TableCell>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <AccessTimeIcon fontSize="small" color="action" />
                                        {periodLabel}
                                      </Box>
                                    </TableCell>
                                    <TableCell align="right">
                                      <Chip 
                                        label={usage.total_queries.toLocaleString()} 
                                        size="small" 
                                        color="primary" 
                                        variant="outlined"
                                      />
                                    </TableCell>
                                    <TableCell align="right">
                                      {usage.total_input_tokens.toLocaleString()}
                                    </TableCell>
                                    <TableCell align="right">
                                      {usage.total_output_tokens.toLocaleString()}
                                    </TableCell>
                                    <TableCell align="right">
                                      <Typography fontWeight="medium">
                                        {usage.total_tokens.toLocaleString()}
                                      </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                      <Chip 
                                        icon={<CachedIcon fontSize="small" />}
                                        label={`${usage.cache_hit_rate.toFixed(1)}%`} 
                                        size="small" 
                                        color={usage.cache_hit_rate > 30 ? 'success' : 'default'}
                                        variant="outlined"
                                      />
                                    </TableCell>
                                    <TableCell align="right">
                                      {usage.avg_response_time_ms.toFixed(0)}ms
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </TableContainer>
                        
                        {/* Summary Stats */}
                        <Grid container spacing={2} sx={{ mt: 2 }}>
                          <Grid item xs={6} md={3}>
                            <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'primary.50', borderRadius: 1 }}>
                              <Typography variant="h5" color="primary.main" fontWeight="bold">
                                {smartSearchSettings.usage_today?.total_queries || 0}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Queries Today
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={6} md={3}>
                            <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'success.50', borderRadius: 1 }}>
                              <Typography variant="h5" color="success.main" fontWeight="bold">
                                {((smartSearchSettings.usage_today?.total_tokens || 0) / 1000).toFixed(1)}K
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Tokens Today
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={6} md={3}>
                            <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'info.50', borderRadius: 1 }}>
                              <Typography variant="h5" color="info.main" fontWeight="bold">
                                {((smartSearchSettings.usage_month?.total_tokens || 0) / 1000).toFixed(1)}K
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Tokens This Month
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={6} md={3}>
                            <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'warning.50', borderRadius: 1 }}>
                              <Typography variant="h5" color="warning.main" fontWeight="bold">
                                {smartSearchSettings.usage_today?.avg_tokens_per_query?.toFixed(0) || 0}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Avg Tokens/Query
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>
                      </Paper>
                    </Grid>
                  </Grid>
                ) : (
                  <Alert severity="info">
                    Smart search settings could not be loaded. Click refresh to try again.
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>

        {/* Help Section */}
        <Grid item xs={12}>
          <Accordion elevation={2}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <InfoIcon color="primary" />
                <Typography variant="h6">How Similarity Analysis Works</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={4}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Process Overview
                  </Typography>
                  <Typography variant="body2" paragraph>
                    When you preview or publish a feature file, the system analyzes each scenario 
                    and compares it against existing test cases to identify potential duplicates.
                  </Typography>
                  <Box component="ul" sx={{ pl: 2, '& li': { mb: 1 } }}>
                    <li>
                      <Typography variant="body2">
                        <strong>Step 1:</strong> Scenarios are converted to vector embeddings using AI models
                      </Typography>
                    </li>
                    <li>
                      <Typography variant="body2">
                        <strong>Step 2:</strong> Cosine similarity is calculated against existing test case embeddings
                      </Typography>
                    </li>
                    <li>
                      <Typography variant="body2">
                        <strong>Step 3:</strong> Matches above the threshold are flagged as potential duplicates
                      </Typography>
                    </li>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Model Comparison
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                          <TableCell>Model</TableCell>
                          <TableCell>Speed</TableCell>
                          <TableCell>Accuracy</TableCell>
                          <TableCell>Best For</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <TableRow>
                          <TableCell>MiniLM-L6-v2</TableCell>
                          <TableCell>
                            <Chip label="Fast" size="small" color="success" />
                          </TableCell>
                          <TableCell>Good</TableCell>
                          <TableCell>General use</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>BGE-small-en</TableCell>
                          <TableCell>Moderate</TableCell>
                          <TableCell>
                            <Chip label="Better" size="small" color="primary" />
                          </TableCell>
                          <TableCell>Higher accuracy</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>
      </Grid>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          variant="filled"
          elevation={6}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ApplicationSettings;
