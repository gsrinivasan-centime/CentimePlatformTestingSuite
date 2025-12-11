import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    FormControl,
    Select,
    MenuItem,
    Typography,
    Box,
    Chip,
    CircularProgress,
    Alert,
    IconButton,
    Tooltip
} from '@mui/material';
import {
    Send as SendIcon,
    Close as CloseIcon,
    Download as DownloadIcon,
    Warning as WarningIcon,
    CheckCircle as CheckCircleIcon,
    SelectAll as SelectAllIcon
} from '@mui/icons-material';

// Same TEST_TYPES as PublishPreviewModal
const TEST_TYPES = [
    { value: 'ui', label: 'UI', color: 'primary' },
    { value: 'api', label: 'API', color: 'success' },
    { value: 'integration', label: 'Integration', color: 'warning' },
    { value: 'hybrid', label: 'Hybrid', color: 'info' }
];

/**
 * SimilarityCheckDialog Component
 * 
 * Dialog for displaying similarity check results before submission.
 * Styled identically to PublishPreviewModal for consistency.
 */
const SimilarityCheckDialog = ({ 
    open, 
    onClose, 
    loading,
    similarityResults,
    onConfirm,
    onCancel,
    itemName = 'Workbook',
    itemType = 'workbook',
    totalItems = 0,
    threshold: thresholdProp = 75,
    testCases = [] // Array of test cases from the workbook (only test_case rows, not PARAMS/DATA)
}) => {
    const [submitting, setSubmitting] = useState(false);
    
    // Use threshold from similarityResults if available, otherwise use prop
    const threshold = similarityResults?.threshold || thresholdProp;
    
    const [testCaseTypes, setTestCaseTypes] = useState(() => 
        testCases.map((tc, idx) => ({
            index: idx,
            rowIndex: tc.rowIndex ?? idx, // Original row index for matching similarity results
            name: tc.title || tc.name || `Test Case ${idx + 1}`,
            type: tc.test_type || 'api'
        }))
    );

    // Update test case types when testCases prop changes
    React.useEffect(() => {
        if (testCases && testCases.length > 0) {
            setTestCaseTypes(testCases.map((tc, idx) => ({
                index: idx,
                rowIndex: tc.rowIndex ?? idx, // Original row index for matching similarity results
                name: tc.title || tc.name || `Test Case ${idx + 1}`,
                type: tc.test_type || 'api'
            })));
        }
    }, [testCases]);

    // Get similarity data for a test case using its original row index
    const getSimilarityForTestCase = (testCase) => {
        if (!similarityResults?.results) return null;
        const rowIndex = testCase.rowIndex ?? testCase.index;
        const result = similarityResults.results.find(r => r.row_index === rowIndex || r.index === rowIndex);
        if (!result || !result.similar_test_cases || result.similar_test_cases.length === 0) return null;
        
        const similar = result.similar_test_cases[0]; // Get the most similar one
        return {
            similarity_percent: similar.similarity || Math.round((similar.similarity_score || 0) * 100),
            similar_test_case_id: similar.test_id || similar.id,
            similar_test_case_title: similar.title,
            is_potential_duplicate: (similar.similarity || (similar.similarity_score * 100)) >= threshold
        };
    };

    const potentialDuplicatesCount = testCaseTypes.filter((tc) => 
        getSimilarityForTestCase(tc)?.is_potential_duplicate
    ).length;

    const handleTypeChange = (index, newType) => {
        setTestCaseTypes(prev => 
            prev.map(st => 
                st.index === index ? { ...st, type: newType } : st
            )
        );
    };

    const handleSetAllType = (type) => {
        setTestCaseTypes(prev => 
            prev.map(st => ({ ...st, type }))
        );
    };

    const handleConfirm = async () => {
        setSubmitting(true);
        try {
            await onConfirm(testCaseTypes);
        } finally {
            setSubmitting(false);
        }
    };

    const getTypeChip = (type) => {
        const typeConfig = TEST_TYPES.find(t => t.value === type);
        return (
            <Chip 
                label={typeConfig?.label || type.toUpperCase()} 
                color={typeConfig?.color || 'default'} 
                size="small" 
            />
        );
    };

    const getSimilarityChip = (similarity) => {
        if (!similarity) return null;
        
        const percent = similarity.similarity_percent;
        let color = 'success';
        let icon = <CheckCircleIcon sx={{ fontSize: 14 }} />;
        
        if (percent >= threshold) {
            color = 'warning';
            icon = <WarningIcon sx={{ fontSize: 14 }} />;
        }
        
        return (
            <Tooltip title={
                similarity.similar_test_case_id 
                    ? `Similar to: ${similarity.similar_test_case_id} - ${similarity.similar_test_case_title}`
                    : 'No similar test cases found'
            }>
                <Chip
                    icon={icon}
                    label={`${percent}%`}
                    color={color}
                    size="small"
                    variant={percent >= threshold ? 'filled' : 'outlined'}
                />
            </Tooltip>
        );
    };

    const handleExportCSV = () => {
        if (!testCaseTypes.length) return;
        
        const headers = ['#', 'Test Case Name', 'Test Type', 'Similarity %', 'Similar To'];
        const rows = testCaseTypes.map((tc, idx) => {
            const similarity = getSimilarityForTestCase(idx);
            return [
                idx + 1,
                `"${(tc.name || '').replace(/"/g, '""')}"`,
                tc.type.toUpperCase(),
                similarity?.similarity_percent || 0,
                similarity?.similar_test_case_id || 'N/A'
            ];
        });
        
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${itemName.replace(/\s+/g, '_')}_preview.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
    };

    return (
        <Dialog 
            open={open} 
            onClose={() => !loading && !submitting && onClose()} 
            maxWidth="md" 
            fullWidth
            PaperProps={{
                sx: { minHeight: '400px' }
            }}
        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SendIcon color="primary" />
                    <Typography variant="h6">
                        {similarityResults?.isReviewMode ? 'Similarity Analysis Results' : 'Submit CSV Workbook'}
                    </Typography>
                </Box>
                <IconButton onClick={onClose} size="small" disabled={loading || submitting}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            
            <DialogContent dividers>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
                        <CircularProgress />
                        <Typography sx={{ ml: 2 }}>Analyzing test cases...</Typography>
                    </Box>
                ) : similarityResults ? (
                    <>
                        {/* File Info */}
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="subtitle1" fontWeight="bold">
                                {itemName}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                CSV Workbook
                            </Typography>
                            <Chip 
                                label={`${testCaseTypes.length || totalItems} Test Case(s) Detected`}
                                color="info"
                                size="small"
                                sx={{ mt: 1 }}
                            />
                        </Box>

                        {/* Similarity Info */}
                        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                            <Chip 
                                label={`Threshold: ${threshold}%`}
                                size="small"
                                variant="outlined"
                            />
                            {potentialDuplicatesCount > 0 && (
                                <Chip 
                                    icon={<WarningIcon />}
                                    label={`${potentialDuplicatesCount} potential duplicate(s)`}
                                    color="warning"
                                    size="small"
                                />
                            )}
                        </Box>

                        {/* Set All Buttons */}
                        <Box sx={{ mb: 2, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                                <SelectAllIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                                Set all as:
                            </Typography>
                            {TEST_TYPES.map(type => (
                                <Button
                                    key={type.value}
                                    size="small"
                                    variant="outlined"
                                    color={type.color}
                                    onClick={() => handleSetAllType(type.value)}
                                    sx={{ textTransform: 'none' }}
                                >
                                    {type.label}
                                </Button>
                            ))}
                            
                            {/* Export CSV Button */}
                            <Box sx={{ flexGrow: 1 }} />
                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={<DownloadIcon />}
                                onClick={handleExportCSV}
                                sx={{ textTransform: 'none' }}
                            >
                                Export CSV
                            </Button>
                        </Box>

                        {/* Test Cases Table */}
                        {testCaseTypes.length > 0 ? (
                            <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ backgroundColor: 'grey.100' }}>
                                            <TableCell width="5%">#</TableCell>
                                            <TableCell width="40%">Test Case Name</TableCell>
                                            <TableCell width="20%">Test Type</TableCell>
                                            <TableCell width="15%">Similarity</TableCell>
                                            <TableCell width="20%">Similar To</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {testCaseTypes.map((tc, idx) => {
                                            const similarity = getSimilarityForTestCase(tc);
                                            return (
                                                <TableRow 
                                                    key={idx} 
                                                    hover
                                                    sx={similarity?.is_potential_duplicate ? { 
                                                        backgroundColor: 'warning.lighter',
                                                        '&:hover': { backgroundColor: 'warning.light' }
                                                    } : {}}
                                                >
                                                    <TableCell>
                                                        <Typography variant="body2" color="text.secondary">
                                                            {idx + 1}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" fontWeight="medium">
                                                            {tc.name}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <FormControl size="small" fullWidth>
                                                            <Select
                                                                value={tc.type || 'api'}
                                                                onChange={(e) => handleTypeChange(tc.index, e.target.value)}
                                                                sx={{ 
                                                                    minWidth: 100,
                                                                    '& .MuiSelect-select': { py: 1 }
                                                                }}
                                                            >
                                                                {TEST_TYPES.map(type => (
                                                                    <MenuItem key={type.value} value={type.value}>
                                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                            {getTypeChip(type.value)}
                                                                        </Box>
                                                                    </MenuItem>
                                                                ))}
                                                            </Select>
                                                        </FormControl>
                                                    </TableCell>
                                                    <TableCell>
                                                        {loading ? (
                                                            <CircularProgress size={16} />
                                                        ) : (
                                                            similarity ? getSimilarityChip(similarity) : (
                                                                <Typography variant="body2" color="text.disabled">
                                                                    —
                                                                </Typography>
                                                            )
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {similarity?.similar_test_case_id ? (
                                                            <Tooltip title={similarity.similar_test_case_title}>
                                                                <Typography 
                                                                    variant="body2" 
                                                                    sx={{ 
                                                                        color: similarity.is_potential_duplicate ? 'warning.dark' : 'text.secondary',
                                                                        fontWeight: similarity.is_potential_duplicate ? 'medium' : 'normal'
                                                                    }}
                                                                >
                                                                    {similarity.similar_test_case_id}
                                                                </Typography>
                                                            </Tooltip>
                                                        ) : (
                                                            <Typography variant="body2" color="text.disabled">
                                                                —
                                                            </Typography>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        ) : (
                            <Alert severity="warning">
                                No test cases found in this workbook.
                            </Alert>
                        )}

                        {/* Info Alert */}
                        <Alert severity="info" sx={{ mt: 3 }}>
                            <Typography variant="body2">
                                {similarityResults?.isReviewMode ? (
                                    <>
                                        <strong>Reviewer Note:</strong> This shows potential duplicates with existing test cases.
                                        Test cases with high similarity ({threshold}%+) may already exist in the system.
                                    </>
                                ) : (
                                    <>
                                        <strong>Note:</strong> Test cases will be created only after an admin approves this workbook.
                                        {potentialDuplicatesCount > 0 && 
                                            ' The admin will also review the potential duplicates before approval.'}
                                    </>
                                )}
                            </Typography>
                        </Alert>
                    </>
                ) : null}
            </DialogContent>
            
            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={onCancel || onClose} disabled={submitting}>
                    {similarityResults?.isReviewMode ? 'Close' : 'Cancel'}
                </Button>
                {!similarityResults?.isReviewMode && (
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                        onClick={handleConfirm}
                        disabled={loading || submitting || !testCaseTypes.length}
                    >
                        {submitting ? 'Submitting...' : `Submit ${testCaseTypes.length || 0} Test Case(s)`}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default SimilarityCheckDialog;
