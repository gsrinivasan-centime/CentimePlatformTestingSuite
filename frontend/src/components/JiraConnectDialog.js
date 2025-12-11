/**
 * JIRA Connect Dialog Component
 * Modal dialog for connecting/disconnecting JIRA OAuth account
 */
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Chip,
  Avatar,
  Divider,
  IconButton,
} from '@mui/material';
import {
  Link as LinkIcon,
  LinkOff as LinkOffIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import jiraAPI from '../services/jiraService';

// JIRA logo SVG
const JiraLogo = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="jira-blue-1" x1="98.03%" y1="0%" x2="58.17%" y2="40.2%">
        <stop offset="18%" stopColor="#0052CC"/>
        <stop offset="100%" stopColor="#2684FF"/>
      </linearGradient>
      <linearGradient id="jira-blue-2" x1="100.17%" y1="0%" x2="55.35%" y2="46.93%">
        <stop offset="18%" stopColor="#0052CC"/>
        <stop offset="100%" stopColor="#2684FF"/>
      </linearGradient>
    </defs>
    <path d="M15.967 0L5.297 10.667L16 21.333L26.703 10.667L15.967 0ZM16 13.907L12.093 10L16 6.093L19.907 10L16 13.907Z" fill="url(#jira-blue-1)"/>
    <path d="M16 13.907C13.867 11.773 13.867 8.227 16 6.093L5.333 16.76L10.667 22.093L16 16.76L16 13.907Z" fill="#2684FF"/>
    <path d="M21.333 10L16 15.333V18.187C18.133 20.32 18.133 23.867 16 26L26.667 15.333L21.333 10Z" fill="url(#jira-blue-2)"/>
  </svg>
);

const JiraConnectDialog = ({ open, onClose, onConnectionChange }) => {
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [error, setError] = useState(null);

  // Fetch connection status on mount
  useEffect(() => {
    if (open) {
      fetchConnectionStatus();
    }
  }, [open]);

  // Listen for OAuth callback messages
  useEffect(() => {
    const handleMessage = (event) => {
      // Only accept messages from our frontend origin
      if (event.origin !== window.location.origin) return;
      
      if (event.data?.type === 'JIRA_OAUTH_CALLBACK') {
        const { success, error: callbackError, name } = event.data;
        
        if (success) {
          fetchConnectionStatus();
          if (onConnectionChange) onConnectionChange(true);
        } else {
          setError(callbackError || 'Connection failed');
        }
        setConnecting(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onConnectionChange]);

  const fetchConnectionStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const status = await jiraAPI.getConnectionStatus();
      setConnectionStatus(status);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch JIRA status');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      const { auth_url } = await jiraAPI.initiateConnect();
      
      // Open OAuth popup
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        auth_url,
        'jira-oauth',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
      );
      
      // Check if popup was blocked
      if (!popup) {
        setError('Popup blocked. Please allow popups and try again.');
        setConnecting(false);
        return;
      }
      
      // Poll for popup closure (fallback if postMessage fails)
      const pollTimer = setInterval(() => {
        if (popup.closed) {
          clearInterval(pollTimer);
          // Refresh status after popup closes
          setTimeout(() => {
            fetchConnectionStatus();
            setConnecting(false);
          }, 500);
        }
      }, 500);
      
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to initiate connection');
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    setError(null);
    try {
      await jiraAPI.disconnect();
      setConnectionStatus({ configured: true, connected: false });
      if (onConnectionChange) onConnectionChange(false);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to disconnect');
    } finally {
      setDisconnecting(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <Box display="flex" flexDirection="column" alignItems="center" py={4}>
          <CircularProgress size={40} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Checking JIRA connection status...
          </Typography>
        </Box>
      );
    }

    if (!connectionStatus?.configured) {
      return (
        <Alert severity="warning" sx={{ mb: 2 }}>
          JIRA OAuth is not configured on the server. Please contact your administrator.
        </Alert>
      );
    }

    if (connectionStatus?.connected) {
      return (
        <Box>
          <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 3 }}>
            Your JIRA account is connected!
          </Alert>
          
          <Box 
            sx={{ 
              p: 2, 
              bgcolor: 'background.default', 
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <Avatar sx={{ bgcolor: 'primary.main' }}>
                {connectionStatus.display_name?.charAt(0) || 'J'}
              </Avatar>
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">
                  {connectionStatus.display_name || 'JIRA User'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {connectionStatus.email}
                </Typography>
              </Box>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary">
                Token expires:
              </Typography>
              <Chip 
                size="small"
                color={connectionStatus.expired ? 'error' : 'success'}
                label={connectionStatus.expired ? 'Expired' : 'Active'}
              />
            </Box>
            
            {connectionStatus.expires_at && (
              <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                {new Date(connectionStatus.expires_at).toLocaleString()}
              </Typography>
            )}
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Comments you post on tickets will appear under your JIRA account name.
          </Typography>
        </Box>
      );
    }

    // Not connected
    return (
      <Box>
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <JiraLogo />
          <Box>
            <Typography variant="h6">Connect to JIRA</Typography>
            <Typography variant="body2" color="text.secondary">
              Authorize this app to post comments on your behalf
            </Typography>
          </Box>
        </Box>
        
        <Alert severity="info" sx={{ mb: 2 }}>
          Connect your JIRA account to post comments on production tickets. 
          Comments will appear under your JIRA username.
        </Alert>
        
        <Typography variant="body2" color="text.secondary" paragraph>
          You'll be redirected to Atlassian to authorize this application. 
          We only request permission to:
        </Typography>
        
        <Box component="ul" sx={{ pl: 2, color: 'text.secondary' }}>
          <li><Typography variant="body2">Read JIRA issues and comments</Typography></li>
          <li><Typography variant="body2">Post comments on your behalf</Typography></li>
          <li><Typography variant="body2">Access your basic profile information</Typography></li>
        </Box>
      </Box>
    );
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1}>
            <LinkIcon color="primary" />
            <Typography variant="h6">JIRA Integration</Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {renderContent()}
      </DialogContent>
      
      <DialogActions sx={{ px: 3, py: 2 }}>
        {connectionStatus?.connected ? (
          <>
            <Button 
              onClick={fetchConnectionStatus} 
              startIcon={<RefreshIcon />}
              disabled={loading}
            >
              Refresh Status
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={handleDisconnect}
              disabled={disconnecting}
              startIcon={disconnecting ? <CircularProgress size={16} /> : <LinkOffIcon />}
            >
              {disconnecting ? 'Disconnecting...' : 'Disconnect'}
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleConnect}
              disabled={connecting || !connectionStatus?.configured}
              startIcon={connecting ? <CircularProgress size={16} color="inherit" /> : <LinkIcon />}
            >
              {connecting ? 'Connecting...' : 'Connect to JIRA'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default JiraConnectDialog;
