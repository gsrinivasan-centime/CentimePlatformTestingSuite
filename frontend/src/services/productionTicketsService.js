/**
 * Production Tickets API Service
 * Fetches production tickets from JIRA via backend proxy (read-only)
 */
import api from './api';

export const productionTicketsAPI = {
  /**
   * Get production tickets with optional filters
   * @param {Object} params - Query parameters
   * @param {string} params.status - Filter by status: open, in_progress, pending_verification, closed
   * @param {string} params.period - Filter by period: current_month, last_month, all
   * @param {string} params.ticket_number - Search by specific ticket number (CN-XXXX)
   * @returns {Promise<{tickets: Array, total: number, cached: boolean, cache_updated_at: string}>}
   */
  getTickets: async (params = {}) => {
    const response = await api.get('/production-tickets', { params });
    return response.data;
  },

  /**
   * Get production ticket statistics by status
   * @returns {Promise<{open: number, in_progress: number, pending_verification: number, closed_this_month: number}>}
   */
  getStats: async () => {
    const response = await api.get('/production-tickets/stats');
    return response.data;
  },

  /**
   * Get detailed information for a specific ticket including ADF description
   * @param {string} ticketKey - JIRA ticket key (e.g., CN-1234)
   * @returns {Promise<Object>} Ticket details with description_adf and description_html
   */
  getTicketDetails: async (ticketKey) => {
    const response = await api.get(`/production-tickets/${ticketKey}`);
    return response.data;
  },

  /**
   * Get paginated comments for a ticket (newest first)
   * @param {string} ticketKey - JIRA ticket key (e.g., CN-1234)
   * @param {number} startAt - Starting index for pagination (default 0)
   * @param {number} maxResults - Maximum results per page (default 10)
   * @returns {Promise<{total: number, start_at: number, max_results: number, comments: Array}>}
   */
  getTicketComments: async (ticketKey, startAt = 0, maxResults = 10) => {
    const response = await api.get(`/production-tickets/${ticketKey}/comments`, {
      params: { start_at: startAt, max_results: maxResults }
    });
    return response.data;
  },

  /**
   * Get available status transitions for a ticket
   * @param {string} ticketKey - JIRA ticket key (e.g., CN-1234)
   * @returns {Promise<{transitions: Array}>} List of available transitions
   */
  getTicketTransitions: async (ticketKey) => {
    const response = await api.get(`/production-tickets/${ticketKey}/transitions`);
    return response.data;
  },

  /**
   * Transition a ticket to a new status
   * @param {string} ticketKey - JIRA ticket key (e.g., CN-1234)
   * @param {string} transitionId - The transition ID to execute
   * @returns {Promise<{success: boolean, message: string}>}
   */
  transitionTicket: async (ticketKey, transitionId) => {
    const response = await api.post(`/production-tickets/${ticketKey}/transitions`, {
      transition_id: transitionId
    });
    return response.data;
  },

  /**
   * Get users that can be assigned to a ticket
   * @param {string} ticketKey - JIRA ticket key (e.g., CN-1234)
   * @param {string} query - Optional search query for user name/email
   * @returns {Promise<{users: Array}>} List of assignable users
   */
  getAssignableUsers: async (ticketKey, query = '') => {
    const response = await api.get(`/production-tickets/${ticketKey}/assignable-users`, {
      params: { query }
    });
    return response.data;
  },

  /**
   * Update the assignee of a ticket
   * @param {string} ticketKey - JIRA ticket key (e.g., CN-1234)
   * @param {string|null} accountId - Account ID of the new assignee, or null to unassign
   * @returns {Promise<{success: boolean, message: string}>}
   */
  updateAssignee: async (ticketKey, accountId) => {
    const response = await api.put(`/production-tickets/${ticketKey}/assignee`, {
      account_id: accountId
    });
    return response.data;
  },

  /**
   * Clear all caches to force fresh data on next request
   * @returns {Promise<{message: string, cleared_at: string}>}
   */
  refreshCache: async () => {
    const response = await api.post('/production-tickets/refresh');
    return response.data;
  }
};

export default productionTicketsAPI;
