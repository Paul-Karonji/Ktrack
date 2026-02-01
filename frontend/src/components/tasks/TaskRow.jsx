import React, { useState } from 'react';
import { Edit2, Trash2, Calendar, CheckCircle, Clock, FileText, Copy, MessageSquare, Upload } from 'lucide-react';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { PriorityBadge, StatusBadge } from '../common/Badges';
import ChatComponent from '../chat/ChatComponent';

const TaskRow = ({ task, isOnline, hideAmounts, onEdit, onDelete, onTogglePayment, onDownloadFile, onUploadFile, onQuoteResponse, onSendQuote, onDuplicate, user }) => {
    const [showChat, setShowChat] = useState(false);
    const fileRef = React.useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            onUploadFile(task.id, file);
        }
        // Reset input
        e.target.value = '';
    };

    return (
        <>
            <tr className="hover:bg-indigo-50/50 transition-colors">
                <td className="px-6 py-4">
                    <div className="flex flex-col">
                        <span className="font-bold text-gray-800">{task.task_description}</span>
                        {task.quantity > 1 && (
                            <span className="text-xs text-indigo-600 font-medium">Qty: {task.quantity}</span>
                        )}
                        <input
                            type="file"
                            ref={fileRef}
                            style={{ display: 'none' }}
                            onChange={handleFileChange}
                        />
                        {task.has_file && (
                            <button
                                onClick={() => onDownloadFile(task.id)}
                                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 mt-1"
                            >
                                <FileText size={12} /> View File
                            </button>
                        )}

                        {(user.role === 'admin' || !task.has_file) && (
                            <button
                                onClick={() => fileRef.current.click()}
                                disabled={!isOnline}
                                className={`flex items-center gap-1 text-xs mt-1 ${task.has_file ? 'text-gray-400 hover:text-indigo-600' : 'text-gray-400 hover:text-indigo-600'}`}
                                title={task.has_file ? "Upload New File" : "Upload File"}
                            >
                                <Upload size={12} /> {task.has_file ? 'New' : 'Upload'}
                            </button>
                        )}
                        {/* Allow re-upload/overwrite for admin even if file exists? Maybe too complex for now. */}

                        {user.role === 'admin' && (
                            <span className="text-xs text-gray-500 mt-1">{task.client_name}</span>
                        )}
                    </div>
                </td>
                <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                            <Calendar size={14} />
                            <span>Due: {formatDate(task.date_delivered)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock size={12} />
                            <span>Created: {formatDate(task.created_at)}</span>
                        </div>
                    </div>
                </td>
                <td className="px-6 py-4">
                    <span className={`font-bold ${hideAmounts ? 'blur-sm select-none' : 'text-gray-700'}`}>
                        {formatCurrency(task.expected_amount)}
                    </span>
                    {task.quoted_amount && task.status === 'pending_quote' && (
                        <div className="text-xs text-orange-600 font-bold mt-1">
                            Quote: {formatCurrency(task.quoted_amount)}
                        </div>
                    )}
                </td>
                <td className="px-6 py-4">
                    <PriorityBadge priority={task.priority} />
                </td>
                <td className="px-6 py-4">
                    <StatusBadge status={task.status} />
                </td>
                <td className="px-6 py-4">
                    {user?.role === 'client' && task.quote_status === 'quote_sent' ? (
                        <div className="flex flex-col gap-2">
                            <div className="text-xs font-bold text-indigo-600 mb-1">
                                Quote: {formatCurrency(task.quoted_amount)}
                            </div>
                            <div className="flex justify-center gap-2">
                                <button
                                    onClick={() => onQuoteResponse(task.id, 'approve')}
                                    disabled={!isOnline}
                                    className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold hover:bg-green-200"
                                >
                                    Accept
                                </button>
                                <button
                                    onClick={() => onQuoteResponse(task.id, 'reject')}
                                    disabled={!isOnline}
                                    className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200"
                                >
                                    Reject
                                </button>
                            </div>
                        </div>
                    ) : (
                        user?.role === 'client' ? (
                            // Client View: Static Badge (No Click)
                            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold ${task.is_paid
                                ? 'bg-green-100 text-green-700'
                                : 'bg-orange-100 text-orange-700'
                                }`}>
                                {task.is_paid ? (
                                    <>
                                        <CheckCircle size={14} />
                                        Paid
                                    </>
                                ) : (
                                    <>
                                        <Clock size={14} />
                                        Unpaid
                                    </>
                                )}
                            </div>
                        ) : (
                            // Admin View: Toggle Button
                            <button
                                onClick={() => onTogglePayment(task.id)}
                                disabled={!isOnline}
                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all transform hover:scale-105 ${task.is_paid
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                    : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                    } ${!isOnline ? 'opacity-50 cursor-not-allowed' : ''}`}
                                title="Click to toggle payment status"
                            >
                                {task.is_paid ? (
                                    <>
                                        <CheckCircle size={14} />
                                        Paid
                                    </>
                                ) : (
                                    <>
                                        <Clock size={14} />
                                        Pending
                                    </>
                                )}
                            </button>
                        )
                    )}

                    {user?.role === 'admin' && task.quote_status === 'pending_quote' && (
                        <div className="mt-2">
                            <button
                                onClick={() => onSendQuote(task.id)}
                                className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-full font-bold hover:bg-indigo-700"
                            >
                                Send Quote
                            </button>
                        </div>
                    )}
                </td>
                <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => onDuplicate(task)}
                            disabled={!isOnline}
                            className={`p-2 rounded-lg transition-all ${isOnline
                                ? 'text-blue-600 hover:bg-blue-100'
                                : 'text-gray-400 cursor-not-allowed'
                                }`}
                            title="Duplicate Task"
                        >
                            <Copy size={18} />
                        </button>
                        <button
                            onClick={() => setShowChat(!showChat)}
                            disabled={!isOnline}
                            className={`relative p-2 rounded-lg transition-all ${isOnline
                                ? 'text-indigo-600 hover:bg-indigo-100'
                                : 'text-gray-400 cursor-not-allowed'
                                } ${showChat ? 'bg-indigo-100' : ''}`}
                            title="Chat"
                        >
                            <MessageSquare size={18} />
                            {task.unread_count > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center border-2 border-white">
                                    {task.unread_count}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => onEdit(task)}
                            disabled={!isOnline}
                            className={`p-2 rounded-lg transition-all ${isOnline
                                ? 'text-blue-600 hover:bg-blue-100'
                                : 'text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            <Edit2 size={18} />
                        </button>
                        <button
                            onClick={() => onDelete(task.id)}
                            disabled={!isOnline}
                            className={`p-2 rounded-lg transition-all ${isOnline
                                ? 'text-red-600 hover:bg-red-100'
                                : 'text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                </td>
            </tr >
            {showChat && (
                <tr>
                    <td colSpan="7" className="px-0 py-0 border-b bg-gray-50">
                        <div className="p-4">
                            <ChatComponent taskId={task.id} user={user} onClose={() => setShowChat(false)} />
                        </div>
                    </td>
                </tr>
            )
            }
        </>
    );
};

export default TaskRow;
