/**
 * JIRA OAuth Service
 * Handles JIRA OAuth authentication and user-specific JIRA operations
 */
import api from './api';

export const jiraAPI = {
  /**
   * Get the current user's JIRA connection status
   * Returns: { configured, connected, expired, email, display_name, cloud_id, expires_at }
   */
  getConnectionStatus: async () => {
    const response = await api.get('/jira/status');
    return response.data;
  },

  /**
   * Initiate JIRA OAuth connection
   * Returns: { auth_url, state }
   */
  initiateConnect: async () => {
    const response = await api.get('/jira/connect');
    return response.data;
  },

  /**
   * Disconnect the user's JIRA account
   */
  disconnect: async () => {
    const response = await api.delete('/jira/disconnect');
    return response.data;
  },

  /**
   * Manually refresh the JIRA token
   */
  refreshToken: async () => {
    const response = await api.post('/jira/refresh');
    return response.data;
  },

  /**
   * Add a comment to a JIRA ticket with optional @mentions
   * @param {string} ticketKey - The JIRA ticket key (e.g., CN-1234)
   * @param {string} body - The comment text (with @[Name](accountId) for mentions)
   * @param {Array} mentions - Array of {id, display} objects for mentioned users
   */
  addComment: async (ticketKey, body, mentions = []) => {
    const response = await api.post(`/production-tickets/${ticketKey}/comments`, { 
      body, 
      mentions 
    });
    return response.data;
  },

  /**
   * Search JIRA users for @mention autocomplete
   * @param {string} query - Search query (name or email)
   * @returns {Array} Array of {accountId, displayName, emailAddress, avatarUrl}
   */
  searchUsers: async (query = '') => {
    const response = await api.get(`/production-tickets/search-users`, {
      params: { query }
    });
    return response.data;
  },
};

export default jiraAPI;
