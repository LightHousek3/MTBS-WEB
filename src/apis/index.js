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

// Theater API
const theaterAPI = {
    getTheaters: (params) => apiClient.get(`/theaters`, { params }),
    getTheaterById: (id) => apiClient.get(`/theaters/${id}`),
    createTheater: (theater) => apiClient.post(`/theaters`, theater),
    updateTheater: (id, theater) => apiClient.put(`/theaters/${id}`, theater),
    deleteTheater: (id) => apiClient.delete(`/theaters/${id}`),
};

export { authAPI, genreAPI, theaterAPI };
