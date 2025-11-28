import React, { useState, useEffect } from 'react';
import { CircularProgress, Box } from '@mui/material';
import api from '../services/api';

const AuthenticatedImage = ({ src, alt, sx, onClick, ...props }) => {
    const [imageSrc, setImageSrc] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const fetchImage = async () => {
            try {
                setLoading(true);
                setError(false);
                
                console.log('Fetching image from:', src);
                
                // Fetch the image with authentication and timeout
                const response = await api.get(src, {
                    responseType: 'blob',
                    timeout: 30000 // 30 second timeout
                });
                
                console.log('Image fetched successfully, size:', response.data.size);
                
                // Create a blob URL for the image
                const imageUrl = URL.createObjectURL(response.data);
                setImageSrc(imageUrl);
            } catch (err) {
                console.error('Error loading image from:', src, err);
                console.error('Error details:', err.response?.data, err.message);
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        if (src) {
            fetchImage();
        }

        // Cleanup blob URL on unmount
        return () => {
            if (imageSrc) {
                URL.revokeObjectURL(imageSrc);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [src]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200, ...sx }}>
                <CircularProgress size={40} />
            </Box>
        );
    }

    if (error || !imageSrc) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200, bgcolor: 'grey.200', ...sx }}>
                Failed to load image
            </Box>
        );
    }

    return (
        <img
            src={imageSrc}
            alt={alt}
            onClick={onClick}
            style={{ cursor: onClick ? 'pointer' : 'default', ...sx }}
            {...props}
        />
    );
};

export default AuthenticatedImage;
