/**
 * Filter Presets Component
 * Dropdown menu for built-in and user-saved filter presets with save/share functionality
 */
import React, { useState } from 'react';
import {
  Button,
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
  BookmarkBorder as PresetIcon,
  Bookmark as SavedPresetIcon,
  Save as SaveIcon,
  Share as ShareIcon,
  Delete as DeleteIcon,
  BugReport as BugIcon,
  PriorityHigh as PriorityIcon,
  Person as PersonIcon,
  PersonOff as PersonOffIcon,
  Block as BlockIcon,
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

const FilterPresets = ({
  currentFilters, // { items: [], logic: 'and' }
  onApplyPreset,
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [userPresets, setUserPresets] = useState(() => loadPresetsFromStorage());
  
  const { showSuccess, showError } = useToast();

  const open = Boolean(anchorEl);

  // Open menu
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  // Close menu
  const handleClose = () => {
    setAnchorEl(null);
  };

  // Apply a preset
  const handleApplyPreset = (preset) => {
    onApplyPreset(preset.filters);
    handleClose();
    showSuccess(`Applied preset: ${preset.name}`);
  };

  // Open save dialog
  const handleOpenSaveDialog = () => {
    setPresetName('');
    setSaveDialogOpen(true);
    handleClose();
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
    showSuccess(`Saved preset: ${presetName}`);
  };

  // Delete user preset
  const handleDeletePreset = (presetId, event) => {
    event.stopPropagation();
    const updatedPresets = userPresets.filter(p => p.id !== presetId);
    setUserPresets(updatedPresets);
    savePresetsToStorage(updatedPresets);
    showSuccess('Preset deleted');
  };

  // Share filters via URL
  const handleShareFilters = async () => {
    if (!currentFilters?.items?.length) {
      showError('No filters to share');
      handleClose();
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
    handleClose();
  };

  const hasFilters = currentFilters?.items?.length > 0;

  return (
    <>
      {/* Presets Button */}
      <Button
        variant="outlined"
        size="small"
        startIcon={<PresetIcon />}
        onClick={handleClick}
        sx={{ minWidth: 'auto' }}
      >
        Presets
      </Button>

      {/* Presets Menu */}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: { minWidth: 220, maxWidth: 300 },
        }}
      >
        {/* Built-in Presets Section */}
        <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 0.5, display: 'block' }}>
          Built-in Presets
        </Typography>
        
        {BUILT_IN_PRESETS.map((preset) => (
          <MenuItem
            key={preset.id}
            onClick={() => handleApplyPreset(preset)}
          >
            <ListItemIcon>
              {PRESET_ICONS[preset.id] || <PresetIcon fontSize="small" />}
            </ListItemIcon>
            <ListItemText
              primary={preset.name}
              secondary={preset.description}
              secondaryTypographyProps={{ variant: 'caption' }}
            />
          </MenuItem>
        ))}

        {/* User Presets Section */}
        {userPresets.length > 0 && (
          <>
            <Divider sx={{ my: 1 }} />
            <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 0.5, display: 'block' }}>
              My Presets
            </Typography>
            
            {userPresets.map((preset) => (
              <MenuItem
                key={preset.id}
                onClick={() => handleApplyPreset(preset)}
                sx={{ pr: 1 }}
              >
                <ListItemIcon>
                  <SavedPresetIcon fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={preset.name}
                  secondary={`${preset.filters?.items?.length || 0} filters`}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
                <Tooltip title="Delete preset">
                  <IconButton
                    size="small"
                    onClick={(e) => handleDeletePreset(preset.id, e)}
                    sx={{ ml: 1 }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </MenuItem>
            ))}
          </>
        )}

        {/* Actions Section */}
        <Divider sx={{ my: 1 }} />
        
        <MenuItem
          onClick={handleOpenSaveDialog}
          disabled={!hasFilters}
        >
          <ListItemIcon>
            <SaveIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Save Current as Preset"
            secondary={hasFilters ? null : "Apply filters first"}
            secondaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
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
            primary="Share Filters Link"
            secondary="Copy URL to clipboard"
            secondaryTypographyProps={{ variant: 'caption' }}
          />
        </MenuItem>
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
            placeholder="e.g., My High Priority Open Tickets"
            sx={{ mt: 1 }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSavePreset();
              }
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            This will save {currentFilters?.items?.length || 0} filter(s) with {currentFilters?.logic?.toUpperCase() || 'AND'} logic.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSavePreset}
            variant="contained"
            disabled={!presetName.trim()}
          >
            Save Preset
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FilterPresets;
