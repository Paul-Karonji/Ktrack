// API service for task operations
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://client-task-tracker.onrender.com/api';

export const apiService = {
    getTasks: async () => {
        const response = await fetch(`${API_BASE_URL}/tasks`);
        if (!response.ok) throw new Error('Failed to fetch tasks');
        return response.json();
    },

    createTask: async (task) => {
        const response = await fetch(`${API_BASE_URL}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(task),
        });
        if (!response.ok) throw new Error('Failed to create task');
        return response.json();
    },

    updateTask: async (id, task) => {
        const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(task),
        });
        if (!response.ok) throw new Error('Failed to update task');
        return response.json();
    },

    deleteTask: async (id) => {
        const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete task');
        return response.json();
    },

    togglePayment: async (id) => {
        const response = await fetch(`${API_BASE_URL}/tasks/${id}/toggle-payment`, {
            method: 'PATCH',
        });
        if (!response.ok) throw new Error('Failed to toggle payment status');
        return response.json();
    }
};
