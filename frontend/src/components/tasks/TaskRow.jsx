import React from 'react';
import { Edit2, Trash2, Calendar, CheckCircle, User, Clock } from 'lucide-react';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { PriorityBadge, StatusBadge } from '../common/Badges';

const TaskRow = ({ task, isOnline, hideAmounts, onEdit, onDelete, onTogglePayment }) => {
    return (
        <tr className="hover:bg-indigo-50/50 transition-colors">
            <td className="px-6 py-4">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                        <User size={18} className="text-indigo-600" />
                    </div>
                    <div>
                        <div className="text-sm font-bold text-gray-900">{task.client_name}</div>
                        <div className="text-sm text-gray-600 mt-1">{task.task_description}</div>
                        <div className="flex items-center gap-2 mt-2">
                            <PriorityBadge priority={task.priority || 'medium'} />
                            <StatusBadge status={task.status || 'not_started'} />
                        </div>
                        {task.notes && (
                            <div className="text-xs text-gray-500 mt-1 italic">
                                📝 {task.notes.length > 50 ? task.notes.substring(0, 50) + '...' : task.notes}
                            </div>
                        )}
                    </div>
                </div>
            </td>
            <td className="px-6 py-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Calendar size={14} className="text-indigo-400" />
                        <span className="font-medium">Start:</span>
                        <span>{formatDate(task.date_commissioned)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                        <CheckCircle size={14} className="text-green-400" />
                        <span className="font-medium">End:</span>
                        <span>{formatDate(task.date_delivered)}</span>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4">
                <div className="text-lg font-bold text-gray-900">
                    {formatCurrency(task.expected_amount, hideAmounts)}
                </div>
            </td>
            <td className="px-6 py-4 text-center">
                <button
                    onClick={() => onTogglePayment(task.id)}
                    disabled={!isOnline}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all transform hover:scale-105 ${task.is_paid
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                        } ${!isOnline && 'opacity-50 cursor-not-allowed'}`}
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
            </td>
            <td className="px-6 py-4">
                <div className="flex items-center justify-center gap-2">
                    <button
                        onClick={() => onEdit(task)}
                        disabled={!isOnline}
                        className={`p-2 rounded-lg transition-all ${isOnline
                            ? 'text-indigo-600 hover:bg-indigo-100'
                            : 'text-gray-400 cursor-not-allowed'
                            }`}
                        title="Edit task"
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
                        title="Delete task"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </td>
        </tr>
    );
};

export default TaskRow;
