import axios from 'axios';
import { message } from 'antd';
import { authAPI } from '../apis';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';
import 'dayjs/locale/vi';

/*   Start config for axios   */

// Base API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

let accessToken = null;
const accessTokenListeners = new Set();

const getAccessToken = () => accessToken;

const setAccessToken = (token) => {
    accessToken = token;
    accessTokenListeners.forEach((listener) => listener(accessToken));
};

const clearAccessToken = () => {
    setAccessToken(null);
};

const subscribeAccessToken = (listener) => {
    accessTokenListeners.add(listener);
    return () => accessTokenListeners.delete(listener);
};

// Create axios instance
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
    (config) => {
        const token = getAccessToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    },
);

// Variable for mange refresh token processing
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

const authRefreshIgnoredPaths = ['/auth/login', '/auth/refresh-token', '/auth/logout'];

const shouldRefresh = (error, originalRequest) => {
    if (error.response?.status !== 401 || originalRequest?._retry) {
        return false;
    }

    return !authRefreshIgnoredPaths.some((path) => originalRequest?.url?.includes(path));
};

const redirectToLogin = () => {
    window.dispatchEvent(new Event('auth-unauthorized'));
};

// Response interceptor to handle auth errors and refresh token
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If 401 error and never try refresh token
        if (shouldRefresh(error, originalRequest)) {
            // If calling request refresh token, add into queue
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return apiClient(originalRequest);
                    })
                    .catch((err) => {
                        return Promise.reject(err);
                    });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Call refresh token by httpOnly cookie
                const response = await authAPI.refreshToken();

                const { accessToken } = response.data.data;

                setAccessToken(accessToken);

                // Update header for original request
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;

                // Handle requests in queue
                processQueue(null, accessToken);

                // Retry original request
                return apiClient(originalRequest);
            } catch (refreshError) {
                // Refresh token fail, remove token RAM and redirect to login
                processQueue(refreshError, null);
                clearAccessToken();
                redirectToLogin();
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        // Handle other errors
        return Promise.reject(error);
    },
);

/*  End config for axios   */

/*  Start config for deviceId   */

const DEVICE_ID = 'deviceId';

let deviceId = localStorage.getItem(DEVICE_ID);

if (!deviceId) {
    deviceId = uuidv4();
    localStorage.setItem(DEVICE_ID, deviceId);
}

/*  Start config for deviceId  */

/*  Start config for message antd   */

message.config({ maxCount: 3 }); // Limit only 3 messages are rendered

/*   Start config for message antd   */

/*   Start config for cho dayjs dayjs   */

dayjs.extend(customParseFormat);
dayjs.locale('vi'); // For render day flollowing VietNam language
dayjs.extend(utc);

/*   End config for cho dayjs   */

export {
    apiClient,
    deviceId,
    getAccessToken,
    setAccessToken,
    clearAccessToken,
    subscribeAccessToken,
};
