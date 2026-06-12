import { apiClient } from "../config";

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

const movieAPI = {
  getMovies: (params) => apiClient.get(`/movies`, { params }),
  getMovieById: (id) => apiClient.get(`/movies/${id}`),
  createMovie: (movie) => apiClient.post("/movies", movie),
  updateMovie: (id, movie) => apiClient.put(`/movies/${id}`, movie),
  deleteMovie: (id) => apiClient.delete(`/movies/${id}`),

  // Get now-showing movies by theater
  getNowShowingByTheater: (params = {}) =>
    apiClient.get(`/movies/now-showing/theaters`, { params }),

  // Get coming-soon movies by theater
  getComingSoonByTheater: (params = {}) =>
    apiClient.get(`/movies/coming-soon/theaters`, { params }),

  // Get all now-showing movies
  getAllNowShowing: (params = {}) =>
    apiClient.get("/movies/now-showing", { params }),

  // Get all coming-soon movies
  getAllComingSoon: (params = {}) =>
    apiClient.get("/movies/coming-soon", { params }),
};

const showtimeAPI = {
  getShowtimes: (params = {}) => apiClient.get("/showtimes", { params }),
  getShowtimeById: (id, params = {}) =>
    apiClient.get(`/showtimes/${id}`, { params }),
  getShowtimeSeating: (id) => apiClient.get(`/showtimes/${id}/seating`),
  createShowtime: (showtime) => apiClient.post("/showtimes", showtime),
  updateShowtime: (id, showtime) => apiClient.put(`/showtimes/${id}`, showtime),
  deleteShowtime: (id) => apiClient.delete(`/showtimes/${id}`),
};

const screenAPI = {
  getScreens: () => apiClient.get("/screens"),
};

const redeemAPI = {
  getRedeems: (params = {}) => apiClient.get("/redeems", { params }),
  getRedeemById: (id) => apiClient.get(`/redeems/${id}`),
  createRedeem: (redeem) => apiClient.post("/redeems", redeem),
  updateRedeem: (id, redeem) => apiClient.put(`/redeems/${id}`, redeem),
  deleteRedeem: (id) => apiClient.delete(`/redeems/${id}`),
};

const redeemGiftAPI = {
  getRedeemGifts: (params = {}) => apiClient.get("/redeem-gifts", { params }),
  getRedeemGiftById: (id) => apiClient.get(`/redeem-gifts/${id}`),
  createRedeemGift: (redeemGift) => apiClient.post("/redeem-gifts", redeemGift),
  updateRedeemGift: (id, redeemGift) =>
    apiClient.put(`/redeem-gifts/${id}`, redeemGift),
  deleteRedeemGift: (id) => apiClient.delete(`/redeem-gifts/${id}`),
};

export {
  authAPI,
  genreAPI,
  theaterAPI,
  movieAPI,
  showtimeAPI,
  screenAPI,
  redeemAPI,
  redeemGiftAPI,
};
