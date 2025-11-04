import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Paper,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  AddCircleOutline as AddColumnIcon,
} from '@mui/icons-material';

/**
 * ScenarioExamplesTable Component
 * 
 * Allows users to create data-driven test scenarios with dynamic columns and rows.
 * Data format: { columns: ["Amount", "Status"], rows: [["$0", "Invalid"], ["$10", "Valid"]] }
 * 
 * @param {Object} value - Current scenario examples data (JSON object or null)
 * @param {Function} onChange - Callback when data changes
 */
const ScenarioExamplesTable = ({ value, onChange }) => {
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);

  // Initialize from value prop
  useEffect(() => {
    if (value) {
      try {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value;
        setColumns(parsed.columns || []);
        setRows(parsed.rows || []);
      } catch (e) {
        console.error('Failed to parse scenario_examples:', e);
        setColumns([]);
        setRows([]);
      }
    } else {
      setColumns([]);
      setRows([]);
    }
  }, [value]);

  // Notify parent of changes
  const notifyChange = (newColumns, newRows) => {
    if (newColumns.length === 0 && newRows.length === 0) {
      onChange(null);
    } else {
      const data = {
        columns: newColumns,
        rows: newRows,
      };
      onChange(JSON.stringify(data));
    }
  };

  // Add new column
  const handleAddColumn = () => {
    const newColumns = [...columns, `Column ${columns.length + 1}`];
    const newRows = rows.map(row => [...row, '']);
    setColumns(newColumns);
    setRows(newRows);
    notifyChange(newColumns, newRows);
  };

  // Delete column
  const handleDeleteColumn = (colIndex) => {
    const newColumns = columns.filter((_, i) => i !== colIndex);
    const newRows = rows.map(row => row.filter((_, i) => i !== colIndex));
    setColumns(newColumns);
    setRows(newRows);
    notifyChange(newColumns, newRows);
  };

  // Update column header
  const handleColumnChange = (colIndex, value) => {
    const newColumns = [...columns];
    newColumns[colIndex] = value;
    setColumns(newColumns);
    notifyChange(newColumns, rows);
  };

  // Add new row
  const handleAddRow = () => {
    const newRows = [...rows, new Array(columns.length).fill('')];
    setRows(newRows);
    notifyChange(columns, newRows);
  };

  // Delete row
  const handleDeleteRow = (rowIndex) => {
    const newRows = rows.filter((_, i) => i !== rowIndex);
    setRows(newRows);
    notifyChange(columns, newRows);
  };

  // Update cell value
  const handleCellChange = (rowIndex, colIndex, value) => {
    const newRows = [...rows];
    newRows[rowIndex][colIndex] = value;
    setRows(newRows);
    notifyChange(columns, newRows);
  };

  // Clear all data
  const handleClear = () => {
    setColumns([]);
    setRows([]);
    notifyChange([], []);
  };

  const hasData = columns.length > 0 || rows.length > 0;

  return (
    <Box sx={{ mt: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle2" color="text.secondary">
          Scenario Examples / Parameters (Optional)
        </Typography>
        <Box>
          {hasData && (
            <Button
              size="small"
              color="error"
              onClick={handleClear}
              sx={{ mr: 1 }}
            >
              Clear All
            </Button>
          )}
          <Button
            size="small"
            startIcon={<AddColumnIcon />}
            onClick={handleAddColumn}
            variant="outlined"
          >
            Add Column
          </Button>
        </Box>
      </Box>

      {hasData ? (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                {columns.map((col, colIndex) => (
                  <TableCell key={colIndex}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TextField
                        value={col}
                        onChange={(e) => handleColumnChange(colIndex, e.target.value)}
                        size="small"
                        placeholder={`Column ${colIndex + 1}`}
                        fullWidth
                        variant="standard"
                      />
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteColumn(colIndex)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                ))}
                <TableCell sx={{ width: 50 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {row.map((cell, colIndex) => (
                    <TableCell key={colIndex}>
                      <TextField
                        value={cell}
                        onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                        size="small"
                        placeholder="Value"
                        fullWidth
                        variant="outlined"
                      />
                    </TableCell>
                  ))}
                  <TableCell>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteRow(rowIndex)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Box sx={{ p: 1, textAlign: 'center', borderTop: '1px solid #e0e0e0' }}>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={handleAddRow}
              disabled={columns.length === 0}
            >
              Add Row
            </Button>
          </Box>
        </TableContainer>
      ) : (
        <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            No scenario examples added yet
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
            Add columns and rows to create data-driven test scenarios
            <br />
            Example: Amount ($0, $10, $-10) with Status (Invalid, Valid, Invalid)
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddColumnIcon />}
            onClick={handleAddColumn}
          >
            Add First Column
          </Button>
        </Paper>
      )}
    </Box>
  );
};

export default ScenarioExamplesTable;
