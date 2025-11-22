import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Typography,
    CircularProgress,
    Alert
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { issueService } from '../../services/issueService';
import IssueList from '../../components/IssueList';
import IssueDetail from '../../components/IssueDetail';

const ReleaseIssuesView = ({ releaseId, releaseVersion }) => {
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [openDetail, setOpenDetail] = useState(false);
    const [selectedIssue, setSelectedIssue] = useState(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useEffect(() => {
        fetchIssues();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [releaseId, refreshTrigger]);

    const fetchIssues = async () => {
        setLoading(true);
        try {
            // Fetch issues linked to this release
            // We might need to update list_issues API to filter by release_id if not already supported
            // The current API supports release_id filter
            const data = await issueService.getAll({ release_id: releaseId });
            setIssues(data);
            setError('');
        } catch (err) {
            console.error('Error fetching issues:', err);
            setError('Failed to load issues');
        } finally {
            setLoading(false);
        }
    };

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
                <Typography variant="h6">Issues for Release {releaseVersion}</Typography>
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
