import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Container,
    Grid,
    Paper,
    Typography,
    Button,
    Card,
    CardContent,
    LinearProgress,
    Chip,
    IconButton,
    Tooltip
} from '@mui/material';
import { Add as AddIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { issueService } from '../services/issueService';
import IssueList from '../components/IssueList';
import IssueDetail from '../components/IssueDetail';
import { useToast } from '../context/ToastContext';

const Issues = () => {
    const [stats, setStats] = useState([]);
    const [openDetail, setOpenDetail] = useState(false);
    const [selectedIssue, setSelectedIssue] = useState(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const { showSuccess, showError } = useToast();

    const fetchStats = useCallback(async () => {
        try {
            const data = await issueService.getStats();
            setStats(data);
        } catch (error) {
            console.error('Error fetching stats:', error);
            showError('Failed to load issue statistics');
        }
    }, [showError]);

    useEffect(() => {
        fetchStats();
    }, [refreshTrigger, fetchStats]);

    const handleCreateClick = () => {
        setSelectedIssue(null);
        setOpenDetail(true);
    };

    const handleEditClick = (issue) => {
        setSelectedIssue(issue);
        setOpenDetail(true);
    };

    const handleCloseDetail = () => {
        setOpenDetail(false);
        setSelectedIssue(null);
    };

    const handleSaveIssue = async (issueData) => {
        try {
            if (selectedIssue) {
                await issueService.update(selectedIssue.id, issueData);
                showSuccess('Issue updated successfully');
            } else {
                await issueService.create(issueData);
                showSuccess('Issue created successfully');
            }
            handleCloseDetail();
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            console.error('Error saving issue:', error);
            showError('Failed to save issue');
        }
    };

    const handleRefresh = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Issue Tracker
                </Typography>
                <Box>
                    <Tooltip title="Refresh">
                        <IconButton onClick={handleRefresh} sx={{ mr: 1 }}>
                            <RefreshIcon />
                        </IconButton>
                    </Tooltip>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<AddIcon />}
                        onClick={handleCreateClick}
                    >
                        New Issue
                    </Button>
                </Box>
            </Box>

            {/* Dashboard Stats */}
            <Grid container spacing={3} mb={4}>
                {stats.map((stat) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={stat.module_id}>
                        <Card elevation={2}>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom variant="overline">
                                    {stat.module_name}
                                </Typography>
                                <Box display="flex" justifyContent="space-between" alignItems="flex-end">
                                    <Typography variant="h4">{stat.open_issues}</Typography>
                                    <Typography variant="body2" color="textSecondary">
                                        Open Issues
                                    </Typography>
                                </Box>
                                <Box mt={2}>
                                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                                        <Typography variant="caption">Progress</Typography>
                                        <Typography variant="caption">
                                            {stat.total_issues > 0
                                                ? Math.round((stat.closed_issues / stat.total_issues) * 100)
                                                : 0}%
                                        </Typography>
                                    </Box>
                                    <LinearProgress
                                        variant="determinate"
                                        value={stat.total_issues > 0
                                            ? (stat.closed_issues / stat.total_issues) * 100
                                            : 0}
                                        color="success"
                                    />
                                    <Box display="flex" justifyContent="space-between" mt={1}>
                                        <Chip
                                            label={`${stat.closed_issues} Closed`}
                                            size="small"
                                            color="success"
                                            variant="outlined"
                                        />
                                        <Chip
                                            label={`${stat.total_issues} Total`}
                                            size="small"
                                            variant="outlined"
                                        />
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Issue List */}
            <Paper elevation={2} sx={{ p: 2 }}>
                <IssueList
                    onEdit={handleEditClick}
                    refreshTrigger={refreshTrigger}
                />
            </Paper>

            {/* Issue Detail Modal */}
            <IssueDetail
                open={openDetail}
                onClose={handleCloseDetail}
                onSave={handleSaveIssue}
                issue={selectedIssue}
            />
        </Container>
    );
};

export default Issues;
