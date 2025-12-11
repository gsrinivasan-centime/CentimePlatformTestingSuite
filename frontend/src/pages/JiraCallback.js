/**
 * JIRA OAuth Callback Page
 * Handles the redirect from Atlassian OAuth and communicates result to parent window
 */
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Paper,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';

const JiraCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing'); // processing, success, error
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Parse callback parameters
    const success = searchParams.get('success') === 'true';
    const error = searchParams.get('error');
    const errorMessage = searchParams.get('message');
    const name = searchParams.get('name');
    const site = searchParams.get('site');

    if (success) {
      setStatus('success');
      setMessage(`Successfully connected as ${decodeURIComponent(name || 'JIRA User')}`);
      
      // Notify parent window
      if (window.opener) {
        window.opener.postMessage({
          type: 'JIRA_OAUTH_CALLBACK',
          success: true,
          name: name ? decodeURIComponent(name) : null,
          site: site ? decodeURIComponent(site) : null,
        }, window.location.origin);
        
        // Close popup after short delay
        setTimeout(() => {
          window.close();
        }, 2000);
      }
    } else if (error) {
      setStatus('error');
      setMessage(errorMessage ? decodeURIComponent(errorMessage) : `Error: ${error}`);
      
      // Notify parent window
      if (window.opener) {
        window.opener.postMessage({
          type: 'JIRA_OAUTH_CALLBACK',
          success: false,
          error: errorMessage ? decodeURIComponent(errorMessage) : error,
        }, window.location.origin);
      }
    } else {
      // No parameters - might be direct navigation
      setStatus('error');
      setMessage('Invalid callback. Please try connecting again.');
    }
  }, [searchParams]);

  const handleClose = () => {
    if (window.opener) {
      window.close();
    } else {
      navigate('/production-tickets');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 3,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          maxWidth: 400,
          width: '100%',
          textAlign: 'center',
        }}
      >
        {status === 'processing' && (
          <>
            <CircularProgress size={60} sx={{ mb: 3 }} />
            <Typography variant="h6" gutterBottom>
              Processing...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please wait while we complete the connection.
            </Typography>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircleIcon 
              sx={{ fontSize: 60, color: 'success.main', mb: 2 }} 
            />
            <Typography variant="h6" gutterBottom color="success.main">
              Connected Successfully!
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              {message}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              This window will close automatically...
            </Typography>
            <Button
              variant="outlined"
              onClick={handleClose}
              sx={{ mt: 2 }}
            >
              Close Window
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <ErrorIcon 
              sx={{ fontSize: 60, color: 'error.main', mb: 2 }} 
            />
            <Typography variant="h6" gutterBottom color="error.main">
              Connection Failed
            </Typography>
            <Alert severity="error" sx={{ mt: 2, mb: 3, textAlign: 'left' }}>
              {message}
            </Alert>
            <Button
              variant="contained"
              onClick={handleClose}
            >
              Close and Try Again
            </Button>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default JiraCallback;
