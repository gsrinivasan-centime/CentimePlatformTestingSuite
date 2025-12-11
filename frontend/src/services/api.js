import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Global error handler function
let errorHandler = null;

export const setErrorHandler = (handler) => {
  errorHandler = handler;
};

// Global loading handler functions
let loadingStartHandler = null;
let loadingStopHandler = null;

export const setLoadingHandlers = (startHandler, stopHandler) => {
  loadingStartHandler = startHandler;
  loadingStopHandler = stopHandler;
};

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// Add token to requests and trigger loading state
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Start loading indicator for all API calls
    if (loadingStartHandler) {
      loadingStartHandler();
    }
    return config;
  },
  (error) => {
    // Stop loading on request error
    if (loadingStopHandler) {
      loadingStopHandler();
    }
    return Promise.reject(error);
  }
);

// Handle response errors with global error handler
api.interceptors.response.use(
  (response) => {
    // Stop loading on successful response
    if (loadingStopHandler) {
      loadingStopHandler();
    }
    return response;
  },
  async (error) => {
    // Stop loading on error response
    if (loadingStopHandler) {
      loadingStopHandler();
    }
    // Handle network errors
    if (!error.response) {
      if (errorHandler) {
        errorHandler('Network error. Please check your connection.');
      }
      return Promise.reject(error);
    }

    const originalRequest = error.config;
    const { status, data } = error.response;
    
    // Handle 401 - Token expired
    if (status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Wait for the token refresh to complete
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers['Authorization'] = 'Bearer ' + token;
            return api(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      
      if (!refreshToken) {
        // No refresh token, redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        if (errorHandler) {
          errorHandler('Session expired. Please login again.');
        }
        return Promise.reject(error);
      }

      try {
        // Attempt to refresh token
        const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
          refresh_token: refreshToken
        });
        
        const { access_token, refresh_token } = response.data;
        
        localStorage.setItem('token', access_token);
        localStorage.setItem('refreshToken', refresh_token);
        
        api.defaults.headers.common['Authorization'] = 'Bearer ' + access_token;
        originalRequest.headers['Authorization'] = 'Bearer ' + access_token;
        
        processQueue(null, access_token);
        isRefreshing = false;
        
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        processQueue(refreshError, null);
        isRefreshing = false;
        
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        if (errorHandler) {
          errorHandler('Session expired. Please login again.');
        }
        return Promise.reject(refreshError);
      }
    } else if (status === 403) {
      if (errorHandler) {
        errorHandler('You do not have permission to perform this action.');
      }
    } else if (status === 404) {
      if (errorHandler) {
        errorHandler('Resource not found.');
      }
    } else if (status === 422) {
      // Validation error
      if (errorHandler) {
        const detail = data?.detail;
        if (Array.isArray(detail)) {
          errorHandler(`Validation error: ${detail[0]?.msg || 'Invalid data'}`);
        } else {
          errorHandler(detail || 'Validation error. Please check your input.');
        }
      }
    } else if (status === 500) {
      if (errorHandler) {
        errorHandler(data?.detail || 'Server error. Please try again later.');
      }
    } else {
      // Generic error
      if (errorHandler) {
        errorHandler(data?.detail || 'Request failed. Please try again.');
      }
    }

    return Promise.reject(error);
  }
);

// Authentication API
export const authAPI = {
  login: async (email, password) => {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);
    
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  },
  
  register: async (userData) => {
    const response = await axios.post(`${API_BASE_URL}/api/auth/register`, userData);
    return response.data;
  },
  
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  
  getPermissions: async () => {
    const response = await api.get('/users/permissions/me');
    return response.data;
  },
};

// Users API
export const usersAPI = {
  getAll: async () => {
    const response = await api.get('/users');
    return response.data;
  },
  
  getById: async (id) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },
  
  update: async (id, userData) => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  },
};

// Modules API
export const modulesAPI = {
  getAll: async () => {
    const response = await api.get('/modules');
    return response.data;
  },
  
  create: async (moduleData) => {
    const response = await api.post('/modules', moduleData);
    return response.data;
  },
  
  getById: async (id) => {
    const response = await api.get(`/modules/${id}`);
    return response.data;
  },
};

// Sub-Modules API
export const subModulesAPI = {
  getAll: async (moduleId = null) => {
    const params = moduleId ? { module_id: moduleId } : {};
    const response = await api.get('/sub-modules', { params });
    return response.data;
  },
  
  create: async (subModuleData) => {
    const response = await api.post('/sub-modules', subModuleData);
    return response.data;
  },
  
  getById: async (id) => {
    const response = await api.get(`/sub-modules/${id}`);
    return response.data;
  },
  
  update: async (id, subModuleData) => {
    const response = await api.put(`/sub-modules/${id}`, subModuleData);
    return response.data;
  },
  
  delete: async (id) => {
    const response = await api.delete(`/sub-modules/${id}`);
    return response.data;
  },
};

// Features API
export const featuresAPI = {
  getAll: async (subModuleId = null) => {
    const params = subModuleId ? { sub_module_id: subModuleId } : {};
    const response = await api.get('/features', { params });
    return response.data;
  },
  
  create: async (featureData) => {
    const response = await api.post('/features', featureData);
    return response.data;
  },
  
  getById: async (id) => {
    const response = await api.get(`/features/${id}`);
    return response.data;
  },
  
  update: async (id, featureData) => {
    const response = await api.put(`/features/${id}`, featureData);
    return response.data;
  },
  
  delete: async (id) => {
    const response = await api.delete(`/features/${id}`);
    return response.data;
  },
};

// Test Cases API
export const testCasesAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/test-cases', { params });
    return response.data;
  },
  
  create: async (testCaseData) => {
    const response = await api.post('/test-cases', testCaseData);
    return response.data;
  },
  
  getById: async (id) => {
    const response = await api.get(`/test-cases/${id}`);
    return response.data;
  },
  
  update: async (id, testCaseData) => {
    const response = await api.put(`/test-cases/${id}`, testCaseData);
    return response.data;
  },
  
  delete: async (id) => {
    const response = await api.delete(`/test-cases/${id}`);
    return response.data;
  },
  
  // NEW: Generate test ID based on tag
  generateTestId: async (tag) => {
    const response = await api.get('/test-cases/generate-test-id', { 
      params: { tag } 
    });
    return response.data;
  },
  
  // NEW: Bulk upload test cases from CSV
  bulkUpload: async (formData) => {
    const response = await api.post('/test-cases/bulk-upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  // NEW: Bulk upload test cases from BDD Feature file
  bulkUploadFeature: async (formData) => {
    const response = await api.post('/test-cases/bulk-upload-feature', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  // NEW: Hierarchy endpoints
  getHierarchyStructure: async () => {
    const response = await api.get('/test-cases/hierarchy/structure');
    return response.data;
  },
  
  getHierarchyOptions: async (moduleId = null, subModule = null) => {
    const params = {};
    if (moduleId) params.module_id = moduleId;
    if (subModule) params.sub_module = subModule;
    const response = await api.get('/test-cases/hierarchy/options', { params });
    return response.data;
  },
  
  // JIRA Story View
  getByJiraStory: async (releaseId = null) => {
    const params = {};
    if (releaseId) params.release_id = releaseId;
    const response = await api.get('/test-cases/by-jira-story', { params });
    return response.data;
  },

  // NEW: Bulk update test cases
  bulkUpdate: async (testCaseIds, updateData) => {
    const response = await api.put('/test-cases/bulk-update', {
      test_case_ids: testCaseIds,
      ...updateData
    });
    return response.data;
  },

  // NEW: Import test cases from CSV workbook
  importCsvWorkbook: async (payload) => {
    const response = await api.post('/test-cases/import-csv-workbook', payload);
    return response.data;
  },
};

// Releases API
export const releasesAPI = {
  getAll: async () => {
    const response = await api.get('/releases');
    return response.data;
  },
  
  create: async (releaseData) => {
    const response = await api.post('/releases', releaseData);
    return response.data;
  },
  
  getById: async (id) => {
    const response = await api.get(`/releases/${id}`);
    return response.data;
  },
};

// Executions API
export const executionsAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/executions', { params });
    return response.data;
  },
  
  create: async (executionData) => {
    const response = await api.post('/executions', executionData);
    return response.data;
  },
  
  execute: async (testCaseId, releaseId) => {
    const response = await api.post(`/executions/execute/${testCaseId}?release_id=${releaseId}`);
    return response.data;
  },
  
  getById: async (id) => {
    const response = await api.get(`/executions/${id}`);
    return response.data;
  },
};

// Reports API
export const reportsAPI = {
  getReleaseReport: async (releaseId) => {
    const response = await api.get(`/reports/release/${releaseId}`);
    return response.data;
  },
  
  downloadPDF: async (releaseId) => {
    const response = await api.get(`/reports/pdf/${releaseId}`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

// JIRA Stories API
export const jiraStoriesAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/jira-stories', { params });
    return response.data;
  },
  
  create: async (storyData) => {
    const response = await api.post('/jira-stories', storyData);
    return response.data;
  },
  
  getById: async (storyId) => {
    const response = await api.get(`/jira-stories/${storyId}`);
    return response.data;
  },
  
  update: async (storyId, storyData) => {
    const response = await api.put(`/jira-stories/${storyId}`, storyData);
    return response.data;
  },
  
  delete: async (storyId) => {
    const response = await api.delete(`/jira-stories/${storyId}`);
    return response.data;
  },
  
  getTestCases: async (storyId) => {
    const response = await api.get(`/jira-stories/${storyId}/test-cases`);
    return response.data;
  },
  
  linkTestCase: async (storyId, testCaseId) => {
    const response = await api.post(`/jira-stories/${storyId}/link-test-case/${testCaseId}`);
    return response.data;
  },
  
  unlinkTestCase: async (storyId, testCaseId) => {
    const response = await api.delete(`/jira-stories/${storyId}/unlink-test-case/${testCaseId}`);
    return response.data;
  },
  
  getByEpic: async (epicId) => {
    const response = await api.get(`/jira-stories/epic/${epicId}/stories`);
    return response.data;
  },
  
  importFromJira: async (storyUrl) => {
    const response = await api.post('/jira-stories/import-from-jira', { story_url: storyUrl });
    return response.data;
  },
  
  checkJiraConfig: async () => {
    const response = await api.get('/jira-stories/jira-config-status');
    return response.data;
  },
  
  refetchFromJira: async (storyId) => {
    const response = await api.post(`/jira-stories/${storyId}/refetch`);
    return response.data;
  },
  
  syncByRelease: async (releaseVersion) => {
    const response = await api.post(`/jira-stories/sync-by-release/${releaseVersion}`);
    return response.data;
  },
  
  syncAllStories: async () => {
    const response = await api.post('/jira-stories/sync-all-stories');
    return response.data;
  },
};

// Step Catalog API
export const stepCatalogAPI = {
  // Get all steps with optional filters
  getAll: async (params = {}) => {
    const response = await api.get('/step-catalog/steps', { params });
    return response.data;
  },
  
  // Get step by ID
  getById: async (id) => {
    const response = await api.get(`/step-catalog/steps/${id}`);
    return response.data;
  },
  
  // Create new step
  create: async (data) => {
    const response = await api.post('/step-catalog/steps', data);
    return response.data;
  },
  
  // Update step
  update: async (id, data) => {
    const response = await api.put(`/step-catalog/steps/${id}`, data);
    return response.data;
  },
  
  // Delete step
  delete: async (id) => {
    const response = await api.delete(`/step-catalog/steps/${id}`);
    return response.data;
  },
  
  // Increment usage count
  incrementUsage: async (id) => {
    const response = await api.post(`/step-catalog/steps/${id}/increment-usage`);
    return response.data;
  },
  
  // Get statistics
  getStats: async () => {
    const response = await api.get('/step-catalog/steps/stats/summary');
    return response.data;
  },
  
  // Search for suggestions (autocomplete)
  searchSuggestions: async (query, stepType = null, limit = 10) => {
    const params = { query, limit };
    if (stepType) params.step_type = stepType;
    const response = await api.get('/step-catalog/steps/search/suggestions', { params });
    return response.data;
  },
};

// Feature Files API
export const featureFilesAPI = {
  // Get all feature files
  getAll: async (params = {}) => {
    const response = await api.get('/step-catalog/feature-files', { params });
    return response.data;
  },
  
  // Get feature file by ID
  getById: async (id) => {
    const response = await api.get(`/step-catalog/feature-files/${id}`);
    return response.data;
  },
  
  // Create new feature file
  create: async (data) => {
    const response = await api.post('/step-catalog/feature-files', data);
    return response.data;
  },
  
  // Update feature file
  update: async (id, data) => {
    const response = await api.put(`/step-catalog/feature-files/${id}`, data);
    return response.data;
  },
  
  // Delete feature file
  delete: async (id) => {
    const response = await api.delete(`/step-catalog/feature-files/${id}`);
    return response.data;
  },
  
  // Preview scenarios before publishing
  previewScenarios: async (id) => {
    const response = await api.get(`/step-catalog/feature-files/${id}/preview-scenarios`);
    return response.data;
  },
  
  // Publish feature file with scenario types (submits for approval)
  publish: async (id, scenarioTypes = null) => {
    const response = await api.post(`/step-catalog/feature-files/${id}/publish`, {
      scenario_types: scenarioTypes
    });
    return response.data;
  },
  
  // Restore feature file (unpublish)
  restore: async (id) => {
    const response = await api.post(`/step-catalog/feature-files/${id}/restore`);
    return response.data;
  },
  
  // Get pending approval files (for testers: own files, for admins: all files)
  getPendingApproval: async () => {
    const response = await api.get('/step-catalog/feature-files/pending-approval/list');
    return response.data;
  },
  
  // Bulk upload feature file for approval
  bulkUploadForApproval: async (formData) => {
    const response = await api.post('/step-catalog/feature-files/bulk-upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  // Approve feature file (admin only)
  approve: async (id, scenarioTypes = null) => {
    const response = await api.post(`/step-catalog/feature-files/${id}/approve`, {
      scenario_types: scenarioTypes
    });
    return response.data;
  },
  
  // Reject feature file (admin only)
  reject: async (id, reason = '') => {
    const response = await api.post(`/step-catalog/feature-files/${id}/reject`, {
      reason
    });
    return response.data;
  },
};

// CSV Workbooks API - For CSV file upload with approval workflow
export const csvWorkbooksAPI = {
  // Get all workbooks (with optional status filter)
  getAll: async (params = {}) => {
    const response = await api.get('/csv-workbooks', { params });
    return response.data;
  },
  
  // Get user's draft workbooks
  getDrafts: async () => {
    const response = await api.get('/csv-workbooks/drafts');
    return response.data;
  },
  
  // Get pending approval workbooks
  getPendingApproval: async () => {
    const response = await api.get('/csv-workbooks/pending-approval');
    return response.data;
  },
  
  // Create new workbook (from CSV upload or blank)
  create: async (data) => {
    const response = await api.post('/csv-workbooks', data);
    return response.data;
  },
  
  // Get workbook by ID
  getById: async (id) => {
    const response = await api.get(`/csv-workbooks/${id}`);
    return response.data;
  },
  
  // Update workbook
  update: async (id, data) => {
    const response = await api.put(`/csv-workbooks/${id}`, data);
    return response.data;
  },
  
  // Delete workbook
  delete: async (id) => {
    const response = await api.delete(`/csv-workbooks/${id}`);
    return response.data;
  },
  
  // Submit workbook for approval
  submitForApproval: async (id) => {
    const response = await api.post(`/csv-workbooks/${id}/submit-for-approval`);
    return response.data;
  },
  
  // Analyze similarity (preview duplicates)
  analyzeSimilarity: async (id) => {
    const response = await api.post(`/csv-workbooks/${id}/analyze-similarity`);
    return response.data;
  },
  
  // Preview publish (see what test cases will be created)
  previewPublish: async (id) => {
    const response = await api.get(`/csv-workbooks/${id}/preview-publish`);
    return response.data;
  },
  
  // Approve workbook (admin only)
  approve: async (id) => {
    const response = await api.post(`/csv-workbooks/${id}/approve`);
    return response.data;
  },
  
  // Reject workbook (admin only)
  reject: async (id, reason = '') => {
    const response = await api.post(`/csv-workbooks/${id}/reject`, { reason });
    return response.data;
  },
  
  // Confirm publish (create test cases)
  confirmPublish: async (id) => {
    const response = await api.post(`/csv-workbooks/${id}/confirm-publish`);
    return response.data;
  },
};

export default api;
