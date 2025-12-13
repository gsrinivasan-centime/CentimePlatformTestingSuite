import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  Avatar,
  Skeleton,
  Alert,
  Stack,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  TaskAlt as TaskAltIcon,
  Warning as WarningIcon,
  AccessTime as AccessTimeIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { useToast } from '../context/ToastContext';
import productionTicketsAPI from '../services/productionTicketsService';
import jiraAPI from '../services/jiraService';
import TicketDetailPanel from '../components/TicketDetailPanel.js';
import JiraConnectDialog from '../components/JiraConnectDialog';
import SlackMessageDialog from '../components/SlackMessageDialog';
import ResizableTableCell from '../components/ResizableTableCell';
import FilterBar from '../components/FilterBar';
import FilterPresets from '../components/FilterPresets';
import {
  applyFilters,
  encodeFiltersToURL,
  decodeFiltersFromURL,
  saveFiltersToStorage,
  loadFiltersFromStorage,
} from '../utils/filterOperators';

// Status color mapping
const statusColors = {
  'Open': 'error',
  'Work in progress': 'info',
  'Work In Progress': 'info',
  'In Progress': 'info',
  'Pending Verification': 'warning',
  'Closed': 'success',
  'Cancelled': 'default',
  'Resolved': 'success',
};

// Priority color mapping
const priorityColors = {
  'Highest': 'error',
  'High': 'error',
  'Medium': 'warning',
  'Low': 'info',
  'Lowest': 'default',
};

// Format relative time
const formatRelativeTime = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

// Format date
const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const ProductionTickets = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showSuccess, showError, showWarning } = useToast();

  // State
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [cacheInfo, setCacheInfo] = useState({ cached: false, cache_updated_at: null });
  
  // Server-side filters
  const [statusFilter, setStatusFilter] = useState('');  // Empty = all non-closed
  // eslint-disable-next-line no-unused-vars
  const [periodFilter, setPeriodFilter] = useState('');
  const [ticketSearch, setTicketSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  
  // Advanced filters (client-side)
  const [advancedFilters, setAdvancedFilters] = useState({ items: [], logic: 'and' });
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  
  // Detail panel
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  
  // JIRA OAuth state
  const [jiraConnectDialogOpen, setJiraConnectDialogOpen] = useState(false);
  const [jiraConnectionStatus, setJiraConnectionStatus] = useState(null);

  // Slack message dialog state
  const [slackDialogOpen, setSlackDialogOpen] = useState(false);
  const [slackDialogTicket, setSlackDialogTicket] = useState(null);

  // Handle opening Slack message dialog
  const handleOpenSlackDialog = (e, ticket) => {
    e.stopPropagation(); // Prevent row click
    setSlackDialogTicket(ticket);
    setSlackDialogOpen(true);
  };

  // Check JIRA connection status on mount
  useEffect(() => {
    checkJiraConnection();
    
    // Listen for openJiraConnect event from TicketDetailPanel
    const handleOpenJiraConnect = () => {
      setJiraConnectDialogOpen(true);
    };
    window.addEventListener('openJiraConnect', handleOpenJiraConnect);
    return () => window.removeEventListener('openJiraConnect', handleOpenJiraConnect);
  }, []);

  const checkJiraConnection = async () => {
    try {
      const status = await jiraAPI.getConnectionStatus();
      
      // If connected but token is expired, try to auto-refresh
      if (status.connected && status.expired) {
        console.log('JIRA token expired, attempting auto-refresh...');
        try {
          await jiraAPI.refreshToken();
          // Re-check status after refresh
          const refreshedStatus = await jiraAPI.getConnectionStatus();
          setJiraConnectionStatus(refreshedStatus);
          if (!refreshedStatus.expired) {
            console.log('JIRA token refreshed successfully');
          }
        } catch (refreshErr) {
          console.error('Auto-refresh failed:', refreshErr);
          setJiraConnectionStatus(status);
        }
      } else {
        setJiraConnectionStatus(status);
      }
    } catch (err) {
      setJiraConnectionStatus({ connected: false, configured: false });
    }
  };

  const handleJiraConnectionChange = (connected) => {
    checkJiraConnection();
  };

  // Initialize filters from URL or localStorage on mount
  useEffect(() => {
    if (filtersInitialized) return;
    
    const urlFilters = searchParams.get('filters');
    
    if (urlFilters) {
      // Try to load from URL
      const { filters, errors } = decodeFiltersFromURL(urlFilters);
      
      if (errors.length > 0) {
        showWarning(`Some filters could not be applied: ${errors.join('; ')}`);
      }
      
      if (filters && filters.items.length > 0) {
        setAdvancedFilters(filters);
        showSuccess('Filters loaded from shared link');
      } else {
        // URL was invalid, try localStorage
        const stored = loadFiltersFromStorage();
        if (stored) {
          setAdvancedFilters(stored);
        }
      }
    } else {
      // No URL filters, try localStorage
      const stored = loadFiltersFromStorage();
      if (stored) {
        setAdvancedFilters(stored);
      }
    }
    
    setFiltersInitialized(true);
  }, [searchParams, filtersInitialized, showWarning, showSuccess]);

  // Save filters to localStorage and update URL when filters change
  useEffect(() => {
    if (!filtersInitialized) return;
    
    // Save to localStorage
    saveFiltersToStorage(advancedFilters);
    
    // Preserve ticket parameter if present (for Slack links)
    const ticketParam = searchParams.get('ticket');
    
    // Update URL - preserve ticket param if present
    if (advancedFilters.items.length > 0) {
      const encoded = encodeFiltersToURL(advancedFilters);
      const newParams = { filters: encoded };
      if (ticketParam) {
        newParams.ticket = ticketParam;
      }
      setSearchParams(newParams, { replace: true });
    } else {
      // Remove filters param if no filters, but preserve ticket
      const newParams = new URLSearchParams();
      if (ticketParam) {
        newParams.set('ticket', ticketParam);
      }
      setSearchParams(newParams, { replace: true });
    }
  }, [advancedFilters, filtersInitialized, setSearchParams, searchParams]);

  // Fetch tickets
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (periodFilter) params.period = periodFilter;
      if (ticketSearch) params.ticket_number = ticketSearch;
      
      const result = await productionTicketsAPI.getTickets(params);
      setTickets(result.tickets || []);
      setCacheInfo({
        cached: result.cached,
        cache_updated_at: result.cache_updated_at
      });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch tickets');
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, periodFilter, ticketSearch]);

  // Initial load
  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Handle ticket URL parameter to auto-open panel (e.g., from Slack links)
  useEffect(() => {
    const ticketKey = searchParams.get('ticket');
    if (ticketKey) {
      // First check if ticket is already in our loaded list
      const foundTicket = tickets.find(t => t.key === ticketKey);
      if (foundTicket) {
        setSelectedTicket(foundTicket);
        setPanelOpen(true);
        // Clear the ticket param from URL after opening
        searchParams.delete('ticket');
        setSearchParams(searchParams, { replace: true });
      } else if (!loading) {
        // Ticket not in current list, fetch it directly from API
        const fetchTicketDirectly = async () => {
          try {
            const ticketData = await productionTicketsAPI.getTicket(ticketKey);
            if (ticketData) {
              setSelectedTicket(ticketData);
              setPanelOpen(true);
              // Clear the ticket param from URL after opening
              searchParams.delete('ticket');
              setSearchParams(searchParams, { replace: true });
            } else {
              showWarning(`Ticket ${ticketKey} not found`);
            }
          } catch (err) {
            console.error('Failed to fetch ticket:', err);
            showWarning(`Could not load ticket ${ticketKey}`);
          }
        };
        fetchTicketDirectly();
      }
    }
  }, [tickets, searchParams, setSearchParams, loading, showWarning]);

  // Handle refresh
  const handleRefresh = async () => {
    try {
      await productionTicketsAPI.refreshCache();
      showSuccess('Cache cleared, fetching fresh data...');
      await fetchTickets();
    } catch (err) {
      showError('Failed to refresh');
    }
  };

  // Handle status filter change
  const handleStatusFilterChange = (event, newStatus) => {
    setStatusFilter(newStatus || '');
    setPage(0);
  };

  // Handle ticket search
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setTicketSearch(searchInput.trim());
    setPage(0);
  };

  // Handle clear search
  const handleClearSearch = () => {
    setSearchInput('');
    setTicketSearch('');
    setPage(0);
  };

  // Handle advanced filters change
  const handleFiltersChange = (newFilters) => {
    setAdvancedFilters(newFilters);
    setPage(0);
  };

  // Handle preset apply
  const handleApplyPreset = (presetFilters) => {
    setAdvancedFilters(presetFilters);
    setPage(0);
  };

  // Handle row click - open panel
  const handleRowClick = (ticket) => {
    setSelectedTicket(ticket);
    setPanelOpen(true);
  };

  // Handle panel close
  const handlePanelClose = () => {
    setPanelOpen(false);
  };

  // Pagination handlers
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Get unique values for filter autocomplete options
  const availableValues = useMemo(() => ({
    status: [...new Set(tickets.map(t => t.status).filter(Boolean))].sort(),
    priority: [...new Set(tickets.map(t => t.priority).filter(Boolean))].sort(),
    assignee: ['Unassigned', ...new Set(tickets.map(t => t.assignee).filter(Boolean))].sort(),
    key: [...new Set(tickets.map(t => t.key).filter(Boolean))].sort(),
  }), [tickets]);

  // Apply advanced filters
  const filteredTickets = useMemo(() => {
    if (!advancedFilters.items || advancedFilters.items.length === 0) {
      return tickets;
    }
    return applyFilters(tickets, advancedFilters.items, advancedFilters.logic);
  }, [tickets, advancedFilters]);

  // Paginated tickets (from filtered)
  const paginatedTickets = filteredTickets.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // Compute dynamic stats based on filtered tickets
  const filteredStats = useMemo(() => {
    const open = filteredTickets.filter(t => t.status === 'Open').length;
    const inProgress = filteredTickets.filter(t => 
      t.status === 'Work in progress' || 
      t.status === 'Work In Progress' || 
      t.status === 'In Progress'
    ).length;
    const pendingVerification = filteredTickets.filter(t => t.status === 'Pending Verification').length;
    const closed = filteredTickets.filter(t => t.status === 'Closed').length;
    const resolved = filteredTickets.filter(t => t.status === 'Resolved').length;
    const cancelled = filteredTickets.filter(t => t.status === 'Cancelled').length;
    const waitingForInfo = filteredTickets.filter(t => 
      t.status?.toLowerCase().includes('waiting') && t.status?.toLowerCase().includes('external')
    ).length;
    
    // Priority breakdown - map JIRA priorities to Critical/High/Medium/Low
    const p0 = filteredTickets.filter(t => t.priority === 'Highest' || t.priority === 'Critical').length;
    const p1 = filteredTickets.filter(t => t.priority === 'High').length;
    const p2 = filteredTickets.filter(t => t.priority === 'Medium').length;
    const p3 = filteredTickets.filter(t => t.priority === 'Low' || t.priority === 'Lowest').length;
    
    // Critical incidents (P0 + P1)
    const criticalIncidents = p0 + p1;
    
    // Closed this month calculation
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const closedThisMonth = filteredTickets.filter(t => {
      if (t.status !== 'Closed' && t.status !== 'Resolved') return false;
      const updated = new Date(t.updated);
      return updated >= firstDayOfMonth;
    }).length;

    return { 
      open, 
      inProgress, 
      pendingVerification, 
      closedThisMonth, 
      closed,
      resolved,
      cancelled,
      waitingForInfo,
      total: filteredTickets.length,
      criticalIncidents,
      priority: { p0, p1, p2, p3 }
    };
  }, [filteredTickets]);

  // Donut chart component for priority with hover interactivity
  const PriorityDonutChart = ({ stats }) => {
    const [hoveredSegment, setHoveredSegment] = React.useState(null);
    const total = stats.p0 + stats.p1 + stats.p2 + stats.p3 || 1;
    const data = [
      { label: 'Critical', value: stats.p0, color: '#ef4444' },
      { label: 'High', value: stats.p1, color: '#f97316' },
      { label: 'Medium', value: stats.p2, color: '#3b82f6' },
      { label: 'Low', value: stats.p3, color: '#22c55e' },
    ];
    
    let cumulativePercent = 0;
    const size = 200;
    const strokeWidth = 28;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2, overflow: 'visible' }}>
        <Box sx={{ position: 'relative', width: size + 20, height: size + 20, p: '10px', overflow: 'visible' }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
            {/* Background circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#f3f4f6"
              strokeWidth={strokeWidth}
            />
            {/* Data segments */}
            {data.map((segment, index) => {
              const percent = segment.value / total;
              const strokeDasharray = `${percent * circumference} ${circumference}`;
              const strokeDashoffset = -cumulativePercent * circumference;
              cumulativePercent += percent;
              const isHovered = hoveredSegment === segment.label;
              
              return (
                <circle
                  key={segment.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth={isHovered ? strokeWidth + 6 : strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  style={{ 
                    transition: 'stroke-width 0.2s ease, opacity 0.2s ease',
                    cursor: 'pointer',
                    opacity: hoveredSegment && !isHovered ? 0.5 : 1,
                  }}
                  onMouseEnter={() => setHoveredSegment(segment.label)}
                  onMouseLeave={() => setHoveredSegment(null)}
                />
              );
            })}
          </svg>
          {/* Center text showing hovered value */}
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none',
            }}
          >
            {hoveredSegment ? (
              <>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  {hoveredSegment}
                </Typography>
                <Typography variant="h5" fontWeight="bold" color="text.primary">
                  {data.find(d => d.label === hoveredSegment)?.value || 0}
                </Typography>
              </>
            ) : (
              <>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  Total
                </Typography>
                <Typography variant="h5" fontWeight="bold" color="text.primary">
                  {total}
                </Typography>
              </>
            )}
          </Box>
        </Box>
        {/* Legend */}
        <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
          {data.map((item) => (
            <Box 
              key={item.label} 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 0.5,
                cursor: 'pointer',
                opacity: hoveredSegment && hoveredSegment !== item.label ? 0.5 : 1,
                transition: 'opacity 0.2s ease',
              }}
              onMouseEnter={() => setHoveredSegment(item.label)}
              onMouseLeave={() => setHoveredSegment(null)}
            >
              <Box sx={{ width: 12, height: 12, borderRadius: '2px', bgcolor: item.color }} />
              <Typography variant="caption" fontWeight={500}>{item.label}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  // Horizontal bar chart for status
  const StatusBarChart = ({ stats }) => {
    const statusData = [
      { label: 'Open', value: stats.open, color: '#ef4444', maxValue: stats.total },
      { label: 'Work in Progress', value: stats.inProgress, color: '#3b82f6', maxValue: stats.total },
      { label: 'Pending Verification', value: stats.pendingVerification, color: '#f59e0b', maxValue: stats.total },
      { label: 'Waiting for External Info', value: stats.waitingForInfo, color: '#8b5cf6', maxValue: stats.total },
      { label: 'Resolved', value: stats.resolved, color: '#22c55e', maxValue: stats.total },
      { label: 'Closed', value: stats.closed, color: '#10b981', maxValue: stats.total },
    ];
    
    const maxValue = Math.max(...statusData.map(d => d.value), 1);
    
    return (
      <Box sx={{ py: 2, px: 1 }}>
        {statusData.map((item) => (
          <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
            <Typography 
              variant="body2" 
              sx={{ width: 140, flexShrink: 0, textAlign: 'right', pr: 2, color: 'text.secondary', fontSize: '0.8rem' }}
            >
              {item.label}
            </Typography>
            <Tooltip title={`${item.label}: ${item.value}`} placement="top">
              <Box sx={{ flex: 1, position: 'relative' }}>
                <Box
                  sx={{
                    height: 24,
                    bgcolor: '#f1f5f9',
                    borderRadius: 1,
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      height: '100%',
                      width: `${(item.value / maxValue) * 100}%`,
                      bgcolor: item.color,
                      borderRadius: 1,
                      transition: 'width 0.5s ease',
                      minWidth: item.value > 0 ? 4 : 0,
                    }}
                  />
                </Box>
              </Box>
            </Tooltip>
          </Box>
        ))}
      </Box>
    );
  };

  return (
    <>
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold">
            Production Tickets
          </Typography>
          <Typography variant="body2" color="text.secondary">
            JIRA tickets with project CN and label "BO"
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={2}>
          <Tooltip title="Refresh (clear cache)">
            <IconButton onClick={handleRefresh} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          {/* JIRA Connection Status */}
          {jiraConnectionStatus?.configured && (
            <Tooltip title={
              jiraConnectionStatus?.connected 
                ? `Connected as ${jiraConnectionStatus.display_name || 'JIRA User'}` 
                : 'Connect your JIRA account'
            }>
              <Chip
                icon={jiraConnectionStatus?.connected ? <TaskAltIcon /> : <WarningIcon />}
                label={jiraConnectionStatus?.connected 
                  ? (jiraConnectionStatus.display_name || 'JIRA Connected')
                  : 'JIRA Disconnected'
                }
                onClick={() => setJiraConnectDialogOpen(true)}
                color={jiraConnectionStatus?.connected ? 'success' : 'default'}
                variant={jiraConnectionStatus?.connected ? 'filled' : 'outlined'}
                sx={{ 
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              />
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Stats Cards - New Design */}
      <Grid container spacing={2} mb={3}>
        {/* Total Tickets */}
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
            <CardContent sx={{ py: 2.5, px: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Total Tickets
                  </Typography>
                  {loading && filteredTickets.length === 0 ? (
                    <Skeleton variant="text" width={60} height={48} />
                  ) : (
                    <Typography variant="h3" fontWeight="bold" color="text.primary">
                      {filteredStats.total}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ 
                  p: 1, 
                  borderRadius: '50%', 
                  bgcolor: 'grey.100',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <TaskAltIcon sx={{ color: 'grey.600' }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Critical Incidents */}
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
            <CardContent sx={{ py: 2.5, px: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Critical Incidents
                  </Typography>
                  {loading && filteredTickets.length === 0 ? (
                    <Skeleton variant="text" width={60} height={48} />
                  ) : (
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="h3" fontWeight="bold" color="text.primary">
                        {filteredStats.criticalIncidents}
                      </Typography>
                      {filteredStats.criticalIncidents > 0 && (
                        <Chip 
                          label={`Critical: ${filteredStats.priority.p0}`}
                          size="small" 
                          sx={{ 
                            bgcolor: '#fef2f2', 
                            color: '#dc2626',
                            fontWeight: 500,
                            fontSize: '0.7rem',
                            height: 22,
                          }} 
                        />
                      )}
                    </Box>
                  )}
                </Box>
                <Box sx={{ 
                  p: 1, 
                  borderRadius: '50%', 
                  bgcolor: '#fef2f2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <WarningIcon sx={{ color: '#dc2626' }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Open Tickets */}
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
            <CardContent sx={{ py: 2.5, px: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Open Tickets
                  </Typography>
                  {loading && filteredTickets.length === 0 ? (
                    <Skeleton variant="text" width={60} height={48} />
                  ) : (
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="h3" fontWeight="bold" color="text.primary">
                        {filteredStats.open}
                      </Typography>
                      {filteredStats.total > 0 && (
                        <Chip 
                          label={`${Math.round((filteredStats.open / filteredStats.total) * 100)}% of total`}
                          size="small" 
                          sx={{ 
                            bgcolor: '#eff6ff', 
                            color: '#2563eb',
                            fontWeight: 500,
                            fontSize: '0.7rem',
                            height: 22,
                          }} 
                        />
                      )}
                    </Box>
                  )}
                </Box>
                <Box sx={{ 
                  p: 1, 
                  borderRadius: '50%', 
                  bgcolor: '#fef3c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <AccessTimeIcon sx={{ color: '#d97706' }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Closed This Month */}
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
            <CardContent sx={{ py: 2.5, px: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Closed This Month
                  </Typography>
                  {loading && filteredTickets.length === 0 ? (
                    <Skeleton variant="text" width={60} height={48} />
                  ) : (
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="h3" fontWeight="bold" color="text.primary">
                        {filteredStats.closedThisMonth}
                      </Typography>
                      <Chip 
                        label="This Month"
                        size="small" 
                        sx={{ 
                          bgcolor: '#ecfdf5', 
                          color: '#059669',
                          fontWeight: 500,
                          fontSize: '0.7rem',
                          height: 22,
                        }} 
                      />
                    </Box>
                  )}
                </Box>
                <Box sx={{ 
                  p: 1, 
                  borderRadius: '50%', 
                  bgcolor: '#ecfdf5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <TrendingUpIcon sx={{ color: '#059669' }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={2} mb={3}>
        {/* Priority Donut Chart */}
        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, height: '100%', overflow: 'visible' }}>
            <CardContent sx={{ overflow: 'visible' }}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                Incidents by Priority
              </Typography>
              {loading && filteredTickets.length === 0 ? (
                <Box display="flex" justifyContent="center" alignItems="center" height={200}>
                  <Skeleton variant="circular" width={150} height={150} />
                </Box>
              ) : (
                <PriorityDonutChart stats={filteredStats.priority} />
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Status Bar Chart */}
        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                Current Ticket Status
              </Typography>
              {loading && filteredTickets.length === 0 ? (
                <Box>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} variant="rectangular" height={24} sx={{ mb: 1.5, borderRadius: 1 }} />
                  ))}
                </Box>
              ) : (
                <StatusBarChart stats={filteredStats} />
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
          {/* Status Filter */}
          <ToggleButtonGroup
            value={statusFilter}
            exclusive
            onChange={handleStatusFilterChange}
            size="small"
          >
              <ToggleButton value="" sx={{ px: 2 }}>
                All Active
              </ToggleButton>
              <ToggleButton value="open" sx={{ px: 2 }}>
                Open
              </ToggleButton>
              <ToggleButton value="in_progress" sx={{ px: 2 }}>
                In Progress
              </ToggleButton>
              <ToggleButton value="pending_verification" sx={{ px: 2 }}>
                Pending
              </ToggleButton>
              <ToggleButton value="closed" sx={{ px: 2 }}>
                Closed
              </ToggleButton>
            </ToggleButtonGroup>

          {/* Ticket Search */}
          <Box sx={{ minWidth: 280 }}>
            <form onSubmit={handleSearchSubmit}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search JIRA ID (CN-1234)"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: searchInput && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={handleClearSearch}>
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </form>
          </Box>
        </Box>
      </Paper>

      {/* Advanced Filters */}
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Typography variant="subtitle2" color="text.secondary">
            Advanced Filters
          </Typography>
          <FilterPresets
            currentFilters={advancedFilters}
            onApplyPreset={handleApplyPreset}
          />
        </Box>
        <FilterBar
          filters={advancedFilters}
          onFiltersChange={handleFiltersChange}
          availableValues={availableValues}
        />
        {advancedFilters.items.length > 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Showing {filteredTickets.length} of {tickets.length} tickets
          </Typography>
        )}
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Tickets Table */}
      <Paper elevation={2}>
        <TableContainer>
          <Table size="small" sx={{ minWidth: 1100, tableLayout: 'fixed' }}>
            <TableHead>
              <TableRow>
                <ResizableTableCell minWidth={100} initialWidth={120} isHeader>JIRA ID</ResizableTableCell>
                <ResizableTableCell minWidth={250} initialWidth={380} isHeader align="left">Summary</ResizableTableCell>
                <ResizableTableCell minWidth={100} initialWidth={140} isHeader>Status</ResizableTableCell>
                <ResizableTableCell minWidth={80} initialWidth={110} isHeader>Priority</ResizableTableCell>
                <ResizableTableCell minWidth={120} initialWidth={160} isHeader>Assignee</ResizableTableCell>
                <ResizableTableCell minWidth={90} initialWidth={110} isHeader>Updated</ResizableTableCell>
                <TableCell sx={{ width: 60 }} align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                // Loading skeletons
                [...Array(5)].map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton /></TableCell>
                    <TableCell><Skeleton /></TableCell>
                    <TableCell><Skeleton width={80} /></TableCell>
                    <TableCell><Skeleton width={60} /></TableCell>
                    <TableCell><Skeleton /></TableCell>
                    <TableCell><Skeleton width={80} /></TableCell>
                    <TableCell><Skeleton width={30} /></TableCell>
                  </TableRow>
                ))
              ) : paginatedTickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      No tickets found
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Try adjusting your filters
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTickets.map((ticket) => (
                  <TableRow 
                    key={ticket.key}
                    hover
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                      '& td': { py: 1 }
                    }}
                  >
                    <TableCell>
                      <Chip
                        label={ticket.key}
                        size="small"
                        color="primary"
                        variant="outlined"
                        component="a"
                        href={ticket.jira_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        clickable
                        onClick={(e) => e.stopPropagation()}
                        sx={{ 
                          fontWeight: 500,
                          fontSize: '0.8rem',
                          '& .MuiChip-label': { px: 1 }
                        }}
                      />
                    </TableCell>
                    <TableCell 
                      onClick={() => handleRowClick(ticket)}
                      sx={{ 
                        '&:hover': { color: 'primary.main' }
                      }}
                    >
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: '0.875rem'
                        }}
                      >
                        {ticket.summary}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={ticket.status}
                        size="small"
                        color={statusColors[ticket.status] || 'default'}
                        sx={{ fontSize: '0.75rem', fontWeight: 500, height: 24 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={ticket.priority}
                        size="small"
                        color={priorityColors[ticket.priority] || 'default'}
                        variant="outlined"
                        sx={{ fontSize: '0.75rem', fontWeight: 500, height: 24 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        {ticket.assignee_avatar ? (
                          <Avatar 
                            src={ticket.assignee_avatar} 
                            sx={{ width: 24, height: 24 }}
                          />
                        ) : (
                          <Avatar sx={{ width: 24, height: 24, fontSize: 12, bgcolor: 'grey.400' }}>
                            {ticket.assignee?.charAt(0) || '?'}
                          </Avatar>
                        )}
                        <Typography variant="body2" noWrap sx={{ maxWidth: 120, fontSize: '0.875rem' }}>
                          {ticket.assignee || 'Unassigned'}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={formatDate(ticket.updated)}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                          {formatRelativeTime(ticket.updated)}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Send Slack Message">
                        <IconButton
                          size="small"
                          onClick={(e) => handleOpenSlackDialog(e, ticket)}
                          sx={{ 
                            p: 0.5,
                            '&:hover': { bgcolor: 'rgba(54, 197, 240, 0.1)' }
                          }}
                        >
                          <img 
                            src="/icons/slack-plane.svg" 
                            alt="Send Slack DM" 
                            style={{ width: 28, height: 28 }} 
                          />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filteredTickets.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </Paper>
    </Container>

      {/* Ticket Detail Panel */}
      <TicketDetailPanel
        open={panelOpen}
        onClose={handlePanelClose}
        ticket={selectedTicket}
        onTicketUpdated={fetchTickets}
      />

      {/* JIRA Connect Dialog */}
      <JiraConnectDialog
        open={jiraConnectDialogOpen}
        onClose={() => setJiraConnectDialogOpen(false)}
        onConnectionChange={handleJiraConnectionChange}
      />

      {/* Slack Message Dialog */}
      <SlackMessageDialog
        open={slackDialogOpen}
        onClose={() => {
          setSlackDialogOpen(false);
          setSlackDialogTicket(null);
        }}
        ticket={slackDialogTicket}
      />
    </>
  );
};

export default ProductionTickets;
