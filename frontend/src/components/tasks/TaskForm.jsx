import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Upload } from 'lucide-react';
import api from '../../services/api';

const TaskForm = ({ formData, editingTask, isOnline, onSubmit, onCancel, onChange, user }) => {
    const [clientType, setClientType] = useState('registered');
    const [registeredClients, setRegisteredClients] = useState([]);
    const [guestClients, setGuestClients] = useState([]);
    const [selectedClientId, setSelectedClientId] = useState('');
    const [selectedGuestId, setSelectedGuestId] = useState('');
    const [guestClientName, setGuestClientName] = useState('');

    useEffect(() => {
        if (user?.role === 'admin' && !editingTask) {
            fetchClients();
        }
    }, [user?.role, editingTask]);

    // Pre-populate for editing
    useEffect(() => {
        if (editingTask && user?.role === 'admin') {
            if (editingTask.client_type === 'guest') {
                setClientType('guest');
                setSelectedGuestId(editingTask.guest_client_id);
            } else if (editingTask.client_type === 'registered') {
                setClientType('registered');
                setSelectedClientId(editingTask.client_id);
            }
        }
    }, [editingTask, user?.role]);

    const fetchClients = async () => {
        try {
            const [usersData, guestsData] = await Promise.all([
                api.getUsers({ role: 'client' }),
                api.getGuestClients()
            ]);
            setRegisteredClients(usersData);
            setGuestClients(guestsData.guests);
        } catch (error) {
            console.error('Failed to fetch clients:', error);
        }
    };

    // Handle client selection changes
    const handleClientTypeChange = (e) => {
        setClientType(e.target.value);
        // Reset selections
        updateFormData('clientId', '');
        updateFormData('guestClientId', '');
        updateFormData('guestClientName', '');
        updateFormData('clientName', '');
        setSelectedClientId('');
        setSelectedGuestId('');
        setGuestClientName('');
    };

    const handleRegisteredClientChange = (e) => {
        const id = e.target.value;
        setSelectedClientId(id);
        const client = registeredClients.find(c => c.id === parseInt(id));
        if (client) {
            updateFormData('clientId', id);
            updateFormData('guestClientId', ''); // Clear guest
            updateFormData('clientName', client.full_name || client.name);
        } else {
            updateFormData('clientId', '');
            updateFormData('clientName', '');
        }
    };

    const handleGuestClientChange = (e) => {
        const id = e.target.value;
        setSelectedGuestId(id);
        const guest = guestClients.find(g => g.id === parseInt(id));
        if (guest) {
            updateFormData('guestClientId', id);
            updateFormData('clientId', ''); // Clear registered
            updateFormData('clientName', guest.name);
        } else {
            updateFormData('guestClientId', '');
            updateFormData('clientName', '');
        }
    };

    const handleNewGuestNameChange = (e) => {
        const name = e.target.value;
        setGuestClientName(name);
        updateFormData('guestClientName', name);
        updateFormData('clientName', name);
        updateFormData('guestClientId', '');
        updateFormData('clientId', '');
    };

    const updateFormData = (name, value) => {
        // Create synthetic event to reuse parent's onChange if possible, or direct mutation?
        // Parent expects event object usually.
        onChange({ target: { name, value } });
    };

    return (
        <div id="task-form" className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                {editingTask ? <Edit2 size={24} className="text-indigo-600" /> : <Plus size={24} className="text-indigo-600" />}
                {editingTask ? 'Edit Task' : 'Create New Task'}
            </h2>
            <form onSubmit={onSubmit} className="space-y-4">

                {/* Admin Client Selection */}
                {user?.role === 'admin' && (
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-4">
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            Select Client Type
                        </label>
                        <select
                            value={clientType}
                            onChange={handleClientTypeChange}
                            className="w-full p-3 border-2 border-gray-200 rounded-xl mb-4"
                            disabled={!!editingTask} // Lock type when editing for simplicity? Or allow change?
                        >
                            <option value="registered">Registered Client (User)</option>
                            <option value="guest">Existing Guest Client</option>
                            <option value="new-guest">New Guest Client</option>
                        </select>

                        {clientType === 'registered' && (
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Select Registered Client
                                </label>
                                <select
                                    value={selectedClientId}
                                    onChange={handleRegisteredClientChange}
                                    className="w-full p-3 border-2 border-gray-200 rounded-xl"
                                    required={!editingTask}
                                >
                                    <option value="">-- Select Client --</option>
                                    {registeredClients.map(client => (
                                        <option key={client.id} value={client.id}>
                                            {client.full_name || client.name} ({client.email})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {clientType === 'guest' && (
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Select Guest Client
                                </label>
                                <select
                                    value={selectedGuestId}
                                    onChange={handleGuestClientChange}
                                    className="w-full p-3 border-2 border-gray-200 rounded-xl"
                                    required={!editingTask}
                                >
                                    <option value="">-- Select Guest --</option>
                                    {guestClients.map(guest => (
                                        <option key={guest.id} value={guest.id}>
                                            {guest.name}
                                            {guest.phone && ` • ${guest.phone}`}
                                            {` (${guest.task_count || 0} tasks)`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {clientType === 'new-guest' && (
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    New Guest Name
                                </label>
                                <input
                                    type="text"
                                    value={guestClientName}
                                    onChange={handleNewGuestNameChange}
                                    className="w-full p-3 border-2 border-gray-200 rounded-xl"
                                    placeholder="Enter guest name"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    This will create a new guest client record.
                                </p>
                            </div>
                        )}

                        {/* Hidden input for compat with backend validation that checks clientName */}
                        <input type="hidden" name="clientName" value={formData.clientName} />
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Quantity & Amount */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Quantity
                            </label>
                            <input
                                type="number"
                                name="quantity"
                                min="1"
                                value={formData.quantity || 1}
                                onChange={onChange}
                                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Expected Price
                                {user?.role !== 'admin' && (
                                    <span className="text-xs text-gray-500 ml-2">(Admin will quote)</span>
                                )}
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-gray-400">$</span>
                                <input
                                    type="number"
                                    name="expectedAmount"
                                    value={formData.expectedAmount}
                                    onChange={onChange}
                                    disabled={user?.role !== 'admin'}
                                    className={`w-full pl-8 p-3 border-2 rounded-xl font-mono transition-all ${user?.role !== 'admin'
                                        ? 'bg-gray-100 cursor-not-allowed text-gray-500 border-gray-200'
                                        : 'border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                                        }`}
                                    placeholder={user?.role === 'admin' ? '0.00' : 'Pending'}
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Task Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        name="taskName"
                        value={formData.taskName}
                        onChange={onChange}
                        className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-bold text-lg"
                        required
                        placeholder="e.g. Website Redesign"
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Task Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        name="taskDescription"
                        value={formData.taskDescription}
                        onChange={onChange}
                        className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        rows={3}
                        required
                        placeholder="Describe the task or project..."
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Date Commissioned
                        </label>
                        <input
                            type="date"
                            name="dateCommissioned"
                            value={formData.dateCommissioned}
                            onChange={onChange}
                            className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Date Delivered
                        </label>
                        <input
                            type="date"
                            name="dateDelivered"
                            value={formData.dateDelivered}
                            onChange={onChange}
                            className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Priority
                        </label>
                        <select
                            name="priority"
                            value={formData.priority || 'medium'}
                            onChange={onChange}
                            className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        >
                            <option value="low">🟢 Low</option>
                            <option value="medium">🟡 Medium</option>
                            <option value="high">🟠 High</option>
                            <option value="urgent">🔴 Urgent</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Status
                        </label>
                        <select
                            name="status"
                            value={formData.status || 'not_started'}
                            onChange={onChange}
                            className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        >
                            <option value="not_started">Not Started</option>
                            <option value="in_progress">In Progress</option>
                            <option value="review">Under Review</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Notes (Optional)
                    </label>
                    <textarea
                        name="notes"
                        value={formData.notes || ''}
                        onChange={onChange}
                        className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        rows={2}
                        placeholder="Add any additional notes or comments..."
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Attachments (Max 10MB per file, up to 10 files)
                    </label>
                    <div className="relative">
                        <input
                            type="file"
                            name="files"
                            onChange={onChange}
                            multiple
                            className="w-full p-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-500 focus:outline-none transition-all file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                            accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip"
                        />
                        <div className="absolute right-3 top-3 pointer-events-none">
                            <Upload className="text-gray-400" size={20} />
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <span>📎</span> Supported: Images, PDF, Word, Excel, CSV, ZIP • Select multiple files
                    </p>
                    {formData.files && formData.files.length > 0 && (
                        <p className="text-xs text-green-600 mt-1">
                            ✓ {formData.files.length} file(s) selected
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                    <input
                        type="checkbox"
                        id="isPaid"
                        name="isPaid"
                        checked={formData.isPaid}
                        onChange={onChange}
                        className="w-5 h-5 text-indigo-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
                    />
                    <label htmlFor="isPaid" className="text-sm font-medium text-gray-700 cursor-pointer">
                        Mark as paid
                    </label>
                </div>
                <div className="flex gap-3 pt-4">
                    <button
                        type="submit"
                        className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all transform hover:scale-105"
                    >
                        {editingTask ? 'Update Task' : 'Create Task'}
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-all"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
};

export default TaskForm;
