/**
 * Filter Bar Component
 * Displays active filters as chips with add/edit/delete functionality and AND/OR logic toggle
 */
import React, { useState } from 'react';
import {
  Box,
  Chip,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Tooltip,
  IconButton,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  FilterList as FilterListIcon,
  Clear as ClearIcon,
  Warning as WarningIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import AdvancedFilterBuilder from './AdvancedFilterBuilder';
import {
  getFilterLabel,
  MAX_FILTERS,
  WARN_FILTERS,
} from '../utils/filterOperators';

const FilterBar = ({
  filters, // { items: [], logic: 'and' }
  onFiltersChange,
  availableValues = {},
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [editingFilter, setEditingFilter] = useState(null);

  const filterItems = filters?.items || [];
  const logic = filters?.logic || 'and';

  // Open add filter popover
  const handleAddClick = (event) => {
    setEditingFilter(null);
    setAnchorEl(event.currentTarget);
  };

  // Open edit filter popover
  const handleEditClick = (event, filter) => {
    event.stopPropagation();
    setEditingFilter(filter);
    setAnchorEl(event.currentTarget);
  };

  // Close popover
  const handleClose = () => {
    setAnchorEl(null);
    setEditingFilter(null);
  };

  // Add new filter
  const handleAddFilter = (newFilter) => {
    const newItems = [...filterItems, newFilter];
    onFiltersChange({
      items: newItems,
      logic,
    });
  };

  // Update existing filter
  const handleUpdateFilter = (updatedFilter) => {
    const newItems = filterItems.map(f =>
      f.id === updatedFilter.id ? updatedFilter : f
    );
    onFiltersChange({
      items: newItems,
      logic,
    });
  };

  // Delete filter
  const handleDeleteFilter = (filterId) => {
    const newItems = filterItems.filter(f => f.id !== filterId);
    onFiltersChange({
      items: newItems,
      logic,
    });
  };

  // Change logic operator
  const handleLogicChange = (event, newLogic) => {
    if (newLogic) {
      onFiltersChange({
        items: filterItems,
        logic: newLogic,
      });
    }
  };

  // Clear all filters
  const handleClearAll = () => {
    onFiltersChange({
      items: [],
      logic: 'and',
    });
  };

  // Get chip color based on operator type
  const getChipColor = (operator) => {
    if (['notIn', 'notEquals', 'notContains'].includes(operator)) {
      return 'error';
    }
    if (['isEmpty', 'isNotEmpty'].includes(operator)) {
      return 'warning';
    }
    return 'primary';
  };

  const isAtMaxFilters = filterItems.length >= MAX_FILTERS;
  const showWarning = filterItems.length >= WARN_FILTERS;

  return (
    <Box sx={{ mb: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        {/* Filter Icon */}
        <FilterListIcon color="action" sx={{ mr: 0.5 }} />

        {/* Filter Chips */}
        {filterItems.map((filter, index) => (
          <React.Fragment key={filter.id}>
            {/* AND/OR between chips */}
            {index > 0 && (
              <Chip
                label={logic.toUpperCase()}
                size="small"
                variant="outlined"
                sx={{ 
                  fontWeight: 'bold',
                  fontSize: '0.7rem',
                  height: 20,
                  bgcolor: logic === 'or' ? 'warning.lighter' : 'grey.100',
                }}
              />
            )}
            
            {/* Filter Chip */}
            <Chip
              label={getFilterLabel(filter)}
              size="small"
              color={getChipColor(filter.operator)}
              variant="outlined"
              onDelete={() => handleDeleteFilter(filter.id)}
              onClick={(e) => handleEditClick(e, filter)}
              sx={{ 
                cursor: 'pointer',
                '&:hover': { 
                  bgcolor: 'action.hover',
                },
              }}
              icon={
                <Tooltip title="Click to edit">
                  <EditIcon sx={{ fontSize: 14, ml: 0.5 }} />
                </Tooltip>
              }
            />
          </React.Fragment>
        ))}

        {/* Add Filter Button */}
        <Tooltip title={isAtMaxFilters ? `Maximum ${MAX_FILTERS} filters allowed` : 'Add filter'}>
          <span>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={handleAddClick}
              disabled={isAtMaxFilters}
              variant="outlined"
              sx={{ minWidth: 'auto' }}
            >
              Add Filter
            </Button>
          </span>
        </Tooltip>

        {/* Logic Toggle (only show when multiple filters) */}
        {filterItems.length > 1 && (
          <ToggleButtonGroup
            value={logic}
            exclusive
            onChange={handleLogicChange}
            size="small"
            sx={{ ml: 1 }}
          >
            <ToggleButton value="and" sx={{ px: 1.5, py: 0.25 }}>
              <Typography variant="caption" fontWeight="bold">AND</Typography>
            </ToggleButton>
            <ToggleButton value="or" sx={{ px: 1.5, py: 0.25 }}>
              <Typography variant="caption" fontWeight="bold">OR</Typography>
            </ToggleButton>
          </ToggleButtonGroup>
        )}

        {/* Clear All Button */}
        {filterItems.length > 0 && (
          <Tooltip title="Clear all filters">
            <IconButton size="small" onClick={handleClearAll} color="error">
              <ClearIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}

        {/* Warning for many filters */}
        {showWarning && !isAtMaxFilters && (
          <Tooltip title={`You have ${filterItems.length} filters. Maximum is ${MAX_FILTERS}.`}>
            <WarningIcon color="warning" fontSize="small" />
          </Tooltip>
        )}
      </Stack>

      {/* No filters message */}
      {filterItems.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, ml: 3.5 }}>
          No filters applied. Click "Add Filter" to filter tickets.
        </Typography>
      )}

      {/* Filter count and result info */}
      {filterItems.length > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 3.5, display: 'block' }}>
          {filterItems.length} filter{filterItems.length > 1 ? 's' : ''} applied
          {filterItems.length > 1 && ` (${logic.toUpperCase()} logic)`}
        </Typography>
      )}

      {/* Advanced Filter Builder Popover */}
      <AdvancedFilterBuilder
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        onAdd={handleAddFilter}
        onUpdate={handleUpdateFilter}
        availableValues={availableValues}
        editingFilter={editingFilter}
      />
    </Box>
  );
};

export default FilterBar;
