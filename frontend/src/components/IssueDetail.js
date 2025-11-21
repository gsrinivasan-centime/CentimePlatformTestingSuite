import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    MenuItem,
    Grid,
    FormControl,
    InputLabel,
    Select,
    Box,
    Typography,
    IconButton,
    Autocomplete,
    CircularProgress,
    Chip
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { moduleService } from '../services/moduleService';
import { userService } from '../services/userService';
import { jiraStoriesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const IssueDetail = ({ open, onClose, onSave, onDelete, issue, defaultReleaseId, defaultStoryId }) => {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        status: 'Open',
        priority: 'Medium',
        severity: 'Major',
        module_id: '',
        assigned_to: '', // Internal user ID (legacy/optional)
        jira_assignee_id: '', // Jira Account ID
        jira_assignee_name: '', // Display name for UI
        video_url: '',
        screenshot_urls: '', // Stored as newline separated string in UI
        reporter_name: '',
        jira_story_id: '',
        videoFile: null,
        screenshotFiles: []
    });

    const [modules, setModules] = useState([]);
    const [jiraUsers, setJiraUsers] = useState([]);
    const [loadingJiraUsers, setLoadingJiraUsers] = useState(false);
    const [jiraUserQuery, setJiraUserQuery] = useState('');
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (open) {
            fetchDependencies();
            if (issue) {
                setFormData({
                    title: issue.title,
                    description: issue.description || '',
                    status: issue.status,
                    priority: issue.priority,
                    severity: issue.severity,
                    module_id: issue.module_id || '',
                    assigned_to: issue.assigned_to || '',
                    jira_assignee_id: issue.jira_assignee_id || '',
                    jira_assignee_name: issue.jira_assignee_id ? 'Loading...' : '',
                    video_url: issue.video_url || '',
                    screenshot_urls: issue.screenshot_urls || '',
                    reporter_name: issue.reporter_name || issue.creator?.full_name || '',
                    jira_story_id: issue.jira_story_id || '',
                    videoFile: null,
                    screenshotFiles: []
                });
            } else {
                // Reset form for new issue
                setFormData({
                    title: '',
                    description: '',
                    status: 'Open',
                    priority: 'Medium',
                    severity: 'Major',
                    module_id: '',
                    assigned_to: '',
                    jira_assignee_id: '',
                    jira_assignee_name: '',
                    video_url: '',
                    screenshot_urls: '',
                    reporter_name: user?.full_name || user?.email || 'Unknown',
                    jira_story_id: defaultStoryId || '',
                    videoFile: null,
                    screenshotFiles: []
                });
            }
        }
    }, [open, issue, user, defaultStoryId]);

    // Debounced search for Jira users
    useEffect(() => {
        const timer = setTimeout(() => {
            if (jiraUserQuery.length >= 2) {
                searchJiraUsers(jiraUserQuery);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [jiraUserQuery]);

    const fetchDependencies = async () => {
        try {
            const modulesData = await moduleService.getAll();
            setModules(modulesData);
        } catch (error) {
            console.error('Error fetching dependencies:', error);
        }
    };

    const searchJiraUsers = async (query) => {
        setLoadingJiraUsers(true);
        try {
            const users = await jiraStoriesAPI.searchUsers(query);
            setJiraUsers(users);
        } catch (error) {
            console.error('Error searching Jira users:', error);
        } finally {
            setLoadingJiraUsers(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleJiraAssigneeChange = (event, newValue) => {
        if (newValue) {
            setFormData(prev => ({
                ...prev,
                jira_assignee_id: newValue.accountId,
                jira_assignee_name: newValue.displayName
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                jira_assignee_id: '',
                jira_assignee_name: ''
            }));
        }
    };

    const handleSubmit = async () => {
        // Separate files from regular data
        const { videoFile, screenshotFiles, jira_assignee_name, ...rawData } = formData;

        // Sanitize data: Convert empty strings to null for integer fields
        const issueData = {
            ...rawData,
            assigned_to: rawData.assigned_to === '' ? null : rawData.assigned_to,
            module_id: rawData.module_id === '' ? null : rawData.module_id,
            // release_id and test_case_id might be passed as props or handled in parent, 
            // but if they are in formData, sanitize them too.
        };

        // 1. Save Issue Data first
        try {
            setUploading(true);
            await onSave(issueData, { video: videoFile, screenshots: screenshotFiles });

        } catch (error) {
            console.error("Error saving issue:", error);
        } finally {
            setUploading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>{issue ? 'Edit Issue' : 'New Issue'}</DialogTitle>
            <DialogContent>
                <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                        name="title"
                        label="Title"
                        value={formData.title}
                        onChange={handleChange}
                        fullWidth
                        required
                    />

                    <TextField
                        name="description"
                        label="Description"
                        value={formData.description}
                        onChange={handleChange}
                        multiline
                        rows={4}
                        fullWidth
                    />

                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <InputLabel>Status</InputLabel>
                                <Select
                                    name="status"
                                    value={formData.status}
                                    label="Status"
                                    onChange={handleChange}
                                >
                                    <MenuItem value="Open">Open</MenuItem>
                                    <MenuItem value="In Progress">In Progress</MenuItem>
                                    <MenuItem value="Resolved">Resolved</MenuItem>
                                    <MenuItem value="Closed">Closed</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <InputLabel>Priority</InputLabel>
                                <Select
                                    name="priority"
                                    value={formData.priority}
                                    label="Priority"
                                    onChange={handleChange}
                                >
                                    <MenuItem value="Low">Low</MenuItem>
                                    <MenuItem value="Medium">Medium</MenuItem>
                                    <MenuItem value="High">High</MenuItem>
                                    <MenuItem value="Critical">Critical</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <InputLabel>Severity</InputLabel>
                                <Select
                                    name="severity"
                                    value={formData.severity}
                                    label="Severity"
                                    onChange={handleChange}
                                >
                                    <MenuItem value="Minor">Minor</MenuItem>
                                    <MenuItem value="Major">Major</MenuItem>
                                    <MenuItem value="Critical">Critical</MenuItem>
                                    <MenuItem value="Blocker">Blocker</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <InputLabel>Module</InputLabel>
                                <Select
                                    name="module_id"
                                    value={formData.module_id}
                                    label="Module"
                                    onChange={handleChange}
                                >
                                    {modules.map(module => (
                                        <MenuItem key={module.id} value={module.id}>
                                            {module.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>

                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Reporter"
                                value={formData.reporter_name}
                                fullWidth
                                disabled
                                helperText="Automatically set to current user"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Autocomplete
                                options={jiraUsers}
                                getOptionLabel={(option) => option.displayName || ''}
                                loading={loadingJiraUsers}
                                onInputChange={(event, newInputValue) => {
                                    setJiraUserQuery(newInputValue);
                                }}
                                onChange={handleJiraAssigneeChange}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Jira Assignee"
                                        fullWidth
                                        InputProps={{
                                            ...params.InputProps,
                                            endAdornment: (
                                                <React.Fragment>
                                                    {loadingJiraUsers ? <CircularProgress color="inherit" size={20} /> : null}
                                                    {params.InputProps.endAdornment}
                                                </React.Fragment>
                                            ),
                                        }}
                                    />
                                )}
                            />
                        </Grid>
                    </Grid>

                    <Typography variant="subtitle1" sx={{ mt: 1 }}>Media Uploads</Typography>

                    <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="textSecondary" gutterBottom>
                            Upload Video (Google Drive)
                        </Typography>
                        <input
                            accept="video/*"
                            style={{ display: 'none' }}
                            id="video-upload"
                            type="file"
                            onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                    setFormData(prev => ({ ...prev, videoFile: file }));
                                }
                            }}
                        />
                        <label htmlFor="video-upload">
                            <Button variant="outlined" component="span" startIcon={<AddIcon />}>
                                Select Video
                            </Button>
                        </label>
                        {formData.videoFile && (
                            <Chip
                                label={formData.videoFile.name}
                                onDelete={() => setFormData(prev => ({ ...prev, videoFile: null }))}
                                sx={{ ml: 1 }}
                            />
                        )}
                        {formData.video_url && !formData.videoFile && (
                            <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                                Current Video: <a href={formData.video_url} target="_blank" rel="noopener noreferrer">View</a>
                            </Typography>
                        )}
                    </Box>

                    <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="textSecondary" gutterBottom>
                            Upload Screenshots
                        </Typography>
                        <input
                            accept="image/*"
                            style={{ display: 'none' }}
                            id="screenshot-upload"
                            type="file"
                            multiple
                            onChange={(e) => {
                                const files = Array.from(e.target.files);
                                if (files.length > 0) {
                                    setFormData(prev => ({
                                        ...prev,
                                        screenshotFiles: [...(prev.screenshotFiles || []), ...files]
                                    }));
                                }
                            }}
                        />
                        <label htmlFor="screenshot-upload">
                            <Button variant="outlined" component="span" startIcon={<AddIcon />}>
                                Select Screenshots
                            </Button>
                        </label>
                        <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {formData.screenshotFiles?.map((file, index) => (
                                <Chip
                                    key={index}
                                    label={file.name}
                                    onDelete={() => {
                                        setFormData(prev => ({
                                            ...prev,
                                            screenshotFiles: prev.screenshotFiles.filter((_, i) => i !== index)
                                        }));
                                    }}
                                />
                            ))}
                        </Box>
                        {formData.screenshot_urls && (
                            <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                                {formData.screenshot_urls.split('\n').length} existing screenshots linked.
                            </Typography>
                        )}
                    </Box>

                    {formData.jira_story_id && (
                        <TextField
                            label="Linked Story ID"
                            value={formData.jira_story_id}
                            fullWidth
                            disabled
                        />
                    )}

                </Box>
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
                {issue && (
                    <Button
                        onClick={() => {
                            if (window.confirm('Are you sure you want to delete this issue?')) {
                                onDelete(issue.id);
                            }
                        }}
                        color="error"
                        startIcon={<DeleteIcon />}
                    >
                        Delete
                    </Button>
                )}
                <Box>
                    <Button onClick={onClose} sx={{ mr: 1 }}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained" color="primary" disabled={uploading}>
                        {uploading ? 'Uploading...' : 'Save & Upload'}
                    </Button>
                </Box>
            </DialogActions>
        </Dialog>
    );
};

export default IssueDetail;
