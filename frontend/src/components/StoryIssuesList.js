import React, { useState, useEffect, useMemo } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Typography,
    Box,
    MenuItem,
    FormControl,
    Select,
    Collapse,
    Autocomplete,
    TextField,
    CircularProgress
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
} from '@mui/icons-material';
import { issueService } from '../services/issueService';
import ResizableTableCell from './ResizableTableCell';
import IssueContentRenderer from './IssueContentRenderer';

const IssueRow = ({ issue, onEdit, onDelete, onUpdate, jiraUsers, jiraUsersMap }) => {
    const [open, setOpen] = useState(false);
    const [status, setStatus] = useState(issue.status);
    const [priority, setPriority] = useState(issue.priority);
    const [jiraAssigneeId, setJiraAssigneeId] = useState(issue.jira_assignee_id || '');

    const handleStatusChange = async (newStatus) => {
        try {
            setStatus(newStatus);
            await onUpdate(issue.id, { status: newStatus });
        } catch (error) {
            setStatus(issue.status); // Revert on error
            console.error('Failed to update status:', error);
        }
    };

    const handlePriorityChange = async (newPriority) => {
        try {
            setPriority(newPriority);
            await onUpdate(issue.id, { priority: newPriority });
        } catch (error) {
            setPriority(issue.priority); // Revert on error
            console.error('Failed to update priority:', error);
        }
    };

    const handleAssigneeChange = async (newAssigneeId) => {
        try {
            setJiraAssigneeId(newAssigneeId);
            // Find the selected user to get their display name and email
            const selectedUser = jiraUsers.find(user => user.accountId === newAssigneeId);
            const assigneeName = selectedUser ? selectedUser.displayName : null;
            const assigneeEmail = selectedUser ? selectedUser.emailAddress : null;
            
            await onUpdate(issue.id, { 
                jira_assignee_id: newAssigneeId || null,
                jira_assignee_name: assigneeName,
                jira_assignee_email: assigneeEmail
            });
        } catch (error) {
            setJiraAssigneeId(issue.jira_assignee_id); // Revert on error
            console.error('Failed to update assignee:', error);
        }
    };

    // Parse screenshots
    const screenshots = issue.screenshot_urls
        ? issue.screenshot_urls.split('\n').filter(url => url.trim() !== '')
        : [];

    return (
        <React.Fragment>
            <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
                <TableCell 
                    align="center"
                    sx={{ 
                        width: 80,
                        cursor: 'pointer', 
                        '&:hover': { backgroundColor: 'action.hover' },
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}
                    onClick={() => setOpen(!open)}
                >
                    {issue.id}
                </TableCell>
                <TableCell 
                    align="left"
                    sx={{ 
                        width: 250,
                        cursor: 'pointer', 
                        '&:hover': { backgroundColor: 'action.hover' },
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}
                    onClick={() => setOpen(!open)}
                >
                    {issue.title}
                </TableCell>
                <TableCell 
                    align="center"
                    sx={{ 
                        width: 120,
                        cursor: 'pointer', 
                        '&:hover': { backgroundColor: 'action.hover' },
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}
                    onClick={() => setOpen(!open)}
                >
                    {issue.module ? issue.module.name : '-'}
                </TableCell>
                <TableCell align="center" sx={{ width: 130 }}>
                    <FormControl fullWidth size="small">
                        <Select
                            value={status}
                            onChange={(e) => handleStatusChange(e.target.value)}
                            variant="standard"
                            disableUnderline
                            sx={{
                                fontSize: '0.875rem',
                                '& .MuiSelect-select': {
                                    py: 0.5,
                                    px: 1,
                                    textAlign: 'center'
                                },
                                '&:hover': {
                                    backgroundColor: 'action.hover',
                                    borderRadius: 1
                                }
                            }}
                        >
                            <MenuItem value="Open">Open</MenuItem>
                            <MenuItem value="In Progress">In Progress</MenuItem>
                            <MenuItem value="Resolved">Resolved</MenuItem>
                            <MenuItem value="Closed">Closed</MenuItem>
                        </Select>
                    </FormControl>
                </TableCell>
                <TableCell align="center" sx={{ width: 110 }}>
                    <FormControl fullWidth size="small">
                        <Select
                            value={priority}
                            onChange={(e) => handlePriorityChange(e.target.value)}
                            variant="standard"
                            disableUnderline
                            sx={{
                                fontSize: '0.875rem',
                                '& .MuiSelect-select': {
                                    py: 0.5,
                                    px: 1,
                                    textAlign: 'center'
                                },
                                '&:hover': {
                                    backgroundColor: 'action.hover',
                                    borderRadius: 1
                                }
                            }}
                        >
                            <MenuItem value="Critical">Critical</MenuItem>
                            <MenuItem value="High">High</MenuItem>
                            <MenuItem value="Medium">Medium</MenuItem>
                            <MenuItem value="Low">Low</MenuItem>
                        </Select>
                    </FormControl>
                </TableCell>
                <TableCell align="center" sx={{ width: 150 }}>
                    <Autocomplete
                        value={jiraAssigneeId ? (jiraUsersMap[jiraAssigneeId] || null) : null}
                        onChange={(event, newValue) => {
                            handleAssigneeChange(newValue ? newValue.accountId : '');
                        }}
                        options={jiraUsers}
                        getOptionLabel={(option) => option.displayName || ''}
                        isOptionEqualToValue={(option, value) => option.accountId === value.accountId}
                        size="small"
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                variant="standard"
                                placeholder="Unassigned"
                                InputProps={{
                                    ...params.InputProps,
                                    disableUnderline: true,
                                    sx: {
                                        fontSize: '0.875rem',
                                        py: 0,
                                        px: 0.5
                                    }
                                }}
                            />
                        )}
                        sx={{
                            '& .MuiAutocomplete-input': {
                                textAlign: 'center',
                                fontSize: '0.875rem',
                                py: 0.5,
                                px: 1
                            },
                            '&:hover': {
                                backgroundColor: 'action.hover',
                                borderRadius: 1
                            }
                        }}
                    />
                </TableCell>
                <TableCell align="center" sx={{ width: 100 }}>
                    <IconButton 
                        size="small" 
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(issue);
                        }}
                        title="Edit Issue"
                    >
                        <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                        size="small" 
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(issue.id);
                        }}
                        title="Delete Issue"
                        color="error"
                    >
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </TableCell>
            </TableRow>
            
            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 2 }}>
                            <Typography variant="h6" gutterBottom component="div">
                                Issue Description
                            </Typography>
                            <IssueContentRenderer
                                htmlContent={issue.description}
                                videoUrl={issue.video_url ? `/issues/${issue.id}/media-proxy?url=${encodeURIComponent(issue.video_url)}` : ''}
                                screenshotUrls={screenshots.map(url => 
                                    `/issues/${issue.id}/media-proxy?url=${encodeURIComponent(url)}`
                                ).join('\n')}
                            />
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </React.Fragment>
    );
};

const StoryIssuesList = ({ storyId, onEdit, refreshTrigger }) => {
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [jiraUsers, setJiraUsers] = useState([]);

    // Memoized lookup map for JIRA users to avoid repeated .find() calls
    const jiraUsersMap = useMemo(() => {
        const map = {};
        jiraUsers.forEach(user => {
            map[user.accountId] = user;
        });
        return map;
    }, [jiraUsers]);

    const fetchIssues = async () => {
        setLoading(true);
        try {
            const data = await issueService.getByStory(storyId);
            setIssues(data);
        } catch (error) {
            console.error('Error fetching issues:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchJiraUsers = async () => {
        try {
            const response = await issueService.getJiraUsers();
            setJiraUsers(response);
        } catch (error) {
            console.error('Error fetching JIRA users:', error);
        }
    };

    useEffect(() => {
        fetchIssues();
        fetchJiraUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storyId, refreshTrigger]);

    const handleUpdate = async (issueId, updates) => {
        try {
            await issueService.update(issueId, updates);
            // Update local state
            setIssues(issues.map(issue => 
                issue.id === issueId ? { ...issue, ...updates } : issue
            ));
        } catch (error) {
            console.error('Error updating issue:', error);
            throw error;
        }
    };

    const handleDelete = async (issueId) => {
        if (window.confirm('Are you sure you want to delete this issue?')) {
            try {
                await issueService.delete(issueId);
                setIssues(issues.filter(issue => issue.id !== issueId));
            } catch (error) {
                console.error('Error deleting issue:', error);
                alert('Failed to delete issue');
            }
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" p={2}>
                <CircularProgress size={24} />
            </Box>
        );
    }

    if (issues.length === 0) {
        return (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                No issues linked to this story
            </Typography>
        );
    }

    return (
        <Box>
            <TableContainer component={Paper} sx={{ overflowX: 'auto', boxShadow: 'none' }}>
                <Table sx={{ width: '100%', tableLayout: 'fixed' }} size="small">
                    <TableHead>
                        <TableRow>
                            <ResizableTableCell minWidth={60} initialWidth={80} isHeader={true} align="center">ID</ResizableTableCell>
                            <ResizableTableCell minWidth={200} initialWidth={250} isHeader={true} align="left">Title</ResizableTableCell>
                            <ResizableTableCell minWidth={100} initialWidth={120} isHeader={true} align="center">Module</ResizableTableCell>
                            <ResizableTableCell minWidth={110} initialWidth={130} isHeader={true} align="center">Status</ResizableTableCell>
                            <ResizableTableCell minWidth={90} initialWidth={110} isHeader={true} align="center">Priority</ResizableTableCell>
                            <ResizableTableCell minWidth={130} initialWidth={150} isHeader={true} align="center">Assigned To</ResizableTableCell>
                            <ResizableTableCell minWidth={80} initialWidth={100} isHeader={true} align="center">Actions</ResizableTableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {issues.map((issue) => (
                            <IssueRow 
                                key={issue.id} 
                                issue={issue} 
                                onEdit={onEdit}
                                onDelete={handleDelete}
                                onUpdate={handleUpdate}
                                jiraUsers={jiraUsers}
                                jiraUsersMap={jiraUsersMap}
                            />
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default StoryIssuesList;
