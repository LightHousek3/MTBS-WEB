import axios from 'axios';
import { apiClient } from '../config';
// Base API configuration
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

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
    upload: (file, { resourceType = 'image', folder, onProgress } = {}) => {
        if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
            return Promise.reject(
                new Error('Missing VITE_CLOUDINARY_CLOUD_NAME or VITE_CLOUDINARY_UPLOAD_PRESET'),
            );
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        if (folder) {
            formData.append('folder', folder);
        }

        return axios.post(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
            formData,
            {
                onUploadProgress: (event) => {
                    if (!event.total) return;
                    onProgress?.(Math.round((event.loaded / event.total) * 100));
                },
            },
        );
    },
    uploadImage: (file, folder, onProgress) =>
        cloudinaryAPI.upload(file, { resourceType: 'image', folder, onProgress }),
};

const movieAPI = {
    getMovies: (params) => apiClient.get(`/movies`, { params }),
    getMovieById: (id) => apiClient.get(`/movies/${id}`),
    createMovie: (movie) => apiClient.post('/movies', movie),
    updateMovie: (id, movie) => apiClient.put(`/movies/${id}`, movie),
    deleteMovie: (id) => apiClient.delete(`/movies/${id}`),
};

const showtimeAPI = {
    getShowtimes: (params = {}) => apiClient.get('/showtimes', { params }),
    getShowtimeById: (id, params = {}) => apiClient.get(`/showtimes/${id}`, { params }),
    getShowtimeSeating: (id) => apiClient.get(`/showtimes/${id}/seating`),
    createShowtime: (showtime) => apiClient.post('/showtimes', showtime),
    updateShowtime: (id, showtime) => apiClient.put(`/showtimes/${id}`, showtime),
    deleteShowtime: (id) => apiClient.delete(`/showtimes/${id}`),
};

const screenAPI = {
    getScreens: (params = {}) => apiClient.get('/screens', { params }),
    getScreenById: (id) => apiClient.get(`/screens/${id}`),
    createScreen: (data) => apiClient.post('/screens', data),
    updateScreen: (id, data) => apiClient.put(`/screens/${id}`, data),
    deleteScreen: (id) => apiClient.delete(`/screens/${id}`),
};

const seatAPI = {
    getSeats: (params = {}) => apiClient.get('/seats', { params }),
    getSeatById: (id) => apiClient.get(`/seats/${id}`),
    createSeat: (seat) => apiClient.post('/seats', seat),
    updateSeat: (id, seat) => apiClient.put(`/seats/${id}`, seat),
    deleteSeat: (id) => apiClient.delete(`/seats/${id}`),
    updateSeatStatus: (id, status) => apiClient.patch(`/seats/${id}/status`, { status }),
    createSeatsBulk: (data) => apiClient.post('/seats/bulk', data),
    updateSeatsBulk: (data) => apiClient.put('/seats/bulk', data),
    deleteSeatsBulk: (data) => apiClient.delete('/seats/bulk', { data }),
};

const bookingAPI = {
    getBookings: (params = {}) => apiClient.get('/bookings', { params }),
    getBookingById: (id, params = {}) => apiClient.get(`/bookings/${id}`, { params }),
};

const redeemAPI = {
    getRedeems: (params = {}) => apiClient.get('/redeems', { params }),
    getRedeemById: (id) => apiClient.get(`/redeems/${id}`),
    createRedeem: (redeem) => apiClient.post('/redeems', redeem),
    updateRedeem: (id, redeem) => apiClient.put(`/redeems/${id}`, redeem),
    deleteRedeem: (id) => apiClient.delete(`/redeems/${id}`),
};

const redeemGiftAPI = {
    getRedeemGifts: (params = {}) => apiClient.get('/redeem-gifts', { params }),
    getRedeemGiftById: (id) => apiClient.get(`/redeem-gifts/${id}`),
    createRedeemGift: (redeemGift) => apiClient.post('/redeem-gifts', redeemGift),
    updateRedeemGift: (id, redeemGift) => apiClient.put(`/redeem-gifts/${id}`, redeemGift),
    deleteRedeemGift: (id) => apiClient.delete(`/redeem-gifts/${id}`),
};

const promotionAPI = {
    getPromotions: (params = {}) => apiClient.get('/promotions', { params }),
    getPromotionById: (id) => apiClient.get(`/promotions/${id}`),
    createPromotion: (promotion) => apiClient.post('/promotions', promotion),
    updatePromotion: (id, promotion) => apiClient.patch(`/promotions/${id}`, promotion),
    deletePromotion: (id) => apiClient.delete(`/promotions/${id}`),
};

const festivalAPI = {
    getFestivals: (params = {}) => apiClient.get('/festivals', { params }),
    getFestivalById: (id) => apiClient.get(`/festivals/${id}`),
    createFestival: (festival) => apiClient.post('/festivals', festival),
    updateFestival: (id, festival) => apiClient.put(`/festivals/${id}`, festival),
    deleteFestival: (id) => apiClient.delete(`/festivals/${id}`),
};

const bannerAPI = {
    getBanners: (params = {}) => apiClient.get('/banners', { params }),
    getBannerById: (id) => apiClient.get(`/banners/${id}`),
    createBanner: (banner) => apiClient.post('/banners', banner),
    updateBanner: (id, banner) => apiClient.put(`/banners/${id}`, banner),
    deleteBanner: (id) => apiClient.delete(`/banners/${id}`),
};

const ticketPriceAPI = {
    getTicketPrices: (params) => apiClient.get('/ticket-prices', { params }),
    getTicketPriceById: (id) => apiClient.get(`/ticket-prices/${id}`),
    createTicketPrice: (data) => apiClient.post('/ticket-prices', data),
    updateTicketPrice: (id, data) => apiClient.put(`/ticket-prices/${id}`, data),
    deleteTicketPrice: (id) => apiClient.delete(`/ticket-prices/${id}`),
};

/* ─── Statistic (Admin Dashboard) ──────────────────────────── */
const statisticAPI = {
    getOverview: () => apiClient.get('/bookings/stats/overview'),
    getRevenueByGenre: (params) => apiClient.get('/bookings/stats/revenue-by-genre', { params }),
    getDailySales: (params) => apiClient.get('/bookings/stats/revenue-by-month', { params }),
    getYearlyRevenue: (params) => apiClient.get('/bookings/stats/revenue-by-year', { params }),
    getTheaterRevenueByYear: (params) => apiClient.get('/bookings/stats/revenue-by-theater', { params }),
    exportDashboard: () => apiClient.get('/bookings/stats/export', { responseType: 'blob' }),
};

/* ─── Exports ───────────────────────────────────────────────── */
export {
    authAPI,
    genreAPI,
    theaterAPI,
    serviceAPI,
    cloudinaryAPI,
    movieAPI,
    showtimeAPI,
    screenAPI,
    seatAPI,
    bookingAPI,
    redeemAPI,
    redeemGiftAPI,
    promotionAPI,
    festivalAPI,
    bannerAPI,
    ticketPriceAPI,
    statisticAPI,
};
