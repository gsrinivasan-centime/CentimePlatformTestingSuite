import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Menu,
  MenuItem,
  Avatar,
  Container,
  InputBase,
  Paper,
  Popper,
  Fade,
  ClickAwayListener,
  CircularProgress,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Assignment as AssignmentIcon,
  PlayArrow as PlayArrowIcon,
  Assessment as AssessmentIcon,
  AccountTree as AccountTreeIcon,
  LocalOffer as LocalOfferIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  AccountCircle,
  Logout,
  Search as SearchIcon,
  Close as CloseIcon,
  BugReport as BugIcon,
  Description as StoryIcon,
  Rocket as ReleaseIcon,
  GridView as ModulesIcon,
  AutoAwesome as AIIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import CentimeLogo from '../centime_logo.svg';
import api from '../services/api';

const drawerWidth = 240;

// Quick search navigation options
const quickSearchOptions = [
  { label: 'Test Cases', path: '/test-cases', icon: AssignmentIcon, keywords: ['test', 'case', 'tc', 'tests'] },
  { label: 'Test Design Studio', path: '/test-design-studio', icon: PlayArrowIcon, keywords: ['design', 'studio', 'create', 'new test', 'write test', 'bdd', 'gherkin'] },
  { label: 'Issues', path: '/issues', icon: BugIcon, keywords: ['issue', 'bug', 'defect', 'problem'] },
  { label: 'Stories', path: '/stories', icon: StoryIcon, keywords: ['story', 'stories', 'jira', 'user story'] },
  { label: 'Releases', path: '/releases', icon: ReleaseIcon, keywords: ['release', 'version', 'deploy'] },
  { label: 'Dashboard', path: '/dashboard', icon: DashboardIcon, keywords: ['dashboard', 'home', 'overview'] },
  { label: 'Modules', path: '/modules', icon: ModulesIcon, keywords: ['module', 'modules', 'component'] },
  { label: 'Reports', path: '/reports', icon: AssessmentIcon, keywords: ['report', 'reports', 'analytics'] },
  { label: 'Execute Tests', path: '/executions', icon: PlayArrowIcon, keywords: ['execute', 'run', 'execution', 'test run'] },
];

// Icon mapping for intents
const intentIcons = {
  view_test_cases: AssignmentIcon,
  view_test_design_studio: PlayArrowIcon,
  view_issues: BugIcon,
  view_stories: StoryIcon,
  view_release: ReleaseIcon,
  view_release_dashboard: DashboardIcon,
  view_modules: ModulesIcon,
  view_reports: AssessmentIcon,
  view_dashboard: DashboardIcon,
  view_executions: PlayArrowIcon,
  unknown: SearchIcon,
};

// Normalize path
const normalizePath = (path) => {
  if (!path) return path;
  const pathMap = {
    '/test_cases': '/test-cases',
    '/test-cases': '/test-cases',
    '/jira_stories': '/stories',
    '/jira-stories': '/stories',
  };
  const basePath = path.split('?')[0];
  if (pathMap[basePath]) {
    return path.replace(basePath, pathMap[basePath]);
  }
  return path.replace(/_/g, '-');
};

const Layout = ({ children }) => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  
  // Search state
  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [isAISearching, setIsAISearching] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [filteredOptions, setFilteredOptions] = useState(quickSearchOptions);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const abortControllerRef = useRef(null);

  // Keyboard shortcut for Cmd+K / Ctrl+K
  const handleKeyDown = useCallback((event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      searchInputRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [handleKeyDown]);

  // Filter quick search options based on query - only show matching page navigation
  useEffect(() => {
    if (searchQuery.trim().length < 1) {
      setFilteredOptions([]);
      setSelectedIndex(0);
      return;
    }

    const queryLower = searchQuery.toLowerCase();
    
    // Remove common navigation phrases to get the core intent
    const cleanQuery = queryLower
      .replace(/^(go to|navigate to|open|show|view|take me to)\s+/i, '')
      .replace(/\s+(page|section|screen)$/i, '')
      .trim();
    
    // Only show navigation options that directly match the query
    // Match if: query contains keyword OR keyword contains query OR cleaned query matches
    const filtered = quickSearchOptions.filter(option => {
      const labelLower = option.label.toLowerCase();
      return (
        labelLower.includes(queryLower) ||
        labelLower.includes(cleanQuery) ||
        queryLower.includes(labelLower) ||
        cleanQuery.includes(labelLower) ||
        option.keywords.some(kw => 
          kw.includes(queryLower) || 
          queryLower.includes(kw) ||
          kw.includes(cleanQuery) ||
          cleanQuery.includes(kw)
        )
      );
    });

    // Only show filtered navigation options if there's a direct match
    // Don't show generic "Search X for..." options - that's what AI search is for
    setFilteredOptions(filtered);
    setSelectedIndex(0);
  }, [searchQuery]);

  // AI Search function
  const performAISearch = useCallback(async () => {
    if (!searchQuery || searchQuery.trim().length < 3) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsAISearching(true);
    setAiResult(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsAISearching(false);
        return;
      }

      const response = await api.post('/search/smart', { query: searchQuery.trim() }, {
        signal: abortControllerRef.current.signal,
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      
      setAiResult(response.data);
    } catch (err) {
      if (err.name !== 'AbortError' && err.code !== 'ERR_CANCELED') {
        console.error('AI search error:', err);
      }
    } finally {
      setIsAISearching(false);
    }
  }, [searchQuery]);

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setSearchOpen(value.length > 0);
    setAiResult(null);
  };

  // Handle quick navigate
  const handleQuickNavigate = (option) => {
    let path = option.path;
    if (option.searchQuery) {
      path += `?search=${encodeURIComponent(option.searchQuery)}`;
    }
    navigate(path);
    handleSearchClose();
  };

  // Handle AI result navigation
  const handleAINavigate = () => {
    if (aiResult && aiResult.success && aiResult.navigate_to) {
      let path = normalizePath(aiResult.navigate_to);
      if (aiResult.query_params && Object.keys(aiResult.query_params).length > 0) {
        const params = new URLSearchParams(aiResult.query_params);
        // Check if path already has query params
        const separator = path.includes('?') ? '&' : '?';
        path += `${separator}${params.toString()}`;
      }
      handleSearchClose();
      setTimeout(() => navigate(path), 50);
    }
  };

  // Handle search close
  const handleSearchClose = () => {
    setSearchOpen(false);
    setSearchQuery('');
    setAiResult(null);
    setSelectedIndex(0);
  };

  // Handle search keyboard navigation
  const handleSearchKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => prev < filteredOptions.length - 1 ? prev + 1 : prev);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // If we already have an AI result, navigate to it
      if (aiResult && aiResult.success) {
        handleAINavigate();
      } else if (searchQuery.trim().length >= 3) {
        // Otherwise, trigger AI search first
        performAISearch();
      } else if (filteredOptions[selectedIndex]) {
        // Fallback to quick navigate if query is too short
        handleQuickNavigate(filteredOptions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      handleSearchClose();
      searchInputRef.current?.blur();
    }
  };

  // Get icon for intent
  const getIntentIcon = (intent) => {
    const IconComponent = intentIcons[intent] || SearchIcon;
    return <IconComponent fontSize="small" />;
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleClose();
    logout();
    navigate('/login');
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Test Design Studio', icon: <PlayArrowIcon />, path: '/test-design-studio' },
    { text: 'Test Cases', icon: <AssignmentIcon />, path: '/test-cases' },
    { text: 'Stories', icon: <AssignmentIcon />, path: '/stories' },
    { text: 'Modules', icon: <AccountTreeIcon />, path: '/modules' },
    { text: 'Releases', icon: <LocalOfferIcon />, path: '/releases' },
    { text: 'Reports', icon: <AssessmentIcon />, path: '/reports' },
    { text: 'Execute Tests', icon: <PlayArrowIcon />, path: '/executions' },
    { text: 'Users', icon: <PeopleIcon />, path: '/users' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
  ];

  const drawer = (
    <div>
      <Toolbar
        sx={{
          cursor: 'pointer',
          bgcolor: 'primary.main',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          '&:hover': {
            bgcolor: 'primary.dark',
          }
        }}
        onClick={() => navigate('/dashboard')}
      >
        <Box
          component="img"
          src={CentimeLogo}
          alt="Centime Logo"
          sx={{
            height: 32,
            width: 'auto',
            objectFit: 'contain',
          }}
        />
      </Toolbar>
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => {
                navigate(item.path);
                setMobileOpen(false);
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar sx={{ gap: 2 }}>
          {/* Left Section - Menu & Title */}
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 1, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexShrink: 0 }}>
            Quality Assurance Portal
          </Typography>
          
          {/* Center Section - Inline Search Bar (NetSuite Style) */}
          <ClickAwayListener onClickAway={() => setSearchOpen(false)}>
            <Box 
              ref={searchContainerRef}
              sx={{ 
                flexGrow: 1, 
                display: 'flex', 
                justifyContent: 'center',
                position: 'relative',
                maxWidth: 500,
                mx: 'auto',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  backgroundColor: '#fff',
                  borderRadius: 1,
                  border: searchOpen ? '2px solid #1976d2' : '1px solid #ccc',
                  transition: 'all 0.2s ease',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', pl: 1.5, gap: 0.5 }}>
                  <SearchIcon sx={{ fontSize: 20, color: '#666' }} />
                  <AIIcon sx={{ fontSize: 16, color: '#1976d2' }} />
                </Box>
                <InputBase
                  inputRef={searchInputRef}
                  placeholder="Ask AI to find or navigate..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onKeyDown={handleSearchKeyDown}
                  onFocus={() => {
                    if (searchQuery.length > 0) setSearchOpen(true);
                  }}
                  sx={{
                    flex: 1,
                    px: 1,
                    py: 0.75,
                    fontSize: '0.95rem',
                    color: '#333',
                    '& input::placeholder': {
                      color: '#888',
                      opacity: 1,
                      fontStyle: 'italic',
                    },
                  }}
                />
                {searchQuery && (
                  <IconButton 
                    size="small" 
                    onClick={() => { setSearchQuery(''); setSearchOpen(false); setAiResult(null); }}
                    sx={{ color: '#666', p: 0.5 }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                )}
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  borderLeft: '1px solid #ddd',
                  px: 1,
                  gap: 0.5,
                }}>
                  {isAISearching ? (
                    <CircularProgress size={18} sx={{ color: '#1976d2' }} />
                  ) : (
                    <IconButton
                      size="small"
                      onClick={performAISearch}
                      disabled={searchQuery.trim().length < 3}
                      sx={{ 
                        p: 0.5,
                        color: searchQuery.trim().length >= 3 ? '#1976d2' : '#ccc',
                        '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.1)' },
                      }}
                      title="AI Search (min 3 characters)"
                    >
                      <AIIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              </Box>

              {/* Dropdown Results - Only show when there are results to display */}
              <Popper
                open={searchOpen && (aiResult || filteredOptions.length > 0)}
                anchorEl={searchContainerRef.current}
                placement="bottom-start"
                transition
                sx={{ 
                  zIndex: 1300, 
                  width: searchContainerRef.current?.offsetWidth || 500,
                }}
              >
                {({ TransitionProps }) => (
                  <Fade {...TransitionProps} timeout={150}>
                    <Paper
                      elevation={8}
                      sx={{
                        mt: 0.5,
                        borderRadius: 1,
                        maxHeight: 400,
                        overflow: 'auto',
                        border: '1px solid #ddd',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      }}
                    >
                      {/* AI Search Result */}
                      {aiResult && (
                        <>
                          {aiResult.success ? (
                            <ListItemButton
                              onClick={handleAINavigate}
                              sx={{
                                py: 1,
                                px: 2,
                                backgroundColor: '#e3f2fd',
                                '&:hover': { backgroundColor: '#bbdefb' },
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                              }}
                            >
                              <AIIcon sx={{ fontSize: 18, color: '#1976d2', flexShrink: 0 }} />
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
                                <Typography 
                                  variant="body2" 
                                  fontWeight={500}
                                  sx={{ 
                                    color: '#1565c0',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                >
                                  {aiResult.message}
                                </Typography>
                                {aiResult.entity_ids?.length > 0 && (
                                  <Typography 
                                    variant="caption" 
                                    sx={{ 
                                      color: '#666',
                                      whiteSpace: 'nowrap',
                                      flexShrink: 0,
                                    }}
                                  >
                                    ({aiResult.entity_ids.length} results)
                                  </Typography>
                                )}
                              </Box>
                              <ArrowForwardIcon sx={{ fontSize: 18, color: '#1976d2', flexShrink: 0 }} />
                            </ListItemButton>
                          ) : (
                            <Box sx={{ p: 1.5, px: 2, backgroundColor: '#fff3e0', display: 'flex', alignItems: 'center', gap: 1 }}>
                              <AIIcon sx={{ fontSize: 18, color: '#f57c00', flexShrink: 0 }} />
                              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {aiResult.message}
                              </Typography>
                            </Box>
                          )}
                          <Divider />
                        </>
                      )}

                      {/* Quick Navigation Options - Only show when there are matches */}
                      {!aiResult && filteredOptions.length > 0 && (
                        <>
                          <Box sx={{ 
                            px: 2, 
                            py: 1, 
                            backgroundColor: '#f5f5f5',
                            borderBottom: '1px solid #e0e0e0',
                          }}>
                            <Typography variant="caption" sx={{ color: '#666', fontWeight: 500 }}>
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
                                    py: 1,
                                    '&.Mui-selected': { backgroundColor: '#e3f2fd' },
                                    '&:hover': { backgroundColor: '#f5f5f5' },
                                  }}
                                >
                                  <ListItemIcon sx={{ minWidth: 36 }}>
                                    <IconComponent 
                                      fontSize="small" 
                                      sx={{ color: '#666' }}
                                    />
                                  </ListItemIcon>
                                  <ListItemText
                                    primary={
                                      <Typography variant="body2">
                                        <span style={{ color: '#888' }}>Go to </span>
                                        <strong>{option.label}</strong>
                                      </Typography>
                                    }
                                  />
                                </ListItemButton>
                              );
                            })}
                          </List>
                        </>
                      )}

                      {/* Footer hint - only show when dropdown is visible */}
                      {(aiResult || filteredOptions.length > 0) && (
                        <Box sx={{ 
                          px: 2, 
                          py: 0.75, 
                          backgroundColor: '#fafafa',
                          borderTop: '1px solid #e0e0e0',
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}>
                          <Typography variant="caption" color="text.secondary">
                            ↑↓ Navigate • Enter to search
                          </Typography>
                          <Typography variant="caption" color="primary">
                            Press Enter for AI Search
                          </Typography>
                        </Box>
                      )}
                    </Paper>
                  </Fade>
                )}
              </Popper>
            </Box>
          </ClickAwayListener>

          {/* Right Section - User Info */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
            <Typography variant="body2" sx={{ opacity: 0.9, display: { xs: 'none', md: 'block' } }}>
              {user?.email}
            </Typography>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              color="inherit"
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                {user?.email?.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem disabled>
                <ListItemIcon>
                  <AccountCircle fontSize="small" />
                </ListItemIcon>
                <ListItemText>
                  {user?.full_name || 'User'} ({user?.role})
                </ListItemText>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <Logout fontSize="small" />
                </ListItemIcon>
                <ListItemText>Logout</ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
        }}
      >
        <Container maxWidth="xl">{children}</Container>
      </Box>
    </Box>
  );
};

export default Layout;
