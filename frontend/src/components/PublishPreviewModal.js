import React, { useState, useEffect } from 'react';
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
    Tooltip,
    LinearProgress
} from '@mui/material';
import {
    Publish as PublishIcon,
    Close as CloseIcon,
    SelectAll as SelectAllIcon,
    Download as DownloadIcon,
    Warning as WarningIcon,
    CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import api from '../services/api';

const TEST_TYPES = [
    { value: 'ui', label: 'UI', color: 'primary' },
    { value: 'api', label: 'API', color: 'success' },
    { value: 'integration', label: 'Integration', color: 'warning' },
    { value: 'hybrid', label: 'Hybrid', color: 'info' }
];

const PublishPreviewModal = ({ 
    open, 
    onClose, 
    previewData, 
    loading, 
    error,
    onPublish,
    fileId
}) => {
    const [scenarioTypes, setScenarioTypes] = useState([]);
    const [publishing, setPublishing] = useState(false);
    const [similarityData, setSimilarityData] = useState(null);
    const [loadingSimilarity, setLoadingSimilarity] = useState(false);
    const [similarityError, setSimilarityError] = useState(null);

    // Initialize scenario types when preview data changes
    useEffect(() => {
        if (previewData?.scenarios) {
            const initialTypes = previewData.scenarios.map((scenario, idx) => ({
                index: scenario.index,
                name: scenario.name,
                type: scenario.suggested_type || 'api'
            }));
            setScenarioTypes(initialTypes);
        }
    }, [previewData]);

    // Fetch similarity data when modal opens and we have a fileId
    useEffect(() => {
        const fetchSimilarity = async () => {
            try {
                setLoadingSimilarity(true);
                setSimilarityError(null);
                const response = await api.post(`/step-catalog/feature-files/${fileId}/check-similarity`);
                setSimilarityData(response.data);
            } catch (err) {
                console.error('Failed to fetch similarity data:', err);
                setSimilarityError('Failed to check similarity. Publishing will continue without similarity info.');
            } finally {
                setLoadingSimilarity(false);
            }
        };

        if (open && fileId && previewData?.scenarios?.length > 0) {
            fetchSimilarity();
        }
    }, [open, fileId, previewData]);

    const getSimilarityForScenario = (scenarioIndex) => {
        if (!similarityData?.results) return null;
        return similarityData.results.find(r => r.index === scenarioIndex);
    };

    const handleTypeChange = (index, newType) => {
        setScenarioTypes(prev => 
            prev.map(st => 
                st.index === index ? { ...st, type: newType } : st
            )
        );
    };

    const handleSetAllType = (type) => {
        setScenarioTypes(prev => 
            prev.map(st => ({ ...st, type }))
        );
    };

    const handlePublish = async () => {
        setPublishing(true);
        try {
            await onPublish(scenarioTypes);
        } finally {
            setPublishing(false);
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
        
        if (percent >= (similarityData?.threshold || 75)) {
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
                    variant={percent >= (similarityData?.threshold || 75) ? 'filled' : 'outlined'}
                />
            </Tooltip>
        );
    };

    const handleExportCSV = () => {
        if (!previewData?.scenarios) return;
        
        // Build CSV content
        const headers = ['#', 'Scenario Name', 'Keyword', 'Steps', 'Test Type', 'Similarity %', 'Similar To'];
        const rows = previewData.scenarios.map((scenario, idx) => {
            const similarity = getSimilarityForScenario(scenario.index);
            const scenarioType = scenarioTypes.find(st => st.index === scenario.index)?.type || 'api';
            
            return [
                idx + 1,
                `"${scenario.name.replace(/"/g, '""')}"`,
                scenario.keyword,
                scenario.steps.length,
                scenarioType.toUpperCase(),
                similarity?.similarity_percent || 0,
                similarity?.similar_test_case_id || 'N/A'
            ];
        });
        
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');
        
        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const fileName = `${previewData.file_name?.replace('.feature', '') || 'scenarios'}_preview.csv`;
        
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(link.href);
    };

    return (
        <Dialog 
            open={open} 
            onClose={onClose} 
            maxWidth="md" 
            fullWidth
            PaperProps={{
                sx: { minHeight: '400px' }
            }}
        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PublishIcon color="primary" />
                    <Typography variant="h6">Publish Feature File</Typography>
                </Box>
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            
            <DialogContent dividers>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
                        <CircularProgress />
                        <Typography sx={{ ml: 2 }}>Analyzing feature file...</Typography>
                    </Box>
                ) : error ? (
                    <Alert severity="error" sx={{ my: 2 }}>
                        {error}
                    </Alert>
                ) : previewData ? (
                    <>
                        {/* File Info */}
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="subtitle1" fontWeight="bold">
                                {previewData.file_name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Feature: {previewData.feature_name}
                            </Typography>
                            <Chip 
                                label={`${previewData.scenario_count} Test Case(s) Detected`}
                                color="info"
                                size="small"
                                sx={{ mt: 1 }}
                            />
                        </Box>

                        {/* Similarity Loading/Error */}
                        {loadingSimilarity && (
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    Checking for similar test cases...
                                </Typography>
                                <LinearProgress />
                            </Box>
                        )}
                        
                        {similarityError && (
                            <Alert severity="warning" sx={{ mb: 2 }}>
                                {similarityError}
                            </Alert>
                        )}

                        {/* Similarity Info */}
                        {similarityData && !loadingSimilarity && (
                            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                                <Chip 
                                    label={`Threshold: ${similarityData.threshold}%`}
                                    size="small"
                                    variant="outlined"
                                />
                                <Chip 
                                    label={`Model: ${similarityData.model_used}`}
                                    size="small"
                                    variant="outlined"
                                />
                                {similarityData.results?.some(r => r.is_potential_duplicate) && (
                                    <Chip 
                                        icon={<WarningIcon />}
                                        label={`${similarityData.results.filter(r => r.is_potential_duplicate).length} potential duplicate(s)`}
                                        color="warning"
                                        size="small"
                                    />
                                )}
                            </Box>
                        )}

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

                        {/* Scenarios Table */}
                        {previewData.scenarios.length > 0 ? (
                            <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ backgroundColor: 'grey.100' }}>
                                            <TableCell width="5%">#</TableCell>
                                            <TableCell width="40%">Scenario Name</TableCell>
                                            <TableCell width="20%">Test Type</TableCell>
                                            <TableCell width="15%">Similarity</TableCell>
                                            <TableCell width="20%">Similar To</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {previewData.scenarios.map((scenario, idx) => {
                                            const similarity = getSimilarityForScenario(scenario.index);
                                            return (
                                                <TableRow 
                                                    key={scenario.index} 
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
                                                        <Tooltip title={scenario.steps.join('\n')} placement="top-start">
                                                            <Box>
                                                                <Typography variant="body2" fontWeight="medium">
                                                                    {scenario.name}
                                                                </Typography>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {scenario.keyword} • {scenario.steps.length} steps
                                                                    {scenario.has_examples && ' • Has Examples'}
                                                                </Typography>
                                                            </Box>
                                                        </Tooltip>
                                                    </TableCell>
                                                    <TableCell>
                                                        <FormControl size="small" fullWidth>
                                                            <Select
                                                                value={scenarioTypes.find(st => st.index === scenario.index)?.type || 'api'}
                                                                onChange={(e) => handleTypeChange(scenario.index, e.target.value)}
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
                                                        {loadingSimilarity ? (
                                                            <CircularProgress size={16} />
                                                        ) : (
                                                            getSimilarityChip(similarity)
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
                                No scenarios found in this feature file. Make sure you have valid Scenario or Scenario Outline definitions.
                            </Alert>
                        )}
                    </>
                ) : null}
            </DialogContent>
            
            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={onClose} disabled={publishing}>
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={publishing ? <CircularProgress size={20} color="inherit" /> : <PublishIcon />}
                    onClick={handlePublish}
                    disabled={loading || publishing || !previewData?.scenarios?.length}
                >
                    {publishing ? 'Publishing...' : `Publish ${previewData?.scenario_count || 0} Test Case(s)`}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default PublishPreviewModal;
