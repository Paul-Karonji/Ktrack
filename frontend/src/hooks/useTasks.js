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
            const newTask = await apiService.createTask(taskData);
            await loadTasks();
            return newTask; // Return the created task object
        } catch (err) {
            setError('Failed to create task. Please try again.');
            console.error('Error creating task:', err);
            // Log the specific validation message for easier debugging
            if (err.response?.data?.details) {
                console.error('Validation ERROR:', JSON.stringify(err.response.data.details, null, 2));
            } else {
                console.error('Validation Details:', err.response?.data);
            }
            return null; // Return null on failure
        }
    }, [loadTasks]);

    const updateTask = useCallback(async (id, taskData) => {
        try {
            setError('');
            const updatedTask = await apiService.updateTask(id, taskData);
            await loadTasks();
            // Assuming updateTask API returns the task object, otherwise just return boolean or whatever
            return updatedTask || true;
        } catch (err) {
            setError('Failed to update task. Please try again.');
            console.error('Error updating task:', err);
            return null;
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
