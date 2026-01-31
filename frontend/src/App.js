import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import { useTasks } from './hooks/useTasks';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorMessage from './components/common/ErrorMessage';
import ExportButton from './components/common/ExportButton';
import Pagination from './components/common/Pagination';
import Header from './components/layout/Header';
import Analytics from './components/dashboard/Analytics';
import TaskFilters from './components/tasks/TaskFilters';
import TaskForm from './components/tasks/TaskForm';
import TaskTable from './components/tasks/TaskTable';
import TaskPriorityChart from './components/charts/TaskPriorityChart';
import TaskStatusChart from './components/charts/TaskStatusChart';
import RevenueChart from './components/charts/RevenueChart';

const TaskTracker = () => {
  // Custom hooks
  const { tasks, loading, error, setError, loadTasks, createTask, updateTask, deleteTask, togglePayment } = useTasks();
  const isOnline = useOnlineStatus();

  // UI state
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [hideAmounts, setHideAmounts] = useState(false);
  const [selectedChart, setSelectedChart] = useState('priority'); // priority, status, revenue

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Form state
  const [formData, setFormData] = useState({
    clientName: '',
    taskDescription: '',
    dateCommissioned: '',
    dateDelivered: '',
    expectedAmount: '',
    isPaid: false,
    priority: 'medium',
    status: 'not_started',
    notes: ''
  });

  // Load tasks on mount
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Reset form
  const resetForm = () => {
    setFormData({
      clientName: '',
      taskDescription: '',
      dateCommissioned: '',
      dateDelivered: '',
      expectedAmount: '',
      isPaid: false,
      priority: 'medium',
      status: 'not_started',
      notes: ''
    });
    setEditingTask(null);
  };

  // Scroll to form
  const scrollToForm = () => {
    setTimeout(() => {
      const formElement = document.getElementById('task-form');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isOnline) {
      setError('You are offline. Please check your internet connection.');
      return;
    }

    const taskData = {
      ...formData,
      expectedAmount: parseFloat(formData.expectedAmount) || 0
    };

    const success = editingTask
      ? await updateTask(editingTask, taskData)
      : await createTask(taskData);

    if (success) {
      resetForm();
      setShowForm(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle edit
  const handleEdit = (task) => {
    setFormData({
      clientName: task.client_name,
      taskDescription: task.task_description,
      dateCommissioned: task.date_commissioned || '',
      dateDelivered: task.date_delivered || '',
      expectedAmount: task.expected_amount.toString(),
      isPaid: task.is_paid,
      priority: task.priority || 'medium',
      status: task.status || 'not_started',
      notes: task.notes || ''
    });
    setEditingTask(task.id);
    setShowForm(true);
    scrollToForm();
  };

  // Handle delete
  const handleDelete = async (taskId) => {
    if (!isOnline) {
      setError('You are offline. Please check your internet connection.');
      return;
    }

    if (window.confirm('Are you sure you want to delete this task?')) {
      await deleteTask(taskId);
    }
  };

  // Handle payment toggle
  const handleTogglePayment = async (taskId) => {
    if (!isOnline) {
      setError('You are offline. Please check your internet connection.');
      return;
    }
    await togglePayment(taskId);
  };

  // Handle add task button
  const handleAddTask = () => {
    resetForm();
    setShowForm(true);
    scrollToForm();
  };

  // Filter and paginate tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch =
        task.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.task_description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFilter =
        filterStatus === 'all' ||
        (filterStatus === 'paid' && task.is_paid) ||
        (filterStatus === 'pending' && !task.is_paid);

      return matchesSearch && matchesFilter;
    });
  }, [tasks, searchTerm, filterStatus]);

  // Paginated tasks
  const paginatedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredTasks.slice(startIndex, endIndex);
  }, [filteredTasks, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  // Handle pagination changes
  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (items) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  // Loading state
  if (loading) {
    return <LoadingSpinner message="Loading your tasks..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <Header
          isOnline={isOnline}
          hideAmounts={hideAmounts}
          onToggleAmounts={() => setHideAmounts(!hideAmounts)}
          onAddTask={handleAddTask}
        />

        {/* Error Message */}
        <ErrorMessage error={error} />

        {/* Analytics Dashboard */}
        <Analytics tasks={tasks} hideAmounts={hideAmounts} />

        {/* Analytics Charts */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Analytics Charts</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedChart('priority')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${selectedChart === 'priority'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
              >
                Priority
              </button>
              <button
                onClick={() => setSelectedChart('status')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${selectedChart === 'status'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
              >
                Status
              </button>
              <button
                onClick={() => setSelectedChart('revenue')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${selectedChart === 'revenue'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
              >
                Revenue
              </button>
            </div>
          </div>
          {selectedChart === 'priority' && <TaskPriorityChart tasks={tasks} />}
          {selectedChart === 'status' && <TaskStatusChart tasks={tasks} />}
          {selectedChart === 'revenue' && <RevenueChart tasks={tasks} />}
        </div>

        {/* Search, Filter, and Export */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <TaskFilters
              searchTerm={searchTerm}
              filterStatus={filterStatus}
              onSearchChange={setSearchTerm}
              onFilterChange={setFilterStatus}
            />
          </div>
          <ExportButton tasks={filteredTasks} isOnline={isOnline} />
        </div>

        {/* Task Form */}
        {showForm && (
          <TaskForm
            formData={formData}
            editingTask={editingTask}
            isOnline={isOnline}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              resetForm();
            }}
            onChange={handleInputChange}
          />
        )}

        {/* Tasks Table */}
        <TaskTable
          tasks={paginatedTasks}
          isOnline={isOnline}
          hideAmounts={hideAmounts}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onTogglePayment={handleTogglePayment}
          onAddTask={handleAddTask}
        />

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredTasks.length}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
        />

        {/* Footer with Refresh Button */}
        <div className="flex justify-center">
          <button
            onClick={loadTasks}
            disabled={loading || !isOnline}
            className={`px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all transform hover:scale-105 ${isOnline && !loading
              ? 'bg-white text-indigo-600 hover:shadow-lg border-2 border-indigo-200'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-200 border-t-indigo-600"></div>
                Refreshing...
              </>
            ) : (
              <>
                <TrendingUp size={20} />
                Refresh Data
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskTracker;