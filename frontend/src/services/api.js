import axios from 'axios';

const apiFunc = (url) => {
    if (!url) return 'http://localhost:3001/api';
    // Remove trailing slash if present
    const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
}
export const API_BASE_URL = apiFunc(import.meta.env.VITE_API_URL || 'http://localhost:3001');

console.log('🔗 API Base URL:', API_BASE_URL);

let accessToken = null;

const redirectToLogin = () => {
    setTimeout(() => {
        window.location.replace('/login');
    }, 100);
};

export const getAccessToken = () => accessToken;
export const hasAccessToken = () => Boolean(accessToken);
export const setAccessToken = (token) => {
    accessToken = typeof token === 'string' && token.trim() ? token.trim() : null;
    return accessToken;
};
export const clearAccessToken = () => {
    accessToken = null;
};

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true, // Important for cookies
    headers: {
        'Content-Type': 'application/json'
    }
});

const refreshClient = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Global flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });

    failedQueue = [];
};

// Request interceptor to add access token
api.interceptors.request.use(
    (config) => {
        const token = getAccessToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (!originalRequest) {
            return Promise.reject(error);
        }

        // Don't try to refresh token for public endpoints or if user isn't logged in
        const isPublicEndpoint = originalRequest.url?.includes('/public/');
        const token = getAccessToken();

        // If error is 401 (Unauthorized) and not already retrying
        if (error.response?.status === 401 && !originalRequest._retry && token && !isPublicEndpoint) {
            // If already refreshing, queue this request
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then(token => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return api(originalRequest);
                    })
                    .catch(err => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Try to refresh token
                const response = await refreshClient.post('/auth/refresh');
                const nextAccessToken = setAccessToken(response.data.accessToken);

                // Save new token
                isRefreshing = false;
                processQueue(null, nextAccessToken);

                // Retry original request
                originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                // Refresh failed (token expired or invalid)
                isRefreshing = false;
                processQueue(refreshError, null);
                clearAccessToken();
                redirectToLogin();

                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export const restoreSession = async () => {
    try {
        const response = await refreshClient.post('/auth/refresh');
        return setAccessToken(response.data.accessToken);
    } catch (_error) {
        clearAccessToken();
        return null;
    }
};

// API Service object
export const apiService = {
    // Auth
    login: (credentials) => api.post('/auth/login', credentials),
    register: (userData) => api.post('/auth/register', userData),
    logout: () => api.post('/auth/logout'),
    getCurrentUser: () => api.get('/auth/me'),

    // Tasks
    getTasks: () => api.get('/tasks').then(res => res.data),
    createTask: (task) => api.post('/tasks', task).then(res => res.data),
    updateTask: (id, task) => api.put(`/tasks/${id}`, task).then(res => res.data),
    deleteTask: (id) => api.delete(`/tasks/${id}`).then(res => res.data),
    togglePayment: (id, payload = {}) => api.patch(`/tasks/${id}/toggle-payment`, payload).then(res => res.data),
    recordOfflinePayment: (id, payload) => api.post(`/tasks/${id}/record-payment`, payload).then(res => res.data),
    getPaymentHistory: () => api.get('/payments').then(res => res.data),
    createGuestPaymentLink: (payload) => api.post('/payments/guest-links', payload).then(res => res.data),
    revokeGuestPaymentLink: (id) => api.post(`/payments/guest-links/${id}/revoke`).then(res => res.data),
    getOutstandingSummary: () => api.get('/payments/outstanding-summary').then(res => res.data),
    initializeBulkPayment: () => api.post('/payments/initialize-bulk').then(res => res.data),
    verifyBulkPayment: (payload) => api.post('/payments/verify-bulk', payload).then(res => res.data),
    getPaymentSettings: () => api.get('/payments/settings').then(res => res.data),
    updatePaymentSettings: (payload) => api.put('/payments/settings', payload).then(res => res.data),
    getPaymentReminderOverview: () => api.get('/payments/reminders/overview').then(res => res.data),
    sendPaymentRemindersNow: (payload) => api.post('/payments/reminders/send-now', payload).then(res => res.data),
    // Files
    getAllFiles: (params) => api.get('/files', { params }).then(res => res.data),
    getFileStats: () => api.get('/files/stats').then(res => res.data),
    uploadFile: (taskId, formData) => api.post(`/tasks/${taskId}/files`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data),
    getTaskFiles: (taskId) => api.get(`/tasks/${taskId}/files`).then(res => res.data),
    getDownloadUrl: (fileId) => api.get(`/files/${fileId}/download`).then(res => res.data),
    toggleDeliverable: (fileId) => api.patch(`/files/${fileId}/deliverable`).then(res => res.data),
    deleteFile: (fileId) => api.delete(`/files/${fileId}`).then(res => res.data),

    // Quotes
    sendQuote: (taskId, amount, requiresDeposit) => api.post(`/tasks/${taskId}/quote`, { amount, requiresDeposit }).then(res => res.data),
    respondToQuote: (taskId, action) => api.post(`/tasks/${taskId}/quote/respond`, { action }).then(res => res.data),

    // Chat
    // Chat
    getMessages: (taskId, limit = 50, offset = 0) => api.get(`/messages/tasks/${taskId}`, { params: { limit, offset } }).then(res => res.data),
    sendMessage: (taskId, message) => api.post(`/messages/tasks/${taskId}`, { message }).then(res => res.data),
    markMessagesRead: (taskId) => api.put(`/messages/tasks/${taskId}/read`).then(res => res.data),
    uploadMessageFile: (taskId, formData) => api.post(`/messages/tasks/${taskId}/file`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data),
    
    getGeneralMessages: (clientId, limit = 50, offset = 0) => api.get(`/messages/general/${clientId}`, { params: { limit, offset } }).then(res => res.data),
    sendGeneralMessage: (clientId, message) => api.post(`/messages/general/${clientId}`, { message }).then(res => res.data),
    uploadGeneralMessageFile: (clientId, formData) => api.post(`/messages/general/${clientId}/file`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data),

    // Users (Admin)
    getUsers: (filters) => api.get('/users', { params: filters }).then(res => res.data),
    approveUser: (id) => api.put(`/users/${id}/approve`).then(res => res.data),
    rejectUser: (id) => api.put(`/users/${id}/reject`).then(res => res.data),
    suspendUser: (id) => api.put(`/users/${id}/suspend`).then(res => res.data),
    unsuspendUser: (id) => api.put(`/users/${id}/unsuspend`).then(res => res.data),
    deleteUser: (id) => api.delete(`/users/${id}`).then(res => res.data),
    updateUser: (id, data) => api.put(`/users/${id}`, data).then(res => res.data),
    getUserStats: () => api.get('/users/stats').then(res => res.data),
    searchGuests: (q) => api.get('/users/guests/search', { params: { q } }).then(res => res.data),
    getMatches: (userId) => api.get(`/users/${userId}/matches`).then(res => res.data),
    mergeGuest: (userId, guestId) => api.post(`/users/${userId}/merge/${guestId}`).then(res => res.data),

    // Guest Clients
    getGuestClients: () => api.get('/guest-clients').then(res => res.data),
    updateGuestClient: (id, data) => api.put(`/guest-clients/${id}`, data).then(res => res.data),

    // Settings (User's own profile)
    updateProfile: (data) => api.put('/auth/profile', data).then(res => res.data),
    changePassword: (data) => api.put('/auth/password', data).then(res => res.data),
    updateEmail: (data) => api.put('/auth/email', data).then(res => res.data),

    // Public
    getPublicStats: () => api.get('/public/stats').then(res => res.data),
    getGuestPaymentLink: (token) => api.get(`/public/payments/guest/${encodeURIComponent(token)}`).then(res => res.data),
    initializeGuestPayment: (token, payload) => api.post(`/public/payments/guest/${encodeURIComponent(token)}/initialize`, payload).then(res => res.data),
    verifyGuestPayment: (token, payload) => api.post(`/public/payments/guest/${encodeURIComponent(token)}/verify`, payload).then(res => res.data),

    // Analytics
    analytics: {
        getKPIs: (params) => api.get('/analytics/kpis', { params }).then(res => res.data),
        getRevenue: (params) => api.get('/analytics/revenue', { params }).then(res => res.data),
        getPipeline: (params) => api.get('/analytics/pipeline', { params }).then(res => res.data),
        getClientGrowth: (params) => api.get('/analytics/clients/growth', { params }).then(res => res.data),
        getTaskStatus: (params) => api.get('/analytics/tasks/status', { params }).then(res => res.data),
        getFinancialStats: (params) => api.get('/analytics/financial/detailed', { params }).then(res => res.data),
        getClientStats: (params) => api.get('/analytics/clients/performance', { params }).then(res => res.data),
        getProjectTimeline: (params) => api.get('/analytics/projects/timeline', { params }).then(res => res.data),
        getActivityHeatmap: (params) => api.get('/analytics/activity/heatmap', { params }).then(res => res.data),
        getStorageAnalytics: (params) => api.get('/analytics/storage', { params }).then(res => res.data)
    }
};

export { api };
export default apiService;
