import api from './api';

export const userService = {
    getAll: async () => {
        const response = await api.get('/auth/users/');
        return response.data;
    },

    getById: async (id) => {
        const response = await api.get(`/auth/users/${id}`);
        return response.data;
    },

    getCurrentUser: async () => {
        const response = await api.get('/auth/users/me');
        return response.data;
    }
};
