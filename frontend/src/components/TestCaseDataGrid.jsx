import React, { useCallback, useMemo } from 'react';
import { DataGrid, GridToolbarContainer } from '@mui/x-data-grid';
import {
  Box,
  Button,
  TextField,
  Tooltip,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { ROW_TYPES, createEmptyRow, exportToCSV, generateTemplate } from '../utils/csvParser';

/**
 * Custom edit cell component for multi-line text fields (Steps)
 */
const MultilineEditCell = (props) => {
  const { id, field, value, api } = props;

  const handleChange = useCallback((event) => {
    api.setEditCellValue({ id, field, value: event.target.value });
  }, [api, id, field]);

  const handleKeyDown = useCallback((event) => {
    // Allow Enter for newlines, use Escape to exit edit mode
    if (event.key === 'Enter' && !event.shiftKey) {
      // Shift+Enter for new line, Enter alone does nothing special
      // Let the default behavior handle it
    }
    if (event.key === 'Escape') {
      api.stopCellEditMode({ id, field, ignoreModifications: true });
    }
  }, [api, id, field]);

  return (
    <TextField
      multiline
      fullWidth
      minRows={2}
      maxRows={6}
      value={value || ''}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      variant="standard"
      sx={{
        '& .MuiInputBase-root': {
          padding: '8px',
          fontSize: '0.875rem',
        },
        '& .MuiInput-underline:before': {
          borderBottom: 'none',
        },
      }}
      autoFocus
    />
  );
};

/**
 * Custom cell renderer for multi-line text display
 */
const MultilineCell = ({ value }) => {
  if (!value) return null;
  
  return (
    <Box
      sx={{
        whiteSpace: 'pre-wrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxHeight: '100%',
        lineHeight: 1.4,
        fontSize: '0.875rem',
      }}
    >
      {value}
    </Box>
  );
};

/**
 * Custom toolbar with Add/Delete row buttons
 */
const CustomToolbar = ({ onAddRow, onDeleteRows, selectedRows, onDownloadTemplate, onExportCSV }) => {
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleAddTestCase = () => {
    onAddRow(ROW_TYPES.TEST_CASE);
    handleMenuClose();
  };

  const handleAddParams = () => {
    onAddRow(ROW_TYPES.PARAMS);
    handleMenuClose();
  };

  const handleAddData = () => {
    onAddRow(ROW_TYPES.DATA);
    handleMenuClose();
  };

  return (
    <GridToolbarContainer sx={{ p: 1, borderBottom: '1px solid #e0e0e0' }}>
      <Button
        size="small"
        startIcon={<AddIcon />}
        onClick={handleMenuOpen}
        variant="outlined"
        sx={{ mr: 1 }}
      >
        Add Row
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleAddTestCase}>Test Case Row</MenuItem>
        <MenuItem onClick={handleAddParams}>[PARAMS] Row</MenuItem>
        <MenuItem onClick={handleAddData}>[DATA] Row</MenuItem>
      </Menu>

      <Button
        size="small"
        startIcon={<DeleteIcon />}
        onClick={onDeleteRows}
        disabled={selectedRows.length === 0}
        color="error"
        variant="outlined"
        sx={{ mr: 1 }}
      >
        Delete Selected ({selectedRows.length})
      </Button>

      <Box sx={{ flexGrow: 1 }} />

      <Button
        size="small"
        startIcon={<DownloadIcon />}
        onClick={onDownloadTemplate}
        variant="text"
        sx={{ mr: 1 }}
      >
        Template
      </Button>

      <Button
        size="small"
        startIcon={<DownloadIcon />}
        onClick={onExportCSV}
        variant="text"
      >
        Export CSV
      </Button>
    </GridToolbarContainer>
  );
};

/**
 * TestCaseDataGrid Component
 * 
 * MUI X DataGrid with Excel-like cell editing for test cases
 * Supports multi-line Steps field, row type styling, and validation
 */
const TestCaseDataGrid = ({
  rows,
  setRows,
  modules = [],
  onValidationChange,
  readOnly = false,
}) => {
  const [selectedRows, setSelectedRows] = React.useState([]);

  // Generate row counter for new rows
  const rowCounter = React.useRef(rows.length + 1);

  // Column definitions
  const columns = useMemo(() => [
    {
      field: 'testId',
      headerName: 'TestID',
      width: 120,
      editable: !readOnly,
      renderCell: (params) => {
        const { rowType, testId } = params.row;
        if (rowType === ROW_TYPES.PARAMS) {
          return <Typography color="primary" fontWeight="bold">[PARAMS]</Typography>;
        }
        if (rowType === ROW_TYPES.DATA) {
          return <Typography color="textSecondary" fontWeight="bold">[DATA]</Typography>;
        }
        return testId || <Typography color="textSecondary" fontStyle="italic">Auto-generate</Typography>;
      },
    },
    {
      field: 'title',
      headerName: 'Title',
      width: 250,
      editable: !readOnly,
      renderCell: (params) => {
        const hasError = params.row.errors?.title;
        return (
          <Tooltip title={hasError || ''} arrow placement="top">
            <Box
              sx={{
                width: '100%',
                borderBottom: hasError ? '2px solid red' : 'none',
              }}
            >
              {params.value}
            </Box>
          </Tooltip>
        );
      },
    },
    {
      field: 'preconditions',
      headerName: 'Preconditions',
      width: 200,
      editable: !readOnly,
      renderCell: (params) => {
        const hasError = params.row.errors?.preconditions;
        return (
          <Tooltip title={hasError || ''} arrow placement="top">
            <Box
              sx={{
                width: '100%',
                borderBottom: hasError ? '2px solid red' : 'none',
              }}
            >
              {params.value}
            </Box>
          </Tooltip>
        );
      },
    },
    {
      field: 'steps',
      headerName: 'Steps',
      width: 300,
      editable: !readOnly,
      renderCell: (params) => <MultilineCell value={params.value} />,
      renderEditCell: (params) => <MultilineEditCell {...params} />,
    },
    {
      field: 'expectedResult',
      headerName: 'Expected Result',
      width: 250,
      editable: !readOnly,
      renderCell: (params) => <MultilineCell value={params.value} />,
      renderEditCell: (params) => <MultilineEditCell {...params} />,
    },
    {
      field: 'module',
      headerName: 'Module',
      width: 150,
      editable: !readOnly,
      type: modules.length > 0 ? 'singleSelect' : 'string',
      valueOptions: modules.map(m => m.name),
      renderCell: (params) => {
        const hasError = params.row.errors?.module;
        return (
          <Tooltip title={hasError || ''} arrow placement="top">
            <Box
              sx={{
                width: '100%',
                borderBottom: hasError ? '2px solid red' : 'none',
              }}
            >
              {params.value}
            </Box>
          </Tooltip>
        );
      },
    },
    {
      field: 'tags',
      headerName: 'Tags',
      width: 150,
      editable: !readOnly,
    },
  ], [readOnly, modules]);

  // Handle cell edit commit (on blur)
  const handleProcessRowUpdate = useCallback((newRow, oldRow) => {
    // Update the row in state
    const updatedRows = rows.map(row => 
      row.id === newRow.id ? { ...newRow, errors: {}, isValid: true } : row
    );
    setRows(updatedRows);
    
    // Trigger validation callback
    if (onValidationChange) {
      onValidationChange(updatedRows);
    }
    
    return newRow;
  }, [rows, setRows, onValidationChange]);

  // Handle row addition
  const handleAddRow = useCallback((rowType) => {
    const newRow = createEmptyRow(rowCounter.current++, rowType);
    const updatedRows = [...rows, newRow];
    setRows(updatedRows);
  }, [rows, setRows]);

  // Handle row deletion
  const handleDeleteRows = useCallback(() => {
    const updatedRows = rows.filter(row => !selectedRows.includes(row.id));
    setRows(updatedRows);
    setSelectedRows([]);
  }, [rows, selectedRows, setRows]);

  // Handle template download
  const handleDownloadTemplate = useCallback(() => {
    const template = generateTemplate();
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'test_cases_template.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  }, []);

  // Handle CSV export
  const handleExportCSV = useCallback(() => {
    const csvContent = exportToCSV(rows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `test_cases_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }, [rows]);

  // Row styling based on row type
  const getRowClassName = useCallback((params) => {
    const { rowType } = params.row;
    if (rowType === ROW_TYPES.PARAMS) return 'params-row';
    if (rowType === ROW_TYPES.DATA) return 'data-row';
    if (!params.row.isValid) return 'error-row';
    return '';
  }, []);

  return (
    <Box
      sx={{
        height: '100%',
        width: '100%',
        '& .params-row': {
          backgroundColor: '#e3f2fd', // Light blue for PARAMS
          '&:hover': {
            backgroundColor: '#bbdefb',
          },
        },
        '& .data-row': {
          backgroundColor: '#f5f5f5', // Light gray for DATA
          '&:hover': {
            backgroundColor: '#eeeeee',
          },
        },
        '& .error-row': {
          backgroundColor: '#ffebee', // Light red for errors
          '&:hover': {
            backgroundColor: '#ffcdd2',
          },
        },
        '& .MuiDataGrid-cell': {
          borderRight: '1px solid #e0e0e0',
        },
        '& .MuiDataGrid-columnHeaders': {
          backgroundColor: '#f5f5f5',
          borderBottom: '2px solid #e0e0e0',
        },
      }}
    >
      <DataGrid
        rows={rows}
        columns={columns}
        editMode="cell"
        processRowUpdate={handleProcessRowUpdate}
        onProcessRowUpdateError={(error) => console.error('Row update error:', error)}
        checkboxSelection={!readOnly}
        disableRowSelectionOnClick
        onRowSelectionModelChange={(newSelection) => setSelectedRows(newSelection)}
        rowSelectionModel={selectedRows}
        getRowClassName={getRowClassName}
        getRowHeight={() => 'auto'}
        slots={{
          toolbar: readOnly ? null : CustomToolbar,
        }}
        slotProps={{
          toolbar: {
            onAddRow: handleAddRow,
            onDeleteRows: handleDeleteRows,
            selectedRows,
            onDownloadTemplate: handleDownloadTemplate,
            onExportCSV: handleExportCSV,
          },
        }}
        sx={{
          '& .MuiDataGrid-cell': {
            py: 1,
            alignItems: 'flex-start',
          },
          '& .MuiDataGrid-row': {
            minHeight: '52px !important',
          },
        }}
        initialState={{
          pagination: {
            paginationModel: { pageSize: 25 },
          },
        }}
        pageSizeOptions={[10, 25, 50, 100]}
      />
    </Box>
  );
};

export default TestCaseDataGrid;
