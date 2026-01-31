import { useState, useCallback } from 'react';
import { apiService } from '../services/api';

// Custom hook for task management
export const useTasks = () => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadTasks = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const data = await apiService.getTasks();
            setTasks(data);
        } catch (err) {
            setError('Failed to load tasks. Please check your connection and try again.');
            console.error('Error loading tasks:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const createTask = useCallback(async (taskData) => {
        try {
            setError('');
            await apiService.createTask(taskData);
            await loadTasks();
            return true;
        } catch (err) {
            setError('Failed to create task. Please try again.');
            console.error('Error creating task:', err);
            return false;
        }
    }, [loadTasks]);

    const updateTask = useCallback(async (id, taskData) => {
        try {
            setError('');
            await apiService.updateTask(id, taskData);
            await loadTasks();
            return true;
        } catch (err) {
            setError('Failed to update task. Please try again.');
            console.error('Error updating task:', err);
            return false;
        }
    }, [loadTasks]);

    const deleteTask = useCallback(async (id) => {
        try {
            setError('');
            await apiService.deleteTask(id);
            await loadTasks();
            return true;
        } catch (err) {
            setError('Failed to delete task. Please try again.');
            console.error('Error deleting task:', err);
            return false;
        }
    }, [loadTasks]);

    const togglePayment = useCallback(async (id) => {
        try {
            setError('');
            await apiService.togglePayment(id);
            await loadTasks();
            return true;
        } catch (err) {
            setError('Failed to update payment status. Please try again.');
            console.error('Error toggling payment:', err);
            return false;
        }
    }, [loadTasks]);

    return {
        tasks,
        loading,
        error,
        setError,
        loadTasks,
        createTask,
        updateTask,
        deleteTask,
        togglePayment
    };
};
