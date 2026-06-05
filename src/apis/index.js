import { apiClient } from '../config';

// Authentication API
const authAPI = {
    login: (credentials) => apiClient.post('/auth/login', credentials),
    logout: () => apiClient.post('/auth/logout'),
    refreshToken: () => apiClient.post('/auth/refresh-token'),
};

// Genre API
const genreAPI = {
    getGenres: (params) => apiClient.get('/genres', { params }),
    createGenre: (data) => apiClient.post('/genres', data),
    updateGenre: (id, data) => apiClient.put(`/genres/${id}`, data),
    deleteGenre: (id) => apiClient.delete(`/genres/${id}`),
};

export { authAPI, genreAPI };
