import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon
} from '@mui/icons-material';
import api from '../../services/api';
import { addTestCasesToRelease } from '../../services/releaseManagementApi';

const ManageTestCasesDialog = ({ open, onClose, releaseId, onSuccess }) => {
  const [modules, setModules] = useState([]);
  const [testCases, setTestCases] = useState([]);
  const [selectedModule, setSelectedModule] = useState('');
  const [selectedSubModule, setSelectedSubModule] = useState('');
  const [selectedFeature, setSelectedFeature] = useState('');
  const [selectedTestCases, setSelectedTestCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedModules, setExpandedModules] = useState({});

  useEffect(() => {
    if (open) {
      fetchModules();
      fetchTestCases();
    }
  }, [open]);

  const fetchModules = async () => {
    try {
      const response = await api.get('/modules');
      setModules(response.data);
    } catch (err) {
      console.error('Error fetching modules:', err);
      setError('Failed to load modules');
    }
  };

  const fetchTestCases = async () => {
    try {
      setLoading(true);
      const response = await api.get('/test-cases');
      setTestCases(response.data);
    } catch (err) {
      console.error('Error fetching test cases:', err);
      setError('Failed to load test cases');
    } finally {
      setLoading(false);
    }
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
    
    if (selectedModule) {
      filtered = filtered.filter(tc => tc.module_id === parseInt(selectedModule));
    }
    
    if (selectedSubModule) {
      filtered = filtered.filter(tc => tc.sub_module === selectedSubModule);
    }
    
    if (selectedFeature) {
      filtered = filtered.filter(tc => tc.feature_section === selectedFeature);
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

  const handleAddTestCases = async () => {
    if (selectedTestCases.length === 0) {
      setError('Please select at least one test case');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await addTestCasesToRelease(releaseId, selectedTestCases);
      onSuccess();
      handleClose();
    } catch (err) {
      console.error('Error adding test cases:', err);
      setError(err.response?.data?.detail || 'Failed to add test cases to release');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedTestCases([]);
    setSelectedModule('');
    setSelectedSubModule('');
    setSelectedFeature('');
    setError('');
    onClose();
  };

  const groupedTestCases = groupTestCasesByModule();
  const subModules = selectedModule 
    ? [...new Set(testCases
        .filter(tc => tc.module_id === parseInt(selectedModule))
        .map(tc => tc.sub_module)
        .filter(Boolean))]
    : [];

  const features = selectedModule
    ? [...new Set(testCases
        .filter(tc => tc.module_id === parseInt(selectedModule))
        .filter(tc => !selectedSubModule || tc.sub_module === selectedSubModule)
        .map(tc => tc.feature_section)
        .filter(Boolean))]
    : [];

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        Add Test Cases to Release
        <Typography variant="body2" color="text.secondary">
          Select test cases to include in this release
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 3, mt: 1 }}>
          {/* Filters */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Filter by Module</InputLabel>
              <Select
                value={selectedModule}
                label="Filter by Module"
                onChange={(e) => {
                  setSelectedModule(e.target.value);
                  setSelectedSubModule('');
                  setSelectedFeature('');
                }}
              >
                <MenuItem value="">All Modules</MenuItem>
                {modules.map(module => (
                  <MenuItem key={module.id} value={module.id}>{module.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {subModules.length > 0 && (
              <FormControl fullWidth>
                <InputLabel>Filter by Sub-Module</InputLabel>
                <Select
                  value={selectedSubModule}
                  label="Filter by Sub-Module"
                  onChange={(e) => {
                    setSelectedSubModule(e.target.value);
                    setSelectedFeature('');
                  }}
                >
                  <MenuItem value="">All Sub-Modules</MenuItem>
                  {subModules.map(sm => (
                    <MenuItem key={sm} value={sm}>{sm}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {features.length > 0 && (
              <FormControl fullWidth>
                <InputLabel>Filter by Feature</InputLabel>
                <Select
                  value={selectedFeature}
                  label="Filter by Feature"
                  onChange={(e) => setSelectedFeature(e.target.value)}
                >
                  <MenuItem value="">All Features</MenuItem>
                  {features.map(feature => (
                    <MenuItem key={feature} value={feature}>{feature}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

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
              {Object.keys(groupedTestCases).length === 0 ? (
                <Alert severity="info">No test cases found. Please create test cases first.</Alert>
              ) : (
                Object.values(groupedTestCases).map(({ module, testCases: moduleTestCases }) => (
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
        <Button onClick={handleClose}>Cancel</Button>
        <Button 
          onClick={handleAddTestCases} 
          variant="contained" 
          color="primary"
          disabled={loading || selectedTestCases.length === 0}
          startIcon={<AddIcon />}
        >
          Add {selectedTestCases.length > 0 ? `${selectedTestCases.length} ` : ''}Test Case(s)
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ManageTestCasesDialog;
