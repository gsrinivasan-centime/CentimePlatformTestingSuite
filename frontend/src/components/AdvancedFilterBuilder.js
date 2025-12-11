/**
 * Advanced Filter Builder Component
 * Popover UI for creating/editing filter conditions with field, operator, and value selection
 */
import React, { useState, useEffect } from 'react';
import {
  Popover,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Autocomplete,
  Chip,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
} from '@mui/icons-material';
import {
  FILTER_FIELDS,
  OPERATORS,
  getOperatorsForField,
  createFilterItem,
} from '../utils/filterOperators';

const AdvancedFilterBuilder = ({
  anchorEl,
  open,
  onClose,
  onAdd,
  availableValues = {}, // { status: ['Open', 'Closed'], assignee: ['John', 'Jane'] }
  editingFilter = null, // For editing existing filter
  onUpdate = null, // Callback when editing
}) => {
  const [selectedField, setSelectedField] = useState('');
  const [selectedOperator, setSelectedOperator] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [multiValues, setMultiValues] = useState([]);

  // Reset form when popover opens/closes or editing filter changes
  useEffect(() => {
    if (open) {
      if (editingFilter) {
        setSelectedField(editingFilter.field);
        setSelectedOperator(editingFilter.operator);
        if (Array.isArray(editingFilter.value)) {
          setMultiValues(editingFilter.value);
          setFilterValue('');
        } else {
          setFilterValue(editingFilter.value || '');
          setMultiValues([]);
        }
      } else {
        setSelectedField('');
        setSelectedOperator('');
        setFilterValue('');
        setMultiValues([]);
      }
    }
  }, [open, editingFilter]);

  // Get available operators for selected field
  const availableOperators = selectedField ? getOperatorsForField(selectedField) : [];

  // Reset operator and value when field changes
  const handleFieldChange = (e) => {
    const newField = e.target.value;
    setSelectedField(newField);
    setSelectedOperator('');
    setFilterValue('');
    setMultiValues([]);
  };

  // Reset value when operator changes
  const handleOperatorChange = (e) => {
    const newOp = e.target.value;
    setSelectedOperator(newOp);
    setFilterValue('');
    setMultiValues([]);
  };

  // Get value options for autocomplete (enum fields)
  const getValueOptions = () => {
    const fieldConfig = FILTER_FIELDS[selectedField];
    if (!fieldConfig) return [];

    // Use available values from data if provided, otherwise use defaults
    if (availableValues[selectedField]?.length > 0) {
      return availableValues[selectedField];
    }

    // Use default values for enum fields
    if (fieldConfig.defaultValues) {
      return fieldConfig.defaultValues;
    }

    return [];
  };

  // Check if current operator requires multi-value input
  const isMultiValue = selectedOperator && OPERATORS[selectedOperator]?.multiValue;

  // Check if operator requires any value
  const requiresValue = selectedOperator && OPERATORS[selectedOperator]?.requiresValue;

  // Check if form is valid
  const isValid = () => {
    if (!selectedField || !selectedOperator) return false;
    if (!requiresValue) return true;
    if (isMultiValue) return multiValues.length > 0;
    return filterValue.trim() !== '';
  };

  // Handle add/update filter
  const handleSubmit = () => {
    if (!isValid()) return;

    const value = isMultiValue ? multiValues : (requiresValue ? filterValue : null);
    
    if (editingFilter && onUpdate) {
      onUpdate({
        ...editingFilter,
        field: selectedField,
        operator: selectedOperator,
        value,
      });
    } else {
      const newFilter = createFilterItem(selectedField, selectedOperator, value);
      onAdd(newFilter);
    }
    
    onClose();
  };

  const fieldConfig = FILTER_FIELDS[selectedField];
  const isEnumField = fieldConfig?.type === 'enum';
  const valueOptions = getValueOptions();

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'left',
      }}
      PaperProps={{
        sx: { p: 2, minWidth: 320, maxWidth: 400 },
      }}
    >
      <Typography variant="subtitle1" fontWeight="bold" mb={2}>
        {editingFilter ? 'Edit Filter' : 'Add Filter'}
      </Typography>

      <Stack spacing={2}>
        {/* Field Selection */}
        <FormControl fullWidth size="small">
          <InputLabel>Field</InputLabel>
          <Select
            value={selectedField}
            onChange={handleFieldChange}
            label="Field"
          >
            {Object.entries(FILTER_FIELDS).map(([key, config]) => (
              <MenuItem key={key} value={key}>
                {config.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Operator Selection */}
        {selectedField && (
          <FormControl fullWidth size="small">
            <InputLabel>Operator</InputLabel>
            <Select
              value={selectedOperator}
              onChange={handleOperatorChange}
              label="Operator"
            >
              {availableOperators.map((op) => (
                <MenuItem key={op.value} value={op.value}>
                  {op.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {/* Value Input */}
        {selectedOperator && requiresValue && (
          <>
            {isMultiValue ? (
              // Multi-value input (IN / NOT IN)
              <Autocomplete
                multiple
                freeSolo
                options={valueOptions}
                value={multiValues}
                onChange={(e, newValue) => setMultiValues(newValue)}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      variant="outlined"
                      label={option}
                      size="small"
                      {...getTagProps({ index })}
                    />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Values"
                    placeholder="Type or select values"
                    size="small"
                    helperText={isEnumField ? "Select from list or type custom values" : "Press Enter to add custom values"}
                  />
                )}
              />
            ) : isEnumField && valueOptions.length > 0 ? (
              // Single-value dropdown for enum fields
              <Autocomplete
                freeSolo
                options={valueOptions}
                value={filterValue}
                onChange={(e, newValue) => setFilterValue(newValue || '')}
                onInputChange={(e, newValue) => setFilterValue(newValue || '')}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Value"
                    placeholder="Select or type a value"
                    size="small"
                  />
                )}
              />
            ) : (
              // Text input for text fields
              <TextField
                fullWidth
                size="small"
                label="Value"
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                placeholder="Enter value"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
            )}
          </>
        )}

        {/* Operator description */}
        {selectedOperator && OPERATORS[selectedOperator] && (
          <Typography variant="caption" color="text.secondary">
            {OPERATORS[selectedOperator].description}
          </Typography>
        )}

        {/* Actions */}
        <Box display="flex" justifyContent="flex-end" gap={1} mt={1}>
          <Button onClick={onClose} size="small">
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!isValid()}
            startIcon={editingFilter ? null : <AddIcon />}
            size="small"
          >
            {editingFilter ? 'Update' : 'Add Filter'}
          </Button>
        </Box>
      </Stack>
    </Popover>
  );
};

export default AdvancedFilterBuilder;
