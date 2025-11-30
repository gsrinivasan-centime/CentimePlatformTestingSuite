import React, { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Button,
    Typography,
    CircularProgress,
    Alert,
    Chip
} from '@mui/material';
import { Add as AddIcon, FilterList as FilterIcon } from '@mui/icons-material';
import { issueService } from '../../services/issueService';
import IssueList from '../../components/IssueList';
import IssueDetail from '../../components/IssueDetail';

const ReleaseIssuesView = ({ releaseId, releaseVersion, urlFilters = {} }) => {
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [openDetail, setOpenDetail] = useState(false);
    const [selectedIssue, setSelectedIssue] = useState(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    
    // Track if we have active URL filters (from Smart Search)
    const hasUrlFilters = useMemo(() => {
        return !!(urlFilters.status || urlFilters.assignee || urlFilters.search || urlFilters.ids?.length);
    }, [urlFilters]);

    useEffect(() => {
        fetchIssues();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [releaseId, refreshTrigger]);

    const fetchIssues = async () => {
        setLoading(true);
        try {
            // Build filter params including URL filters
            const filterParams = { release_id: releaseId };
            if (urlFilters.status) {
                filterParams.status = urlFilters.status;
            }
            if (urlFilters.assignee) {
                filterParams.assigned_to = urlFilters.assignee;
            }
            
            const data = await issueService.getAll(filterParams);
            
            // If specific IDs are provided, filter and sort by those IDs
            let filteredData = data;
            if (urlFilters.ids?.length) {
                const idSet = new Set(urlFilters.ids);
                // First show matching IDs in order, then the rest
                const matchingIssues = urlFilters.ids
                    .map(id => data.find(issue => issue.id === id))
                    .filter(Boolean);
                const otherIssues = data.filter(issue => !idSet.has(issue.id));
                filteredData = [...matchingIssues, ...otherIssues];
            }
            
            setIssues(filteredData);
            setError('');
        } catch (err) {
            console.error('Error fetching issues:', err);
            setError('Failed to load issues');
        } finally {
            setLoading(false);
        }
    };
    
    // Re-fetch when URL filters change
    useEffect(() => {
        if (hasUrlFilters) {
            fetchIssues();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [urlFilters.status, urlFilters.assignee, urlFilters.ids?.join(',')]);

    const handleCreateIssue = () => {
        setSelectedIssue(null);
        setOpenDetail(true);
    };

    const handleEditIssue = (issue) => {
        setSelectedIssue(issue);
        setOpenDetail(true);
    };

    const handleSaveIssue = async (issueData, files) => {
        try {
            let savedIssue;
            if (selectedIssue) {
                savedIssue = await issueService.update(selectedIssue.id, issueData);
            } else {
                // Ensure the issue is linked to the current release
                savedIssue = await issueService.create({ ...issueData, release_id: releaseId });
            }

            // Handle file uploads if any
            if (files && (files.video || (files.screenshots && files.screenshots.length > 0))) {
                const formData = new FormData();
                if (files.video) {
                    formData.append('files', files.video);
                }
                if (files.screenshots) {
                    files.screenshots.forEach(file => {
                        formData.append('files', file);
                    });
                }
                await issueService.uploadMedia(savedIssue.id, formData);
            }

            setOpenDetail(false);
            setSelectedIssue(null);
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            console.error('Error saving issue:', error);
            throw error; // Let the modal handle the error display
        }
    };

    const handleDeleteIssue = async (id) => {
        try {
            await issueService.delete(id);
            setOpenDetail(false);
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            console.error('Error deleting issue:', error);
            // setError('Failed to delete issue'); // Optional: show error in UI
        }
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="h6">Issues for Release {releaseVersion}</Typography>
                    {hasUrlFilters && (
                        <Chip 
                            icon={<FilterIcon />}
                            label={`Filtered${urlFilters.status ? `: ${urlFilters.status}` : ''}${urlFilters.ids?.length ? ` (${urlFilters.ids.length} highlighted)` : ''}`}
                            color="primary"
                            size="small"
                            variant="outlined"
                        />
                    )}
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleCreateIssue}
                >
                    Log Issue
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <IssueList
                    issues={issues}
                    onEdit={handleEditIssue}
                    loading={loading}
                    showModuleColumn={true}
                    highlightIds={urlFilters.ids}
                />
            )}

            <IssueDetail
                open={openDetail}
                onClose={() => {
                    setOpenDetail(false);
                    setSelectedIssue(null);
                }}
                onSave={handleSaveIssue}
                onDelete={handleDeleteIssue}
                issue={selectedIssue}
                defaultReleaseId={releaseId}
            />
        </Box>
    );
};

export default ReleaseIssuesView;
