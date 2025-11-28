import React, { useMemo } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import AuthenticatedImage from './AuthenticatedImage';
import AuthenticatedVideo from './AuthenticatedVideo';

/**
 * IssueContentRenderer Component
 * 
 * Renders issue description HTML content with inline media placeholders replaced
 * by actual media components (images/videos from Confluence).
 * 
 * This component takes HTML content with placeholders like:
 * [IMAGE: filename.png] or [VIDEO: recording.mp4]
 * 
 * And replaces them with actual media components that fetch from Confluence.
 * 
 * @param {Object} props
 * @param {string} props.htmlContent - The HTML content with placeholders
 * @param {Array} props.mediaUrls - Array of media URLs from Confluence (screenshots and video)
 * @param {string} props.videoUrl - Video URL from issue
 * @param {string} props.screenshotUrls - Newline-separated screenshot URLs from issue
 */
const IssueContentRenderer = ({ htmlContent = '', mediaUrls = [], videoUrl = '', screenshotUrls = '' }) => {
    // Parse screenshot URLs
    const screenshots = useMemo(() => {
        if (screenshotUrls && typeof screenshotUrls === 'string') {
            return screenshotUrls.split('\n').filter(url => url.trim() !== '');
        }
        return [];
    }, [screenshotUrls]);

    // Combine all media
    const allMedia = useMemo(() => {
        const media = [];
        
        // Add video if exists
        if (videoUrl) {
            media.push({ type: 'video', url: videoUrl });
        }
        
        // Add screenshots
        screenshots.forEach(url => {
            media.push({ type: 'image', url });
        });
        
        return media;
    }, [videoUrl, screenshots]);

    // Parse HTML and replace placeholders with media components
    const renderContent = () => {
        if (!htmlContent || htmlContent.trim() === '' || htmlContent === '<p></p>\n') {
            // If no description but has media, show them
            if (allMedia.length > 0) {
                return (
                    <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            No description provided.
                        </Typography>
                    </Box>
                );
            }
            return <Typography variant="body2" color="text.secondary">No description provided.</Typography>;
        }

        // Split content by media placeholders
        const placeholderRegex = /\[(IMAGE|VIDEO):\s*([^\]]+)\]/g;
        const parts = [];
        let lastIndex = 0;
        let mediaIndex = 0;
        let match;

        while ((match = placeholderRegex.exec(htmlContent)) !== null) {
            // Add text before placeholder
            if (match.index > lastIndex) {
                const textContent = htmlContent.substring(lastIndex, match.index);
                if (textContent.trim()) {
                    parts.push({
                        type: 'html',
                        content: textContent,
                        key: `text-${lastIndex}`
                    });
                }
            }

            // Add media component
            const mediaType = match[1].toLowerCase();
            const fileName = match[2].trim();
            
            if (mediaIndex < allMedia.length) {
                parts.push({
                    type: mediaType,
                    url: allMedia[mediaIndex].url,
                    fileName: fileName,
                    key: `media-${mediaIndex}`
                });
                mediaIndex++;
            } else {
                // No more media URLs, show placeholder text
                parts.push({
                    type: 'placeholder',
                    content: match[0],
                    key: `placeholder-${match.index}`
                });
            }

            lastIndex = match.index + match[0].length;
        }

        // Add remaining text after last placeholder
        if (lastIndex < htmlContent.length) {
            const textContent = htmlContent.substring(lastIndex);
            if (textContent.trim()) {
                parts.push({
                    type: 'html',
                    content: textContent,
                    key: `text-${lastIndex}`
                });
            }
        }

        // If no placeholders found, render the entire HTML
        if (parts.length === 0) {
            parts.push({
                type: 'html',
                content: htmlContent,
                key: 'full-content'
            });
        }

        return parts.map(part => {
            switch (part.type) {
                case 'html':
                    return (
                        <Box 
                            key={part.key}
                            dangerouslySetInnerHTML={{ __html: part.content }}
                            sx={{ 
                                '& p': { margin: '0.5em 0' },
                                '& ul, & ol': { marginLeft: '1.5em' },
                                '& h1, & h2, & h3, & h4, & h5, & h6': { marginTop: '0.75em', marginBottom: '0.5em' },
                                '& blockquote': { borderLeft: '3px solid #ddd', paddingLeft: '1em', margin: '1em 0', color: '#666' },
                                '& code': { backgroundColor: '#f5f5f5', padding: '2px 4px', borderRadius: '3px', fontSize: '0.9em' }
                            }}
                        />
                    );
                case 'image':
                    return (
                        <Paper 
                            key={part.key}
                            elevation={2}
                            sx={{ 
                                my: 2, 
                                p: 1, 
                                display: 'inline-block',
                                maxWidth: '100%'
                            }}
                        >
                            <AuthenticatedImage 
                                src={part.url} 
                                alt={part.fileName}
                                style={{
                                    maxWidth: '100%',
                                    maxHeight: '400px',
                                    display: 'block',
                                    borderRadius: '4px'
                                }}
                            />
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                {part.fileName}
                            </Typography>
                        </Paper>
                    );
                case 'video':
                    return (
                        <Paper 
                            key={part.key}
                            elevation={2}
                            sx={{ 
                                my: 2, 
                                p: 1,
                                maxWidth: '100%'
                            }}
                        >
                            <AuthenticatedVideo 
                                src={part.url}
                                style={{
                                    maxWidth: '100%',
                                    maxHeight: '400px',
                                    display: 'block',
                                    borderRadius: '4px'
                                }}
                            />
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                {part.fileName}
                            </Typography>
                        </Paper>
                    );
                case 'placeholder':
                    return (
                        <Box 
                            key={part.key}
                            sx={{ 
                                my: 1, 
                                p: 1, 
                                bgcolor: '#f5f5f5', 
                                borderRadius: 1,
                                display: 'inline-block'
                            }}
                        >
                            <Typography variant="caption" color="text.secondary">
                                {part.content}
                            </Typography>
                        </Box>
                    );
                default:
                    return null;
            }
        });
    };

    return (
        <Box sx={{ py: 1 }}>
            {renderContent()}
            
            {/* Fallback: If there are media files but no placeholders in HTML, show them at the end */}
            {allMedia.length > 0 && (!htmlContent || !htmlContent.match(/\[(IMAGE|VIDEO):/g)) && (
                <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                        📎 Attachments ({allMedia.length})
                    </Typography>
                    {allMedia.map((media, index) => (
                        <Paper 
                            key={`fallback-${index}`}
                            elevation={2}
                            sx={{ 
                                my: 1, 
                                p: 1,
                                maxWidth: '100%'
                            }}
                        >
                            {media.type === 'image' ? (
                                <AuthenticatedImage 
                                    src={media.url}
                                    alt={`Attachment ${index + 1}`}
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: '400px',
                                        display: 'block',
                                        borderRadius: '4px'
                                    }}
                                />
                            ) : (
                                <AuthenticatedVideo 
                                    src={media.url}
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: '400px',
                                        display: 'block',
                                        borderRadius: '4px'
                                    }}
                                />
                            )}
                        </Paper>
                    ))}
                </Box>
            )}
        </Box>
    );
};

export default IssueContentRenderer;
