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

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors with global error handler
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle network errors
    if (!error.response) {
      if (errorHandler) {
        errorHandler('Network error. Please check your connection.');
      }
      return Promise.reject(error);
    }

    // Handle specific status codes
    const { status, data } = error.response;
    
    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      if (errorHandler) {
        errorHandler('Session expired. Please login again.');
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

export default api;
