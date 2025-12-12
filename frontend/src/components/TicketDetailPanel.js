import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Divider,
  Avatar,
  Chip,
  Link,
  Skeleton,
  Alert,
  TablePagination,
  Paper,
  Stack,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActionArea,
  Dialog,
  DialogContent,
  Button,
  CircularProgress,
  Snackbar,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  TextField,
  InputAdornment,
  Autocomplete,
} from '@mui/material';
import {
  Close as CloseIcon,
  OpenInNew as OpenInNewIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Label as LabelIcon,
  AttachFile as AttachFileIcon,
  Image as ImageIcon,
  InsertDriveFile as FileIcon,
  Send as SendIcon,
  Link as LinkIcon,
  ArrowDropDown as ArrowDropDownIcon,
  Check as CheckIcon,
  Search as SearchIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import productionTicketsAPI from '../services/productionTicketsService';
import jiraAPI from '../services/jiraService';
import MentionInput, { parseMentions } from './MentionInput';

// Status color mapping
const statusColors = {
  'Open': 'error',
  'In Progress': 'info',
  'Work in progress': 'info',
  'Work In Progress': 'info',
  'Pending Verification': 'warning',
  'Closed': 'success',
  'Cancelled': 'default',
  'Resolved': 'success',
};

// Format date/time
const formatDateTime = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Format relative time
const formatRelativeTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

// Format file size
const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// Check if file is an image
const isImageFile = (mimeType, filename) => {
  if (mimeType?.startsWith('image/')) return true;
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'];
  return imageExtensions.some(ext => filename?.toLowerCase().endsWith(ext));
};

// JIRA server base URL for converting relative URLs
const JIRA_SERVER = 'https://centime.atlassian.net';

// API base URL for proxied images
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

// Helper to create proxy URL for JIRA images - defined outside component to avoid recreation
const createProxyUrl = (originalUrl) => {
  if (!originalUrl) return null;
  
  // If URL is empty string, return null
  if (originalUrl.trim() === '') return null;
  
  let urlToProxy = originalUrl;
  
  // Handle relative URLs from JIRA (start with /rest/api/ or /secure/)
  // When browser parses them, they become http://localhost:xxxx/rest/api/...
  if (originalUrl.includes('/rest/api/') && !originalUrl.includes('.atlassian.net')) {
    // Extract the path part and prepend JIRA server
    const pathMatch = originalUrl.match(/(\/rest\/api\/.*)/);
    if (pathMatch) {
      urlToProxy = JIRA_SERVER + pathMatch[1];
    }
  } else if (originalUrl.includes('/secure/attachment/') && !originalUrl.includes('.atlassian.net')) {
    const pathMatch = originalUrl.match(/(\/secure\/attachment\/.*)/);
    if (pathMatch) {
      urlToProxy = JIRA_SERVER + pathMatch[1];
    }
  }
  
  // Check if this is a JIRA URL that needs proxying
  const isJiraUrl = urlToProxy.includes('.atlassian.net') || 
                    urlToProxy.includes('/secure/attachment/') || 
                    urlToProxy.includes('/rest/api/') ||
                    urlToProxy.includes('/secure/thumbnail/') ||
                    urlToProxy.includes('/wiki/download/') ||
                    urlToProxy.includes('jira') ||
                    urlToProxy.includes('/attachment/');
  
  if (isJiraUrl) {
    try {
      // Base64 encode the URL for safe transmission
      const encodedUrl = btoa(urlToProxy);
      // Use full API URL since img src doesn't go through axios
      const proxyUrl = `${API_BASE_URL}/api/production-tickets/proxy/image?url=${encodedUrl}`;
      return proxyUrl;
    } catch (e) {
      console.error('Failed to encode URL:', urlToProxy, e);
      return originalUrl;
    }
  }
  return originalUrl;
};

// Preprocess HTML to convert JIRA image URLs to proxied URLs BEFORE rendering
// This is critical because the browser will immediately try to load relative URLs
// and convert them to localhost URLs before useEffect can run
const preprocessHtml = (html) => {
  if (!html) return html;
  
  // Replace relative JIRA attachment URLs with proxied URLs
  // Pattern: src="/rest/api/3/attachment/content/12345"
  let processedHtml = html.replace(
    /src="(\/rest\/api\/[^"]+)"/gi,
    (match, path) => {
      const fullUrl = JIRA_SERVER + path;
      try {
        const encodedUrl = btoa(fullUrl);
        return `src="${API_BASE_URL}/api/production-tickets/proxy/image?url=${encodedUrl}"`;
      } catch (e) {
        return match;
      }
    }
  );
  
  // Also handle /secure/attachment/ pattern
  processedHtml = processedHtml.replace(
    /src="(\/secure\/attachment\/[^"]+)"/gi,
    (match, path) => {
      const fullUrl = JIRA_SERVER + path;
      try {
        const encodedUrl = btoa(fullUrl);
        return `src="${API_BASE_URL}/api/production-tickets/proxy/image?url=${encodedUrl}"`;
      } catch (e) {
        return match;
      }
    }
  );
  
  // Handle /secure/thumbnail/ pattern
  processedHtml = processedHtml.replace(
    /src="(\/secure\/thumbnail\/[^"]+)"/gi,
    (match, path) => {
      const fullUrl = JIRA_SERVER + path;
      try {
        const encodedUrl = btoa(fullUrl);
        return `src="${API_BASE_URL}/api/production-tickets/proxy/image?url=${encodedUrl}"`;
      } catch (e) {
        return match;
      }
    }
  );
  
  // Handle full JIRA URLs that aren't already proxied
  processedHtml = processedHtml.replace(
    /src="(https:\/\/[^"]*\.atlassian\.net[^"]+)"/gi,
    (match, url) => {
      if (url.includes('/proxy/image')) return match; // Already proxied
      try {
        const encodedUrl = btoa(url);
        return `src="${API_BASE_URL}/api/production-tickets/proxy/image?url=${encodedUrl}"`;
      } catch (e) {
        return match;
      }
    }
  );
  
  return processedHtml;
};

// Safe HTML renderer for JIRA content with image click handling
const SafeHtmlRenderer = ({ html, onImageClick }) => {
  const containerRef = useRef(null);
  
  // Preprocess HTML to fix image URLs before rendering
  const processedHtml = preprocessHtml(html);
  
  // Add click handlers after render
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Handle all img tags - add click handlers
    const images = containerRef.current.querySelectorAll('img');
    images.forEach((img) => {
      img.style.cursor = 'pointer';
      // Ensure image is visible
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.style.display = 'block';
      
      img.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Try multiple sources for the image URL
        const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-media-src');
        if (src && onImageClick) {
          onImageClick(src);
        }
      };
    });
    
    // Handle JIRA media/file wrapper spans that contain thumbnails
    const mediaWrappers = containerRef.current.querySelectorAll('.image-wrap, [data-media-id], .file-thumbnail, span[data-attachment-id]');
    mediaWrappers.forEach((wrapper) => {
      const img = wrapper.querySelector('img');
      if (img) {
        wrapper.style.cursor = 'pointer';
        wrapper.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          const src = img.src;
          if (src && onImageClick) {
            onImageClick(src);
          }
        };
      }
    });
    
    // Handle anchor tags wrapping images (common in JIRA)
    const allLinks = containerRef.current.querySelectorAll('a');
    allLinks.forEach((link) => {
      const img = link.querySelector('img');
      if (img) {
        link.style.cursor = 'pointer';
        link.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          // Use the proxied image src (already updated above)
          const src = img.src;
          if (src && onImageClick) {
            onImageClick(src);
          }
        };
      }
    });
  }, [processedHtml, onImageClick]);
  
  if (!html) return <Typography color="text.secondary">No content</Typography>;
  
  return (
    <Box
      ref={containerRef}
      sx={{
        '& p': { my: 1, fontSize: '0.9rem', lineHeight: 1.6 },
        '& ul, & ol': { pl: 3, my: 1 },
        '& li': { my: 0.5, fontSize: '0.9rem' },
        '& a': { color: 'primary.main', wordBreak: 'break-word' },
        '& code': { 
          bgcolor: 'grey.100', 
          px: 0.5, 
          borderRadius: 0.5,
          fontFamily: 'monospace',
          fontSize: '0.85em'
        },
        '& pre': {
          bgcolor: 'grey.100',
          p: 2,
          borderRadius: 1,
          overflow: 'auto',
          '& code': { bgcolor: 'transparent', p: 0 }
        },
        '& blockquote': {
          borderLeft: 3,
          borderColor: 'grey.300',
          pl: 2,
          ml: 0,
          color: 'text.secondary'
        },
        // Image styling - crucial for attachments
        '& img': { 
          maxWidth: '100%', 
          height: 'auto',
          display: 'block',
          my: 1,
          borderRadius: 1,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          cursor: 'pointer',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            transform: 'scale(1.02)'
          }
        },
        // Handle JIRA attachment thumbnails
        '& .image-wrap': {
          display: 'block',
          my: 1
        },
        '& .confluence-embedded-image, & .jira-embedded-image': {
          maxWidth: '100%',
          height: 'auto',
          cursor: 'pointer'
        },
        // Handle file attachment links
        '& .attachment-link, & a[data-attachment-id]': {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          px: 1,
          py: 0.5,
          bgcolor: 'grey.100',
          borderRadius: 1,
          textDecoration: 'none',
          fontSize: '0.875rem',
          '&:hover': {
            bgcolor: 'grey.200'
          }
        },
        '& table': { 
          borderCollapse: 'collapse',
          width: '100%',
          my: 2
        },
        '& th, & td': {
          border: 1,
          borderColor: 'grey.300',
          p: 1,
          fontSize: '0.875rem'
        },
        '& th': { bgcolor: 'grey.50' },
        // Handle emoticons/emoji
        '& .emoticon': {
          width: 20,
          height: 20,
          verticalAlign: 'middle'
        },
        // Handle panels and info boxes
        '& .panel, & .aui-message': {
          p: 2,
          my: 2,
          borderRadius: 1,
          bgcolor: 'grey.50',
          borderLeft: 3,
          borderColor: 'info.main'
        },
        // JIRA specific: file thumbnails and media cards
        '& .file-thumbnail, & [data-media-id], & .media-card': {
          display: 'inline-block',
          cursor: 'pointer',
          '& img': {
            maxWidth: '200px',
            height: 'auto'
          }
        },
        // JIRA inline attachments in comments
        '& span[data-attachment-id], & span[data-media-id]': {
          display: 'inline-block',
          cursor: 'pointer',
          '& img': {
            border: '1px solid',
            borderColor: 'grey.200',
            borderRadius: 1
          }
        },
        // Make sure all images in comments are visible
        '& a > img, & span > img': {
          display: 'inline-block !important',
          maxWidth: '100%',
          height: 'auto'
        }
      }}
      dangerouslySetInnerHTML={{ __html: processedHtml }}
    />
  );
};

// Comment component
const Comment = ({ comment, onImageClick }) => {
  return (
    <Paper 
      variant="outlined" 
      sx={{ 
        p: 2, 
        mb: 2,
        '&:last-child': { mb: 0 }
      }}
    >
      <Box display="flex" alignItems="flex-start" gap={2}>
        <Avatar 
          src={comment.author_avatar} 
          sx={{ width: 36, height: 36 }}
        >
          {comment.author?.charAt(0) || '?'}
        </Avatar>
        <Box flex={1} minWidth={0}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="subtitle2" fontWeight="bold">
              {comment.author}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatRelativeTime(comment.created)}
            </Typography>
          </Box>
          <SafeHtmlRenderer html={comment.body_html} onImageClick={onImageClick} />
        </Box>
      </Box>
    </Paper>
  );
};

const TicketDetailPanel = ({ open, onClose, ticket, onTicketUpdated }) => {
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);
  
  const [comments, setComments] = useState([]);
  const [commentsTotal, setCommentsTotal] = useState(0);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState(null);
  const [commentsPage, setCommentsPage] = useState(0);
  const [commentsPerPage, setCommentsPerPage] = useState(10);
  
  // Comment form state
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState(null);
  const [commentSuccess, setCommentSuccess] = useState(false);
  
  // JIRA connection state
  const [jiraConnected, setJiraConnected] = useState(null); // null = loading, true/false = known
  const [jiraUserName, setJiraUserName] = useState('');
  
  // Image preview state
  const [previewImage, setPreviewImage] = useState(null);
  
  // Status transition state
  const [statusMenuAnchor, setStatusMenuAnchor] = useState(null);
  const [transitions, setTransitions] = useState([]);
  const [transitionsLoading, setTransitionsLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  
  // Assignee edit state
  const [assigneeMenuAnchor, setAssigneeMenuAnchor] = useState(null);
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [assignableUsersLoading, setAssignableUsersLoading] = useState(false);
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState('');
  const [updatingAssignee, setUpdatingAssignee] = useState(false);
  
  // Success/error messages for updates
  const [updateSuccess, setUpdateSuccess] = useState('');
  const [updateError, setUpdateError] = useState('');
  
  // Handle image click - open in fullscreen dialog
  const handleImageClick = useCallback((imageSrc) => {
    setPreviewImage(imageSrc);
  }, []);
  
  const handleClosePreview = () => {
    setPreviewImage(null);
  };

  // Fetch ticket details
  const fetchDetails = useCallback(async () => {
    if (!ticket?.key) return;
    
    setDetailsLoading(true);
    setDetailsError(null);
    try {
      const result = await productionTicketsAPI.getTicketDetails(ticket.key);
      setDetails(result);
    } catch (err) {
      setDetailsError(err.response?.data?.detail || 'Failed to load ticket details');
    } finally {
      setDetailsLoading(false);
    }
  }, [ticket?.key]);

  // Fetch comments
  const fetchComments = useCallback(async () => {
    if (!ticket?.key) return;
    
    setCommentsLoading(true);
    setCommentsError(null);
    try {
      const result = await productionTicketsAPI.getTicketComments(
        ticket.key,
        commentsPage * commentsPerPage,
        commentsPerPage
      );
      setComments(result.comments || []);
      setCommentsTotal(result.total || 0);
    } catch (err) {
      setCommentsError(err.response?.data?.detail || 'Failed to load comments');
    } finally {
      setCommentsLoading(false);
    }
  }, [ticket?.key, commentsPage, commentsPerPage]);

  // Load data when panel opens
  useEffect(() => {
    if (open && ticket?.key) {
      fetchDetails();
      setCommentsPage(0);  // Reset to first page
    }
  }, [open, ticket?.key, fetchDetails]);

  // Load comments when page changes
  useEffect(() => {
    if (open && ticket?.key) {
      fetchComments();
    }
  }, [open, ticket?.key, commentsPage, commentsPerPage, fetchComments]);

  // Reset state when closed
  useEffect(() => {
    if (!open) {
      setDetails(null);
      setComments([]);
      setCommentsPage(0);
      setNewComment('');
      setCommentError(null);
    }
  }, [open]);

  // Check JIRA connection status when panel opens
  useEffect(() => {
    if (open) {
      checkJiraConnection();
    }
  }, [open]);

  const checkJiraConnection = async () => {
    try {
      const status = await jiraAPI.getConnectionStatus();
      setJiraConnected(status.connected);
      setJiraUserName(status.display_name || '');
    } catch (err) {
      setJiraConnected(false);
    }
  };

  // Fetch available status transitions
  const fetchTransitions = useCallback(async () => {
    if (!ticket?.key || !jiraConnected || transitionsLoading) return;
    
    setTransitionsLoading(true);
    try {
      const result = await productionTicketsAPI.getTicketTransitions(ticket.key);
      setTransitions(result.transitions || []);
    } catch (err) {
      console.error('Failed to fetch transitions:', err);
      setTransitions([]);
      // Only show error if not already showing one
      if (!updateError) {
        setUpdateError(err.response?.data?.detail || 'Failed to fetch status transitions');
      }
      // Close the menu on error
      setStatusMenuAnchor(null);
    } finally {
      setTransitionsLoading(false);
    }
  }, [ticket?.key, jiraConnected, transitionsLoading, updateError]);

  // Fetch assignable users
  const fetchAssignableUsers = useCallback(async (query = '', showErrorToast = true) => {
    if (!ticket?.key || !jiraConnected || assignableUsersLoading) return;
    
    setAssignableUsersLoading(true);
    try {
      const result = await productionTicketsAPI.getAssignableUsers(ticket.key, query);
      setAssignableUsers(result.users || []);
    } catch (err) {
      console.error('Failed to fetch assignable users:', err);
      setAssignableUsers([]);
      // Only show error if requested and not already showing one
      if (showErrorToast && !updateError) {
        setUpdateError(err.response?.data?.detail || 'Failed to fetch assignable users');
        // Close the menu on error
        setAssigneeMenuAnchor(null);
      }
    } finally {
      setAssignableUsersLoading(false);
    }
  }, [ticket?.key, jiraConnected, assignableUsersLoading, updateError]);

  // Handle status menu open
  const handleStatusMenuOpen = (event) => {
    if (!jiraConnected) return;
    setStatusMenuAnchor(event.currentTarget);
    fetchTransitions();
  };

  // Handle status menu close
  const handleStatusMenuClose = () => {
    setStatusMenuAnchor(null);
  };

  // Handle status transition
  const handleStatusChange = async (transition) => {
    if (!ticket?.key || !transition?.id) return;
    
    setUpdatingStatus(true);
    try {
      await productionTicketsAPI.transitionTicket(ticket.key, transition.id);
      setUpdateSuccess(`Status changed to "${transition.to.name}"`);
      handleStatusMenuClose();
      // Refresh details to get new status
      await fetchDetails();
      // Notify parent to refresh ticket list
      if (onTicketUpdated) onTicketUpdated();
    } catch (err) {
      setUpdateError(err.response?.data?.detail || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Handle assignee menu open
  const handleAssigneeMenuOpen = (event) => {
    if (!jiraConnected) return;
    setAssigneeMenuAnchor(event.currentTarget);
    setAssigneeSearchQuery('');
    fetchAssignableUsers();
  };

  // Handle assignee menu close
  const handleAssigneeMenuClose = () => {
    setAssigneeMenuAnchor(null);
    setAssigneeSearchQuery('');
  };

  // Handle assignee search
  const handleAssigneeSearch = (e) => {
    const query = e.target.value;
    setAssigneeSearchQuery(query);
    // Don't show error toast for search queries - only show on initial open
    fetchAssignableUsers(query, false);
  };

  // Handle assignee change
  const handleAssigneeChange = async (user) => {
    if (!ticket?.key) return;
    
    setUpdatingAssignee(true);
    try {
      await productionTicketsAPI.updateAssignee(ticket.key, user?.accountId || null);
      setUpdateSuccess(user ? `Assigned to ${user.displayName}` : 'Unassigned');
      handleAssigneeMenuClose();
      // Refresh details to get new assignee
      await fetchDetails();
      // Notify parent to refresh ticket list
      if (onTicketUpdated) onTicketUpdated();
    } catch (err) {
      setUpdateError(err.response?.data?.detail || 'Failed to update assignee');
    } finally {
      setUpdatingAssignee(false);
    }
  };

  // Handle comment submission with @mentions
  const handleSubmitComment = async () => {
    if (!newComment.trim() || !ticket?.key) return;
    
    setSubmittingComment(true);
    setCommentError(null);
    
    try {
      // Parse mentions from the comment text (extracts @[Name](id) markers)
      const mentions = parseMentions(newComment);
      
      // Send comment with mentions array
      await jiraAPI.addComment(ticket.key, newComment.trim(), mentions);
      setNewComment('');
      setCommentSuccess(true);
      // Refresh comments list
      await fetchComments();
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to post comment';
      setCommentError(errorMsg);
      
      // If it's an auth error, refresh connection status
      if (err.response?.status === 403 || err.response?.status === 401) {
        checkJiraConnection();
      }
    } finally {
      setSubmittingComment(false);
    }
  };

  // Handle mention input change
  const handleCommentChange = (newValue, plainText, mentions) => {
    setNewComment(newValue);
  };

  // Handle pagination
  const handleCommentsPageChange = (event, newPage) => {
    setCommentsPage(newPage);
  };

  const handleCommentsPerPageChange = (event) => {
    setCommentsPerPage(parseInt(event.target.value, 10));
    setCommentsPage(0);
  };

  if (!ticket) return null;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      variant="temporary"
      hideBackdrop={true}
      disableScrollLock={true}
      ModalProps={{
        keepMounted: true,
        // Allow clicking through to the content behind the drawer
        sx: {
          pointerEvents: 'none',
        },
      }}
      PaperProps={{
        sx: { 
          width: { xs: '100%', sm: 700, md: 850 },
          boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
          position: 'fixed',
          top: 64,
          height: 'calc(100% - 64px)',
          pointerEvents: 'auto', // Re-enable pointer events on the drawer itself
        }
      }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Link
                href={ticket.jira_url}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 0.5,
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' }
                }}
              >
                <Typography variant="h6" fontWeight="bold" color="primary">
                  {ticket.key}
                </Typography>
                <OpenInNewIcon sx={{ fontSize: 16 }} />
              </Link>
              {/* Editable Status */}
              <Tooltip title={jiraConnected ? "Click to change status" : "Connect JIRA to change status"}>
                <Chip
                  label={
                    <Box display="flex" alignItems="center" gap={0.5}>
                      {updatingStatus ? (
                        <CircularProgress size={12} color="inherit" />
                      ) : null}
                      {details?.status || ticket.status}
                      {jiraConnected && <ArrowDropDownIcon sx={{ fontSize: 16, ml: -0.5 }} />}
                    </Box>
                  }
                  size="small"
                  color={statusColors[details?.status || ticket.status] || 'default'}
                  onClick={handleStatusMenuOpen}
                  sx={{ 
                    mt: 0.5,
                    cursor: jiraConnected ? 'pointer' : 'default',
                    '&:hover': jiraConnected ? { filter: 'brightness(0.9)' } : {}
                  }}
                />
              </Tooltip>
              {/* Status Menu */}
              <Menu
                anchorEl={statusMenuAnchor}
                open={Boolean(statusMenuAnchor)}
                onClose={handleStatusMenuClose}
                PaperProps={{
                  sx: { minWidth: 200, maxHeight: 300 }
                }}
              >
                {transitionsLoading ? (
                  <MenuItem disabled>
                    <CircularProgress size={16} sx={{ mr: 1 }} />
                    Loading transitions...
                  </MenuItem>
                ) : transitions.length === 0 ? (
                  <MenuItem disabled>No transitions available</MenuItem>
                ) : (
                  transitions.map((transition) => (
                    <MenuItem
                      key={transition.id}
                      onClick={() => handleStatusChange(transition)}
                      disabled={updatingStatus}
                    >
                      <ListItemIcon>
                        <Chip
                          label={transition.to.name}
                          size="small"
                          color={statusColors[transition.to.name] || 'default'}
                          sx={{ fontSize: '0.7rem', height: 20 }}
                        />
                      </ListItemIcon>
                      <ListItemText primary={transition.name} />
                    </MenuItem>
                  ))
                )}
              </Menu>
            </Box>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
          <Typography variant="h6" sx={{ mt: 1, fontWeight: 700, lineHeight: 1.3 }}>
            {details?.summary || ticket.summary}
          </Typography>
        </Box>

        {/* Scrollable content */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          {/* Metadata */}
          <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mb: 2 }}>
            {/* Editable Assignee */}
            <Box display="flex" alignItems="center" gap={0.5}>
              <PersonIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                Assignee:
              </Typography>
              <Tooltip title={jiraConnected ? "Click to change assignee" : "Connect JIRA to change assignee"}>
                <Chip
                  size="small"
                  variant="outlined"
                  onClick={handleAssigneeMenuOpen}
                  avatar={
                    (details?.assignee_avatar || ticket.assignee_avatar) ? (
                      <Avatar 
                        src={details?.assignee_avatar || ticket.assignee_avatar} 
                        sx={{ width: 20, height: 20 }}
                      />
                    ) : null
                  }
                  label={
                    <Box display="flex" alignItems="center" gap={0.5}>
                      {updatingAssignee ? (
                        <CircularProgress size={12} />
                      ) : null}
                      {details?.assignee || ticket.assignee || 'Unassigned'}
                      {jiraConnected && <EditIcon sx={{ fontSize: 12, ml: 0.5 }} />}
                    </Box>
                  }
                  sx={{ 
                    cursor: jiraConnected ? 'pointer' : 'default',
                    '&:hover': jiraConnected ? { bgcolor: 'action.hover' } : {}
                  }}
                />
              </Tooltip>
              {/* Assignee Menu */}
              <Menu
                anchorEl={assigneeMenuAnchor}
                open={Boolean(assigneeMenuAnchor)}
                onClose={handleAssigneeMenuClose}
                PaperProps={{
                  sx: { width: 280, maxHeight: 400 }
                }}
              >
                <Box sx={{ p: 1 }}>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Search users..."
                    value={assigneeSearchQuery}
                    onChange={handleAssigneeSearch}
                    autoFocus
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Box>
                <Divider />
                {/* Unassign option */}
                <MenuItem 
                  onClick={() => handleAssigneeChange(null)}
                  disabled={updatingAssignee}
                >
                  <ListItemIcon>
                    <Avatar sx={{ width: 24, height: 24, bgcolor: 'grey.300' }}>?</Avatar>
                  </ListItemIcon>
                  <ListItemText primary="Unassigned" />
                  {!details?.assignee && !ticket.assignee && (
                    <CheckIcon fontSize="small" color="primary" />
                  )}
                </MenuItem>
                <Divider />
                {assignableUsersLoading ? (
                  <MenuItem disabled>
                    <CircularProgress size={16} sx={{ mr: 1 }} />
                    Loading users...
                  </MenuItem>
                ) : assignableUsers.length === 0 ? (
                  <MenuItem disabled>No users found</MenuItem>
                ) : (
                  assignableUsers.map((user) => (
                    <MenuItem
                      key={user.accountId}
                      onClick={() => handleAssigneeChange(user)}
                      disabled={updatingAssignee}
                    >
                      <ListItemIcon>
                        <Avatar 
                          src={user.avatarUrl} 
                          sx={{ width: 24, height: 24 }}
                        >
                          {user.displayName?.charAt(0) || '?'}
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText 
                        primary={user.displayName}
                        secondary={user.emailAddress}
                        secondaryTypographyProps={{ fontSize: '0.75rem' }}
                      />
                      {(details?.assignee === user.displayName || ticket.assignee === user.displayName) && (
                        <CheckIcon fontSize="small" color="primary" />
                      )}
                    </MenuItem>
                  ))
                )}
              </Menu>
            </Box>
            <Box display="flex" alignItems="center" gap={0.5}>
              <ScheduleIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                Updated:
              </Typography>
              <Typography variant="body2">
                {formatDateTime(details?.updated || ticket.updated)}
              </Typography>
            </Box>
          </Stack>

          {/* Labels */}
          {(details?.labels || ticket.labels)?.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
                <LabelIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  Labels:
                </Typography>
              </Box>
              <Stack direction="row" spacing={0.5} flexWrap="wrap">
                {(details?.labels || ticket.labels).map((label) => (
                  <Chip key={label} label={label} size="small" variant="outlined" />
                ))}
              </Stack>
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          {/* Description */}
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Description
          </Typography>
          
          {detailsLoading ? (
            <Box>
              <Skeleton variant="text" />
              <Skeleton variant="text" />
              <Skeleton variant="text" width="60%" />
            </Box>
          ) : detailsError ? (
            <Alert severity="error" sx={{ mb: 2 }}>{detailsError}</Alert>
          ) : (
            <Box sx={{ mb: 3 }}>
              <SafeHtmlRenderer html={details?.description_html} onImageClick={handleImageClick} />
            </Box>
          )}

          {/* Attachments */}
          {details?.attachments?.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <AttachFileIcon fontSize="small" color="action" />
                <Typography variant="subtitle2" fontWeight="bold">
                  Attachments ({details.attachments.length})
                </Typography>
              </Box>
              <Grid container spacing={1.5}>
                {details.attachments.map((attachment) => {
                  const isImage = isImageFile(attachment.mimeType, attachment.filename);
                  // Debug log
                  console.log('[Attachments] Processing attachment:', attachment.filename, {
                    content: attachment.content,
                    thumbnail: attachment.thumbnail,
                    mimeType: attachment.mimeType,
                    isImage
                  });
                  // Proxy the attachment URLs
                  const proxiedContent = createProxyUrl(attachment.content);
                  const proxiedThumbnail = createProxyUrl(attachment.thumbnail) || proxiedContent;
                  console.log('[Attachments] Proxied URLs:', { proxiedContent, proxiedThumbnail });
                  return (
                  <Grid item xs={6} key={attachment.id}>
                    <Card 
                      variant="outlined" 
                      sx={{ 
                        height: '100%',
                        transition: 'box-shadow 0.2s',
                        '&:hover': { boxShadow: 2 }
                      }}
                    >
                      <CardActionArea
                        onClick={(e) => {
                          if (isImage) {
                            e.preventDefault();
                            handleImageClick(proxiedContent);
                          } else {
                            // For non-images, open in new tab (still needs auth - open original)
                            window.open(attachment.content, '_blank');
                          }
                        }}
                        sx={{ height: '100%' }}
                      >
                        {isImage ? (
                          <>
                            <CardMedia
                              component="img"
                              height="100"
                              image={proxiedThumbnail}
                              alt={attachment.filename}
                              sx={{ 
                                objectFit: 'cover',
                                bgcolor: 'grey.100'
                              }}
                              onError={(e) => {
                                // Fallback if image fails to load
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                            <Box 
                              sx={{ 
                                display: 'none', 
                                height: 100, 
                                bgcolor: 'grey.100',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <ImageIcon sx={{ fontSize: 40, color: 'grey.400' }} />
                            </Box>
                          </>
                        ) : (
                          <Box 
                            sx={{ 
                              height: 100, 
                              bgcolor: 'grey.50',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <FileIcon sx={{ fontSize: 40, color: 'grey.400' }} />
                          </Box>
                        )}
                        <CardContent sx={{ py: 1, px: 1.5, '&:last-child': { pb: 1 } }}>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              display: 'block',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontWeight: 500
                            }}
                          >
                            {attachment.filename}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatFileSize(attachment.size)}
                          </Typography>
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </Grid>
                  );
                })}
              </Grid>
            </>
          )}

          <Divider sx={{ my: 2 }} />

          {/* Comments */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="subtitle2" fontWeight="bold">
              Comments ({commentsTotal})
            </Typography>
          </Box>

          {/* Add Comment Form */}
          <Paper 
            variant="outlined" 
            sx={{ 
              p: 2, 
              mb: 2, 
              bgcolor: jiraConnected ? 'background.paper' : 'action.disabledBackground' 
            }}
          >
            {jiraConnected === null ? (
              <Box display="flex" alignItems="center" gap={1}>
                <CircularProgress size={16} />
                <Typography variant="body2" color="text.secondary">
                  Checking JIRA connection...
                </Typography>
              </Box>
            ) : jiraConnected ? (
              <>
                <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                  <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem', bgcolor: 'primary.main' }}>
                    {jiraUserName?.charAt(0) || 'J'}
                  </Avatar>
                  <Typography variant="caption" color="text.secondary">
                    Commenting as <strong>{jiraUserName}</strong> • Type <strong>@</strong> to mention someone
                  </Typography>
                </Box>
                <MentionInput
                  value={newComment}
                  onChange={handleCommentChange}
                  placeholder="Write a comment... Type @ to mention someone"
                  disabled={submittingComment}
                  rows={3}
                  sx={{ mb: 1.5 }}
                />
                {commentError && (
                  <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setCommentError(null)}>
                    {commentError}
                  </Alert>
                )}
                <Box display="flex" justifyContent="flex-end">
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim() || submittingComment}
                    startIcon={submittingComment ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
                  >
                    {submittingComment ? 'Posting...' : 'Post Comment'}
                  </Button>
                </Box>
              </>
            ) : (
              <Box textAlign="center" py={1}>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Connect your JIRA account to post comments
                </Typography>
                <Tooltip title="Click to open JIRA connection settings">
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<LinkIcon />}
                    onClick={() => {
                      // Emit event to parent to open JIRA connect dialog
                      if (window.dispatchEvent) {
                        window.dispatchEvent(new CustomEvent('openJiraConnect'));
                      }
                    }}
                  >
                    Connect JIRA Account
                  </Button>
                </Tooltip>
              </Box>
            )}
          </Paper>

          {commentsLoading ? (
            <Box>
              {[...Array(3)].map((_, i) => (
                <Paper key={i} variant="outlined" sx={{ p: 2, mb: 2 }}>
                  <Box display="flex" gap={2}>
                    <Skeleton variant="circular" width={36} height={36} />
                    <Box flex={1}>
                      <Skeleton variant="text" width={120} />
                      <Skeleton variant="text" />
                      <Skeleton variant="text" width="80%" />
                    </Box>
                  </Box>
                </Paper>
              ))}
            </Box>
          ) : commentsError ? (
            <Alert severity="error">{commentsError}</Alert>
          ) : comments.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              No comments yet
            </Typography>
          ) : (
            <Box>
              {comments.map((comment) => (
                <Comment key={comment.id} comment={comment} onImageClick={handleImageClick} />
              ))}
            </Box>
          )}

          {/* Comments Pagination */}
          {commentsTotal > 0 && (
            <TablePagination
              component="div"
              count={commentsTotal}
              page={commentsPage}
              onPageChange={handleCommentsPageChange}
              rowsPerPage={commentsPerPage}
              onRowsPerPageChange={handleCommentsPerPageChange}
              rowsPerPageOptions={[5, 10, 25]}
              sx={{ borderTop: 1, borderColor: 'divider', mt: 2 }}
            />
          )}
        </Box>
      </Box>
      
      {/* Image Preview Dialog */}
      <Dialog
        open={Boolean(previewImage)}
        onClose={handleClosePreview}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'transparent',
            boxShadow: 'none',
            maxHeight: '95vh'
          }
        }}
      >
        <DialogContent 
          sx={{ 
            p: 0, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            bgcolor: 'rgba(0,0,0,0.9)',
            position: 'relative'
          }}
        >
          <IconButton
            onClick={handleClosePreview}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              color: 'white',
              bgcolor: 'rgba(0,0,0,0.5)',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }
            }}
          >
            <CloseIcon />
          </IconButton>
          {previewImage && (
            <Box
              component="img"
              src={previewImage}
              alt="Preview"
              sx={{
                maxWidth: '100%',
                maxHeight: '90vh',
                objectFit: 'contain'
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Comment Success Snackbar */}
      <Snackbar
        open={commentSuccess}
        autoHideDuration={3000}
        onClose={() => setCommentSuccess(false)}
        message="Comment posted successfully!"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
      
      {/* Update Success Snackbar */}
      <Snackbar
        open={Boolean(updateSuccess)}
        autoHideDuration={3000}
        onClose={() => setUpdateSuccess('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setUpdateSuccess('')} 
          severity="success" 
          variant="filled"
          sx={{ width: '100%' }}
        >
          {updateSuccess}
        </Alert>
      </Snackbar>
      
      {/* Update Error Snackbar */}
      <Snackbar
        open={Boolean(updateError)}
        autoHideDuration={5000}
        onClose={() => setUpdateError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setUpdateError('')} 
          severity="error" 
          variant="filled"
          sx={{ width: '100%' }}
        >
          {updateError}
        </Alert>
      </Snackbar>
    </Drawer>
  );
};

export default TicketDetailPanel;
