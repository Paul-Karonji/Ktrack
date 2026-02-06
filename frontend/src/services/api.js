import axios from 'axios';

const apiFunc = (url) => {
    if (!url) return 'http://localhost:3001/api';
    // Remove trailing slash if present
    const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
}
const API_BASE_URL = apiFunc(process.env.REACT_APP_API_URL);

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true, // Important for cookies
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor to add access token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
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

        // Don't try to refresh token for public endpoints or if user isn't logged in
        const isPublicEndpoint = originalRequest.url?.includes('/public/');
        const hasToken = localStorage.getItem('accessToken');

        // If error is 401 (Unauthorized) and not already retrying
        if (error.response?.status === 401 && !originalRequest._retry && hasToken && !isPublicEndpoint) {
            originalRequest._retry = true;

            try {
                // Try to refresh token
                const response = await api.post('/auth/refresh');
                const { accessToken } = response.data;

                // Save new token
                localStorage.setItem('accessToken', accessToken);

                // Retry original request
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                // Refresh failed (token expired or invalid)
                localStorage.removeItem('accessToken');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

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
    togglePayment: (id) => api.patch(`/tasks/${id}/toggle-payment`).then(res => res.data),
    // Files
    getAllFiles: (params) => api.get('/files', { params }).then(res => res.data),
    getFileStats: () => api.get('/files/stats').then(res => res.data),
    uploadFile: (taskId, formData) => api.post(`/tasks/${taskId}/files`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data),
    getTaskFiles: (taskId) => api.get(`/tasks/${taskId}/files`).then(res => res.data),
    getDownloadUrl: (fileId) => api.get(`/files/${fileId}/download`).then(res => res.data),
    deleteFile: (fileId) => api.delete(`/files/${fileId}`).then(res => res.data),

    // Quotes
    sendQuote: (taskId, amount) => api.post(`/tasks/${taskId}/quote`, { amount }).then(res => res.data),
    respondToQuote: (taskId, action) => api.post(`/tasks/${taskId}/quote/respond`, { action }).then(res => res.data),

    // Chat
    getMessages: (taskId) => api.get(`/messages/tasks/${taskId}`).then(res => res.data),
    sendMessage: (taskId, message) => api.post(`/messages/tasks/${taskId}`, { message }).then(res => res.data),
    markMessagesRead: (taskId) => api.put(`/messages/tasks/${taskId}/read`).then(res => res.data),
    uploadMessageFile: (taskId, formData) => api.post(`/messages/tasks/${taskId}/file`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data),

    // Users (Admin)
    getUsers: (filters) => api.get('/users', { params: filters }).then(res => res.data),
    approveUser: (id) => api.put(`/users/${id}/approve`).then(res => res.data),
    rejectUser: (id) => api.delete(`/auth/users/${id}`).then(res => res.data),
    suspendUser: (id) => api.put(`/users/${id}/suspend`).then(res => res.data),
    updateUser: (id, data) => api.put(`/users/${id}`, data).then(res => res.data),
    getUserStats: () => api.get('/users/stats').then(res => res.data),

    // Guest Clients
    getGuestClients: () => api.get('/guest-clients').then(res => res.data),
    updateGuestClient: (id, data) => api.put(`/guest-clients/${id}`, data).then(res => res.data),

    // Settings (User's own profile)
    updateProfile: (data) => api.put('/auth/profile', data).then(res => res.data),
    changePassword: (data) => api.put('/auth/password', data).then(res => res.data),
    updateEmail: (data) => api.put('/auth/email', data).then(res => res.data),

    // Public
    getPublicStats: () => api.get('/public/stats').then(res => res.data),
};

export default api;
