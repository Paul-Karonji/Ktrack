import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../hooks/useTasks';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import FileManager from '../components/files/FileManager';
import SendQuoteModal from '../components/tasks/SendQuoteModal';
import RecordOfflinePaymentModal from '../components/payments/RecordOfflinePaymentModal';
import GuestPaymentLinkModal from '../components/payments/GuestPaymentLinkModal';

import AdminDashboard from './AdminDashboard';
import ClientDashboard from './ClientDashboard';

const Dashboard = () => {
    const { user, logout } = useAuth();
    const [showQuoteModal, setShowQuoteModal] = useState(false);
    const [selectedTaskForQuote, setSelectedTaskForQuote] = useState(null);

    // Custom hooks
    const { tasks, loading, error, loadTasks, createTask, updateTask, deleteTask, recordOfflinePayment } = useTasks();
    const isOnline = useOnlineStatus();

    // UI state
    const [showForm, setShowForm] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [hideAmounts, setHideAmounts] = useState(false);
    const [showFileManager, setShowFileManager] = useState(false);
    const [fileManagerMode, setFileManagerMode] = useState('manage'); // 'manage' or 'deliver'
    const [selectedTaskId, setSelectedTaskId] = useState(null);
    const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);
    const [selectedTaskForPayment, setSelectedTaskForPayment] = useState(null);
    const [isRecordingOfflinePayment, setIsRecordingOfflinePayment] = useState(false);
    const [guestPaymentLinkTarget, setGuestPaymentLinkTarget] = useState(null);
    const fileInputRef = React.useRef(null);

    // Form state
    const [formData, setFormData] = useState({
        clientName: '',
        taskName: '', // Added
        taskDescription: '',
        dateCommissioned: new Date().toISOString().split('T')[0],
        dateDelivered: '',
        expectedAmount: '',
        isPaid: false,
        offlinePaymentReceivedAt: new Date().toISOString().split('T')[0],
        requiresDeposit: false,
        priority: 'medium',
        status: 'not_started',
        notes: '',
        quantity: 1,
        files: null
    });

    // Load tasks on mount
    useEffect(() => {
        loadTasks();
    }, [loadTasks]);

    const resetForm = () => {
        setFormData({
            clientName: user?.role === 'client' ? (user.fullName || user.full_name) : '',
            taskName: '', // Added
            taskDescription: '',
            dateCommissioned: new Date().toISOString().split('T')[0],
            dateDelivered: '',
            expectedAmount: '',
            isPaid: false,
            offlinePaymentReceivedAt: new Date().toISOString().split('T')[0],
            requiresDeposit: false,
            priority: 'medium',
            status: 'not_started',
            notes: '',
            quantity: 1,
            files: null
        });
        setEditingTask(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Handle add task (Create Task wrapping)
    const handleAddTask = async (e) => {
        if (e) e.preventDefault(); // Handle both button click calling reset and form submit
        // Logic split: if e is event, it's submit? No, handleSubmit is valid submit handler.
        // handleAddTask usually opens form.
        // Let's rely on child components calling handleSubmit passed as prop?
        // Or keep handleSubmit here.
        resetForm();
        setShowForm(true);
        // scrollToForm logic can be inside child or effect
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Auto-fill clientName for clients if missing (redundant safety)
        const effectiveClientName = formData.clientName || (user?.role === 'client' ? (user.fullName || user.full_name) : '');

        const submissionData = {
            ...formData,
            clientName: effectiveClientName,
            isPaid: Boolean(formData.isPaid), // Fix: Ensure boolean for backend validation
            offlinePaymentReceivedAt: formData.offlinePaymentReceivedAt || new Date().toISOString().split('T')[0]
        };
        // Remove file from submission data as it's handled separately
        delete submissionData.file;

        if (!effectiveClientName || !formData.taskDescription) {
            alert('Please fill in required fields');
            return;
        }

        try {
            let taskResult;
            if (editingTask) {
                taskResult = await updateTask(editingTask.id, submissionData);
            } else {
                taskResult = await createTask(submissionData);
            }

            // Upload files if present
            if (formData.files && formData.files.length > 0 && taskResult) {
                const taskId = (editingTask && editingTask.id) || taskResult.id;
                const uploadData = new FormData();

                // Append all files
                for (let i = 0; i < formData.files.length; i++) {
                    uploadData.append('files', formData.files[i]);
                }

                try {
                    await apiService.uploadFile(taskId, uploadData);
                    await loadTasks();
                } catch (uploadErr) {
                    console.error('File upload failed:', uploadErr);
                    alert('Task created but file upload failed: ' + (uploadErr.response?.data?.error || uploadErr.message));
                }
            }

            handleCloseForm();
        } catch (err) {
            console.error(err);
        }
    };

    const handleCloseForm = () => {
        setShowForm(false);
        resetForm();
    };

    // Handle edit
    const handleEdit = (task) => {
        setFormData({
            clientName: task.client_name,
            clientId: task.client_id || '', // Fix: Populate IDs for edit
            guestClientId: task.guest_client_id || '', // Fix: Populate IDs for edit
            guestClientName: task.guest_client_name || '', // Fix: Populate IDs for edit
            taskName: task.task_name || '', // Added
            taskDescription: task.task_description,
            dateCommissioned: task.date_commissioned ? task.date_commissioned.split('T')[0] : '',
            dateDelivered: task.date_delivered ? task.date_delivered.split('T')[0] : '',
            expectedAmount: task.expected_amount.toString(),
            isPaid: task.is_paid,
            offlinePaymentReceivedAt: task.paid_at ? task.paid_at.split('T')[0] : new Date().toISOString().split('T')[0],
            requiresDeposit: Boolean(task.requires_deposit),
            priority: task.priority || 'medium',
            status: task.status || 'not_started',
            notes: task.notes || '',
            quantity: task.quantity || 1,
            files: null
        });
        setEditingTask(task); // Set full task object instead of ID
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Handle delete
    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this task?')) {
            await deleteTask(id);
        }
    };

    // Handle input change
    const handleInputChange = (e) => {
        const { name, value, type, checked, files } = e.target;
        if (type === 'file') {
            // Store FileList for multiple files or single file
            setFormData(prev => ({ ...prev, [name]: files }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: type === 'checkbox' ? checked : value
            }));
        }
    };

    // Handle toggle payment
    const handleTogglePayment = async (task) => {
        setSelectedTaskForPayment(task);
        setShowRecordPaymentModal(true);
    };

    const confirmRecordOfflinePayment = async (receivedAt) => {
        if (!selectedTaskForPayment) return;

        try {
            setIsRecordingOfflinePayment(true);
            await recordOfflinePayment(selectedTaskForPayment.id, { receivedAt });
            setShowRecordPaymentModal(false);
            setSelectedTaskForPayment(null);
        } catch (err) {
            console.error('Offline payment recording error:', err);
            alert('Failed to record payment');
        } finally {
            setIsRecordingOfflinePayment(false);
        }
    };

    // Handle file management
    const handleDownloadFile = async (taskId) => {
        setSelectedTaskId(taskId);
        setFileManagerMode('manage');
        setShowFileManager(true);
    };

    // Handle deliver work
    const handleDeliverWork = async (taskId) => {
        setSelectedTaskId(taskId);
        setFileManagerMode('deliver');
        setShowFileManager(true);
    };

    // Handle quote response
    const handleQuoteResponse = async (taskId, action) => {
        if (!window.confirm(`Are you sure you want to ${action} this quote?`)) return;
        try {
            await apiService.respondToQuote(taskId, action);
            await loadTasks();
        } catch (err) {
            console.error('Quote response error:', err);
            alert('Failed to update quote: ' + err.message);
        }
    };

    // Handle send quote
    const handleSendQuote = (task) => {
        setSelectedTaskForQuote(task);
        setShowQuoteModal(true);
    };

    const confirmSendQuote = async (amount, requiresDeposit) => {
        try {
            await apiService.sendQuote(selectedTaskForQuote.id, amount, requiresDeposit);
            await loadTasks();
            setShowQuoteModal(false);
            setSelectedTaskForQuote(null);
        } catch (err) {
            console.error('Send quote error:', err);
            alert('Failed to send quote: ' + err.message);
        }
    };

    // Handle duplicate task
    const handleDuplicate = (task) => {
        setFormData({
            clientName: task.client_name,
            taskName: task.task_name ? `${task.task_name} (Copy)` : '', // Added copy
            taskDescription: task.task_description,
            dateCommissioned: '',
            dateDelivered: '',
            expectedAmount: task.expected_amount,
            isPaid: false,
            requiresDeposit: Boolean(task.requires_deposit),
            priority: task.priority || 'medium',
            status: 'not_started',
            notes: task.notes || '',
            quantity: task.quantity || 1,
            offlinePaymentReceivedAt: new Date().toISOString().split('T')[0],
            files: null
        });
        setEditingTask(null);
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Handle direct file upload (e.g., from Admin TaskRow)
    const handleUploadFile = async (taskId, file) => {
        if (!file) return;

        // Confirm override if needed? Or just upload.
        // Assuming backend handles replace or we just overwrite.

        const uploadData = new FormData();
        uploadData.append('file', file);

        try {
            await apiService.uploadFile(taskId, uploadData);
            await loadTasks();
        } catch (err) {
            console.error('Direct upload failed:', err);
            alert('File upload failed: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleOpenGuestPaymentLink = (task) => {
        if (!task) return;
        setGuestPaymentLinkTarget({
            scope: 'task',
            task
        });
    };


    if (loading) return <LoadingSpinner message="Loading..." />;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Sidebar */}
            <Sidebar user={user} onLogout={logout} />

            {/* Main Content */}
            <div className="lg:ml-64 min-h-screen">
                <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
                    {/* Header only shown for admin — clients have their own hero banner */}
                    {user?.role === 'admin' && (
                        <Header
                            isOnline={isOnline}
                            hideAmounts={hideAmounts}
                            onToggleAmounts={() => setHideAmounts(!hideAmounts)}
                            onAddTask={() => {
                                resetForm();
                                setShowForm(true);
                            }}
                            user={user}
                            onLogout={logout}
                        />
                    )}

                    <ErrorMessage error={error} />

                    {user?.role === 'admin' ? (
                        <AdminDashboard
                            user={user}
                            tasks={tasks}
                            loadTasks={loadTasks}
                            onLogout={logout}
                            // Handlers
                            isOnline={isOnline}
                            hideAmounts={hideAmounts}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onTogglePayment={handleTogglePayment}
                            onAddTask={handleAddTask}
                            onDownloadFile={handleDownloadFile}
                            onDeliverWork={handleDeliverWork}
                            onQuoteResponse={handleQuoteResponse}
                            onSendQuote={handleSendQuote}
                            onDuplicate={handleDuplicate}
                            onUploadFile={handleUploadFile}
                            onGuestPaymentLink={handleOpenGuestPaymentLink}
                            // Form
                            showForm={showForm}
                            setShowForm={setShowForm}
                            formData={formData}
                            setFormData={setFormData}
                            editingTask={editingTask}
                            handleFormSubmit={handleSubmit}
                            handleInputChange={handleInputChange}
                            resetForm={resetForm}
                        />
                    ) : (
                        <ClientDashboard
                            user={user}
                            tasks={tasks}
                            loading={loading}
                            onFormSubmit={handleSubmit}
                            handleEdit={handleEdit}
                            handleDelete={handleDelete}
                            handleQuoteResponse={handleQuoteResponse}
                            handleDuplicate={handleDuplicate}
                            onDownloadFile={handleDownloadFile}
                            showForm={showForm}
                            setShowForm={setShowForm}
                            formData={formData}
                            setFormData={setFormData}
                            editingTask={editingTask}
                            resetForm={resetForm}
                            handleInputChange={handleInputChange}
                            fileInputRef={fileInputRef}
                            onPaymentSuccess={loadTasks}
                        />
                    )}
                </div>
            </div>

            {/* File Manager Modal */}
            {showFileManager && selectedTaskId && (
                <FileManager
                    taskId={selectedTaskId}
                    userRole={user?.role}
                    defaultDeliverable={fileManagerMode === 'deliver'}
                    onClose={() => {
                        setShowFileManager(false);
                        setSelectedTaskId(null);
                        loadTasks();
                    }}
                />
            )}

            {/* Send Quote Modal */}
            {showQuoteModal && selectedTaskForQuote && (
                <SendQuoteModal
                    isOpen={showQuoteModal}
                    onClose={() => {
                        setShowQuoteModal(false);
                        setSelectedTaskForQuote(null);
                    }}
                    onConfirm={confirmSendQuote}
                    task={selectedTaskForQuote}
                />
            )}

            <RecordOfflinePaymentModal
                isOpen={showRecordPaymentModal}
                task={selectedTaskForPayment}
                isSubmitting={isRecordingOfflinePayment}
                onClose={() => {
                    if (isRecordingOfflinePayment) return;
                    setShowRecordPaymentModal(false);
                    setSelectedTaskForPayment(null);
                }}
                onConfirm={confirmRecordOfflinePayment}
            />

            <GuestPaymentLinkModal
                isOpen={Boolean(guestPaymentLinkTarget)}
                target={guestPaymentLinkTarget}
                onClose={() => setGuestPaymentLinkTarget(null)}
            />
        </div>
    );
};

export default Dashboard;
