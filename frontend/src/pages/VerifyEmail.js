import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Button,
  Alert
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setStatus('error');
        setMessage('No verification token provided');
        return;
      }

      try {
        const response = await axios.post(`${API_URL}/api/auth/verify-email`, null, {
          params: { token }
        });
        
        setStatus('success');
        setMessage(response.data.message || 'Email verified successfully!');
      } catch (error) {
        setStatus('error');
        if (error.response?.data?.detail) {
          setMessage(error.response.data.detail);
        } else {
          setMessage('Failed to verify email. Please try again or contact support.');
        }
        console.error('Email verification error:', error);
      }
    };

    verifyEmail();
  }, [searchParams]);

  const handleGoToLogin = () => {
    navigate('/login');
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%'
          }}
        >
          {status === 'verifying' && (
            <>
              <CircularProgress size={60} sx={{ mb: 3 }} />
              <Typography variant="h5" gutterBottom>
                Verifying Your Email
              </Typography>
              <Typography color="text.secondary" align="center">
                Please wait while we verify your email address...
              </Typography>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircleIcon 
                sx={{ 
                  fontSize: 80, 
                  color: 'success.main',
                  mb: 2 
                }} 
              />
              <Typography variant="h5" gutterBottom color="success.main">
                Email Verified!
              </Typography>
              <Alert severity="success" sx={{ mt: 2, mb: 3, width: '100%' }}>
                {message}
              </Alert>
              <Typography color="text.secondary" align="center" sx={{ mb: 3 }}>
                Your email has been successfully verified. You can now log in to your account.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={handleGoToLogin}
                fullWidth
              >
                Go to Login
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <ErrorIcon 
                sx={{ 
                  fontSize: 80, 
                  color: 'error.main',
                  mb: 2 
                }} 
              />
              <Typography variant="h5" gutterBottom color="error">
                Verification Failed
              </Typography>
              <Alert severity="error" sx={{ mt: 2, mb: 3, width: '100%' }}>
                {message}
              </Alert>
              <Typography color="text.secondary" align="center" sx={{ mb: 3 }}>
                The verification link may have expired or is invalid.
                Please try registering again or contact support.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={handleGoToLogin}
                fullWidth
              >
                Go to Login
              </Button>
            </>
          )}
        </Paper>
      </Box>
    </Container>
  );
}

export default VerifyEmail;
