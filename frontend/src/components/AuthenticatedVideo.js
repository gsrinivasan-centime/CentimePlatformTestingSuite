import React, { useState, useEffect } from 'react';
import { CircularProgress, Box } from '@mui/material';
import api from '../services/api';

const AuthenticatedVideo = ({ src, width = '640', height = '360', ...props }) => {
    const [videoSrc, setVideoSrc] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const fetchVideo = async () => {
            try {
                setLoading(true);
                setError(false);
                
                console.log('Fetching video from:', src);
                
                // Fetch the video with authentication and timeout
                const response = await api.get(src, {
                    responseType: 'blob',
                    timeout: 60000 // 60 second timeout for larger videos
                });
                
                console.log('Video fetched successfully, size:', response.data.size);
                
                // Create a blob URL for the video
                const videoUrl = URL.createObjectURL(response.data);
                setVideoSrc(videoUrl);
            } catch (err) {
                console.error('Error loading video from:', src, err);
                console.error('Error details:', err.response?.data, err.message);
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        if (src) {
            fetchVideo();
        }

        // Cleanup blob URL on unmount
        return () => {
            if (videoSrc) {
                URL.revokeObjectURL(videoSrc);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [src]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width, height }}>
                <CircularProgress size={60} />
            </Box>
        );
    }

    if (error || !videoSrc) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width, height, bgcolor: 'grey.200' }}>
                Failed to load video
            </Box>
        );
    }

    return (
        <video
            controls
            width={width}
            height={height}
            style={{ border: 'none', maxWidth: '100%' }}
            {...props}
        >
            <source src={videoSrc} />
            Your browser does not support the video tag.
        </video>
    );
};

export default AuthenticatedVideo;
