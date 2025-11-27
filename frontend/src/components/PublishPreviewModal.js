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
    Tooltip
} from '@mui/material';
import {
    Publish as PublishIcon,
    Close as CloseIcon,
    SelectAll as SelectAllIcon
} from '@mui/icons-material';

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
    onPublish 
}) => {
    const [scenarioTypes, setScenarioTypes] = useState([]);
    const [publishing, setPublishing] = useState(false);

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
                        </Box>

                        {/* Scenarios Table */}
                        {previewData.scenarios.length > 0 ? (
                            <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ backgroundColor: 'grey.100' }}>
                                            <TableCell width="5%">#</TableCell>
                                            <TableCell width="65%">Scenario Name</TableCell>
                                            <TableCell width="30%">Test Type</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {previewData.scenarios.map((scenario, idx) => (
                                            <TableRow key={scenario.index} hover>
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
                                                                minWidth: 120,
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
                                            </TableRow>
                                        ))}
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
