import axios from 'axios';
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
    updateTheaterCoordinates: (id) => apiClient.patch(`/theaters/${id}/coordinates`),
};

// Service API
const serviceAPI = {
    getServices: (params) => apiClient.get(`/services`, { params }),
    getServiceById: (id) => apiClient.get(`/services/${id}`),
    createService: (service) => apiClient.post('/services', service),
    updateService: (id, service) => apiClient.put(`/services/${id}`, service),
    deleteService: (id) => apiClient.delete(`/services/${id}`),
};

// Cloudinary API
const cloudinaryAPI = {
    uploadImage: (file, folder) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'movie_ticket');
        formData.append('folder', folder);
        return axios.post(`https://api.cloudinary.com/v1_1/dtnmtkqq4/image/upload`, formData);
    },
};

export { authAPI, genreAPI, theaterAPI, serviceAPI, cloudinaryAPI };
