/**
 * Advanced Filter Operators Utility
 * Provides filter field definitions, operators, and filtering logic for Production Tickets
 */

// Maximum number of filters allowed
export const MAX_FILTERS = 10;
// Number of filters after which to show warning
export const WARN_FILTERS = 5;

// Filter field definitions with metadata
export const FILTER_FIELDS = {
  key: {
    label: 'JIRA ID',
    type: 'text',
    field: 'key',
    operators: ['equals', 'notEquals', 'contains', 'notContains', 'in', 'notIn'],
  },
  summary: {
    label: 'Summary',
    type: 'text',
    field: 'summary',
    operators: ['contains', 'notContains', 'equals', 'notEquals'],
  },
  status: {
    label: 'Status',
    type: 'enum',
    field: 'status',
    operators: ['equals', 'notEquals', 'in', 'notIn'],
    defaultValues: ['Open', 'In Progress', 'Pending Verification', 'Closed', 'Cancelled', 'Resolved'],
  },
  priority: {
    label: 'Priority',
    type: 'enum',
    field: 'priority',
    operators: ['equals', 'notEquals', 'in', 'notIn'],
    defaultValues: ['Highest', 'High', 'Medium', 'Low', 'Lowest'],
  },
  assignee: {
    label: 'Assignee',
    type: 'enum',
    field: 'assignee',
    operators: ['equals', 'notEquals', 'in', 'notIn', 'isEmpty', 'isNotEmpty'],
    // Special handling for "Unassigned"
  },
};

// Operator definitions with labels and descriptions
export const OPERATORS = {
  equals: {
    label: 'equals',
    description: 'Exact match',
    requiresValue: true,
    multiValue: false,
  },
  notEquals: {
    label: 'not equals',
    description: 'Does not match',
    requiresValue: true,
    multiValue: false,
  },
  contains: {
    label: 'contains',
    description: 'Contains text (case-insensitive)',
    requiresValue: true,
    multiValue: false,
  },
  notContains: {
    label: 'not contains',
    description: 'Does not contain text',
    requiresValue: true,
    multiValue: false,
  },
  in: {
    label: 'in',
    description: 'Matches any of the selected values',
    requiresValue: true,
    multiValue: true,
  },
  notIn: {
    label: 'not in',
    description: 'Does not match any of the selected values',
    requiresValue: true,
    multiValue: true,
  },
  isEmpty: {
    label: 'is empty',
    description: 'Value is empty or unassigned',
    requiresValue: false,
    multiValue: false,
  },
  isNotEmpty: {
    label: 'is not empty',
    description: 'Value is not empty',
    requiresValue: false,
    multiValue: false,
  },
};

/**
 * Apply a single filter condition to a value
 */
const applyOperator = (value, operator, filterValue) => {
  // Normalize value for comparison
  const normalizedValue = value?.toString().toLowerCase() || '';
  
  // Handle "Unassigned" special case for assignee
  const isUnassigned = !value || value === 'Unassigned' || value === '';

  switch (operator) {
    case 'equals':
      if (Array.isArray(filterValue)) {
        return filterValue.some(fv => normalizedValue === fv.toLowerCase());
      }
      return normalizedValue === filterValue?.toString().toLowerCase();
    
    case 'notEquals':
      if (Array.isArray(filterValue)) {
        return !filterValue.some(fv => normalizedValue === fv.toLowerCase());
      }
      return normalizedValue !== filterValue?.toString().toLowerCase();
    
    case 'contains':
      return normalizedValue.includes(filterValue?.toString().toLowerCase() || '');
    
    case 'notContains':
      return !normalizedValue.includes(filterValue?.toString().toLowerCase() || '');
    
    case 'in':
      if (!Array.isArray(filterValue) || filterValue.length === 0) return true;
      return filterValue.some(fv => {
        if (fv.toLowerCase() === 'unassigned') {
          return isUnassigned;
        }
        return normalizedValue === fv.toLowerCase();
      });
    
    case 'notIn':
      if (!Array.isArray(filterValue) || filterValue.length === 0) return true;
      return !filterValue.some(fv => {
        if (fv.toLowerCase() === 'unassigned') {
          return isUnassigned;
        }
        return normalizedValue === fv.toLowerCase();
      });
    
    case 'isEmpty':
      return isUnassigned;
    
    case 'isNotEmpty':
      return !isUnassigned;
    
    default:
      return true;
  }
};

/**
 * Apply all filters to a dataset
 * @param {Array} data - Array of ticket objects
 * @param {Array} filterItems - Array of filter objects { id, field, operator, value }
 * @param {string} logicOperator - 'and' or 'or' to combine filters
 * @returns {Array} Filtered data
 */
export const applyFilters = (data, filterItems, logicOperator = 'and') => {
  if (!filterItems || filterItems.length === 0) {
    return data;
  }

  return data.filter(item => {
    const results = filterItems.map(filter => {
      const fieldConfig = FILTER_FIELDS[filter.field];
      if (!fieldConfig) return true;
      
      const itemValue = item[fieldConfig.field];
      return applyOperator(itemValue, filter.operator, filter.value);
    });

    if (logicOperator === 'or') {
      return results.some(r => r);
    }
    return results.every(r => r);
  });
};

/**
 * Generate human-readable label for a filter
 */
export const getFilterLabel = (filter) => {
  const fieldConfig = FILTER_FIELDS[filter.field];
  const operatorConfig = OPERATORS[filter.operator];
  
  if (!fieldConfig || !operatorConfig) return '';
  
  let valueStr = '';
  if (operatorConfig.requiresValue) {
    if (Array.isArray(filter.value)) {
      valueStr = filter.value.length > 2 
        ? `${filter.value.slice(0, 2).join(', ')} +${filter.value.length - 2}`
        : filter.value.join(', ');
    } else {
      valueStr = filter.value?.toString() || '';
    }
  }
  
  const parts = [fieldConfig.label, operatorConfig.label];
  if (valueStr) {
    parts.push(`"${valueStr}"`);
  }
  
  return parts.join(' ');
};

/**
 * Encode filter state to URL-safe string
 */
export const encodeFiltersToURL = (filterState) => {
  try {
    const json = JSON.stringify(filterState);
    return btoa(encodeURIComponent(json));
  } catch (e) {
    console.error('Failed to encode filters:', e);
    return '';
  }
};

/**
 * Decode filter state from URL parameter
 * @returns {{ filters: object|null, errors: string[] }}
 */
export const decodeFiltersFromURL = (urlParam) => {
  const result = { filters: null, errors: [] };
  
  if (!urlParam) {
    return result;
  }
  
  try {
    const json = decodeURIComponent(atob(urlParam));
    const parsed = JSON.parse(json);
    
    // Validate structure
    if (!parsed || typeof parsed !== 'object') {
      result.errors.push('Invalid filter format');
      return result;
    }
    
    // Validate items array
    if (!Array.isArray(parsed.items)) {
      result.errors.push('Filter items must be an array');
      return result;
    }
    
    // Validate each filter item
    const validItems = [];
    parsed.items.forEach((item, index) => {
      const errors = validateFilterItem(item);
      if (errors.length > 0) {
        result.errors.push(`Filter ${index + 1}: ${errors.join(', ')}`);
      } else {
        validItems.push(item);
      }
    });
    
    // Validate logic operator
    const validLogic = ['and', 'or'].includes(parsed.logic) ? parsed.logic : 'and';
    if (parsed.logic && !['and', 'or'].includes(parsed.logic)) {
      result.errors.push('Invalid logic operator, defaulting to AND');
    }
    
    result.filters = {
      items: validItems,
      logic: validLogic,
    };
    
    return result;
  } catch (e) {
    result.errors.push('Failed to parse filter URL');
    return result;
  }
};

/**
 * Validate a single filter item
 * @returns {string[]} Array of error messages
 */
export const validateFilterItem = (item) => {
  const errors = [];
  
  if (!item.field || !FILTER_FIELDS[item.field]) {
    errors.push('Invalid field');
  }
  
  if (!item.operator || !OPERATORS[item.operator]) {
    errors.push('Invalid operator');
  }
  
  // Check if field supports this operator
  if (item.field && item.operator) {
    const fieldConfig = FILTER_FIELDS[item.field];
    if (fieldConfig && !fieldConfig.operators.includes(item.operator)) {
      errors.push(`Operator "${item.operator}" not supported for field "${item.field}"`);
    }
  }
  
  // Check if value is required
  if (item.operator && OPERATORS[item.operator]?.requiresValue) {
    if (item.value === undefined || item.value === null || item.value === '') {
      if (!Array.isArray(item.value) || item.value.length === 0) {
        errors.push('Value is required');
      }
    }
  }
  
  return errors;
};

/**
 * Create a new filter item with unique ID
 */
export const createFilterItem = (field, operator, value) => {
  return {
    id: Date.now() + Math.random(),
    field,
    operator,
    value,
  };
};

/**
 * Get available operators for a field
 */
export const getOperatorsForField = (fieldKey) => {
  const fieldConfig = FILTER_FIELDS[fieldKey];
  if (!fieldConfig) return [];
  
  return fieldConfig.operators.map(op => ({
    value: op,
    ...OPERATORS[op],
  }));
};

/**
 * Built-in filter presets
 */
export const BUILT_IN_PRESETS = [
  {
    id: 'active',
    name: 'Active Tickets',
    description: 'Open and In Progress tickets',
    filters: {
      items: [
        { id: 1, field: 'status', operator: 'in', value: ['Open', 'In Progress'] },
      ],
      logic: 'and',
    },
  },
  {
    id: 'high-priority',
    name: 'High Priority',
    description: 'Highest and High priority tickets',
    filters: {
      items: [
        { id: 1, field: 'priority', operator: 'in', value: ['Highest', 'High'] },
      ],
      logic: 'and',
    },
  },
  {
    id: 'assigned-only',
    name: 'Assigned Only',
    description: 'Tickets with an assignee',
    filters: {
      items: [
        { id: 1, field: 'assignee', operator: 'isNotEmpty', value: null },
      ],
      logic: 'and',
    },
  },
  {
    id: 'unassigned',
    name: 'Unassigned',
    description: 'Tickets without an assignee',
    filters: {
      items: [
        { id: 1, field: 'assignee', operator: 'isEmpty', value: null },
      ],
      logic: 'and',
    },
  },
  {
    id: 'exclude-closed',
    name: 'Exclude Cancelled/Resolved',
    description: 'Hide Cancelled and Resolved tickets',
    filters: {
      items: [
        { id: 1, field: 'status', operator: 'notIn', value: ['Cancelled', 'Resolved', 'Closed'] },
      ],
      logic: 'and',
    },
  },
];

// LocalStorage keys
export const STORAGE_KEYS = {
  FILTERS: 'productionTickets_filters',
  PRESETS: 'productionTickets_presets',
};

/**
 * Save filters to localStorage
 */
export const saveFiltersToStorage = (filterState) => {
  try {
    localStorage.setItem(STORAGE_KEYS.FILTERS, JSON.stringify(filterState));
  } catch (e) {
    console.error('Failed to save filters to localStorage:', e);
  }
};

/**
 * Load filters from localStorage
 */
export const loadFiltersFromStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.FILTERS);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load filters from localStorage:', e);
  }
  return null;
};

/**
 * Save user presets to localStorage
 */
export const savePresetsToStorage = (presets) => {
  try {
    localStorage.setItem(STORAGE_KEYS.PRESETS, JSON.stringify(presets));
  } catch (e) {
    console.error('Failed to save presets to localStorage:', e);
  }
};

/**
 * Load user presets from localStorage
 */
export const loadPresetsFromStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.PRESETS);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load presets from localStorage:', e);
  }
  return [];
};
