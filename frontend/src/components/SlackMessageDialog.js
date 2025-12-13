/**
 * Slack Message Dialog Component
 * 
 * Allows users to send Slack DMs about production tickets.
 * Supports two modes:
 * 1. Send as user (using OAuth token - message appears from the sender)
 * 2. Send via bot (using bot token - message includes sender attribution)
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
  Box,
  Autocomplete,
  Avatar,
  Chip,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Send as SendIcon,
  Person as PersonIcon,
  SmartToy as BotIcon,
  Close as CloseIcon,
  Settings as SettingsIcon,
  Link as LinkIcon,
} from '@mui/icons-material';
import api from '../services/api';

const SlackMessageDialog = ({ 
  open, 
  onClose, 
  ticket = null, // Optional ticket context
  defaultRecipientEmail = null, // Pre-select recipient by email
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form state
  const [recipients, setRecipients] = useState([]); // Array of recipients for group DM
  const [message, setMessage] = useState('');
  const [sendMode, setSendMode] = useState('user'); // 'user' or 'bot'
  
  // Slack data
  const [slackUsers, setSlackUsers] = useState([]);
  const [slackStatus, setSlackStatus] = useState({ connected: false, configured: false });

  // Fetch Slack users and connection status
  useEffect(() => {
    if (open) {
      fetchSlackData();
    }
  }, [open]);

  // Pre-populate message with ticket info
  useEffect(() => {
    if (ticket && open) {
      const ticketSummary = ticket.summary || ticket.title || 'No summary available';
      const priority = ticket.priority || 'Unknown';
      const status = ticket.status || 'Unknown';
      const assignee = ticket.assignee || 'Unassigned';
      
      setMessage(`Hi,

Could you please look into the following production ticket when you get a chance?

*Ticket:* ${ticket.key}\n*Summary:* ${ticketSummary}\n*Priority:* ${priority}\n*Status:* ${status}\n*Assignee:* ${assignee}

Please let me know if you need any additional information.

Thanks!`);
    }
  }, [ticket, open]);

  // Find recipient by email if provided
  useEffect(() => {
    if (defaultRecipientEmail && slackUsers.length > 0) {
      const foundUser = slackUsers.find(
        u => u.email?.toLowerCase() === defaultRecipientEmail.toLowerCase()
      );
      if (foundUser) {
        setRecipients([foundUser]);
      }
    }
  }, [defaultRecipientEmail, slackUsers]);

  const fetchSlackData = async () => {
    setLoading(true);
    setError('');
    try {
      const [statusRes, usersRes] = await Promise.all([
        api.get('/slack/status'),
        api.get('/slack/users')
      ]);
      
      setSlackStatus(statusRes.data);
      setSlackUsers(usersRes.data || []);
      
      // Default to bot mode if user is not connected
      if (!statusRes.data.connected) {
        setSendMode('bot');
      }
    } catch (err) {
      console.error('Failed to load Slack data:', err);
      setError('Failed to load Slack users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (recipients.length === 0) {
      setError('Please select at least one recipient');
      return;
    }
    if (!message.trim()) {
      setError('Please enter a message');
      return;
    }

    setSending(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/slack/send-dm', {
        recipient_slack_ids: recipients.map(r => r.id),
        message: message.trim(),
        send_as_user: sendMode === 'user',
        ticket_key: ticket?.key || null
      });

      if (response.data.success) {
        const sentAs = response.data.sent_as === 'user' 
          ? 'from your account' 
          : 'via bot';
        const groupText = recipients.length > 1 ? ' to group' : '';
        setSuccess(`Message sent${groupText} successfully ${sentAs}!`);
        
        // Close dialog after short delay
        setTimeout(() => {
          handleClose();
        }, 1500);
      }
    } catch (err) {
      // Handle different error formats
      let errorMsg = 'Failed to send message';
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (typeof detail === 'string') {
          errorMsg = detail;
        } else if (Array.isArray(detail)) {
          // Pydantic validation errors come as array
          errorMsg = detail.map(e => e.msg || e.message || JSON.stringify(e)).join(', ');
        } else if (typeof detail === 'object') {
          errorMsg = detail.msg || detail.message || JSON.stringify(detail);
        }
      }
      setError(errorMsg);
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setRecipients([]);
    setMessage('');
    setSendMode('user');
    setError('');
    setSuccess('');
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SendIcon color="primary" />
          <Typography variant="h6">Send Slack Message</Typography>
        </Box>
        {ticket && (
          <Typography variant="body2" color="text.secondary">
            Regarding: {ticket.key}
          </Typography>
        )}
      </DialogTitle>
      
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {error && (
              <Alert severity="error" onClose={() => setError('')}>
                {error}
              </Alert>
            )}
            
            {success && (
              <Alert severity="success">
                {success}
              </Alert>
            )}

            {/* Send Mode Selection */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                How would you like to send this message?
              </Typography>
              <FormControl component="fieldset">
                <RadioGroup
                  row
                  value={sendMode}
                  onChange={(e) => setSendMode(e.target.value)}
                >
                  <FormControlLabel
                    value="user"
                    control={<Radio />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PersonIcon fontSize="small" />
                        <span>Send as me</span>
                        {!slackStatus.connected && (
                          <Chip label="Not connected" size="small" color="warning" />
                        )}
                      </Box>
                    }
                    disabled={!slackStatus.connected}
                  />
                  <FormControlLabel
                    value="bot"
                    control={<Radio />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <BotIcon fontSize="small" />
                        <span>Send via bot</span>
                      </Box>
                    }
                  />
                </RadioGroup>
              </FormControl>
              
              {sendMode === 'user' && slackStatus.connected && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  Message will appear as sent directly from you ({slackStatus.display_name})
                </Typography>
              )}
              {sendMode === 'bot' && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  Message will be sent by the bot with your name attribution
                </Typography>
              )}
              
              {!slackStatus.connected && (
                <Alert 
                  severity="info" 
                  sx={{ mt: 1 }}
                  action={
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        color="inherit"
                        size="small"
                        startIcon={<LinkIcon />}
                        onClick={async () => {
                          try {
                            const response = await api.get('/slack/connect');
                            if (response.data.auth_url) {
                              window.open(response.data.auth_url, '_blank', 'width=600,height=700');
                            }
                          } catch (err) {
                            setError('Failed to initiate Slack connection');
                          }
                        }}
                      >
                        Connect Now
                      </Button>
                      <Button
                        color="inherit"
                        size="small"
                        startIcon={<SettingsIcon />}
                        onClick={() => {
                          handleClose();
                          navigate('/settings');
                        }}
                      >
                        Settings
                      </Button>
                    </Box>
                  }
                >
                  <Typography variant="body2">
                    <strong>Tip:</strong> Connect your Slack account to send messages as yourself instead of via bot.
                  </Typography>
                </Alert>
              )}
            </Box>

            <Divider />

            {/* Recipient Selection */}
            <Autocomplete
              multiple
              value={recipients}
              onChange={(event, newValue) => setRecipients(newValue)}
              options={slackUsers}
              getOptionLabel={(option) => option.real_name || option.name || ''}
              renderOption={(props, option) => (
                <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar 
                    src={option.avatar} 
                    sx={{ width: 32, height: 32 }}
                  >
                    {(option.real_name || option.name || '?')[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="body2">
                      {option.real_name || option.name}
                    </Typography>
                    {option.email && (
                      <Typography variant="caption" color="text.secondary">
                        {option.email}
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    avatar={<Avatar src={option.avatar}>{(option.real_name || option.name || '?')[0]}</Avatar>}
                    label={option.real_name || option.name}
                    size="small"
                    {...getTagProps({ index })}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Recipients"
                  placeholder={recipients.length === 0 ? "Search by name or email..." : "Add more recipients..."}
                  required
                  helperText={recipients.length > 1 ? `${recipients.length} recipients selected (group message)` : ''}
                />
              )}
              isOptionEqualToValue={(option, value) => option.id === value?.id}
              filterOptions={(options, { inputValue }) => {
                const filter = inputValue.toLowerCase();
                return options.filter(
                  opt =>
                    opt.real_name?.toLowerCase().includes(filter) ||
                    opt.name?.toLowerCase().includes(filter) ||
                    opt.email?.toLowerCase().includes(filter) ||
                    opt.display_name?.toLowerCase().includes(filter)
                );
              }}
            />

            {/* Message Input */}
            <TextField
              label="Message"
              multiline
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              required
              fullWidth
            />
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose} startIcon={<CloseIcon />}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSend}
          disabled={loading || sending || recipients.length === 0 || !message.trim()}
          startIcon={sending ? <CircularProgress size={16} /> : <SendIcon />}
        >
          {sending ? 'Sending...' : recipients.length > 1 ? 'Send to Group' : 'Send Message'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SlackMessageDialog;
