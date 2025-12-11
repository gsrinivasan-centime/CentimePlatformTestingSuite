import React, { useState, useCallback, useEffect } from 'react';
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
  Stepper,
  Step,
  StepLabel,
  Paper,
  Divider,
  Chip,
  IconButton,
  TextField,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Close as CloseIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  InsertDriveFile as FileIcon,
  Send as SendIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import TestCaseDataGrid from './TestCaseDataGrid';
import SimilarityCheckDialog from './SimilarityCheckDialog';
import { parseCSV, validateAllRows, generateTemplate, ROW_TYPES } from '../utils/csvParser';
import { modulesAPI, csvWorkbooksAPI } from '../services/api';

const steps = ['Upload CSV', 'Review & Edit', 'Save Workbook'];

/**
 * CsvUploadDialog Component
 * 
 * Modal dialog for uploading, reviewing, and saving test cases from CSV as a workbook.
 * Workbooks go through approval workflow before test cases are created.
 */
const CsvUploadDialog = ({ open, onClose, onSuccess }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [modules, setModules] = useState([]);
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [workbookName, setWorkbookName] = useState('');
  const [workbookDescription, setWorkbookDescription] = useState('');
  const [parseError, setParseError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saveResult, setSaveResult] = useState(null);
  const [validationSummary, setValidationSummary] = useState(null);
  
  // Similarity check states
  const [showSimilarityDialog, setShowSimilarityDialog] = useState(false);
  const [similarityLoading, setSimilarityLoading] = useState(false);
  const [similarityResults, setSimilarityResults] = useState(null);
  const [savedWorkbookId, setSavedWorkbookId] = useState(null);

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
      setActiveStep(0);
      setFile(null);
      setRows([]);
      setSelectedModuleId('');
      setWorkbookName('');
      setWorkbookDescription('');
      setParseError(null);
      setLoading(false);
      setSaveResult(null);
      setValidationSummary(null);
      // Reset similarity states
      setShowSimilarityDialog(false);
      setSimilarityLoading(false);
      setSimilarityResults(null);
      setSavedWorkbookId(null);
    }
  }, [open]);

  // File drop handler
  const onDrop = useCallback((acceptedFiles) => {
    const csvFile = acceptedFiles[0];
    if (!csvFile) return;

    setFile(csvFile);
    setParseError(null);
    
    // Set default workbook name from filename
    const filename = csvFile.name.replace(/\.csv$/i, '');
    setWorkbookName(filename);

    // Read and parse CSV
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const parsedRows = parseCSV(content);
        setRows(parsedRows);
        
        // Validate and show summary
        const validation = validateAllRows(parsedRows);
        setValidationSummary(validation);
        setRows(validation.validatedRows);
        
      } catch (error) {
        setParseError(error.message);
        setRows([]);
      }
    };
    reader.readAsText(csvFile);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
  });

  // Handle validation changes from grid edits
  const handleValidationChange = useCallback((updatedRows) => {
    const validation = validateAllRows(updatedRows);
    setValidationSummary(validation);
    setRows(validation.validatedRows);
  }, []);

  // Handle step navigation
  const handleNext = () => {
    if (activeStep === 0 && rows.length > 0) {
      setActiveStep(1);
    } else if (activeStep === 1) {
      // Validate before proceeding to confirm
      const validation = validateAllRows(rows);
      setValidationSummary(validation);
      setRows(validation.validatedRows);
      setActiveStep(2);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  // Handle import submission - now saves as workbook for approval
  const handleSaveWorkbook = async (submitForApproval = false) => {
    if (!selectedModuleId || !workbookName.trim()) {
      return;
    }

    setLoading(true);
    try {
      // Create workbook with CSV content
      const workbookData = {
        name: workbookName.trim(),
        description: workbookDescription.trim() || null,
        csv_content: JSON.stringify(rows),
        original_filename: file?.name || null,
        module_id: parseInt(selectedModuleId),
      };
      
      const result = await csvWorkbooksAPI.create(workbookData);
      setSavedWorkbookId(result.id);
      
      // If submitForApproval is true, first analyze similarity before submitting
      if (submitForApproval && result.id) {
        setLoading(false);
        setSimilarityLoading(true);
        setShowSimilarityDialog(true);
        
        try {
          const similarityData = await csvWorkbooksAPI.analyzeSimilarity(result.id);
          
          // Transform backend response to frontend format
          // Backend returns: { results: [{ row_index, title, similar_test_cases: [...] }], potential_duplicates, total_test_cases }
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
                    similarity_score: similar.similarity / 100, // Convert from percentage
                  });
                });
              }
            });
          }
          
          setSimilarityResults({
            similar_test_cases: duplicates,
            total_new: similarityData.total_test_cases || rows.length,
            potential_duplicates: similarityData.potential_duplicates || 0,
            threshold: similarityData.threshold || 75,
            results: similarityData.results || [],
          });
        } catch (simError) {
          console.error('Similarity analysis error:', simError);
          // If similarity analysis fails, show empty results but allow proceeding
          setSimilarityResults({ 
            similar_test_cases: [], 
            total_new: rows.length,
            error: 'Could not analyze similarity. You may proceed anyway.'
          });
        } finally {
          setSimilarityLoading(false);
        }
      } else {
        setSaveResult({
          success: true,
          message: `Workbook "${workbookName}" saved as draft. You can edit it later or submit for approval.`,
          submitted: false,
          details: result,
        });
        
        // Callback to parent
        if (onSuccess) {
          onSuccess(result);
        }
      }

    } catch (error) {
      setSaveResult({
        success: false,
        message: error.response?.data?.detail || 'Failed to save workbook',
        details: error,
      });
      setLoading(false);
    }
  };

  // Confirm submit after reviewing similarity results
  const handleConfirmSubmitForApproval = async () => {
    if (!savedWorkbookId) return;
    
    setSimilarityLoading(true);
    try {
      await csvWorkbooksAPI.submitForApproval(savedWorkbookId);
      setShowSimilarityDialog(false);
      setSaveResult({
        success: true,
        message: `Workbook "${workbookName}" created and submitted for approval`,
        submitted: true,
        details: { id: savedWorkbookId },
      });
      
      // Callback to parent
      if (onSuccess) {
        onSuccess({ id: savedWorkbookId, name: workbookName });
      }
    } catch (error) {
      setSaveResult({
        success: false,
        message: error.response?.data?.detail || 'Failed to submit workbook for approval',
        details: error,
      });
      setShowSimilarityDialog(false);
    } finally {
      setSimilarityLoading(false);
    }
  };

  // Cancel submission (keep as draft)
  const handleCancelSubmission = () => {
    setShowSimilarityDialog(false);
    setSaveResult({
      success: true,
      message: `Workbook "${workbookName}" saved as draft. You can submit it for approval later.`,
      submitted: false,
      details: { id: savedWorkbookId },
    });
    
    // Callback to parent
    if (onSuccess) {
      onSuccess({ id: savedWorkbookId, name: workbookName });
    }
  };

  // Download template
  const handleDownloadTemplate = () => {
    const template = generateTemplate();
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'test_cases_template.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // Render step content
  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            {/* Dropzone */}
            <Paper
              {...getRootProps()}
              sx={{
                p: 3,
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: isDragActive ? '#e3f2fd' : '#fafafa',
                border: '2px dashed',
                borderColor: isDragActive ? 'primary.main' : '#ccc',
                borderRadius: 2,
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: 'primary.main',
                  backgroundColor: '#f5f5f5',
                },
              }}
            >
              <input {...getInputProps()} />
              <UploadIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="subtitle1" gutterBottom>
                {isDragActive ? 'Drop the CSV file here' : 'Drag & drop a CSV file here'}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                or click to browse
              </Typography>
            </Paper>

            {/* File info */}
            {file && (
              <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <FileIcon color="primary" fontSize="small" />
                <Typography variant="body2">{file.name}</Typography>
                <Chip 
                  label={`${rows.length} rows`} 
                  size="small" 
                  color={parseError ? 'error' : 'success'}
                />
                <IconButton size="small" onClick={() => { setFile(null); setRows([]); setParseError(null); }}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            )}

            {/* Parse error */}
            {parseError && (
              <Alert severity="error" sx={{ mt: 1.5 }}>
                {parseError}
              </Alert>
            )}

            {/* Template download */}
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Button
                variant="text"
                size="small"
                onClick={handleDownloadTemplate}
                startIcon={<UploadIcon />}
              >
                Download CSV Template
              </Button>
            </Box>
          </Box>
        );

      case 1:
        return (
          <Box sx={{ height: 500 }}>
            {/* Validation summary */}
            {validationSummary && (
              <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                <Chip
                  icon={<CheckIcon />}
                  label={`${validationSummary.validCount} valid`}
                  color="success"
                  variant="outlined"
                />
                {validationSummary.errorCount > 0 && (
                  <Chip
                    icon={<ErrorIcon />}
                    label={`${validationSummary.errorCount} with errors`}
                    color="error"
                    variant="outlined"
                  />
                )}
                <Typography variant="body2" color="textSecondary">
                  Edit cells directly. Cells with errors are highlighted in red.
                </Typography>
              </Box>
            )}

            {/* DataGrid */}
            <TestCaseDataGrid
              rows={rows}
              setRows={setRows}
              modules={modules}
              onValidationChange={handleValidationChange}
            />
          </Box>
        );

      case 2:
        return (
          <Box>
            {/* Workbook name */}
            <TextField
              fullWidth
              label="Workbook Name *"
              value={workbookName}
              onChange={(e) => setWorkbookName(e.target.value)}
              sx={{ mb: 2 }}
              placeholder="Enter a descriptive name for this workbook"
            />

            {/* Workbook description */}
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

            {/* Module selection */}
            <FormControl fullWidth sx={{ mb: 3 }}>
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

            {/* Summary */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Workbook Summary
              </Typography>
              <Divider sx={{ my: 1 }} />
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Total Rows:</Typography>
                  <Typography fontWeight="bold">{rows.length}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Valid Test Cases:</Typography>
                  <Typography fontWeight="bold" color="success.main">
                    {validationSummary?.validCount || 0}
                  </Typography>
                </Box>
                {validationSummary?.errorCount > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography>Rows with Errors:</Typography>
                    <Typography fontWeight="bold" color="error.main">
                      {validationSummary.errorCount}
                    </Typography>
                  </Box>
                )}
              </Box>

              {validationSummary?.errorCount > 0 && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Some rows have validation errors. They will be flagged during approval review.
                  Go back to fix them or save the workbook with current content.
                </Alert>
              )}
              
              <Alert severity="info" sx={{ mt: 2 }}>
                <strong>Approval Workflow:</strong> This workbook will be saved as a draft. 
                You can submit it for approval when ready. Test cases will only be created 
                after an admin approves and publishes the workbook.
              </Alert>
            </Paper>

            {/* Save result */}
            {saveResult && (
              <Alert 
                severity={saveResult.success ? 'success' : 'error'} 
                sx={{ mt: 2 }}
              >
                {saveResult.message}
              </Alert>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Import Test Cases from CSV</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Stepper */}
        <Stepper activeStep={activeStep} sx={{ mb: 2 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Step content */}
        {renderStepContent()}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        
        {activeStep > 0 && (
          <Button onClick={handleBack} disabled={loading}>
            Back
          </Button>
        )}

        {activeStep < 2 ? (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={activeStep === 0 && rows.length === 0}
          >
            Next
          </Button>
        ) : (
          <>
            <Button
              variant="outlined"
              onClick={() => handleSaveWorkbook(false)}
              disabled={loading || !selectedModuleId || !workbookName.trim() || saveResult?.success}
              startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
            >
              Save as Draft
            </Button>
            <Button
              variant="contained"
              onClick={() => handleSaveWorkbook(true)}
              disabled={loading || !selectedModuleId || !workbookName.trim() || saveResult?.success}
              startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
            >
              Save & Submit for Approval
            </Button>
          </>
        )}

        {saveResult?.success && (
          <Button variant="contained" color="success" onClick={onClose}>
            Done
          </Button>
        )}
      </DialogActions>

      {/* Similarity Check Dialog - Reusable component matching feature file style */}
      <SimilarityCheckDialog
        open={showSimilarityDialog}
        onClose={() => !similarityLoading && setShowSimilarityDialog(false)}
        loading={similarityLoading}
        similarityResults={similarityResults}
        onConfirm={handleConfirmSubmitForApproval}
        onCancel={handleCancelSubmission}
        itemName={workbookName}
        itemType="workbook"
        totalItems={rows.filter(row => row.rowType === ROW_TYPES.TEST_CASE).length}
        threshold={similarityResults?.threshold || 75}
        testCases={rows
          .filter(row => row.rowType === ROW_TYPES.TEST_CASE)
          .map((row, idx) => ({
            title: row.title || row.Title || `Test Case ${idx + 1}`,
            test_type: row.test_type || row['Test Type'] || 'api',
            rowIndex: rows.indexOf(row)  // Keep original index for similarity matching
          }))}
      />
    </Dialog>
  );
};

export default CsvUploadDialog;
