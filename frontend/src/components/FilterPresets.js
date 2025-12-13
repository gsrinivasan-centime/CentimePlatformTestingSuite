/**
 * Filter Presets Component
 * Horizontal bar with quick-access preset chips and save/share functionality
 */
import React, { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Typography,
  Tooltip,
} from '@mui/material';
import {
  Bookmark as SavedPresetIcon,
  Save as SaveIcon,
  Share as ShareIcon,
  BugReport as BugIcon,
  PriorityHigh as PriorityIcon,
  Person as PersonIcon,
  PersonOff as PersonOffIcon,
  Block as BlockIcon,
  MoreVert as MoreIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { useToast } from '../context/ToastContext';
import {
  BUILT_IN_PRESETS,
  encodeFiltersToURL,
  savePresetsToStorage,
  loadPresetsFromStorage,
} from '../utils/filterOperators';

// Icons for built-in presets
const PRESET_ICONS = {
  'active': <BugIcon fontSize="small" />,
  'high-priority': <PriorityIcon fontSize="small" />,
  'assigned-only': <PersonIcon fontSize="small" />,
  'unassigned': <PersonOffIcon fontSize="small" />,
  'exclude-closed': <BlockIcon fontSize="small" />,
};

// Colors for built-in presets
const PRESET_COLORS = {
  'active': 'primary',
  'high-priority': 'error',
  'assigned-only': 'success',
  'unassigned': 'warning',
  'exclude-closed': 'default',
};

const FilterPresets = ({
  currentFilters, // { items: [], logic: 'and' }
  onApplyPreset,
  onClearFilters, // Optional: callback to clear all filters
}) => {
  const [moreMenuAnchor, setMoreMenuAnchor] = useState(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [userPresets, setUserPresets] = useState(() => loadPresetsFromStorage());
  const [activePresetId, setActivePresetId] = useState(null);
  
  const { showSuccess, showError } = useToast();

  // Apply a preset
  const handleApplyPreset = (preset) => {
    onApplyPreset(preset.filters);
    setActivePresetId(preset.id);
    setMoreMenuAnchor(null);
    showSuccess(`Applied: ${preset.name}`);
  };

  // Clear filters
  const handleClearFilters = () => {
    if (onClearFilters) {
      onClearFilters();
    } else {
      onApplyPreset({ items: [], logic: 'and' });
    }
    setActivePresetId(null);
  };

  // Open save dialog
  const handleOpenSaveDialog = () => {
    setPresetName('');
    setSaveDialogOpen(true);
    setMoreMenuAnchor(null);
  };

  // Save current filters as preset
  const handleSavePreset = () => {
    if (!presetName.trim()) {
      showError('Please enter a preset name');
      return;
    }

    if (!currentFilters?.items?.length) {
      showError('No filters to save');
      return;
    }

    const newPreset = {
      id: `user-${Date.now()}`,
      name: presetName.trim(),
      filters: { ...currentFilters },
      createdAt: new Date().toISOString(),
    };

    const updatedPresets = [...userPresets, newPreset];
    setUserPresets(updatedPresets);
    savePresetsToStorage(updatedPresets);
    
    setSaveDialogOpen(false);
    showSuccess(`Saved: ${presetName}`);
  };

  // Delete user preset
  const handleDeletePreset = (presetId, event) => {
    event.stopPropagation();
    const updatedPresets = userPresets.filter(p => p.id !== presetId);
    setUserPresets(updatedPresets);
    savePresetsToStorage(updatedPresets);
    if (activePresetId === presetId) {
      setActivePresetId(null);
    }
    showSuccess('Preset deleted');
  };

  // Share filters via URL
  const handleShareFilters = async () => {
    if (!currentFilters?.items?.length) {
      showError('No filters to share');
      setMoreMenuAnchor(null);
      return;
    }

    try {
      const encoded = encodeFiltersToURL(currentFilters);
      const url = `${window.location.origin}${window.location.pathname}?filters=${encoded}`;
      
      await navigator.clipboard.writeText(url);
      showSuccess('Filter URL copied to clipboard!');
    } catch (err) {
      showError('Failed to copy URL');
    }
    setMoreMenuAnchor(null);
  };

  const hasFilters = currentFilters?.items?.length > 0;

  return (
    <>
      {/* Presets Bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        {/* Quick Presets Label */}
        <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5, fontWeight: 500 }}>
          Quick filters:
        </Typography>
        
        {/* Built-in Preset Chips */}
        {BUILT_IN_PRESETS.map((preset) => (
          <Tooltip key={preset.id} title={preset.description} arrow>
            <Chip
              icon={PRESET_ICONS[preset.id]}
              label={preset.name}
              size="small"
              color={activePresetId === preset.id ? PRESET_COLORS[preset.id] : 'default'}
              variant={activePresetId === preset.id ? 'filled' : 'outlined'}
              onClick={() => handleApplyPreset(preset)}
              sx={{ 
                cursor: 'pointer',
                '&:hover': { 
                  backgroundColor: activePresetId === preset.id 
                    ? undefined 
                    : 'action.hover' 
                },
              }}
            />
          </Tooltip>
        ))}
        
        {/* Divider */}
        {userPresets.length > 0 && (
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5, height: 24, alignSelf: 'center' }} />
        )}
        
        {/* User Preset Chips */}
        {userPresets.map((preset) => (
          <Chip
            key={preset.id}
            icon={<SavedPresetIcon fontSize="small" />}
            label={preset.name}
            size="small"
            color={activePresetId === preset.id ? 'primary' : 'default'}
            variant={activePresetId === preset.id ? 'filled' : 'outlined'}
            onClick={() => handleApplyPreset(preset)}
            onDelete={(e) => handleDeletePreset(preset.id, e)}
            sx={{ cursor: 'pointer' }}
          />
        ))}
        
        {/* Clear Filter Button (shown when filters active) */}
        {hasFilters && (
          <Chip
            icon={<ClearIcon fontSize="small" />}
            label="Clear"
            size="small"
            color="default"
            variant="outlined"
            onClick={handleClearFilters}
            sx={{ 
              cursor: 'pointer',
              borderStyle: 'dashed',
            }}
          />
        )}
        
        {/* More Actions Button */}
        <Tooltip title="Save or share filters">
          <IconButton
            size="small"
            onClick={(e) => setMoreMenuAnchor(e.currentTarget)}
            sx={{ ml: 0.5 }}
          >
            <MoreIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* More Actions Menu */}
      <Menu
        anchorEl={moreMenuAnchor}
        open={Boolean(moreMenuAnchor)}
        onClose={() => setMoreMenuAnchor(null)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: { minWidth: 200 },
        }}
      >
        <MenuItem
          onClick={handleOpenSaveDialog}
          disabled={!hasFilters}
        >
          <ListItemIcon>
            <SaveIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Save as Preset"
            secondary={hasFilters ? `${currentFilters.items.length} filter(s)` : "Apply filters first"}
            secondaryTypographyProps={{ variant: 'caption' }}
          />
        </MenuItem>

        <MenuItem
          onClick={handleShareFilters}
          disabled={!hasFilters}
        >
          <ListItemIcon>
            <ShareIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Share Filters"
            secondary="Copy link to clipboard"
            secondaryTypographyProps={{ variant: 'caption' }}
          />
        </MenuItem>
        
        {hasFilters && (
          <>
            <Divider />
            <MenuItem onClick={handleClearFilters}>
              <ListItemIcon>
                <ClearIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Clear All Filters" />
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Save Preset Dialog */}
      <Dialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Save Filter Preset</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Preset Name"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder="e.g., My High Priority Open"
            sx={{ mt: 1 }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSavePreset();
              }
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Saving {currentFilters?.items?.length || 0} filter(s) with {currentFilters?.logic?.toUpperCase() || 'AND'} logic.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSavePreset}
            variant="contained"
            disabled={!presetName.trim()}
            startIcon={<SaveIcon />}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FilterPresets;
