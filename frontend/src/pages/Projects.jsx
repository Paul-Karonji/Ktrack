import React, { useState, useEffect } from 'react';
import { FolderOpen, Search, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import Sidebar from '../components/layout/Sidebar';
import ProjectGrid from '../components/projects/ProjectGrid';
import ProjectFilters from '../components/projects/ProjectFilters';
import ProjectAnalytics from '../components/projects/ProjectAnalytics';
import ViewToggle from '../components/projects/ViewToggle';
import TaskTable from '../components/tasks/TaskTable';

const Projects = () => {
    const { user, logout } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [filteredTasks, setFilteredTasks] = useState([]);
    const [filters, setFilters] = useState({});
    const [view, setView] = useState('grid');
    const [showFilters, setShowFilters] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('date_delivered');
    const [loading, setLoading] = useState(true);

    // Load tasks
    useEffect(() => {
        loadTasks();
    }, []);

    const loadTasks = async () => {
        try {
            setLoading(true);
            const data = await apiService.getTasks();
            setTasks(data);
            setFilteredTasks(data);
        } catch (error) {
            console.error('Failed to load tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    // Apply filters and sorting
    useEffect(() => {
        let result = [...tasks];

        // Search
        if (searchTerm) {
            result = result.filter(t =>
                t.task_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (t.task_description && t.task_description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (t.client_name && t.client_name.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        // Status filter
        if (filters.status?.length > 0) {
            result = result.filter(t => filters.status.includes(t.status));
        }

        // Priority filter
        if (filters.priority?.length > 0) {
            result = result.filter(t => filters.priority.includes(t.priority));
        }

        // Date range
        if (filters.startDate) {
            result = result.filter(t => {
                if (!t.date_delivered) return false;
                return new Date(t.date_delivered) >= new Date(filters.startDate);
            });
        }
        if (filters.endDate) {
            result = result.filter(t => {
                if (!t.date_delivered) return false;
                return new Date(t.date_delivered) <= new Date(filters.endDate);
            });
        }

        // Sort
        result.sort((a, b) => {
            if (sortBy === 'date_delivered') {
                const dateA = a.date_delivered ? new Date(a.date_delivered) : new Date(0);
                const dateB = b.date_delivered ? new Date(b.date_delivered) : new Date(0);
                return dateA - dateB;
            }
            if (sortBy === 'expected_amount') {
                return (parseFloat(b.expected_amount) || 0) - (parseFloat(a.expected_amount) || 0);
            }
            if (sortBy === 'task_name') {
                return a.task_name.localeCompare(b.task_name);
            }
            if (sortBy === 'priority') {
                const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
                return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
            }
            return 0;
        });

        setFilteredTasks(result);
    }, [tasks, filters, searchTerm, sortBy]);

    const handleClearFilters = () => {
        setFilters({});
        setSearchTerm('');
    };

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <Sidebar user={user} onLogout={logout} />

            <main className="flex-1 lg:ml-64 p-4 md:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h1 className="text-5xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                                <FolderOpen size={48} className="text-indigo-600" />
                                Projects
                            </h1>
                            <p className="text-lg text-gray-500">
                                Showing {filteredTasks.length} of {tasks.length} projects
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center gap-2 px-4 py-2 bg-white border-2 rounded-xl hover:bg-gray-50 transition-all ${showFilters ? 'border-indigo-500 text-indigo-600' : 'border-gray-200 text-gray-700'
                                    }`}
                            >
                                <SlidersHorizontal size={18} />
                                Filters
                            </button>
                            <ViewToggle view={view} onViewChange={setView} />
                        </div>
                    </div>

                    {/* Analytics */}
                    <ProjectAnalytics tasks={filteredTasks} />

                    {/* Search & Sort */}
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search projects by name, description, or client..."
                                className="w-full pl-10 p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                            />
                        </div>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white font-medium text-gray-700"
                        >
                            <option value="date_delivered">Sort by Date</option>
                            <option value="expected_amount">Sort by Amount</option>
                            <option value="task_name">Sort by Name</option>
                            <option value="priority">Sort by Priority</option>
                        </select>
                    </div>

                    {/* Main Content */}
                    <div className="flex gap-6">
                        {/* Filters Sidebar */}
                        {showFilters && (
                            <div className="w-64 flex-shrink-0">
                                <ProjectFilters
                                    filters={filters}
                                    onFilterChange={setFilters}
                                    onClearFilters={handleClearFilters}
                                />
                            </div>
                        )}

                        {/* Projects Display */}
                        <div className="flex-1">
                            {loading ? (
                                <div className="bg-white rounded-2xl p-12 text-center border-2 border-gray-100">
                                    <p className="text-gray-500 text-lg">Loading projects...</p>
                                </div>
                            ) : filteredTasks.length === 0 ? (
                                <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-gray-200">
                                    <p className="text-gray-500 text-lg mb-2">No projects found</p>
                                    <p className="text-gray-400 text-sm">
                                        {searchTerm || Object.keys(filters).length > 0
                                            ? 'Try adjusting your filters or search term'
                                            : 'Create your first project to get started'
                                        }
                                    </p>
                                </div>
                            ) : view === 'grid' ? (
                                <ProjectGrid tasks={filteredTasks} onTaskClick={() => { }} />
                            ) : (
                                <div className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden">
                                    <TaskTable tasks={filteredTasks} user={user} onUpdate={loadTasks} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Projects;
