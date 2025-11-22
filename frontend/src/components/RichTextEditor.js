import React, { useState, useEffect, useRef } from 'react';
import { Editor } from 'react-draft-wysiwyg';
import { EditorState, ContentState, convertToRaw, Modifier } from 'draft-js';
import draftToHtml from 'draftjs-to-html';
import htmlToDraft from 'html-to-draftjs';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';
import { Box, Typography, Paper, IconButton } from '@mui/material';
import { AttachFile as AttachFileIcon, Close as CloseIcon } from '@mui/icons-material';

/**
 * RichTextEditor Component
 * 
 * A rich text editor with inline media support via drag-and-drop or file selection.
 * Media files are stored separately but referenced inline with placeholders.
 * 
 * Features:
 * - Drag and drop media files (images/videos)
 * - Inline media placeholders in the editor
 * - Media files stored separately for Confluence upload
 * - Converts to HTML for display and storage
 * 
 * @param {Object} props
 * @param {string} props.value - Initial HTML content
 * @param {Function} props.onChange - Callback when content or media changes (content, mediaFiles)
 * @param {string} props.placeholder - Placeholder text
 * @param {Array} props.existingMedia - Array of existing media URLs from backend
 */
const RichTextEditor = ({ value = '', onChange, placeholder = 'Describe the issue...', existingMedia = [] }) => {
    const [editorState, setEditorState] = useState(() => {
        if (value) {
            const contentBlock = htmlToDraft(value);
            if (contentBlock) {
                const contentState = ContentState.createFromBlockArray(contentBlock.contentBlocks);
                return EditorState.createWithContent(contentState);
            }
        }
        return EditorState.createEmpty();
    });

    const [mediaFiles, setMediaFiles] = useState([]);
    const [mediaPlaceholders, setMediaPlaceholders] = useState([]);
    const fileInputRef = useRef(null);

    // Notify parent of changes
    useEffect(() => {
        const rawContentState = convertToRaw(editorState.getCurrentContent());
        const html = draftToHtml(rawContentState);
        
        if (onChange) {
            onChange(html, mediaFiles);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editorState, mediaFiles]);

    const handleEditorChange = (newEditorState) => {
        setEditorState(newEditorState);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const files = Array.from(e.dataTransfer.files);
        const mediaFilesArray = files.filter(file => 
            file.type.startsWith('image/') || file.type.startsWith('video/')
        );
        
        if (mediaFilesArray.length > 0) {
            addMediaFiles(mediaFilesArray);
        }
    };

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            addMediaFiles(files);
        }
    };

    const addMediaFiles = (files) => {
        // Create placeholders for each file
        const newPlaceholders = files.map((file, index) => ({
            id: `media_${Date.now()}_${index}`,
            name: file.name,
            type: file.type.startsWith('image/') ? 'image' : 'video',
            file: file
        }));

        setMediaPlaceholders(prev => [...prev, ...newPlaceholders]);
        setMediaFiles(prev => [...prev, ...files]);

        // Insert placeholder text in editor
        const currentContent = editorState.getCurrentContent();
        const selection = editorState.getSelection();
        
        let newContentState = currentContent;
        newPlaceholders.forEach(placeholder => {
            const textToInsert = `\n[${placeholder.type.toUpperCase()}: ${placeholder.name}]\n`;
            newContentState = Modifier.insertText(
                newContentState,
                selection,
                textToInsert
            );
        });

        const newEditorState = EditorState.push(
            editorState,
            newContentState,
            'insert-characters'
        );
        setEditorState(newEditorState);
    };

    const removeMediaFile = (index) => {
        setMediaFiles(prev => prev.filter((_, i) => i !== index));
        setMediaPlaceholders(prev => prev.filter((_, i) => i !== index));
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    return (
        <Box>
            <Paper
                variant="outlined"
                sx={{
                    minHeight: 300,
                    border: '1px solid #e0e0e0',
                    borderRadius: 1,
                    overflow: 'hidden'
                }}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
            >
                <Editor
                    editorState={editorState}
                    onEditorStateChange={handleEditorChange}
                    placeholder={placeholder}
                    toolbar={{
                        options: ['inline', 'blockType', 'list', 'link', 'history'],
                        inline: {
                            options: ['bold', 'italic', 'underline', 'strikethrough', 'monospace']
                        },
                        blockType: {
                            inDropdown: true,
                            options: ['Normal', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'Blockquote', 'Code']
                        },
                        list: {
                            options: ['unordered', 'ordered']
                        }
                    }}
                    editorStyle={{
                        minHeight: 250,
                        padding: '0 15px',
                        fontSize: '14px',
                        lineHeight: '1.6'
                    }}
                    toolbarStyle={{
                        border: 'none',
                        borderBottom: '1px solid #e0e0e0',
                        marginBottom: 0
                    }}
                />
            </Paper>

            {/* Media Upload Section */}
            <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                        Media Files (Images/Videos)
                    </Typography>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        style={{ display: 'none' }}
                        onChange={handleFileSelect}
                    />
                    <IconButton
                        size="small"
                        color="primary"
                        onClick={() => fileInputRef.current?.click()}
                        title="Add media files"
                    >
                        <AttachFileIcon fontSize="small" />
                    </IconButton>
                </Box>

                {/* Display uploaded media files with previews */}
                {mediaPlaceholders.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
                        {mediaPlaceholders.map((placeholder, index) => (
                            <Paper
                                key={placeholder.id}
                                elevation={2}
                                sx={{ 
                                    position: 'relative',
                                    width: 200,
                                    border: '2px solid #e0e0e0',
                                    borderRadius: 1,
                                    overflow: 'hidden'
                                }}
                            >
                                <IconButton
                                    size="small"
                                    onClick={() => removeMediaFile(index)}
                                    sx={{
                                        position: 'absolute',
                                        top: 4,
                                        right: 4,
                                        bgcolor: 'rgba(255,255,255,0.9)',
                                        '&:hover': { bgcolor: 'rgba(255,255,255,1)' },
                                        zIndex: 1
                                    }}
                                >
                                    <CloseIcon fontSize="small" />
                                </IconButton>
                                {placeholder.type === 'image' ? (
                                    <img
                                        src={URL.createObjectURL(placeholder.file)}
                                        alt={placeholder.name}
                                        style={{
                                            width: '100%',
                                            height: 150,
                                            objectFit: 'cover',
                                            display: 'block'
                                        }}
                                    />
                                ) : (
                                    <Box
                                        sx={{
                                            width: '100%',
                                            height: 150,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            bgcolor: '#f5f5f5'
                                        }}
                                    >
                                        <video
                                            src={URL.createObjectURL(placeholder.file)}
                                            style={{
                                                maxWidth: '100%',
                                                maxHeight: '100%',
                                                display: 'block'
                                            }}
                                            controls
                                        />
                                    </Box>
                                )}
                                <Box sx={{ p: 1, bgcolor: '#f9f9f9' }}>
                                    <Typography variant="caption" noWrap title={placeholder.name}>
                                        {placeholder.name}
                                    </Typography>
                                </Box>
                            </Paper>
                        ))}
                    </Box>
                )}

                {/* Display existing media from backend */}
                {existingMedia && existingMedia.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                            💾 {existingMedia.length} existing media file(s) attached
                        </Typography>
                    </Box>
                )}

                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                    💡 Tip: Drag and drop images or videos directly into the editor area, or click the attach icon to select files.
                </Typography>
            </Box>
        </Box>
    );
};

export default RichTextEditor;
