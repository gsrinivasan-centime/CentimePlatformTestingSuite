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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Avatar,
  Skeleton,
  Alert,
  Stack,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Search as SearchIcon,
  BugReport as BugIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  HourglassEmpty as HourglassIcon,
  PlayCircle as PlayCircleIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { useToast } from '../context/ToastContext';
import productionTicketsAPI from '../services/productionTicketsService';
import TicketDetailPanel from '../components/TicketDetailPanel.js';
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
  const [cacheInfo, setCacheInfo] = useState({ cached: false, cache_updated_at: null });
  
  // Server-side filters
  const [statusFilter, setStatusFilter] = useState('');  // Empty = all non-closed
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
    
    // Update URL
    if (advancedFilters.items.length > 0) {
      const encoded = encodeFiltersToURL(advancedFilters);
      setSearchParams({ filters: encoded }, { replace: true });
    } else {
      // Remove filters param if no filters
      searchParams.delete('filters');
      setSearchParams(searchParams, { replace: true });
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

  // Handle period filter change
  const handlePeriodFilterChange = (event) => {
    setPeriodFilter(event.target.value);
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
    const inProgress = filteredTickets.filter(t => t.status === 'In Progress').length;
    const pendingVerification = filteredTickets.filter(t => t.status === 'Pending Verification').length;
    
    // Closed this month calculation
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const closedThisMonth = filteredTickets.filter(t => {
      if (t.status !== 'Closed' && t.status !== 'Resolved') return false;
      const updated = new Date(t.updated);
      return updated >= firstDayOfMonth;
    }).length;

    return { open, inProgress, pendingVerification, closedThisMonth };
  }, [filteredTickets]);

  // Stats cards data - use filtered stats (defined after filteredStats)
  const statsCards = [
    {
      title: 'Open',
      count: filteredStats.open,
      color: '#d32f2f',
      bgColor: 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
      icon: <BugIcon sx={{ fontSize: 40, color: '#d32f2f', opacity: 0.6 }} />,
    },
    {
      title: 'In Progress',
      count: filteredStats.inProgress,
      color: '#1976d2',
      bgColor: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
      icon: <PlayCircleIcon sx={{ fontSize: 40, color: '#1976d2', opacity: 0.6 }} />,
    },
    {
      title: 'Pending Verification',
      count: filteredStats.pendingVerification,
      color: '#ed6c02',
      bgColor: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
      icon: <HourglassIcon sx={{ fontSize: 40, color: '#ed6c02', opacity: 0.6 }} />,
    },
    {
      title: 'Closed This Month',
      count: filteredStats.closedThisMonth,
      color: '#2e7d32',
      bgColor: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
      icon: <CheckCircleIcon sx={{ fontSize: 40, color: '#2e7d32', opacity: 0.6 }} />,
    },
  ];

  return (
    <>
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold">
            Production Tickets
          </Typography>
          <Typography variant="body2" color="text.secondary">
            JIRA tickets with project CN and label "BO"
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={2}>
          {cacheInfo.cache_updated_at && (
            <Chip
              icon={<ScheduleIcon />}
              label={`Updated ${formatRelativeTime(cacheInfo.cache_updated_at)}`}
              size="small"
              variant="outlined"
              color={cacheInfo.cached ? 'default' : 'primary'}
            />
          )}
          <Tooltip title="Refresh (clear cache)">
            <IconButton onClick={handleRefresh} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} mb={3}>
        {statsCards.map((card) => (
          <Grid item xs={12} sm={6} md={3} key={card.title}>
            <Card 
              elevation={2}
              sx={{ 
                position: 'relative',
                overflow: 'hidden',
                background: card.bgColor,
                borderLeft: 4,
                borderColor: card.color,
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': { 
                  transform: 'translateY(-2px)',
                  boxShadow: 4 
                }
              }}
            >
              <CardContent sx={{ py: 2, px: 2.5, '&:last-child': { pb: 2 } }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: 600, 
                        textTransform: 'uppercase', 
                        letterSpacing: 0.5,
                        fontSize: '0.75rem',
                        color: 'text.secondary',
                        mb: 0.5
                      }}
                    >
                      {card.title}
                    </Typography>
                    {loading && filteredTickets.length === 0 ? (
                      <Skeleton variant="text" width={50} height={40} />
                    ) : (
                      <Typography 
                        variant="h3" 
                        fontWeight="bold" 
                        sx={{ color: card.color, lineHeight: 1.2 }}
                      >
                        {card.count}
                      </Typography>
                    )}
                  </Box>
                  <Box>
                    {card.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filters */}
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          {/* Status Filter */}
          <Grid item xs={12} md={5}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Status
            </Typography>
            <ToggleButtonGroup
              value={statusFilter}
              exclusive
              onChange={handleStatusFilterChange}
              size="small"
              sx={{ flexWrap: 'wrap' }}
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
          </Grid>

          {/* Period Filter */}
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Time Period</InputLabel>
              <Select
                value={periodFilter}
                label="Time Period"
                onChange={handlePeriodFilterChange}
              >
                <MenuItem value="">All Time</MenuItem>
                <MenuItem value="current_month">Current Month</MenuItem>
                <MenuItem value="last_month">Last Month</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Ticket Search */}
          <Grid item xs={12} sm={6} md={4}>
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
          </Grid>
        </Grid>
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
          <Table size="small" sx={{ minWidth: 1000 }}>
            <TableHead>
              <TableRow>
                <ResizableTableCell minWidth={100} initialWidth={120} isHeader>JIRA ID</ResizableTableCell>
                <ResizableTableCell minWidth={250} initialWidth={400} isHeader align="left">Summary</ResizableTableCell>
                <ResizableTableCell minWidth={100} initialWidth={140} isHeader>Status</ResizableTableCell>
                <ResizableTableCell minWidth={80} initialWidth={110} isHeader>Priority</ResizableTableCell>
                <ResizableTableCell minWidth={120} initialWidth={160} isHeader>Assignee</ResizableTableCell>
                <ResizableTableCell minWidth={90} initialWidth={110} isHeader>Updated</ResizableTableCell>
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
                  </TableRow>
                ))
              ) : paginatedTickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
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
      />
    </>
  );
};

export default ProductionTickets;
