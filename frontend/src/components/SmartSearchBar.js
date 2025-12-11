import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Popper,
  Paper,
  List,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Typography,
  CircularProgress,
  Fade,
  ClickAwayListener,
  Chip,
  Divider,
  Button,
  useTheme,
  alpha,
  Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  Close as CloseIcon,
  BugReport as BugIcon,
  Assignment as TestCaseIcon,
  Description as StoryIcon,
  Rocket as ReleaseIcon,
  Dashboard as DashboardIcon,
  GridView as ModulesIcon,
  Assessment as ReportsIcon,
  KeyboardCommandKey,
  ArrowForward as ArrowForwardIcon,
  AutoAwesome as AIIcon,
} from '@mui/icons-material';
import api from '../services/api';

// Icon mapping for different intents/pages
const intentIcons = {
  view_test_cases: TestCaseIcon,
  view_issues: BugIcon,
  view_stories: StoryIcon,
  view_release: ReleaseIcon,
  view_release_dashboard: DashboardIcon,
  view_release_stories: StoryIcon,
  view_release_issues: BugIcon,
  view_modules: ModulesIcon,
  view_reports: ReportsIcon,
  view_executions: ReportsIcon,
  view_dashboard: DashboardIcon,
  unknown: SearchIcon,
};

// Quick search navigation options
const quickSearchOptions = [
  { label: 'Test Cases', path: '/test-cases', icon: TestCaseIcon, keywords: ['test', 'case', 'tc', 'tests'] },
  { label: 'Issues', path: '/issues', icon: BugIcon, keywords: ['issue', 'bug', 'defect', 'problem'] },
  { label: 'Production Tickets', path: '/production-tickets', icon: BugIcon, keywords: ['production', 'prod', 'ticket', 'jira', 'CN-', 'BO', 'prod ticket'] },
  { label: 'Stories', path: '/stories', icon: StoryIcon, keywords: ['story', 'stories', 'jira', 'user story'] },
  { label: 'Releases', path: '/releases', icon: ReleaseIcon, keywords: ['release', 'version', 'deploy'] },
  { label: 'Dashboard', path: '/dashboard', icon: DashboardIcon, keywords: ['dashboard', 'home', 'overview'] },
  { label: 'Modules', path: '/modules', icon: ModulesIcon, keywords: ['module', 'modules', 'component'] },
  { label: 'Reports', path: '/reports', icon: ReportsIcon, keywords: ['report', 'reports', 'analytics'] },
];

// Normalize path - convert underscores to hyphens for frontend routing
const normalizePath = (path) => {
  if (!path) return path;
  // Map of backend paths to frontend paths
  const pathMap = {
    '/test_cases': '/test-cases',
    '/test-cases': '/test-cases',
    '/jira_stories': '/stories',
    '/jira-stories': '/stories',
  };
  // Check for exact match first
  const basePath = path.split('?')[0];
  if (pathMap[basePath]) {
    return path.replace(basePath, pathMap[basePath]);
  }
  // Replace underscores with hyphens as fallback
  return path.replace(/_/g, '-');
};

const SmartSearchBar = ({ onClose }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isAISearching, setIsAISearching] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [error, setError] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [filteredOptions, setFilteredOptions] = useState(quickSearchOptions);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const abortControllerRef = useRef(null);

  // Minimum characters before filtering
  const MIN_QUERY_LENGTH = 1;

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Filter quick search options based on query
  useEffect(() => {
    if (query.trim().length < MIN_QUERY_LENGTH) {
      setFilteredOptions(quickSearchOptions);
      setSelectedIndex(0);
      return;
    }

    const queryLower = query.toLowerCase();
    const filtered = quickSearchOptions.filter(option => {
      // Check if query matches label or any keyword
      return option.label.toLowerCase().includes(queryLower) ||
        option.keywords.some(kw => kw.includes(queryLower));
    });

    // Also add dynamic search options
    const dynamicOptions = [
      { 
        label: `Search Test Cases for "${query}"`, 
        path: '/test-cases', 
        icon: TestCaseIcon,
        searchQuery: query,
        isDynamic: true
      },
      { 
        label: `Search Issues for "${query}"`, 
        path: '/issues', 
        icon: BugIcon,
        searchQuery: query,
        isDynamic: true
      },
      { 
        label: `Search Stories for "${query}"`, 
        path: '/stories', 
        icon: StoryIcon,
        searchQuery: query,
        isDynamic: true
      },
    ];

    setFilteredOptions([...filtered, ...dynamicOptions]);
    setSelectedIndex(0);
  }, [query]);

  // Perform AI-powered smart search
  const performAISearch = useCallback(async () => {
    if (!query || query.trim().length < 3) {
      setError('Please enter at least 3 characters for AI search');
      return;
    }

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsAISearching(true);
    setError(null);
    setAiResult(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in to use AI search');
        setIsAISearching(false);
        return;
      }

      const response = await api.post('/search/smart', { query: query.trim() }, {
        signal: abortControllerRef.current.signal,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      setAiResult(response.data);
      setIsOpen(true);
    } catch (err) {
      if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
        return;
      }
      console.error('AI search error:', err);
      
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
      } else if (err.response?.status === 403) {
        setError('You do not have permission to use AI search.');
      } else {
        setError(err.response?.data?.detail || 'AI search failed. Please try again.');
      }
    } finally {
      setIsAISearching(false);
    }
  }, [query]);

  // Handle input change
  const handleQueryChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setAnchorEl(e.currentTarget);
    setIsOpen(value.length > 0);
    setAiResult(null); // Clear AI result when typing
    setError(null);
  };

  // Handle navigation to quick search option
  const handleQuickNavigate = (option) => {
    let path = option.path;
    if (option.searchQuery) {
      path += `?search=${encodeURIComponent(option.searchQuery)}`;
    }
    navigate(path);
    handleClose();
  };

  // Handle AI result navigation
  const handleAINavigate = () => {
    if (aiResult && aiResult.success && aiResult.navigate_to) {
      // Normalize the path to handle backend/frontend path differences
      let path = normalizePath(aiResult.navigate_to);
      
      if (aiResult.query_params && Object.keys(aiResult.query_params).length > 0) {
        const params = new URLSearchParams(aiResult.query_params);
        path += `?${params.toString()}`;
      }
      
      console.log('[SmartSearch] Navigating to:', path);
      handleClose(); // Close first to ensure modal doesn't block navigation
      setTimeout(() => navigate(path), 50); // Small delay to ensure modal closes
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    let path = suggestion.path;
    if (suggestion.query) {
      path += `?search=${encodeURIComponent(suggestion.query)}`;
    }
    navigate(path);
    handleClose();
  };

  // Handle close
  const handleClose = () => {
    setIsOpen(false);
    setQuery('');
    setAiResult(null);
    setError(null);
    setSelectedIndex(0);
    if (onClose) onClose();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < filteredOptions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (aiResult && aiResult.success) {
        handleAINavigate();
      } else if (filteredOptions[selectedIndex]) {
        handleQuickNavigate(filteredOptions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      handleClose();
    }
  };

  // Get icon for intent
  const getIntentIcon = (intent) => {
    const IconComponent = intentIcons[intent] || SearchIcon;
    return <IconComponent />;
  };

  return (
    <ClickAwayListener onClickAway={() => setIsOpen(false)}>
      <Box sx={{ width: '100%', maxWidth: 600 }}>
        <TextField
          inputRef={inputRef}
          fullWidth
          placeholder="Search pages, test cases, issues..."
          value={query}
          onChange={handleQueryChange}
          onKeyDown={handleKeyDown}
          onFocus={(e) => {
            setAnchorEl(e.currentTarget);
            if (query.length > 0) setIsOpen(true);
          }}
          autoFocus
          variant="outlined"
          size="small"
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: alpha(theme.palette.background.paper, 0.95),
              borderRadius: 2,
              '& fieldset': {
                borderColor: theme.palette.divider,
              },
              '&:hover fieldset': {
                borderColor: theme.palette.primary.main,
              },
              '&.Mui-focused fieldset': {
                borderColor: theme.palette.primary.main,
                borderWidth: 2,
              },
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {query && (
                    <IconButton size="small" onClick={() => setQuery('')}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  )}
                  <Tooltip title="AI-powered smart search (understands natural language)">
                    <Button
                      size="small"
                      variant={aiResult ? "contained" : "outlined"}
                      color="primary"
                      onClick={performAISearch}
                      disabled={isAISearching || query.trim().length < 3}
                      startIcon={isAISearching ? <CircularProgress size={16} color="inherit" /> : <AIIcon />}
                      sx={{ 
                        minWidth: 'auto',
                        px: 1.5,
                        py: 0.5,
                        fontSize: '0.75rem',
                        borderRadius: 1.5,
                        textTransform: 'none',
                      }}
                    >
                      AI Search
                    </Button>
                  </Tooltip>
                  <Chip
                    size="small"
                    icon={<KeyboardCommandKey fontSize="small" />}
                    label="K"
                    sx={{ 
                      height: 24, 
                      fontSize: '0.75rem',
                      backgroundColor: alpha(theme.palette.action.selected, 0.1),
                    }}
                  />
                </Box>
              </InputAdornment>
            ),
          }}
        />

        <Popper
          open={isOpen}
          anchorEl={anchorEl}
          placement="bottom-start"
          transition
          sx={{ zIndex: theme.zIndex.modal + 1, width: anchorEl?.offsetWidth || 600 }}
        >
          {({ TransitionProps }) => (
            <Fade {...TransitionProps} timeout={200}>
              <Paper
                elevation={8}
                sx={{
                  mt: 1,
                  borderRadius: 2,
                  maxHeight: 450,
                  overflow: 'auto',
                  border: `1px solid ${theme.palette.divider}`,
                }}
              >
                {/* Error Display */}
                {error && (
                  <Box sx={{ p: 2, backgroundColor: alpha(theme.palette.error.main, 0.1) }}>
                    <Typography color="error" variant="body2">
                      {error}
                    </Typography>
                  </Box>
                )}

                {/* AI Search Result */}
                {aiResult && (
                  <>
                    <Box sx={{ 
                      p: 1.5, 
                      backgroundColor: alpha(theme.palette.primary.main, 0.05),
                      borderBottom: `1px solid ${theme.palette.divider}`,
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AIIcon color="primary" fontSize="small" />
                        <Typography variant="caption" color="primary" fontWeight={600}>
                          AI Search Result
                        </Typography>
                      </Box>
                    </Box>
                    
                    {aiResult.success ? (
                      <ListItemButton
                        onClick={handleAINavigate}
                        sx={{
                          py: 2,
                          backgroundColor: alpha(theme.palette.primary.main, 0.03),
                          '&:hover': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.08),
                          },
                        }}
                      >
                        <ListItemIcon sx={{ color: theme.palette.primary.main }}>
                          {getIntentIcon(aiResult.intent)}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body1" fontWeight={500}>
                                {aiResult.message}
                              </Typography>
                              {aiResult.confidence && (
                                <Chip
                                  size="small"
                                  label={`${Math.round(aiResult.confidence * 100)}%`}
                                  color={aiResult.confidence > 0.8 ? 'success' : 'warning'}
                                  sx={{ height: 20, fontSize: '0.7rem' }}
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <Typography variant="caption" color="text.secondary">
                              Navigate to {aiResult.navigate_to}
                              {aiResult.entity_ids?.length > 0 && 
                                ` • ${aiResult.entity_ids.length} results found`
                              }
                            </Typography>
                          }
                        />
                        <ArrowForwardIcon color="action" />
                      </ListItemButton>
                    ) : (
                      <>
                        <Box sx={{ p: 2, pb: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            {aiResult.message}
                          </Typography>
                        </Box>
                        {aiResult.suggestions && (
                          <List disablePadding dense>
                            {aiResult.suggestions.map((suggestion, index) => (
                              <ListItemButton
                                key={index}
                                onClick={() => handleSuggestionClick(suggestion)}
                                sx={{
                                  '&:hover': {
                                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                                  },
                                }}
                              >
                                <ListItemIcon>
                                  <SearchIcon color="action" fontSize="small" />
                                </ListItemIcon>
                                <ListItemText
                                  primary={suggestion.label}
                                  secondary={suggestion.path}
                                  primaryTypographyProps={{ variant: 'body2' }}
                                  secondaryTypographyProps={{ variant: 'caption' }}
                                />
                              </ListItemButton>
                            ))}
                          </List>
                        )}
                      </>
                    )}
                    <Divider />
                  </>
                )}

                {/* Quick Search Options */}
                {!aiResult && (
                  <>
                    <Box sx={{ 
                      px: 2, 
                      py: 1, 
                      backgroundColor: alpha(theme.palette.action.selected, 0.03),
                      borderBottom: `1px solid ${theme.palette.divider}`,
                    }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        Quick Navigation
                      </Typography>
                    </Box>
                    <List disablePadding dense>
                      {filteredOptions.map((option, index) => {
                        const IconComponent = option.icon;
                        return (
                          <ListItemButton
                            key={index}
                            selected={index === selectedIndex}
                            onClick={() => handleQuickNavigate(option)}
                            sx={{
                              '&.Mui-selected': {
                                backgroundColor: alpha(theme.palette.primary.main, 0.08),
                              },
                              '&:hover': {
                                backgroundColor: alpha(theme.palette.primary.main, 0.05),
                              },
                            }}
                          >
                            <ListItemIcon>
                              <IconComponent 
                                fontSize="small" 
                                color={option.isDynamic ? 'primary' : 'action'} 
                              />
                            </ListItemIcon>
                            <ListItemText
                              primary={option.label}
                              secondary={option.isDynamic ? 'Search results' : option.path}
                              primaryTypographyProps={{ 
                                variant: 'body2',
                                fontWeight: option.isDynamic ? 500 : 400,
                              }}
                              secondaryTypographyProps={{ variant: 'caption' }}
                            />
                            {option.isDynamic && (
                              <Chip 
                                size="small" 
                                label="Search" 
                                variant="outlined"
                                sx={{ height: 20, fontSize: '0.65rem' }} 
                              />
                            )}
                          </ListItemButton>
                        );
                      })}
                    </List>
                  </>
                )}

                {/* Footer */}
                <Box
                  sx={{
                    p: 1,
                    borderTop: `1px solid ${theme.palette.divider}`,
                    backgroundColor: alpha(theme.palette.action.selected, 0.05),
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    ↑↓ Navigate • Enter to select • Esc to close
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <AIIcon fontSize="small" sx={{ color: theme.palette.primary.main, fontSize: 14 }} />
                    <Typography variant="caption" color="primary">
                      Click AI Search for natural language queries
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Fade>
          )}
        </Popper>
      </Box>
    </ClickAwayListener>
  );
};

export default SmartSearchBar;
