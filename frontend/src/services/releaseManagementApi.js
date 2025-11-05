import api from './api';

// =====================
// Release Test Cases
// =====================

export const addTestCasesToRelease = (releaseId, testCaseIds) => {
  return api.post(`/releases/${releaseId}/test-cases`, { test_case_ids: testCaseIds });
};

export const getReleaseTestCases = (releaseId, filters = {}) => {
  const params = new URLSearchParams(filters);
  return api.get(`/releases/${releaseId}/test-cases?${params.toString()}`);
};

export const updateReleaseTestCase = (releaseId, testCaseId, updateData) => {
  return api.put(`/releases/${releaseId}/test-cases/${testCaseId}`, updateData);
};

export const removeTestCaseFromRelease = (releaseId, testCaseId) => {
  return api.delete(`/releases/${releaseId}/test-cases/${testCaseId}`);
};

// =====================
// Dashboard
// =====================

export const getReleaseDashboard = (releaseId) => {
  return api.get(`/releases/${releaseId}/dashboard`);
};

// =====================
// Tree View
// =====================

export const getReleaseTreeView = (releaseId) => {
  return api.get(`/releases/${releaseId}/tree`);
};

// =====================
// Approvals
// =====================

export const createApproval = (releaseId, approvalData) => {
  return api.post(`/releases/${releaseId}/approvals`, approvalData);
};

export const getReleaseApprovals = (releaseId) => {
  return api.get(`/releases/${releaseId}/approvals`);
};

export const updateApproval = (releaseId, approvalId, updateData) => {
  return api.put(`/releases/${releaseId}/approvals/${approvalId}`, updateData);
};

// =====================
// History
// =====================

export const getReleaseHistory = (releaseId, limit = 50) => {
  return api.get(`/releases/${releaseId}/history?limit=${limit}`);
};
