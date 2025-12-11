/**
 * CSV Parser Utility for Test Case Workbook
 * 
 * Handles parsing CSV files with the template format:
 * TestID,Title,Preconditions,Steps,Expected Result,Module,Tags
 * 
 * Supports data-driven test cases with [PARAMS] and [DATA] rows
 */

// Row type constants
export const ROW_TYPES = {
  TEST_CASE: 'test_case',
  PARAMS: 'params',
  DATA: 'data',
};

// Column definitions matching the template
export const CSV_COLUMNS = [
  { field: 'testId', headerName: 'TestID', width: 120 },
  { field: 'title', headerName: 'Title', width: 250 },
  { field: 'preconditions', headerName: 'Preconditions', width: 200 },
  { field: 'steps', headerName: 'Steps', width: 300 },
  { field: 'expectedResult', headerName: 'Expected Result', width: 250 },
  { field: 'module', headerName: 'Module', width: 150 },
  { field: 'tags', headerName: 'Tags', width: 150 },
];

/**
 * Parse CSV content into DataGrid-compatible rows
 * @param {string} csvContent - Raw CSV string
 * @returns {Array} Array of row objects with id and rowType
 */
export const parseCSV = (csvContent) => {
  // Remove BOM if present and normalize line endings
  const cleanContent = csvContent
    .replace(/^\uFEFF/, '') // Remove UTF-8 BOM
    .replace(/\r\n/g, '\n') // Normalize CRLF to LF
    .replace(/\r/g, '\n'); // Normalize CR to LF
  
  const lines = cleanContent.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV file must have a header row and at least one data row');
  }

  // Parse header row
  const headers = parseCSVLine(lines[0]);
  const expectedHeaders = ['TestID', 'Title', 'Preconditions', 'Steps', 'Expected Result', 'Module', 'Tags'];
  
  // Validate headers (case-insensitive, also handle BOM in first header)
  const normalizedHeaders = headers.map(h => h.trim().toLowerCase().replace(/^\uFEFF/, ''));
  const normalizedExpected = expectedHeaders.map(h => h.toLowerCase());
  
  if (!normalizedExpected.every((h, i) => normalizedHeaders[i] === h)) {
    throw new Error(`Invalid CSV headers. Expected: ${expectedHeaders.join(', ')}`);
  }

  const rows = [];
  let parentTestCaseId = null;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    const row = createRowFromValues(values, i, parentTestCaseId);
    
    // Track parent test case for data-driven tests
    if (row.rowType === ROW_TYPES.TEST_CASE) {
      parentTestCaseId = row.id;
    } else if (row.rowType === ROW_TYPES.PARAMS || row.rowType === ROW_TYPES.DATA) {
      row.parentId = parentTestCaseId;
    }
    
    rows.push(row);
  }

  return rows;
};

/**
 * Parse a single CSV line handling quoted values with commas and newlines
 * @param {string} line - Single CSV line
 * @returns {Array} Array of cell values
 */
export const parseCSVLine = (line) => {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  values.push(current);
  return values;
};

/**
 * Create a row object from parsed CSV values
 * @param {Array} values - Array of cell values
 * @param {number} rowIndex - Row index for generating unique ID
 * @param {string|null} parentTestCaseId - Parent test case ID for data-driven rows
 * @returns {Object} Row object with all fields
 */
const createRowFromValues = (values, rowIndex, parentTestCaseId) => {
  const [testId, title, preconditions, steps, expectedResult, module, tags] = values.map(v => (v || '').trim());
  
  // Detect row type - case-insensitive matching for [PARAMS] and [DATA] markers
  // Also handle potential whitespace or special characters
  let rowType = ROW_TYPES.TEST_CASE;
  const normalizedTestId = testId.toUpperCase().trim().replace(/[\u200B-\u200D\uFEFF]/g, ''); // Remove zero-width chars
  
  if (normalizedTestId === '[PARAMS]' || normalizedTestId === 'PARAMS' || normalizedTestId === '[PARAM]') {
    rowType = ROW_TYPES.PARAMS;
  } else if (normalizedTestId === '[DATA]' || normalizedTestId === 'DATA') {
    rowType = ROW_TYPES.DATA;
  }

  // Convert semicolon-separated steps to newlines for display
  const formattedSteps = steps ? steps.replace(/;\s*/g, '\n') : '';

  return {
    id: `row-${rowIndex}`,
    rowType,
    parentId: parentTestCaseId,
    testId: rowType === ROW_TYPES.TEST_CASE ? testId : rowType === ROW_TYPES.PARAMS ? '[PARAMS]' : '[DATA]',
    title: title || '',
    preconditions: preconditions || '',
    steps: formattedSteps,
    expectedResult: expectedResult || '',
    module: module || '',
    tags: tags || '',
    // For validation
    errors: {},
    isValid: true,
  };
};

/**
 * Export DataGrid rows back to CSV format
 * @param {Array} rows - Array of row objects from DataGrid
 * @returns {string} CSV content string
 */
export const exportToCSV = (rows) => {
  const headers = ['TestID', 'Title', 'Preconditions', 'Steps', 'Expected Result', 'Module', 'Tags'];
  const csvLines = [headers.join(',')];

  rows.forEach(row => {
    // Convert newlines back to semicolons for Steps field
    const steps = row.steps ? row.steps.replace(/\n/g, '; ') : '';
    
    const values = [
      escapeCSVValue(row.rowType === ROW_TYPES.PARAMS ? '[PARAMS]' : row.rowType === ROW_TYPES.DATA ? '[DATA]' : row.testId),
      escapeCSVValue(row.title),
      escapeCSVValue(row.preconditions),
      escapeCSVValue(steps),
      escapeCSVValue(row.expectedResult),
      escapeCSVValue(row.module),
      escapeCSVValue(row.tags),
    ];
    
    csvLines.push(values.join(','));
  });

  return csvLines.join('\n');
};

/**
 * Escape a value for CSV output
 * @param {string} value - Value to escape
 * @returns {string} Escaped value
 */
const escapeCSVValue = (value) => {
  if (!value) return '';
  
  // If value contains comma, newline, or quote, wrap in quotes
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  
  return value;
};

/**
 * Create an empty row for adding new test cases
 * @param {number} rowIndex - Index for generating unique ID
 * @param {string} rowType - Type of row (test_case, params, data)
 * @returns {Object} Empty row object
 */
export const createEmptyRow = (rowIndex, rowType = ROW_TYPES.TEST_CASE) => {
  return {
    id: `row-${rowIndex}-${Date.now()}`,
    rowType,
    parentId: null,
    testId: rowType === ROW_TYPES.PARAMS ? '[PARAMS]' : rowType === ROW_TYPES.DATA ? '[DATA]' : '',
    title: '',
    preconditions: '',
    steps: '',
    expectedResult: '',
    module: '',
    tags: '',
    errors: {},
    isValid: true,
    isNew: true,
  };
};

/**
 * Validate a single row
 * @param {Object} row - Row object to validate
 * @returns {Object} Updated row with validation errors
 */
export const validateRow = (row) => {
  const errors = {};
  
  if (row.rowType === ROW_TYPES.TEST_CASE) {
    // Title is required for test cases
    if (!row.title || row.title.trim() === '') {
      errors.title = 'Title is required';
    }
    
    // Module is required
    if (!row.module || row.module.trim() === '') {
      errors.module = 'Module is required';
    }
  } else if (row.rowType === ROW_TYPES.PARAMS) {
    // PARAMS row should have at least one parameter column name
    if (!row.preconditions && !row.steps && !row.expectedResult) {
      errors.preconditions = 'At least one parameter name is required';
    }
  } else if (row.rowType === ROW_TYPES.DATA) {
    // DATA rows should have at least one value
    if (!row.preconditions && !row.steps && !row.expectedResult) {
      errors.preconditions = 'At least one data value is required';
    }
  }
  
  return {
    ...row,
    errors,
    isValid: Object.keys(errors).length === 0,
  };
};

/**
 * Validate all rows and return validation summary
 * @param {Array} rows - Array of row objects
 * @returns {Object} { validatedRows, validCount, errorCount, errors, testCaseCount }
 */
export const validateAllRows = (rows) => {
  const validatedRows = rows.map(validateRow);
  // Only count actual test_case rows (not PARAMS/DATA rows)
  const testCaseRows = validatedRows.filter(r => r.rowType === ROW_TYPES.TEST_CASE);
  const validCount = testCaseRows.filter(r => r.isValid).length;
  const errorCount = testCaseRows.filter(r => !r.isValid).length;
  const testCaseCount = testCaseRows.length;
  
  const errors = validatedRows
    .filter(r => !r.isValid && r.rowType === ROW_TYPES.TEST_CASE)
    .map(r => ({
      rowId: r.id,
      title: r.title || '(empty)',
      errors: r.errors,
    }));
  
  return {
    validatedRows,
    validCount,
    errorCount,
    errors,
    testCaseCount,
  };
};

/**
 * Transform rows to backend format for import
 * Groups data-driven test rows with their parent test cases
 * @param {Array} rows - Array of row objects
 * @param {number} moduleId - Module ID to assign to all test cases
 * @returns {Array} Array of test case objects ready for backend
 */
export const transformRowsForBackend = (rows, moduleId) => {
  const testCases = [];
  let currentTestCase = null;
  let scenarioParams = null;
  const scenarioData = [];

  rows.forEach(row => {
    if (row.rowType === ROW_TYPES.TEST_CASE) {
      // Save previous test case with its scenario examples
      if (currentTestCase) {
        if (scenarioParams && scenarioData.length > 0) {
          currentTestCase.scenario_examples = JSON.stringify({
            parameters: scenarioParams,
            examples: scenarioData,
          });
        }
        testCases.push(currentTestCase);
      }

      // Start new test case
      currentTestCase = {
        test_id: row.testId || null, // null means auto-generate
        title: row.title,
        preconditions: row.preconditions,
        steps_to_reproduce: row.steps,
        expected_result: row.expectedResult,
        module_id: moduleId,
        module_name: row.module, // For backend to resolve if module_id not provided
        tags: row.tags,
        test_type: 'manual', // Default
        tag: 'ui', // Default, can be overridden
      };
      scenarioParams = null;
      scenarioData.length = 0;
    } else if (row.rowType === ROW_TYPES.PARAMS) {
      // Capture parameter names from the columns
      scenarioParams = {
        preconditions: row.preconditions,
        steps: row.steps,
        expectedResult: row.expectedResult,
      };
    } else if (row.rowType === ROW_TYPES.DATA) {
      // Capture data values
      scenarioData.push({
        preconditions: row.preconditions,
        steps: row.steps,
        expectedResult: row.expectedResult,
      });
    }
  });

  // Don't forget the last test case
  if (currentTestCase) {
    if (scenarioParams && scenarioData.length > 0) {
      currentTestCase.scenario_examples = JSON.stringify({
        parameters: scenarioParams,
        examples: scenarioData,
      });
    }
    testCases.push(currentTestCase);
  }

  return testCases;
};

/**
 * Generate CSV template for download
 * @returns {string} Template CSV content
 */
export const generateTemplate = () => {
  const headers = ['TestID', 'Title', 'Preconditions', 'Steps', 'Expected Result', 'Module', 'Tags'];
  const exampleRows = [
    ['', 'Login with valid credentials', 'User is on login page', '1. Enter username; 2. Enter password; 3. Click Login', 'User is redirected to dashboard', 'Authentication', 'smoke;regression'],
    ['', 'Login with invalid password', 'User is on login page', '1. Enter username; 2. Enter wrong password; 3. Click Login', 'Error message is displayed', 'Authentication', 'regression'],
    ['', 'Logout from application', 'User is logged in', 'Click Logout button', 'User is redirected to login page', 'Authentication', 'smoke'],
    ['', 'Login with multiple users', 'User is on login page', '1. Enter <username>; 2. Enter <password>; 3. Click Login', 'User sees <expected_message>', 'Authentication', 'regression;data-driven'],
    ['[PARAMS]', '', 'username', 'password', 'expected_message', '', ''],
    ['[DATA]', '', 'admin@test.com', 'Admin123', 'Welcome Admin', '', ''],
    ['[DATA]', '', 'user@test.com', 'User123', 'Welcome User', '', ''],
    ['[DATA]', '', 'invalid@test.com', 'wrong', 'Invalid credentials', '', ''],
  ];

  const csvLines = [
    headers.join(','),
    ...exampleRows.map(row => row.map(escapeCSVValue).join(',')),
  ];

  return csvLines.join('\n');
};
