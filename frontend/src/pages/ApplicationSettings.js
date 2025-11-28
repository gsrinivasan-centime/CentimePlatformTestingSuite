import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
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
  CloudDownload as CloudDownloadIcon
} from '@mui/icons-material';
import api from '../services/api';

const ApplicationSettings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [populatingEmbeddings, setPopulatingEmbeddings] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [canEdit, setCanEdit] = useState(false);  // Only super admin can edit
  
  // Settings state
  const [threshold, setThreshold] = useState(75);
  const [selectedModel, setSelectedModel] = useState('');
  const [supportedModels, setSupportedModels] = useState({});
  const [modelsStatus, setModelsStatus] = useState({});
  const [embeddingStats, setEmbeddingStats] = useState(null);
  
  // Check if user is admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

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
    } catch (err) {
      showSnackbar('Failed to load settings: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setLoading(false);
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
      
      showSnackbar(response.data.message, 'success');
      fetchSettings();
    } catch (err) {
      showSnackbar('Failed to populate embeddings: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setPopulatingEmbeddings(false);
    }
  };

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
                    </Box>
                  )}
                </>
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
