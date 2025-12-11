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
} from '@mui/icons-material';
import productionTicketsAPI from '../services/productionTicketsService';

// Status color mapping
const statusColors = {
  'Open': 'error',
  'In Progress': 'info',
  'Pending Verification': 'warning',
  'Closed': 'success',
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

const TicketDetailPanel = ({ open, onClose, ticket }) => {
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);
  
  const [comments, setComments] = useState([]);
  const [commentsTotal, setCommentsTotal] = useState(0);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState(null);
  const [commentsPage, setCommentsPage] = useState(0);
  const [commentsPerPage, setCommentsPerPage] = useState(10);
  
  // Image preview state
  const [previewImage, setPreviewImage] = useState(null);
  
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
    }
  }, [open]);

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
              <Chip
                label={details?.status || ticket.status}
                size="small"
                color={statusColors[details?.status || ticket.status] || 'default'}
                sx={{ mt: 0.5 }}
              />
            </Box>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
          <Typography variant="subtitle1" sx={{ mt: 1 }}>
            {details?.summary || ticket.summary}
          </Typography>
        </Box>

        {/* Scrollable content */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          {/* Metadata */}
          <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mb: 2 }}>
            <Box display="flex" alignItems="center" gap={0.5}>
              <PersonIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                Assignee:
              </Typography>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                {(details?.assignee_avatar || ticket.assignee_avatar) && (
                  <Avatar 
                    src={details?.assignee_avatar || ticket.assignee_avatar} 
                    sx={{ width: 20, height: 20 }}
                  />
                )}
                <Typography variant="body2">
                  {details?.assignee || ticket.assignee || 'Unassigned'}
                </Typography>
              </Stack>
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
    </Drawer>
  );
};

export default TicketDetailPanel;
