import api from './api';

export const moduleService = {
    getAll: async () => {
        const response = await api.get('/modules/');
        return response.data;
    },

    getById: async (id) => {
        const response = await api.get(`/modules/${id}`);
        return response.data;
    },

    create: async (data) => {
        const response = await api.post('/modules/', data);
        return response.data;
    },

    update: async (id, data) => {
        const response = await api.put(`/modules/${id}`, data);
        return response.data;
    },

    delete: async (id) => {
        const response = await api.delete(`/modules/${id}`);
        return response.data;
    }
};
