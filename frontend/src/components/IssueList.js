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
    TablePagination,
    Collapse,
    Dialog,
    DialogContent,
    DialogActions,
    Autocomplete,
    TextField,
    Button,
    Chip
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    Close as CloseIcon,
    Link as LinkIcon,
    Save as SaveIcon,
    Cancel as CancelIcon
} from '@mui/icons-material';
import { issueService } from '../services/issueService';
import ResizableTableCell from './ResizableTableCell';
import IssueContentRenderer from './IssueContentRenderer';
import RichTextEditor from './RichTextEditor';
import TruncatedText from './TruncatedText';
import api from '../services/api';

const IssueRow = ({ issue, onEdit, onDelete, onUpdate, jiraUsers, jiraUsersMap, modules }) => {
    const [open, setOpen] = useState(false);
    const [status, setStatus] = useState(issue.status);
    const [priority, setPriority] = useState(issue.priority);
    const [moduleId, setModuleId] = useState(issue.module_id || '');
    const [jiraAssigneeId, setJiraAssigneeId] = useState(issue.jira_assignee_id || '');
    const [linkDialogOpen, setLinkDialogOpen] = useState(false);
    const [stories, setStories] = useState([]);
    const [selectedStory, setSelectedStory] = useState(null);
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [editedDescription, setEditedDescription] = useState(issue.description || '');
    const [editedMediaFiles, setEditedMediaFiles] = useState([]);
    const [isSavingDescription, setIsSavingDescription] = useState(false);

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

    const handleModuleChange = async (newModuleId) => {
        try {
            setModuleId(newModuleId);
            await onUpdate(issue.id, { module_id: newModuleId || null });
        } catch (error) {
            setModuleId(issue.module_id); // Revert on error
            console.error('Failed to update module:', error);
        }
    };

    const handleAssigneeChange = async (newAssigneeId) => {
        try {
            setJiraAssigneeId(newAssigneeId);
            // Find the selected user to get their display name
            const selectedUser = jiraUsers.find(user => user.accountId === newAssigneeId);
            const assigneeName = selectedUser ? selectedUser.displayName : null;
            
            await onUpdate(issue.id, { 
                jira_assignee_id: newAssigneeId || null,
                jira_assignee_name: assigneeName
            });
        } catch (error) {
            setJiraAssigneeId(issue.jira_assignee_id); // Revert on error
            console.error('Failed to update assignee:', error);
        }
    };

    const handleOpenLinkDialog = async () => {
        try {
            // Fetch all stories from JIRA
            const response = await api.get('/jira-stories/');
            setStories(response.data);
            setLinkDialogOpen(true);
        } catch (error) {
            console.error('Failed to fetch stories:', error);
            alert('Failed to load stories');
        }
    };

    const handleLinkStory = async () => {
        if (!selectedStory) return;
        
        try {
            await onUpdate(issue.id, { jira_story_id: selectedStory });
            setLinkDialogOpen(false);
            alert(`Issue linked to story ${selectedStory}`);
        } catch (error) {
            console.error('Failed to link story:', error);
            alert('Failed to link story');
        }
    };

    const handleSaveDescription = async () => {
        try {
            setIsSavingDescription(true);
            
            // First, upload media files if any
            if (editedMediaFiles.length > 0) {
                const formData = new FormData();
                
                // Backend expects all files under 'files' parameter
                editedMediaFiles.forEach((file) => {
                    formData.append('files', file);
                });
                
                // Upload media files
                const uploadResult = await issueService.uploadMedia(issue.id, formData);
                
                // Update issue with new media URLs
                await onUpdate(issue.id, { 
                    description: editedDescription,
                    video_url: uploadResult.video_url || issue.video_url,
                    screenshot_urls: uploadResult.screenshot_urls || issue.screenshot_urls
                });
                
                // Update local issue object
                issue.description = editedDescription;
                if (uploadResult.video_url) issue.video_url = uploadResult.video_url;
                if (uploadResult.screenshot_urls) issue.screenshot_urls = uploadResult.screenshot_urls;
            } else {
                // No media files, just update description
                await onUpdate(issue.id, { description: editedDescription });
                issue.description = editedDescription;
            }
            
            setIsEditingDescription(false);
            setEditedMediaFiles([]);
        } catch (error) {
            console.error('Failed to update description:', error);
            alert('Failed to update description: ' + (error.response?.data?.detail || error.message));
        } finally {
            setIsSavingDescription(false);
        }
    };

    const handleCancelEditDescription = () => {
        setEditedDescription(issue.description || '');
        setEditedMediaFiles([]);
        setIsEditingDescription(false);
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
                        width: 350,
                        cursor: 'pointer', 
                        '&:hover': { backgroundColor: 'action.hover' },
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}
                    onClick={() => setOpen(!open)}
                >
                    <TruncatedText text={issue.title} />
                </TableCell>
                <TableCell 
                    align="center"
                    sx={{ 
                        width: 120,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}
                >
                    {issue.jira_story_id ? (
                        <Chip 
                            label={issue.jira_story_id} 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                            component="a"
                            href={`https://centime.atlassian.net/browse/${issue.jira_story_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            clickable
                            sx={{ cursor: 'pointer' }}
                        />
                    ) : '-'}
                </TableCell>
                <TableCell align="center" sx={{ width: 150 }}>
                    <FormControl fullWidth size="small">
                        <Select
                            value={moduleId}
                            onChange={(e) => handleModuleChange(e.target.value)}
                            variant="standard"
                            disableUnderline
                            displayEmpty
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
                            <MenuItem value="">-</MenuItem>
                            {modules.map((module) => (
                                <MenuItem key={module.id} value={module.id}>
                                    {module.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </TableCell>
                <TableCell align="center" sx={{ width: 150 }}>
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
                <TableCell align="center" sx={{ width: 120 }}>
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
                <TableCell align="center" sx={{ width: 180 }}>
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
                <TableCell align="center" sx={{ width: 150 }}>
                    <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                        {issue.reporter_name || '-'}
                    </Typography>
                </TableCell>
                <TableCell align="center" sx={{ width: 100 }}>
                    <IconButton 
                        size="small" 
                        onClick={() => onDelete(issue.id)}
                        title="Delete Issue"
                        color="error"
                    >
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                        size="small"
                        title="Link to Story"
                        color="primary"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleOpenLinkDialog();
                        }}
                    >
                        <LinkIcon fontSize="small" />
                    </IconButton>
                </TableCell>
            </TableRow>
            
            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={9}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h6" component="div">
                                    Issue Description
                                </Typography>
                                {!isEditingDescription && (
                                    <IconButton
                                        size="small"
                                        color="primary"
                                        onClick={() => {
                                            setEditedDescription(issue.description || '');
                                            setIsEditingDescription(true);
                                        }}
                                        title="Edit Description"
                                    >
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                )}
                            </Box>
                            
                            {isEditingDescription ? (
                                <Box>
                                    <RichTextEditor
                                        value={editedDescription}
                                        onChange={(html, mediaFiles) => {
                                            setEditedDescription(html);
                                            setEditedMediaFiles(mediaFiles);
                                        }}
                                        placeholder="Edit issue description..."
                                    />
                                    <Box sx={{ display: 'flex', gap: 1, mt: 2, justifyContent: 'flex-end' }}>
                                        <Button
                                            variant="outlined"
                                            startIcon={<CancelIcon />}
                                            onClick={handleCancelEditDescription}
                                            disabled={isSavingDescription}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            variant="contained"
                                            startIcon={<SaveIcon />}
                                            onClick={handleSaveDescription}
                                            disabled={isSavingDescription}
                                        >
                                            {isSavingDescription ? 'Saving...' : 'Save'}
                                        </Button>
                                    </Box>
                                </Box>
                            ) : (
                                <IssueContentRenderer
                                    htmlContent={issue.description}
                                    videoUrl={issue.video_url ? `/issues/${issue.id}/media-proxy?url=${encodeURIComponent(issue.video_url)}` : ''}
                                    screenshotUrls={screenshots.map(url => 
                                        `/issues/${issue.id}/media-proxy?url=${encodeURIComponent(url)}`
                                    ).join('\n')}
                                />
                            )}
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
            
            {/* Link to Story Dialog */}
            <Dialog
                open={linkDialogOpen}
                onClose={() => setLinkDialogOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogActions sx={{ p: 1 }}>
                    <Typography variant="h6" sx={{ flexGrow: 1, px: 2 }}>
                        Link Issue to Story
                    </Typography>
                    <IconButton onClick={() => setLinkDialogOpen(false)}>
                        <CloseIcon />
                    </IconButton>
                </DialogActions>
                <DialogContent>
                    <Autocomplete
                        value={selectedStory}
                        onChange={(event, newValue) => setSelectedStory(newValue)}
                        options={stories.map(story => story.story_id)}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Select Story"
                                placeholder="Search for a story..."
                                fullWidth
                            />
                        )}
                        renderOption={(props, option) => {
                            const story = stories.find(s => s.story_id === option);
                            return (
                                <Box component="li" {...props}>
                                    <Box>
                                        <Typography variant="body2" fontWeight="bold">
                                            {option}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {story?.title}
                                        </Typography>
                                    </Box>
                                </Box>
                            );
                        }}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setLinkDialogOpen(false)}>Cancel</Button>
                    <Button 
                        onClick={handleLinkStory} 
                        variant="contained" 
                        disabled={!selectedStory}
                    >
                        Link Story
                    </Button>
                </DialogActions>
            </Dialog>
        </React.Fragment>
    );
};

const IssueList = ({ 
    onEdit, 
    refreshTrigger, 
    issues: externalIssues,  // Issues passed from parent (optional)
    loading: externalLoading,  // Loading state from parent (optional)
    showModuleColumn = true,
    highlightIds = []  // IDs to highlight (from smart search)
}) => {
    const [internalIssues, setInternalIssues] = useState([]);
    const [internalLoading, setInternalLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [jiraUsers, setJiraUsers] = useState([]);
    const [modules, setModules] = useState([]);
    const [filters, setFilters] = useState({
        id: '',
        title: '',
        storyId: '',
        module: '',
        status: '',
        priority: '',
        assignee: '',
        reporter: ''
    });

    // Use external issues if provided, otherwise use internal state
    const issues = externalIssues !== undefined ? externalIssues : internalIssues;
    const loading = externalLoading !== undefined ? externalLoading : internalLoading;
    const setIssues = externalIssues !== undefined ? () => {} : setInternalIssues;

    // Memoized lookup map for JIRA users to avoid repeated .find() calls
    const jiraUsersMap = useMemo(() => {
        const map = {};
        jiraUsers.forEach(user => {
            map[user.accountId] = user;
        });
        return map;
    }, [jiraUsers]);

    const fetchIssues = async () => {
        // Skip fetching if issues are provided externally
        if (externalIssues !== undefined) return;
        
        setInternalLoading(true);
        try {
            const data = await issueService.getAll();
            setInternalIssues(data);
        } catch (error) {
            console.error('Error fetching issues:', error);
        } finally {
            setInternalLoading(false);
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

    const fetchModules = async () => {
        try {
            const response = await api.get('/modules');
            setModules(response.data);
        } catch (error) {
            console.error('Error fetching modules:', error);
        }
    };

    useEffect(() => {
        fetchIssues();
        fetchJiraUsers();
        fetchModules();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshTrigger, externalIssues]);

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

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const applyFilters = (issue) => {
        if (filters.id && !issue.id.toString().includes(filters.id)) return false;
        if (filters.title && !issue.title.toLowerCase().includes(filters.title.toLowerCase())) return false;
        if (filters.storyId && issue.jira_story_id && !issue.jira_story_id.toLowerCase().includes(filters.storyId.toLowerCase())) return false;
        if (filters.module && issue.module && !issue.module.name.toLowerCase().includes(filters.module.toLowerCase())) return false;
        if (filters.status && issue.status !== filters.status) return false;
        if (filters.priority && issue.priority !== filters.priority) return false;
        if (filters.assignee && issue.jira_assignee_name && !issue.jira_assignee_name.toLowerCase().includes(filters.assignee.toLowerCase())) return false;
        if (filters.reporter && issue.reporter_name && !issue.reporter_name.toLowerCase().includes(filters.reporter.toLowerCase())) return false;
        return true;
    };

    const filteredIssues = issues.filter(applyFilters);

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">All Issues ({filteredIssues.length})</Typography>
            </Box>

            <TableContainer component={Paper} sx={{ overflowX: 'auto', maxWidth: '100%' }}>
                <Table sx={{ width: '100%', tableLayout: 'fixed' }} size="small">
                    <TableHead>
                        <TableRow>
                            <ResizableTableCell minWidth={60} initialWidth={80} isHeader={true} align="center">ID</ResizableTableCell>
                            <ResizableTableCell minWidth={200} initialWidth={350} isHeader={true} align="left">Title</ResizableTableCell>
                            <ResizableTableCell minWidth={100} initialWidth={120} isHeader={true} align="center">Story ID</ResizableTableCell>
                            <ResizableTableCell minWidth={120} initialWidth={150} isHeader={true} align="center">Module</ResizableTableCell>
                            <ResizableTableCell minWidth={120} initialWidth={150} isHeader={true} align="center">Status</ResizableTableCell>
                            <ResizableTableCell minWidth={100} initialWidth={120} isHeader={true} align="center">Priority</ResizableTableCell>
                            <ResizableTableCell minWidth={150} initialWidth={180} isHeader={true} align="center">Assigned To</ResizableTableCell>
                            <ResizableTableCell minWidth={120} initialWidth={150} isHeader={true} align="center">Reporter</ResizableTableCell>
                            <ResizableTableCell minWidth={120} initialWidth={150} isHeader={true} align="center">Actions</ResizableTableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>
                                <TextField
                                    size="small"
                                    placeholder="Filter..."
                                    value={filters.id}
                                    onChange={(e) => setFilters({ ...filters, id: e.target.value })}
                                    fullWidth
                                />
                            </TableCell>
                            <TableCell>
                                <TextField
                                    size="small"
                                    placeholder="Filter..."
                                    value={filters.title}
                                    onChange={(e) => setFilters({ ...filters, title: e.target.value })}
                                    fullWidth
                                />
                            </TableCell>
                            <TableCell>
                                <TextField
                                    size="small"
                                    placeholder="Filter..."
                                    value={filters.storyId}
                                    onChange={(e) => setFilters({ ...filters, storyId: e.target.value })}
                                    fullWidth
                                />
                            </TableCell>
                            <TableCell>
                                <TextField
                                    size="small"
                                    placeholder="Filter..."
                                    value={filters.module}
                                    onChange={(e) => setFilters({ ...filters, module: e.target.value })}
                                    fullWidth
                                />
                            </TableCell>
                            <TableCell>
                                <Select
                                    size="small"
                                    displayEmpty
                                    fullWidth
                                    value={filters.status}
                                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                >
                                    <MenuItem value="">All</MenuItem>
                                    <MenuItem value="Open">Open</MenuItem>
                                    <MenuItem value="In Progress">In Progress</MenuItem>
                                    <MenuItem value="Resolved">Resolved</MenuItem>
                                    <MenuItem value="Closed">Closed</MenuItem>
                                </Select>
                            </TableCell>
                            <TableCell>
                                <Select
                                    size="small"
                                    displayEmpty
                                    fullWidth
                                    value={filters.priority}
                                    onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                                >
                                    <MenuItem value="">All</MenuItem>
                                    <MenuItem value="Critical">Critical</MenuItem>
                                    <MenuItem value="High">High</MenuItem>
                                    <MenuItem value="Medium">Medium</MenuItem>
                                    <MenuItem value="Low">Low</MenuItem>
                                </Select>
                            </TableCell>
                            <TableCell>
                                <TextField
                                    size="small"
                                    placeholder="Filter..."
                                    value={filters.assignee}
                                    onChange={(e) => setFilters({ ...filters, assignee: e.target.value })}
                                    fullWidth
                                />
                            </TableCell>
                            <TableCell>
                                <TextField
                                    size="small"
                                    placeholder="Filter..."
                                    value={filters.reporter}
                                    onChange={(e) => setFilters({ ...filters, reporter: e.target.value })}
                                    fullWidth
                                />
                            </TableCell>
                            <TableCell />
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredIssues
                            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                            .map((issue) => (
                                <IssueRow 
                                    key={issue.id} 
                                    issue={issue} 
                                    onEdit={onEdit}
                                    onDelete={handleDelete}
                                    onUpdate={handleUpdate}
                                    jiraUsers={jiraUsers}
                                    jiraUsersMap={jiraUsersMap}
                                    modules={modules}
                                />
                            ))}
                        {issues.length === 0 && !loading && (
                            <TableRow>
                                <TableCell colSpan={7} align="center">
                                    No issues found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={filteredIssues.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
            />
        </Box>
    );
};

export default IssueList;
