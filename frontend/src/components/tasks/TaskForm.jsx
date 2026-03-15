import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Upload, FileText, DollarSign, Settings, X, User } from 'lucide-react';
import api from '../../services/api';
import { formatCurrency } from '../../utils/formatters';

const TaskForm = ({ formData, editingTask, isOnline, onSubmit, onCancel, onChange, user }) => {
    const [clientType, setClientType] = useState('registered');
    const [registeredClients, setRegisteredClients] = useState([]);
    const [guestClients, setGuestClients] = useState([]);
    const [selectedClientId, setSelectedClientId] = useState('');
    const [selectedGuestId, setSelectedGuestId] = useState('');
    const [guestClientName, setGuestClientName] = useState('');
    const [activeTab, setActiveTab] = useState('details'); // 'details', 'financials', 'files'

    const isAdmin = user?.role === 'admin';

    useEffect(() => {
        if (isAdmin && !editingTask) {
            fetchClients();
        }
    }, [isAdmin, editingTask]);

    // Pre-populate for editing
    useEffect(() => {
        if (editingTask && isAdmin) {
            if (editingTask.client_type === 'guest') {
                setClientType('guest');
                setSelectedGuestId(editingTask.guest_client_id);
            } else if (editingTask.client_type === 'registered') {
                setClientType('registered');
                setSelectedClientId(editingTask.client_id);
            }
        }
    }, [editingTask, isAdmin]);

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

    const handleClientTypeChange = (e) => {
        setClientType(e.target.value);
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
            updateFormData('guestClientId', '');
            updateFormData('clientName', client.full_name || client.name);
        }
    };

    const handleGuestClientChange = (e) => {
        const id = e.target.value;
        setSelectedGuestId(id);
        const guest = guestClients.find(g => g.id === parseInt(id));
        if (guest) {
            updateFormData('guestClientId', id);
            updateFormData('clientId', '');
            updateFormData('clientName', guest.name);
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
        onChange({ target: { name, value } });
    };

    const renderDetails = () => (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {isAdmin && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                        <User size={16} /> Client Selection
                    </label>
                    <select
                        value={clientType}
                        onChange={handleClientTypeChange}
                        className="w-full p-3 border-2 border-gray-200 rounded-xl mb-4 focus:ring-2 focus:ring-indigo-500 outline-none"
                        disabled={!!editingTask}
                    >
                        <option value="registered">Registered Client (User)</option>
                        <option value="guest">Existing Guest Client</option>
                        <option value="new-guest">New Guest Client</option>
                    </select>

                    {clientType === 'registered' && (
                        <select
                            value={selectedClientId}
                            onChange={handleRegisteredClientChange}
                            className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            required={!editingTask}
                        >
                            <option value="">-- Select Registered Client --</option>
                            {registeredClients.map(client => (
                                <option key={client.id} value={client.id}>
                                    {client.full_name || client.name} ({client.email})
                                </option>
                            ))}
                        </select>
                    )}

                    {clientType === 'guest' && (
                        <select
                            value={selectedGuestId}
                            onChange={handleGuestClientChange}
                            className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            required={!editingTask}
                        >
                            <option value="">-- Select Guest Client --</option>
                            {guestClients.map(guest => (
                                <option key={guest.id} value={guest.id}>
                                    {guest.name} {guest.phone ? `(${guest.phone})` : ''}
                                </option>
                            ))}
                        </select>
                    )}

                    {clientType === 'new-guest' && (
                        <input
                            type="text"
                            value={guestClientName}
                            onChange={handleNewGuestNameChange}
                            className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Enter new guest name"
                            required
                        />
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Task Name <span className="text-red-500">*</span></label>
                    <input
                        type="text"
                        name="taskName"
                        value={formData.taskName}
                        onChange={onChange}
                        className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                        required
                        placeholder="e.g. Website Redesign"
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity</label>
                    <input
                        type="number"
                        name="quantity"
                        min="1"
                        value={formData.quantity || 1}
                        onChange={onChange}
                        className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description <span className="text-red-500">*</span></label>
                <textarea
                    name="taskDescription"
                    value={formData.taskDescription}
                    onChange={onChange}
                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    rows={3}
                    required
                    placeholder="Describe the task instructions..."
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
                    <select
                        name="priority"
                        value={formData.priority || 'medium'}
                        onChange={onChange}
                        className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    >
                        <option value="low">🟢 Low</option>
                        <option value="medium">🟡 Medium</option>
                        <option value="high">🟠 High</option>
                        <option value="urgent">🔴 Urgent</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                    <select
                        name="status"
                        value={formData.status || 'not_started'}
                        onChange={onChange}
                        className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        disabled={!isAdmin && editingTask} // Client can only set on creation
                    >
                        <option value="not_started">Not Started</option>
                        <option value="in_progress">In Progress</option>
                        <option value="review">Under Review</option>
                        <option value="completed" disabled={!isAdmin}>Completed (Admin Only)</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
                    <input
                        type="date"
                        name="dateCommissioned"
                        value={formData.dateCommissioned}
                        onChange={onChange}
                        className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Due Date</label>
                    <input
                        type="date"
                        name="dateDelivered"
                        value={formData.dateDelivered}
                        onChange={onChange}
                        className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Notes (Internal)</label>
                <textarea
                    name="notes"
                    value={formData.notes || ''}
                    onChange={onChange}
                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    rows={2}
                    placeholder="Staff notes..."
                />
            </div>
        </div>
    );

    const renderFinancials = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                <h3 className="text-lg font-bold text-indigo-900 mb-1 flex items-center gap-2">
                    <DollarSign size={20} /> Pricing & Payment
                </h3>
                <p className="text-xs text-indigo-600 mb-4">
                    For registered clients, the price you enter here is the <strong>final payable amount</strong> — no separate quote step required.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Final Price ($)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                            <input
                                type="number"
                                name="expectedAmount"
                                value={formData.expectedAmount}
                                onChange={onChange}
                                step="0.01"
                                className="w-full pl-8 p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-lg"
                                placeholder="0.00"
                            />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Client can pay immediately once task is created.</p>
                    </div>

                    <div className="flex flex-col justify-center">
                        <label className="flex items-center gap-3 p-4 bg-white rounded-xl border-2 border-gray-100 cursor-pointer hover:border-indigo-200 transition-colors">
                            <input
                                type="checkbox"
                                name="isPaid"
                                checked={formData.isPaid}
                                onChange={onChange}
                                className="w-6 h-6 text-indigo-600 rounded focus:ring-indigo-500"
                            />
                            <div className="flex flex-col">
                                <span className="font-bold text-gray-800 text-sm">Mark as Paid</span>
                                <span className="text-xs text-gray-500">Manually confirm offline payment</span>
                            </div>
                        </label>
                    </div>
                </div>
            </div>

            <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                <h3 className="text-lg font-bold text-emerald-900 mb-2 flex items-center gap-2">
                    <DollarSign size={20} /> Price Summary
                </h3>
                <p className="text-sm text-emerald-700 mb-3">This is the amount the client will see and be charged.</p>
                <div className="text-3xl font-black text-emerald-800 font-mono">
                    {formatCurrency(formData.expectedAmount || 0)}
                </div>
            </div>
        </div>
    );

    const renderFiles = () => (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-indigo-500 transition-all group">
                <input
                    type="file"
                    id="task-files"
                    name="files"
                    onChange={onChange}
                    multiple
                    className="hidden"
                    accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip"
                />
                <label htmlFor="task-files" className="cursor-pointer">
                    <div className="inline-block p-4 bg-indigo-50 rounded-full mb-4 group-hover:bg-indigo-100 transition-colors">
                        <Upload size={32} className="text-indigo-600" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-800">Choose files or drag and drop</h4>
                    <p className="text-sm text-gray-500 mt-1">Images, PDF, Word, Excel (Max 10MB each)</p>
                </label>
            </div>

            {formData.files && formData.files.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-xl">
                    <h5 className="text-xs font-bold text-gray-500 uppercase mb-3">Selected Files</h5>
                    <div className="space-y-2">
                        {Array.from(formData.files).map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                                <div className="flex items-center gap-2">
                                    <FileText size={16} className="text-indigo-500" />
                                    <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">{file.name}</span>
                                </div>
                                <span className="text-[10px] text-gray-400 font-mono">{(file.size / 1024).toFixed(0)} KB</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    const renderClientDrawer = () => (
        <div className="h-full flex flex-col bg-white">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    {editingTask ? <Edit2 size={20} className="text-indigo-600" /> : <Plus size={20} className="text-indigo-600" />}
                    {editingTask ? 'Edit Task' : 'New Project Request'}
                </h2>
                <button onClick={onCancel} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                    <X size={20} />
                </button>
            </div>

            <form id="client-task-form" onSubmit={onSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">What is this project about? *</label>
                    <input
                        type="text"
                        name="taskName"
                        value={formData.taskName}
                        onChange={onChange}
                        className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-lg"
                        required
                        placeholder="e.g. Analysis of Data Set X"
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Instructions / Description *</label>
                    <textarea
                        name="taskDescription"
                        value={formData.taskDescription}
                        onChange={onChange}
                        className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all min-h-[150px]"
                        required
                        placeholder="Provide detailed instructions for the task..."
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Priority</label>
                        <select
                            name="priority"
                            value={formData.priority || 'medium'}
                            onChange={onChange}
                            className="w-full p-3 border-2 border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value="low">🟢 Low</option>
                            <option value="medium">🟡 Medium</option>
                            <option value="high">🟠 High</option>
                            <option value="urgent">🔴 Urgent</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Due Date</label>
                        <input
                            type="date"
                            name="dateDelivered"
                            value={formData.dateDelivered}
                            onChange={onChange}
                            className="w-full p-3 border-2 border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Upload Reference Files</label>
                    <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:border-indigo-400 transition-all">
                        <input type="file" id="client-files" name="files" onChange={onChange} multiple className="hidden" />
                        <label htmlFor="client-files" className="cursor-pointer flex flex-col items-center gap-2">
                            <Upload className="text-gray-400" size={24} />
                            <span className="text-sm font-medium text-gray-500">Attach files</span>
                        </label>
                    </div>
                    {formData.files && formData.files.length > 0 && (
                        <p className="text-xs text-indigo-600 mt-2 font-bold flex items-center gap-1">
                            <FileText size={12} /> {formData.files.length} file(s) selected
                        </p>
                    )}
                </div>

                {editingTask && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-2xl border-2 border-gray-100 space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Status:</span>
                            <span className="font-bold text-gray-800 uppercase text-xs">{editingTask.status}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Amount:</span>
                            <span className="font-bold text-emerald-600">{formatCurrency(editingTask.expected_amount)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Payment:</span>
                            <span className={`font-bold text-xs uppercase ${editingTask.is_paid ? 'text-green-600' : 'text-orange-500'}`}>
                                {editingTask.is_paid ? 'Paid' : 'Unpaid'}
                            </span>
                        </div>
                    </div>
                )}
            </form>

            <div className="p-6 border-t bg-white flex gap-3">
                <button
                    type="submit"
                    form="client-task-form"
                    className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-700 text-white py-4 rounded-xl font-bold shadow-lg hover:shadow-indigo-200 transition-all"
                >
                    {editingTask ? 'Save Changes' : 'Submit Request'}
                </button>
            </div>
        </div>
    );

    if (!isAdmin) {
        return renderClientDrawer();
    }

    return (
        <div id="task-form" className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col h-[85vh] max-h-[800px]">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-gray-50 to-white border-b flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 rounded-xl">
                        {editingTask ? <Edit2 size={24} className="text-indigo-600" /> : <Plus size={24} className="text-indigo-600" />}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">{editingTask ? 'Task Orchestration' : 'New Task Creation'}</h2>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Admin Control Panel</p>
                    </div>
                </div>
                <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
                    <X size={24} />
                </button>
            </div>

            {/* Admin Tabs */}
            <div className="flex border-b px-6 bg-gray-50/50">
                {[
                    { id: 'details', label: 'Details', icon: FileText },
                    { id: 'financials', label: 'Financials', icon: DollarSign },
                    { id: 'files', label: 'Attachments', icon: Upload },
                ].map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 py-4 px-6 text-sm font-bold border-b-2 transition-all
                            ${activeTab === tab.id
                                ? 'border-indigo-600 text-indigo-700 bg-white'
                                : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Modal Content */}
            <form id="admin-task-form" onSubmit={onSubmit} className="flex-1 overflow-y-auto p-6 md:p-8">
                {activeTab === 'details' && renderDetails()}
                {activeTab === 'financials' && renderFinancials()}
                {activeTab === 'files' && renderFiles()}
            </form>

            {/* Modal Footer */}
            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-6 py-3 bg-white border-2 border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-100 transition-all"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    form="admin-task-form"
                    className="px-10 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold shadow-lg hover:shadow-indigo-200 transition-all transform hover:scale-105 active:scale-95"
                >
                    {editingTask ? 'Update System' : 'Launch Task'}
                </button>
            </div>
        </div>
    );
};

export default TaskForm;

