import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Alert,
  Collapse,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Card,
  CardContent,
  Grid,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  SubdirectoryArrowRight as FeatureIcon
} from '@mui/icons-material';
import api from '../services/api';
import { testCasesAPI, subModulesAPI, featuresAPI } from '../services/api';
import { useToast } from '../context/ToastContext';

const Modules = () => {
  const { showSuccess, showError } = useToast();
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentModule, setCurrentModule] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [error, setError] = useState('');
  
  // NEW: Sub-module management
  const [hierarchyData, setHierarchyData] = useState({});
  const [expandedModules, setExpandedModules] = useState({});
  const [expandedSubModules, setExpandedSubModules] = useState({});
  const [subModuleDialogOpen, setSubModuleDialogOpen] = useState(false);
  const [currentSubModule, setCurrentSubModule] = useState(null);
  const [subModuleFormData, setSubModuleFormData] = useState({
    name: '',
    description: ''
  });
  
  // NEW: Feature management
  const [featureDialogOpen, setFeatureDialogOpen] = useState(false);
  const [currentFeature, setCurrentFeature] = useState(null);
  const [featureFormData, setFeatureFormData] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    fetchModules();
    fetchHierarchyData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchModules = async () => {
    setLoading(true);
    try {
      const response = await api.get('/modules');
      setModules(response.data);
    } catch (error) {
      console.error('Error fetching modules:', error);
      setError('Failed to fetch modules');
    } finally {
      setLoading(false);
    }
  };
  
  // NEW: Fetch hierarchy data (sub-modules and features)
  const fetchHierarchyData = async () => {
    try {
      const response = await testCasesAPI.getHierarchyStructure();
      setHierarchyData(response);
    } catch (error) {
      console.error('Error fetching hierarchy data:', error);
    }
  };
  
  // NEW: Toggle module expansion
  const handleToggleModule = (moduleId) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };
  
  // NEW: Open sub-module dialog
  const handleOpenSubModuleDialog = (module, subModule = null) => {
    setCurrentModule(module);
    if (subModule) {
      setCurrentSubModule(subModule);
      setSubModuleFormData({
        name: subModule.name,
        description: subModule.description || ''
      });
    } else {
      setCurrentSubModule(null);
      setSubModuleFormData({
        name: '',
        description: ''
      });
    }
    setSubModuleDialogOpen(true);
  };
  
  // NEW: Close sub-module dialog
  const handleCloseSubModuleDialog = () => {
    setSubModuleDialogOpen(false);
    setCurrentModule(null);
    setCurrentSubModule(null);
    setSubModuleFormData({ name: '', description: '' });
  };
  
  // NEW: Handle sub-module form change
  const handleSubModuleChange = (e) => {
    setSubModuleFormData({
      ...subModuleFormData,
      [e.target.name]: e.target.value
    });
  };
  
  // NEW: Save sub-module using proper sub-modules API
  const handleSaveSubModule = async () => {
    if (!subModuleFormData.name.trim()) {
      setError('Sub-module name is required');
      return;
    }

    try {
      if (currentSubModule) {
        // Update existing sub-module
        await subModulesAPI.update(currentSubModule.id, {
          name: subModuleFormData.name,
          description: subModuleFormData.description
        });
        showSuccess('Sub-module updated successfully');
      } else {
        // Create new sub-module
        await subModulesAPI.create({
          name: subModuleFormData.name,
          description: subModuleFormData.description,
          module_id: currentModule.id
        });
        showSuccess('Sub-module created successfully');
      }
      
      // Refresh data
      await fetchHierarchyData();
      handleCloseSubModuleDialog();
      setError('');
    } catch (error) {
      console.error('Error saving sub-module:', error);
      // Error will be handled by global error handler
    }
  };
  
  // NEW: Toggle sub-module expansion to show features
  const handleToggleSubModule = (moduleId, subModuleName) => {
    const key = `${moduleId}_${subModuleName}`;
    setExpandedSubModules(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };
  
  // NEW: Open feature dialog
  const handleOpenFeatureDialog = (module, subModuleData, subModuleName, feature = null) => {
    setCurrentModule(module);
    setCurrentSubModule({ id: subModuleData.id, name: subModuleName });
    if (feature) {
      setCurrentFeature(feature);
      setFeatureFormData({
        name: feature,
        description: ''
      });
    } else {
      setCurrentFeature(null);
      setFeatureFormData({
        name: '',
        description: ''
      });
    }
    setFeatureDialogOpen(true);
  };
  
  // NEW: Close feature dialog
  const handleCloseFeatureDialog = () => {
    setFeatureDialogOpen(false);
    setCurrentModule(null);
    setCurrentSubModule(null);
    setCurrentFeature(null);
    setFeatureFormData({ name: '', description: '' });
  };
  
  // NEW: Handle feature form change
  const handleFeatureChange = (e) => {
    setFeatureFormData({
      ...featureFormData,
      [e.target.name]: e.target.value
    });
  };
  
  // NEW: Save feature (using dedicated features table)
  const handleSaveFeature = async () => {
    if (!featureFormData.name.trim()) {
      setError('Feature name is required');
      return;
    }

    try {
      // Create feature using the new features API
      const featureData = {
        name: featureFormData.name,
        description: featureFormData.description || '',
        sub_module_id: currentSubModule.id
      };
      
      await featuresAPI.create(featureData);
      
      // Refresh data
      await fetchHierarchyData();
      handleCloseFeatureDialog();
      showSuccess('Feature created successfully');
      setError('');
    } catch (error) {
      console.error('Error saving feature:', error);
      setError(error.response?.data?.detail || 'Failed to save feature');
    }
  };

  const handleOpenDialog = (module = null) => {
    if (module) {
      setEditMode(true);
      setCurrentModule(module);
      setFormData({
        name: module.name,
        description: module.description || ''
      });
    } else {
      setEditMode(false);
      setCurrentModule(null);
      setFormData({
        name: '',
        description: ''
      });
    }
    setDialogOpen(true);
    setError('');
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditMode(false);
    setCurrentModule(null);
    setFormData({ name: '', description: '' });
    setError('');
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError('Module name is required');
      return;
    }

    try {
      if (editMode) {
        await api.put(`/modules/${currentModule.id}`, formData);
        showSuccess('Module updated successfully');
      } else {
        await api.post('/modules', formData);
        showSuccess('Module created successfully');
      }
      
      fetchModules();
      handleCloseDialog();
      setError('');
    } catch (error) {
      console.error('Error saving module:', error);
      // Error will be handled by global error handler
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this module? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/modules/${id}`);
      showSuccess('Module deleted successfully');
      fetchModules();
    } catch (error) {
      console.error('Error deleting module:', error);
      // Error will be handled by global error handler
    }
  };

  // NEW: Delete sub-module
  const handleDeleteSubModule = async (subModuleId, subModuleName) => {
    if (!window.confirm(`Are you sure you want to delete the sub-module "${subModuleName}"? Test cases referencing this sub-module will not be affected.`)) {
      return;
    }

    try {
      await subModulesAPI.delete(subModuleId);
      showSuccess('Sub-module deleted successfully');
      await fetchHierarchyData();
    } catch (error) {
      console.error('Error deleting sub-module:', error);
      // Error will be handled by global error handler
    }
  };

  // NEW: Delete feature (removes feature from features table and updates test cases)
  const handleDeleteFeature = async (featureId, featureName) => {
    if (!window.confirm(`Are you sure you want to delete the feature "${featureName}"?`)) {
      return;
    }

    try {
      if (featureId) {
        // Delete from features table if it has an ID
        await featuresAPI.delete(featureId);
        showSuccess('Feature deleted successfully');
      } else {
        // Legacy feature without ID - show error
        showError('Cannot delete legacy feature. Please contact administrator.');
      }
      
      // Refresh the hierarchy data
      await fetchHierarchyData();
    } catch (error) {
      // Error will be handled by global error handler
      console.error('Error deleting feature:', error);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Modules Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Module
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {modules.map((module) => {
          const moduleHierarchy = hierarchyData[module.name] || {};
          const subModules = moduleHierarchy.sub_modules || {};
          const subModuleCount = Object.keys(subModules).length;
          const isExpanded = expandedModules[module.id];
          
          return (
            <Grid item xs={12} key={module.id}>
              <Card>
                <CardContent>
                  {/* Module Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 2, 
                        flex: 1,
                        cursor: subModuleCount > 0 ? 'pointer' : 'default',
                        '&:hover': subModuleCount > 0 ? {
                          backgroundColor: 'action.hover',
                          borderRadius: 1,
                        } : {},
                        p: 1,
                        ml: -1,
                      }}
                      onClick={() => subModuleCount > 0 && handleToggleModule(module.id)}
                    >
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleModule(module.id);
                        }}
                        disabled={subModuleCount === 0}
                      >
                        {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {isExpanded ? <FolderOpenIcon color="primary" /> : <FolderIcon color="primary" />}
                          <Typography variant="h6" component="div">
                            {module.name}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {module.description || 'No description'}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                          <Chip
                            label={`${subModuleCount} Sub-Modules`}
                            size="small"
                            color="secondary"
                            variant="outlined"
                          />
                          <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
                            Created: {module.created_at ? new Date(module.created_at).toLocaleDateString() : 'N/A'}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                    
                    {/* Module Actions */}
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenSubModuleDialog(module);
                        }}
                      >
                        Add Sub-Module
                      </Button>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDialog(module);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(module.id);
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                  
                  {/* Sub-Modules List */}
                  <Collapse in={isExpanded}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                      Sub-Modules:
                    </Typography>
                    {subModuleCount > 0 ? (
                      <List dense>
                        {Object.entries(subModules).map(([subModuleName, subModuleData]) => {
                          const featureCount = subModuleData.features ? subModuleData.features.length : 0;
                          const subModuleKey = `${module.id}_${subModuleName}`;
                          const isSubModuleExpanded = expandedSubModules[subModuleKey];
                          
                          return (
                            <Box key={subModuleName} sx={{ mb: 2 }}>
                              <ListItem
                                sx={{
                                  border: '1px solid',
                                  borderColor: 'divider',
                                  borderRadius: 1,
                                  bgcolor: 'background.default',
                                  cursor: featureCount > 0 ? 'pointer' : 'default',
                                  '&:hover': featureCount > 0 ? {
                                    backgroundColor: 'action.hover',
                                  } : {},
                                }}
                                onClick={() => featureCount > 0 && handleToggleSubModule(module.id, subModuleName)}
                              >
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleSubModule(module.id, subModuleName);
                                  }}
                                  disabled={featureCount === 0}
                                  sx={{ mr: 1 }}
                                >
                                  {isSubModuleExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                </IconButton>
                                <ListItemText
                                  primary={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Typography variant="body1" fontWeight="medium">
                                        {subModuleName}
                                      </Typography>
                                      <Chip
                                        label={`${featureCount} Features`}
                                        size="small"
                                        color="info"
                                        variant="outlined"
                                      />
                                    </Box>
                                  }
                                />
                                <ListItemSecondaryAction>
                                  <Button
                                    size="small"
                                    startIcon={<AddIcon />}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenFeatureDialog(module, subModuleData, subModuleName);
                                    }}
                                    sx={{ mr: 1 }}
                                  >
                                    Add Feature
                                  </Button>
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenSubModuleDialog(module, { name: subModuleName, id: subModuleData.id });
                                    }}
                                    sx={{ mr: 0.5 }}
                                  >
                                    <EditIcon />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteSubModule(subModuleData.id, subModuleName);
                                    }}
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </ListItemSecondaryAction>
                              </ListItem>
                              
                              {/* Features List (Collapsible) */}
                              <Collapse in={isSubModuleExpanded}>
                                {featureCount > 0 && (
                                  <List dense sx={{ pl: 6, mt: 1 }}>
                                    {subModuleData.features.map((feature) => {
                                      // Handle both object format (new) and string format (legacy)
                                      const featureName = typeof feature === 'string' ? feature : feature.name;
                                      const featureId = typeof feature === 'object' ? feature.id : null;
                                      
                                      return (
                                        <ListItem
                                          key={featureId || featureName}
                                          sx={{
                                            border: '1px solid',
                                            borderColor: 'grey.300',
                                            borderRadius: 1,
                                            mb: 0.5,
                                            bgcolor: 'grey.50'
                                          }}
                                        >
                                          <FeatureIcon sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} />
                                          <ListItemText
                                            primary={
                                              <Typography variant="body2">
                                                {featureName}
                                              </Typography>
                                            }
                                          />
                                          <ListItemSecondaryAction>
                                            <IconButton
                                              size="small"
                                              color="primary"
                                              onClick={() => handleOpenFeatureDialog(module, subModuleData, subModuleName, featureName)}
                                              sx={{ mr: 0.5 }}
                                            >
                                              <EditIcon />
                                            </IconButton>
                                            <IconButton
                                              size="small"
                                              color="error"
                                              onClick={() => handleDeleteFeature(featureId, featureName)}
                                            >
                                              <DeleteIcon />
                                            </IconButton>
                                          </ListItemSecondaryAction>
                                        </ListItem>
                                      );
                                    })}
                                  </List>
                                )}
                              </Collapse>
                            </Box>
                          );
                        })}
                      </List>
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                        No sub-modules yet. Click "Add Sub-Module" to create one.
                      </Typography>
                    )}
                  </Collapse>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
        
        {modules.length === 0 && !loading && (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No modules found. Click "Add Module" to create one.
              </Typography>
            </Paper>
          </Grid>
        )}
        </Grid>
      )}

      {/* Add/Edit Module Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editMode ? 'Edit Module' : 'Add New Module'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <TextField
              fullWidth
              label="Module Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              sx={{ mb: 2 }}
              autoFocus
            />
            <TextField
              fullWidth
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              multiline
              rows={4}
              placeholder="Enter module description..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {editMode ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Add/Edit Sub-Module Dialog */}
      <Dialog open={subModuleDialogOpen} onClose={handleCloseSubModuleDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {currentSubModule ? 'Edit Sub-Module' : `Add Sub-Module to ${currentModule?.name || ''}`}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                {error}
              </Alert>
            )}
            <Alert severity="info" sx={{ mb: 2 }}>
              Sub-modules help organize test cases within a module (e.g., "Suppliers", "Invoices", "Payments")
            </Alert>
            <TextField
              fullWidth
              label="Sub-Module Name"
              name="name"
              value={subModuleFormData.name}
              onChange={handleSubModuleChange}
              required
              sx={{ mb: 2 }}
              autoFocus
              placeholder="e.g., Suppliers, Invoices, Customers"
              helperText="Use a descriptive name for the functional area"
            />
            <TextField
              fullWidth
              label="Description (Optional)"
              name="description"
              value={subModuleFormData.description}
              onChange={handleSubModuleChange}
              multiline
              rows={3}
              placeholder="Describe what this sub-module covers..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSubModuleDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveSubModule} disabled={!subModuleFormData.name.trim()}>
            {currentSubModule ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Add/Edit Feature Dialog */}
      <Dialog open={featureDialogOpen} onClose={handleCloseFeatureDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {currentFeature 
            ? 'Edit Feature' 
            : `Add Feature to ${currentSubModule?.name || ''} in ${currentModule?.name || ''}`
          }
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                {error}
              </Alert>
            )}
            <Alert severity="info" sx={{ mb: 2 }}>
              Features represent specific functionality within a sub-module (e.g., "Supplier Profile", "List View", "Create Form")
            </Alert>
            <TextField
              fullWidth
              label="Feature Name"
              name="name"
              value={featureFormData.name}
              onChange={handleFeatureChange}
              required
              sx={{ mb: 2 }}
              autoFocus
              placeholder="e.g., Supplier Profile, List View, Create Form"
              helperText="Use a descriptive name for the specific feature"
            />
            <TextField
              fullWidth
              label="Description (Optional)"
              name="description"
              value={featureFormData.description}
              onChange={handleFeatureChange}
              multiline
              rows={3}
              placeholder="Describe what this feature does..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseFeatureDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveFeature} disabled={!featureFormData.name.trim()}>
            {currentFeature ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Modules;
