import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  IconButton,
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Save as SaveIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import TestCaseDataGrid from './TestCaseDataGrid';
import { validateAllRows } from '../utils/csvParser';
import { modulesAPI, csvWorkbooksAPI } from '../services/api';

/**
 * NewWorkbookDialog Component
 * 
 * Modal dialog for creating a new test case workbook from scratch.
 * Users can add test cases row by row and save as draft or submit for approval.
 */
const NewWorkbookDialog = ({ open, onClose, onSuccess }) => {
  const [rows, setRows] = useState([]);
  const [modules, setModules] = useState([]);
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [workbookName, setWorkbookName] = useState('');
  const [workbookDescription, setWorkbookDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [saveResult, setSaveResult] = useState(null);
  const [validationSummary, setValidationSummary] = useState(null);

  // Fetch modules on mount
  useEffect(() => {
    const fetchModules = async () => {
      try {
        const data = await modulesAPI.getAll();
        setModules(data);
      } catch (error) {
        console.error('Failed to fetch modules:', error);
      }
    };
    if (open) {
      fetchModules();
    }
  }, [open]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setRows([]);
      setSelectedModuleId('');
      setWorkbookName('');
      setWorkbookDescription('');
      setLoading(false);
      setSaveResult(null);
      setValidationSummary(null);
    } else {
      // Initialize with one empty row when opening
      setRows([createEmptyRow(1)]);
    }
  }, [open]);

  // Create an empty row with required fields
  const createEmptyRow = (id) => ({
    id,
    rowType: 'normal',
    sub_module: '',
    jira_story: '',
    feature_section: '',
    test_id: '',
    test_case_name: '',
    priority: 'Medium',
    steps: '',
    expected_result: '',
    notes: '',
    _isNew: true,
    _errors: {},
  });

  // Handle validation changes from grid edits
  const handleValidationChange = (updatedRows) => {
    const validation = validateAllRows(updatedRows);
    setValidationSummary(validation);
    setRows(validation.validatedRows);
  };

  // Handle adding new row
  const handleAddRow = () => {
    const newId = rows.length > 0 ? Math.max(...rows.map(r => r.id)) + 1 : 1;
    const updatedRows = [...rows, createEmptyRow(newId)];
    setRows(updatedRows);
    handleValidationChange(updatedRows);
  };

  // Handle save workbook
  const handleSaveWorkbook = async (submitForApproval = false) => {
    if (!selectedModuleId || !workbookName.trim()) {
      return;
    }

    if (rows.length === 0) {
      setSaveResult({
        success: false,
        message: 'Please add at least one test case',
      });
      return;
    }

    setLoading(true);
    try {
      // Create workbook with test case rows
      const workbookData = {
        name: workbookName.trim(),
        description: workbookDescription.trim() || null,
        csv_content: JSON.stringify(rows),
        original_filename: null, // Created from scratch
        module_id: parseInt(selectedModuleId),
      };
      
      const result = await csvWorkbooksAPI.create(workbookData);
      
      // If submitForApproval is true, also submit the workbook
      if (submitForApproval && result.id) {
        await csvWorkbooksAPI.submitForApproval(result.id);
        setSaveResult({
          success: true,
          message: `Workbook "${workbookName}" created and submitted for approval`,
          submitted: true,
          details: result,
        });
      } else {
        setSaveResult({
          success: true,
          message: `Workbook "${workbookName}" saved as draft. You can edit it later or submit for approval.`,
          submitted: false,
          details: result,
        });
      }

      // Callback to parent
      if (onSuccess) {
        onSuccess(result);
      }

    } catch (error) {
      setSaveResult({
        success: false,
        message: error.response?.data?.detail || 'Failed to save workbook',
        details: error,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: { minHeight: '80vh' },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Create New Test Case Workbook</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Workbook metadata */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <TextField
            label="Workbook Name *"
            value={workbookName}
            onChange={(e) => setWorkbookName(e.target.value)}
            sx={{ flex: 2 }}
            placeholder="Enter a descriptive name"
          />
          <FormControl sx={{ flex: 1 }}>
            <InputLabel>Target Module *</InputLabel>
            <Select
              value={selectedModuleId}
              onChange={(e) => setSelectedModuleId(e.target.value)}
              label="Target Module *"
            >
              {modules.map((module) => (
                <MenuItem key={module.id} value={module.id}>
                  {module.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <TextField
          fullWidth
          multiline
          rows={2}
          label="Description"
          value={workbookDescription}
          onChange={(e) => setWorkbookDescription(e.target.value)}
          sx={{ mb: 3 }}
          placeholder="Optional description of the test cases in this workbook"
        />

        {/* Validation summary */}
        {validationSummary && rows.length > 0 && (
          <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
            <Typography variant="body2" color="textSecondary">
              {validationSummary.validCount} valid of {rows.length} rows
              {validationSummary.errorCount > 0 && (
                <span style={{ color: 'red', marginLeft: 8 }}>
                  ({validationSummary.errorCount} with errors)
                </span>
              )}
            </Typography>
          </Box>
        )}

        {/* DataGrid for test cases */}
        <Box sx={{ height: 400, mb: 2 }}>
          <TestCaseDataGrid
            rows={rows}
            setRows={setRows}
            modules={modules}
            onValidationChange={handleValidationChange}
          />
        </Box>

        {/* Add row button */}
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={handleAddRow}
          sx={{ mb: 2 }}
        >
          Add Test Case Row
        </Button>

        {/* Approval workflow info */}
        <Alert severity="info" sx={{ mt: 2 }}>
          <strong>Approval Workflow:</strong> This workbook will be saved as a draft. 
          You can submit it for approval when ready. Test cases will only be created 
          after an admin approves and publishes the workbook.
        </Alert>

        {/* Save result */}
        {saveResult && (
          <Alert 
            severity={saveResult.success ? 'success' : 'error'} 
            sx={{ mt: 2 }}
          >
            {saveResult.message}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        
        <Button
          variant="outlined"
          onClick={() => handleSaveWorkbook(false)}
          disabled={loading || !selectedModuleId || !workbookName.trim() || rows.length === 0 || saveResult?.success}
          startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
        >
          Save as Draft
        </Button>
        <Button
          variant="contained"
          onClick={() => handleSaveWorkbook(true)}
          disabled={loading || !selectedModuleId || !workbookName.trim() || rows.length === 0 || saveResult?.success}
          startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
        >
          Save & Submit for Approval
        </Button>

        {saveResult?.success && (
          <Button variant="contained" color="success" onClick={onClose}>
            Done
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default NewWorkbookDialog;
