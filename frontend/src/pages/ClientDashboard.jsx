import React, { useState, useMemo } from 'react';
import {
    Plus, Clock, CheckCircle, HelpCircle, Search,
    LayoutDashboard, History, Wallet, Sparkles,
    AlertCircle, DollarSign, LayoutGrid, List,
    ArrowUpDown, TrendingUp, ChevronRight, Activity, Menu
} from 'lucide-react';
import StatCard from '../components/dashboard/StatCard';
import TaskTable from '../components/tasks/TaskTable';
import TaskForm from '../components/tasks/TaskForm';
import HelpModal from '../components/common/HelpModal';
import ClientProjectCard from '../components/projects/ClientProjectCard';
import { useNavigation } from '../context/NavigationContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
};

const fmt = (v) =>
    `$${(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── Illustrated empty states ─────────────────────────────────────────────────
const EmptyActive = () => (
    <div className="text-center py-12 px-4">
        <svg className="mx-auto mb-4 w-20 h-20 opacity-80" viewBox="0 0 96 96" fill="none">
            <circle cx="48" cy="48" r="40" fill="#EEF2FF" />
            <path d="M32 64 L48 28 L64 64" stroke="#6366F1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="48" cy="22" r="5" fill="#6366F1" />
            <path d="M38 56 L58 56" stroke="#6366F1" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        <p className="text-gray-700 font-bold text-base mb-1">No active projects</p>
        <p className="text-gray-400 text-sm mb-5">Start something new and track it here</p>
    </div>
);

const EmptyQuotes = () => (
    <div className="text-center py-12 px-4">
        <svg className="mx-auto mb-4 w-20 h-20 opacity-80" viewBox="0 0 96 96" fill="none">
            <circle cx="48" cy="48" r="40" fill="#FFF7ED" />
            <rect x="26" y="30" width="44" height="34" rx="4" fill="#FED7AA" stroke="#F97316" strokeWidth="2" />
            <path d="M26 40 L70 40" stroke="#F97316" strokeWidth="2" />
            <path d="M36 52 L60 52" stroke="#F97316" strokeWidth="2" strokeLinecap="round" />
            <circle cx="68" cy="28" r="10" fill="#22C55E" />
            <path d="M63 28 L66.5 31.5 L73 25" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="text-gray-700 font-bold text-base mb-1">No pending quotes</p>
        <p className="text-gray-400 text-sm">You're all caught up!</p>
    </div>
);

const EmptyHistory = () => (
    <div className="text-center py-12 px-4">
        <svg className="mx-auto mb-4 w-20 h-20 opacity-80" viewBox="0 0 96 96" fill="none">
            <circle cx="48" cy="48" r="40" fill="#F0FDF4" />
            <path d="M48 24 L52 38 L68 38 L55 47 L60 62 L48 53 L36 62 L41 47 L28 38 L44 38 Z" fill="#86EFAC" stroke="#22C55E" strokeWidth="2" strokeLinejoin="round" />
        </svg>
        <p className="text-gray-700 font-bold text-base mb-1">No history yet</p>
        <p className="text-gray-400 text-sm">Completed projects will appear here</p>
    </div>
);

// ─── Activity feed helpers ────────────────────────────────────────────────────
const STATUS_COLORS = {
    not_started: 'bg-gray-400', in_progress: 'bg-blue-500',
    review: 'bg-violet-500', completed: 'bg-emerald-500', cancelled: 'bg-red-400',
};
const STATUS_LABELS = {
    not_started: 'Not Started', in_progress: 'In Progress',
    review: 'Under Review', completed: 'Completed', cancelled: 'Cancelled',
};
const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const d = Math.floor(diff / 86400000);
    const h = Math.floor(diff / 3600000);
    const m = Math.floor(diff / 60000);
    if (d > 0) return `${d}d ago`;
    if (h > 0) return `${h}h ago`;
    if (m > 0) return `${m}m ago`;
    return 'just now';
};

// ─── Main component ───────────────────────────────────────────────────────────
const ClientDashboard = ({
    user, tasks, loading,
    handleAddTask, handleEdit, handleDelete,
    handleSendQuote, handleQuoteResponse, handleDuplicate,
    onDownloadFile,
    showForm, setShowForm,
    formData, setFormData,
    editingTask, resetForm, handleInputChange, fileInputRef
}) => {
    const [showHelp, setShowHelp] = useState(false);
    const [activeTab, setActiveTab] = useState('active');
    const [searchTerm, setSearchTerm] = useState('');
    const [view, setView] = useState('grid');
    const [sortBy, setSortBy] = useState('date_delivered');

    // Mobile sidebar toggle
    const { openSidebar } = useNavigation?.() || {};

    const firstName = user?.full_name?.split(' ')[0] || 'there';

    // ── Stats ─────────────────────────────────────────────────────────────────
    const pendingQuotes = tasks.filter(t => t.quote_status === 'quote_sent').length;
    const activeCount = tasks.filter(t => !['completed', 'cancelled'].includes(t.status)).length;
    const completedCount = tasks.filter(t => t.status === 'completed').length;
    const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
    const totalValue = tasks.reduce((s, t) => s + (parseFloat(t.expected_amount) || 0), 0);
    const paidValue = tasks.filter(t => t.is_paid).reduce((s, t) => s + (parseFloat(t.expected_amount) || 0), 0);
    const outstandingValue = totalValue - paidValue;
    const paidPct = totalValue > 0 ? Math.round((paidValue / totalValue) * 100) : 0;

    // ── Activity feed ─────────────────────────────────────────────────────────
    const recentActivity = useMemo(() =>
        [...tasks]
            .filter(t => t.updated_at || t.date_commissioned)
            .sort((a, b) => new Date(b.updated_at || b.date_commissioned) - new Date(a.updated_at || a.date_commissioned))
            .slice(0, 5),
        [tasks]
    );

    // ── Filtered + sorted tasks ───────────────────────────────────────────────
    const displayTasks = useMemo(() => {
        let r = [...tasks];
        if (activeTab === 'active') r = r.filter(t => !['completed', 'cancelled'].includes(t.status));
        if (activeTab === 'history') r = r.filter(t => ['completed', 'cancelled'].includes(t.status));
        if (activeTab === 'quotes') r = r.filter(t => t.quote_status === 'quote_sent');
        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase();
            r = r.filter(t =>
                (t.task_name && t.task_name.toLowerCase().includes(q)) ||
                (t.task_description && t.task_description.toLowerCase().includes(q))
            );
        }
        r.sort((a, b) => {
            if (sortBy === 'date_delivered') return new Date(a.date_delivered || '9999') - new Date(b.date_delivered || '9999');
            if (sortBy === 'priority') { const o = { urgent: 4, high: 3, medium: 2, low: 1 }; return (o[b.priority] || 0) - (o[a.priority] || 0); }
            if (sortBy === 'amount') return (parseFloat(b.expected_amount) || 0) - (parseFloat(a.expected_amount) || 0);
            return 0;
        });
        return r;
    }, [tasks, activeTab, searchTerm, sortBy]);

    return (
        <div className="space-y-4 md:space-y-6 bg-mesh min-h-screen pb-16">

            {/* ── 1. Glassmorphism Hero ─────────────────────────────────────── */}
            <div className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 p-5 md:p-8 shadow-2xl">
                {/* Animated floating orbs — hidden on mobile for perf */}
                <div className="absolute top-4 right-16 w-32 h-32 bg-white/10 rounded-full animate-float blur-sm pointer-events-none hidden sm:block" />
                <div className="absolute -bottom-8 right-4 w-48 h-48 bg-purple-400/20 rounded-full animate-float-slow blur-md pointer-events-none hidden sm:block" />

                <div className="relative flex flex-col gap-4">
                    {/* Top row: hamburger (mobile) + avatar + greeting */}
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 md:gap-5 flex-1 min-w-0">
                            {/* Mobile menu button */}
                            {openSidebar && (
                                <button onClick={openSidebar}
                                    className="lg:hidden glass p-2 rounded-xl text-white flex-shrink-0">
                                    <Menu size={20} />
                                </button>
                            )}
                            {/* Avatar */}
                            <div className="glass w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                                <span className="text-white text-xl md:text-2xl font-extrabold">
                                    {firstName.charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <div className="min-w-0">
                                <p className="text-indigo-200 text-xs md:text-sm font-medium">{getGreeting()} 👋</p>
                                <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight truncate">{firstName}</h1>
                            </div>
                        </div>

                        {/* Completion arc — desktop only */}
                        <div className="glass rounded-2xl p-3 text-center hidden md:block flex-shrink-0">
                            <svg width="56" height="56" viewBox="0 0 64 64">
                                <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="5" />
                                <circle cx="32" cy="32" r="26" fill="none" stroke="white" strokeWidth="5"
                                    strokeDasharray={`${2 * Math.PI * 26 * (tasks.length > 0 ? completedCount / tasks.length : 0)} ${2 * Math.PI * 26}`}
                                    strokeLinecap="round" transform="rotate(-90 32 32)"
                                    style={{ transition: 'stroke-dasharray 0.8s ease' }} />
                                <text x="32" y="32" textAnchor="middle" dominantBaseline="central" fontSize="13" fontWeight="800" fill="white">
                                    {tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0}%
                                </text>
                            </svg>
                            <p className="text-white/70 text-[10px] font-semibold mt-1">Done</p>
                        </div>
                    </div>

                    {/* Quick stats chips */}
                    <div className="flex flex-wrap gap-2">
                        <span className="glass text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5">
                            <Sparkles size={11} /> {activeCount} active
                        </span>
                        {pendingQuotes > 0 && (
                            <span className="bg-orange-400/30 border border-orange-300/40 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 animate-pulse-ring">
                                <AlertCircle size={11} /> {pendingQuotes} quote{pendingQuotes > 1 ? 's' : ''}
                            </span>
                        )}
                        <span className="glass text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5">
                            <DollarSign size={11} /> {fmt(totalValue)}
                        </span>
                    </div>

                    {/* Action buttons — full width on mobile */}
                    <div className="flex gap-2">
                        <button onClick={() => setShowHelp(true)}
                            className="glass hover:bg-white/25 text-white px-3 md:px-4 py-2 rounded-xl font-medium transition-all text-sm flex items-center gap-2">
                            <HelpCircle size={15} /> <span className="hidden sm:inline">Help</span>
                        </button>
                        <button onClick={() => { resetForm(); setShowForm(true); }}
                            className="flex-1 md:flex-none bg-white text-indigo-700 px-4 py-2 rounded-xl font-bold hover:shadow-lg hover:bg-indigo-50 transition-all text-sm flex items-center justify-center gap-2">
                            <Plus size={15} /> New Project
                        </button>
                    </div>
                </div>
            </div>

            {/* ── 2. Quote Alert ────────────────────────────────────────────── */}
            {pendingQuotes > 0 && (
                <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 rounded-2xl px-4 md:px-6 py-3 md:py-4 animate-slide-right">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-orange-100 rounded-xl animate-pulse-ring flex-shrink-0">
                            <AlertCircle size={16} className="text-orange-600" />
                        </div>
                        <div className="min-w-0">
                            <p className="font-bold text-orange-800 text-sm truncate">
                                {pendingQuotes} quote{pendingQuotes > 1 ? 's' : ''} awaiting response
                            </p>
                            <p className="text-orange-600 text-xs mt-0.5 hidden sm:block">Review and accept or decline to proceed</p>
                        </div>
                    </div>
                    <button onClick={() => setActiveTab('quotes')}
                        className="flex items-center gap-1 bg-orange-500 hover:bg-orange-600 text-white px-3 md:px-4 py-2 rounded-xl text-sm font-bold transition-all flex-shrink-0">
                        Review <ChevronRight size={14} />
                    </button>
                </div>
            )}

            {/* ── 3. Stat Cards ─────────────────────────────────────────────── */}
            {/* 2-col on mobile, 3-col on md, 5-col on lg */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                {[
                    { title: 'Active', value: activeCount, icon: Clock, color: 'blue', sub: inProgressCount > 0 ? `${inProgressCount} in progress` : undefined, tab: 'active' },
                    { title: 'Quotes', value: pendingQuotes, icon: Wallet, color: 'orange', badge: pendingQuotes > 0 ? 'Action!' : undefined, tab: 'quotes' },
                    { title: 'Completed', value: completedCount, icon: CheckCircle, color: 'green', tab: 'history' },
                    { title: 'Total', value: tasks.length, icon: LayoutDashboard, color: 'purple', sub: 'Lifetime' },
                    // Span full width on 2-col mobile so it doesn't look orphaned
                    { title: 'Value', value: fmt(totalValue), icon: TrendingUp, color: 'rose', sub: paidValue > 0 ? `${fmt(paidValue)} paid` : 'None paid', colSpan: true },
                ].map((c, i) => (
                    <div key={c.title}
                        className={`animate-stagger ${['delay-0', 'delay-50', 'delay-100', 'delay-150', 'delay-200'][i]}
                            ${c.colSpan ? 'col-span-2 md:col-span-1' : ''}`}>
                        <StatCard
                            title={c.title}
                            value={c.value}
                            icon={c.icon}
                            color={c.color}
                            subtitle={c.sub}
                            badge={c.badge}
                            onClick={c.tab ? () => setActiveTab(c.tab) : undefined}
                            active={c.tab && activeTab === c.tab}
                            variant="gradient"
                        />
                    </div>
                ))}
            </div>

            {/* ── 4. Financial Summary + Activity Feed ──────────────────────── */}
            {tasks.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Financial summary */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-5">
                        <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                            <DollarSign size={15} className="text-emerald-500" />
                            Financial Summary
                        </h3>
                        <div className="space-y-2.5">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Total Value</span>
                                <span className="font-bold text-gray-900">{fmt(totalValue)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-emerald-600 font-medium">Paid</span>
                                <span className="font-bold text-emerald-700">{fmt(paidValue)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-orange-500 font-medium">Outstanding</span>
                                <span className="font-bold text-orange-600">{fmt(outstandingValue)}</span>
                            </div>
                            <div className="pt-1">
                                <div className="flex justify-between text-xs text-gray-400 mb-1">
                                    <span>Payment progress</span>
                                    <span className="font-semibold text-emerald-600">{paidPct}%</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-700"
                                        style={{ width: `${paidPct}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Activity feed */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-5">
                        <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                            <Activity size={15} className="text-indigo-500" />
                            Recent Activity
                        </h3>
                        {recentActivity.length === 0 ? (
                            <p className="text-gray-400 text-sm text-center py-4">No activity yet</p>
                        ) : (
                            <div className="space-y-2.5">
                                {recentActivity.map((t, i) => (
                                    <div key={t.id} className={`flex items-start gap-3 animate-stagger delay-${i * 50}`}>
                                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${STATUS_COLORS[t.status] || 'bg-gray-400'}`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-gray-800 truncate">{t.task_name || 'Untitled'}</p>
                                            <p className="text-xs text-gray-400">
                                                {STATUS_LABELS[t.status] || t.status} · {timeAgo(t.updated_at || t.date_commissioned)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── 5. Main Content ───────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

                {/* Toolbar — stacks on mobile */}
                <div className="border-b border-gray-100 px-4 md:px-6 py-3 md:py-4 space-y-3">
                    {/* Row 1: Tabs */}
                    <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-full overflow-x-auto">
                        {[
                            { key: 'active', label: 'Active', icon: Sparkles, count: null },
                            { key: 'quotes', label: 'Quotes', icon: Wallet, count: pendingQuotes },
                            { key: 'history', label: 'History', icon: History, count: null },
                        ].map(tab => (
                            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-1.5 px-3 md:px-4 py-2 text-sm font-semibold rounded-lg transition-all whitespace-nowrap flex-1 justify-center
                                    ${activeTab === tab.key ? 'bg-white shadow text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}>
                                <tab.icon size={14} />
                                {tab.label}
                                {tab.count > 0 && (
                                    <span className="bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none">
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Row 2: Search + Sort + View toggle */}
                    <div className="flex items-center gap-2">
                        {/* Search — grows to fill */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <input type="text" placeholder="Search projects..." value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white outline-none transition-all" />
                        </div>
                        {/* Sort */}
                        <div className="relative flex-shrink-0">
                            <ArrowUpDown size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                                className="pl-7 pr-2 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer">
                                <option value="date_delivered">Date</option>
                                <option value="priority">Priority</option>
                                <option value="amount">Amount</option>
                            </select>
                        </div>
                        {/* View toggle */}
                        <div className="flex bg-gray-100 rounded-xl p-1 flex-shrink-0">
                            <button onClick={() => setView('grid')}
                                className={`p-1.5 rounded-lg transition-all ${view === 'grid' ? 'bg-white shadow text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>
                                <LayoutGrid size={15} />
                            </button>
                            <button onClick={() => setView('list')}
                                className={`p-1.5 rounded-lg transition-all ${view === 'list' ? 'bg-white shadow text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>
                                <List size={15} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Task Form — modal overlay so it never pushes content down */}
                {showForm && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
                        <div className="w-full max-w-2xl my-4 md:my-8">
                            <TaskForm
                                formData={formData} setFormData={setFormData}
                                onSubmit={handleAddTask} onChange={handleInputChange}
                                editingTask={editingTask} user={user}
                                onCancel={() => { setShowForm(false); resetForm(); }}
                                fileInputRef={fileInputRef}
                            />
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="p-4 md:p-6">
                    {displayTasks.length === 0 ? (
                        <>
                            {activeTab === 'active' && <EmptyActive />}
                            {activeTab === 'quotes' && <EmptyQuotes />}
                            {activeTab === 'history' && <EmptyHistory />}
                            {activeTab === 'active' && !searchTerm && (
                                <div className="text-center pb-6">
                                    <button onClick={() => { resetForm(); setShowForm(true); }}
                                        className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:shadow-lg transition-all text-sm">
                                        <Plus size={16} /> Start a New Project
                                    </button>
                                </div>
                            )}
                        </>
                    ) : view === 'grid' ? (
                        /* 1-col mobile, 2-col tablet, 3-col desktop */
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
                            {displayTasks.map((task, i) => (
                                <ClientProjectCard
                                    key={task.id} task={task} user={user} index={i}
                                    onQuoteResponse={handleQuoteResponse}
                                    onDownloadFile={onDownloadFile}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="overflow-x-auto -mx-4 md:mx-0">
                            <TaskTable
                                tasks={displayTasks} isOnline={true} hideAmounts={false}
                                onEdit={handleEdit} onDelete={handleDelete}
                                onTogglePayment={() => { }}
                                onAddTask={() => { resetForm(); setShowForm(true); }}
                                onDownloadFile={onDownloadFile}
                                onQuoteResponse={handleQuoteResponse}
                                onSendQuote={() => { }}
                                onDuplicate={handleDuplicate}
                                user={user}
                            />
                        </div>
                    )}
                </div>
            </div>

            <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
        </div>
    );
};

export default ClientDashboard;
