/**
 * MentionInput Component
 * A rich text input with @mention autocomplete for JIRA users
 * Uses react-mentions library
 */
import React, { useState, useCallback, useRef } from 'react';
import { MentionsInput, Mention } from 'react-mentions';
import { Box, Avatar, Typography, CircularProgress } from '@mui/material';
import jiraAPI from '../services/jiraService';

// Styles for the MentionsInput to match MUI TextField
const mentionInputStyle = {
  control: {
    backgroundColor: '#fff',
    fontSize: 14,
    fontFamily: '"Roboto","Helvetica","Arial",sans-serif',
  },
  '&multiLine': {
    control: {
      minHeight: 80,
    },
    highlighter: {
      padding: '12px 14px',
      border: '1px solid transparent',
    },
    input: {
      padding: '12px 14px',
      border: '1px solid rgba(0, 0, 0, 0.23)',
      borderRadius: 4,
      outline: 'none',
      '&:focus': {
        borderColor: '#1976d2',
        borderWidth: 2,
      },
    },
  },
  suggestions: {
    list: {
      backgroundColor: 'white',
      border: '1px solid rgba(0,0,0,0.15)',
      borderRadius: 8,
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      fontSize: 14,
      maxHeight: 250,
      overflow: 'auto',
    },
    item: {
      padding: '8px 12px',
      borderBottom: '1px solid rgba(0,0,0,0.08)',
      '&focused': {
        backgroundColor: 'rgba(25, 118, 210, 0.08)',
      },
    },
  },
};

// Custom style for highlighted mentions in the input
const mentionStyle = {
  backgroundColor: 'rgba(25, 118, 210, 0.15)',
  borderRadius: '4px',
  padding: '2px 0',
};

/**
 * Render a user suggestion item in the dropdown
 */
const renderSuggestion = (suggestion, search, highlightedDisplay, index, focused) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1.5,
      py: 0.5,
      bgcolor: focused ? 'action.hover' : 'transparent',
      cursor: 'pointer',
    }}
  >
    <Avatar 
      src={suggestion.avatarUrl} 
      sx={{ width: 28, height: 28, fontSize: '0.75rem' }}
    >
      {suggestion.display?.charAt(0) || '?'}
    </Avatar>
    <Box sx={{ minWidth: 0, flex: 1 }}>
      <Typography variant="body2" fontWeight={500} noWrap>
        {suggestion.display}
      </Typography>
      {suggestion.email && (
        <Typography variant="caption" color="text.secondary" noWrap>
          {suggestion.email}
        </Typography>
      )}
    </Box>
  </Box>
);

/**
 * MentionInput Component
 * 
 * @param {string} value - The current input value (with mention markup)
 * @param {function} onChange - Called when value changes: (newValue, plainText, mentions) => void
 * @param {string} placeholder - Placeholder text
 * @param {boolean} disabled - Whether the input is disabled
 * @param {number} rows - Minimum number of rows (for multiline)
 * @param {object} sx - Additional MUI sx styles for the container
 */
const MentionInput = ({ 
  value, 
  onChange, 
  placeholder = 'Write a comment... Type @ to mention someone',
  disabled = false,
  rows = 3,
  sx = {},
}) => {
  const [loading, setLoading] = useState(false);
  const searchTimeoutRef = useRef(null);

  /**
   * Fetch users for mention suggestions
   * Debounced to avoid excessive API calls
   */
  const fetchUsers = useCallback(async (query, callback) => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce the search
    searchTimeoutRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const users = await jiraAPI.searchUsers(query);
        const suggestions = users.map(user => ({
          id: user.accountId,
          display: user.displayName,
          email: user.emailAddress,
          avatarUrl: user.avatarUrl,
        }));
        callback(suggestions);
      } catch (error) {
        console.error('Error fetching users:', error);
        callback([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  /**
   * Handle input change
   * Parses the value to extract mentions
   */
  const handleChange = (event, newValue, newPlainTextValue, mentions) => {
    if (onChange) {
      onChange(newValue, newPlainTextValue, mentions);
    }
  };

  // Calculate minHeight based on rows
  const minHeight = rows * 24 + 24; // ~24px per row + padding

  return (
    <Box 
      sx={{ 
        position: 'relative',
        '& .mentions-input': {
          fontFamily: '"Roboto","Helvetica","Arial",sans-serif',
        },
        '& .mentions-input__control': {
          minHeight,
        },
        '& .mentions-input__input': {
          padding: '12px 14px',
          border: '1px solid rgba(0, 0, 0, 0.23)',
          borderRadius: '4px',
          fontSize: '14px',
          lineHeight: 1.5,
          minHeight,
          resize: 'vertical',
          outline: 'none',
          transition: 'border-color 0.2s',
          '&:hover': {
            borderColor: 'rgba(0, 0, 0, 0.87)',
          },
          '&:focus': {
            borderColor: '#1976d2',
            borderWidth: '2px',
            padding: '11px 13px', // Adjust for border width
          },
        },
        '& .mentions-input__highlighter': {
          padding: '12px 14px',
          border: '1px solid transparent',
          minHeight,
        },
        '& .mentions-input__suggestions': {
          backgroundColor: 'white',
          border: '1px solid rgba(0,0,0,0.12)',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          marginTop: '4px',
          zIndex: 1300,
        },
        '& .mentions-input__suggestions__list': {
          maxHeight: 250,
          overflow: 'auto',
        },
        '& .mentions-input__suggestions__item': {
          padding: '8px 12px',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          '&:last-child': {
            borderBottom: 'none',
          },
        },
        '& .mentions-input__suggestions__item--focused': {
          backgroundColor: 'rgba(25, 118, 210, 0.08)',
        },
        ...sx,
      }}
    >
      <MentionsInput
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className="mentions-input"
        style={mentionInputStyle}
        a11ySuggestionsListLabel="Suggested users"
        allowSuggestionsAboveCursor
      >
        <Mention
          trigger="@"
          data={fetchUsers}
          style={mentionStyle}
          renderSuggestion={renderSuggestion}
          displayTransform={(id, display) => `@${display}`}
          markup="@[__display__](__id__)"
          appendSpaceOnAdd
        />
      </MentionsInput>
      
      {loading && (
        <Box 
          sx={{ 
            position: 'absolute', 
            right: 12, 
            top: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          <CircularProgress size={16} />
        </Box>
      )}
    </Box>
  );
};

/**
 * Parse the mention markup to extract mentions array
 * Converts "@[Display Name](accountId)" format to array of {id, display}
 * 
 * @param {string} text - The text with mention markup
 * @returns {Array} Array of {id, display} objects
 */
export const parseMentions = (text) => {
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const mentions = [];
  let match;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push({
      display: match[1],
      id: match[2],
    });
  }
  
  return mentions;
};

/**
 * Convert markup text to plain text for display
 * Converts "@[Display Name](accountId)" to "@Display Name"
 * 
 * @param {string} text - The text with mention markup
 * @returns {string} Plain text with @mentions
 */
export const getPlainText = (text) => {
  return text.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1');
};

export default MentionInput;
