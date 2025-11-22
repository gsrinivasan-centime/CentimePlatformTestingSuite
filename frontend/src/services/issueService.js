import api from './api';

export const issueService = {
    getAll: async (params) => {
        const response = await api.get('/issues/', { params });
        return response.data;
    },

    getStats: async () => {
        const response = await api.get('/issues/stats');
        return response.data;
    },

    getById: async (id) => {
        const response = await api.get(`/issues/${id}`);
        return response.data;
    },

    create: async (data) => {
        const response = await api.post('/issues/', data);
        return response.data;
    },

    update: async (id, issue) => {
        const response = await api.put(`/issues/${id}`, issue);
        return response.data;
    },
    delete: async (id) => {
        await api.delete(`/issues/${id}`);
    },
    uploadMedia: async (id, formData) => {
        const response = await api.post(`/issues/${id}/upload`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },
    getJiraUsers: async (query = '') => {
        const response = await api.get('/issues/jira-users/search', {
            params: { query }
        });
        return response.data;
    },
    getByStory: async (storyId) => {
        const response = await api.get('/issues/', {
            params: { jira_story_id: storyId }
        });
        return response.data;
    }
};

