import React, { useState } from 'react';
import { X, HelpCircle, BookOpen, MessageCircle, FileText, CheckCircle, Download, Upload } from 'lucide-react';

const HelpModal = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState('quickstart');

    if (!isOpen) return null;

    const tabs = [
        { id: 'quickstart', label: 'Quick Start', icon: HelpCircle },
        { id: 'tasks', label: 'Creating Tasks', icon: FileText },
        { id: 'quotes', label: 'Quote Process', icon: CheckCircle },
        { id: 'chat', label: 'Using Chat', icon: MessageCircle },
        { id: 'files', label: 'File Management', icon: Upload },
        { id: 'faq', label: 'FAQ', icon: BookOpen },
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <HelpCircle className="w-8 h-8" />
                        <div>
                            <h2 className="text-2xl font-bold">K-Track User Guide</h2>
                            <p className="text-indigo-100 text-sm">Everything you need to get started</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="hover:bg-white/20 p-2 rounded-lg transition-colors"
                        aria-label="Close help"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b overflow-x-auto bg-gray-50">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                                        ? 'border-indigo-600 text-indigo-600 bg-white'
                                        : 'border-transparent text-gray-600 hover:text-indigo-600 hover:bg-gray-100'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                <span className="text-sm font-medium">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                    {activeTab === 'quickstart' && <QuickStartContent />}
                    {activeTab === 'tasks' && <TasksContent />}
                    {activeTab === 'quotes' && <QuotesContent />}
                    {activeTab === 'chat' && <ChatContent />}
                    {activeTab === 'files' && <FilesContent />}
                    {activeTab === 'faq' && <FAQContent />}
                </div>

                {/* Footer */}
                <div className="border-t p-4 bg-gray-50 flex justify-between items-center">
                    <p className="text-sm text-gray-600">
                        Need more help? Use the chat feature on any task to contact an admin.
                    </p>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        Got it!
                    </button>
                </div>
            </div>
        </div>
    );
};

// Content Components
const QuickStartContent = () => (
    <div className="space-y-6">
        <div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">Welcome to K-Track! 🚀</h3>
            <p className="text-gray-600 mb-4">
                Let's get you started with creating and managing your tasks. Follow these simple steps:
            </p>
        </div>

        <div className="space-y-4">
            <StepCard
                number="1"
                title="Your Account is Approved"
                description="You've already received admin approval and can now access your dashboard."
                color="green"
            />

            <StepCard
                number="2"
                title="Create Your First Task"
                description="Click the 'New Task' or '➕' button to create a commission request. Describe what you need done."
                color="blue"
            />

            <StepCard
                number="3"
                title="Wait for a Quote"
                description="An admin will review your task and send you a price quote. You'll see the status change to 'Quote Sent'."
                color="purple"
            />

            <StepCard
                number="4"
                title="Approve the Quote"
                description="Review the quoted amount and click 'Approve' to start the work, or use chat to discuss."
                color="indigo"
            />

            <StepCard
                number="5"
                title="Track Progress"
                description="Monitor your task status as it moves from 'In Progress' to 'Review' to 'Completed'."
                color="orange"
            />

            <StepCard
                number="6"
                title="Download Deliverables"
                description="Once completed, download your final files using the download button."
                color="green"
            />
        </div>

        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mt-6">
            <p className="text-sm text-indigo-800">
                <strong>💡 Pro Tip:</strong> Use the chat feature to communicate with admins at any time. It's the fastest way to get answers!
            </p>
        </div>
    </div>
);

const TasksContent = () => (
    <div className="space-y-6">
        <div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">Creating Tasks</h3>
            <p className="text-gray-600 mb-4">
                Tasks (also called commissions) are work requests you submit to the admin team.
            </p>
        </div>

        <div className="space-y-4">
            <InfoSection title="Required Information">
                <ul className="list-disc list-inside space-y-2 text-gray-600">
                    <li><strong>Task Description:</strong> Clearly explain what you need done</li>
                    <li><strong>Priority:</strong> Low, Medium, High, or Urgent</li>
                </ul>
            </InfoSection>

            <InfoSection title="Optional Fields">
                <ul className="list-disc list-inside space-y-2 text-gray-600">
                    <li><strong>Expected Amount:</strong> Your budget estimate</li>
                    <li><strong>Quantity:</strong> Number of items needed</li>
                    <li><strong>Notes:</strong> Additional requirements or specifications</li>
                    <li><strong>Files:</strong> Reference materials or examples</li>
                </ul>
            </InfoSection>

            <InfoSection title="Priority Levels">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                        <span className="text-gray-600"><strong>Low:</strong> No rush, flexible timeline</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                        <span className="text-gray-600"><strong>Medium:</strong> Standard priority (default)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
                        <span className="text-gray-600"><strong>High:</strong> Important, needs attention soon</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                        <span className="text-gray-600"><strong>Urgent:</strong> Time-sensitive, immediate</span>
                    </div>
                </div>
            </InfoSection>
        </div>
    </div>
);

const QuotesContent = () => (
    <div className="space-y-6">
        <div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">Understanding the Quote Process</h3>
            <p className="text-gray-600 mb-4">
                K-Track uses a quote approval system to ensure transparency and agreement before work begins.
            </p>
        </div>

        <div className="space-y-4">
            <ProcessStep
                step="1"
                title="Pending Quote"
                description="After you create a task, it enters 'Pending Quote' status. The admin team reviews your request and calculates the cost."
                status="pending"
            />

            <ProcessStep
                step="2"
                title="Quote Sent"
                description="The admin sends a quoted amount. You'll see this displayed on your task card with the price."
                status="sent"
            />

            <ProcessStep
                step="3"
                title="Your Decision"
                description="You have two options:"
                status="decision"
            >
                <div className="mt-3 space-y-2 ml-4">
                    <div className="bg-green-50 border border-green-200 rounded p-3">
                        <p className="text-green-800 font-medium">✅ Approve Quote</p>
                        <p className="text-green-700 text-sm">Work begins, status changes to "In Progress"</p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded p-3">
                        <p className="text-red-800 font-medium">❌ Reject Quote</p>
                        <p className="text-red-700 text-sm">Task is cancelled. You can chat to discuss or create a new task</p>
                    </div>
                </div>
            </ProcessStep>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
            <p className="text-sm text-yellow-800">
                <strong>💡 Tip:</strong> Before rejecting a quote, use the chat to discuss pricing. The admin may be able to adjust the scope or offer alternatives!
            </p>
        </div>
    </div>
);

const ChatContent = () => (
    <div className="space-y-6">
        <div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">Using the Chat Feature</h3>
            <p className="text-gray-600 mb-4">
                Every task has its own dedicated chat channel for communication with the admin team.
            </p>
        </div>

        <div className="space-y-4">
            <InfoSection title="How to Access Chat">
                <ol className="list-decimal list-inside space-y-2 text-gray-600">
                    <li>Find your task in the dashboard</li>
                    <li>Click the 💬 chat icon or "Chat" button</li>
                    <li>The chat panel will open on the right side</li>
                </ol>
            </InfoSection>

            <InfoSection title="Chat Best Practices">
                <div className="space-y-2">
                    <div className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-600">Ask clarifying questions about requirements</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-600">Request progress updates</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-600">Discuss quote pricing or timeline</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-600">Provide feedback on drafts or deliverables</span>
                    </div>
                </div>
            </InfoSection>

            <InfoSection title="Unread Messages">
                <p className="text-gray-600">
                    When you have unread messages, you'll see a red badge with a number on the task card.
                    The badge shows how many messages you haven't read yet. It disappears when you open the chat.
                </p>
            </InfoSection>
        </div>
    </div>
);

const FilesContent = () => (
    <div className="space-y-6">
        <div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">Managing Files</h3>
            <p className="text-gray-600 mb-4">
                Upload reference materials and download completed deliverables with ease.
            </p>
        </div>

        <div className="space-y-4">
            <InfoSection title="Uploading Files (References)">
                <p className="text-gray-600 mb-3">You can upload files when creating a task or after:</p>
                <ol className="list-decimal list-inside space-y-2 text-gray-600">
                    <li>Click "Upload File" or "Choose File"</li>
                    <li>Select your file from your computer</li>
                    <li>The file will be attached to your task</li>
                </ol>
            </InfoSection>

            <InfoSection title="Downloading Files (Deliverables)">
                <p className="text-gray-600 mb-3">When your task is completed:</p>
                <ol className="list-decimal list-inside space-y-2 text-gray-600">
                    <li>Look for the 📥 download icon on your task</li>
                    <li>Click to download the file</li>
                    <li>File saves to your default downloads folder</li>
                </ol>
            </InfoSection>

            <InfoSection title="File Specifications">
                <ul className="list-disc list-inside space-y-2 text-gray-600">
                    <li><strong>Supported formats:</strong> PDF, DOCX, PNG, JPG, ZIP, and more</li>
                    <li><strong>Maximum size:</strong> 10MB per file</li>
                    <li><strong>Storage:</strong> Securely stored in the cloud</li>
                </ul>
            </InfoSection>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
            <p className="text-sm text-blue-800">
                <strong>💡 Tip:</strong> For files larger than 10MB, compress them first or share via external links (Google Drive, Dropbox) in the chat.
            </p>
        </div>
    </div>
);

const FAQContent = () => (
    <div className="space-y-6">
        <div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">Frequently Asked Questions</h3>
        </div>

        <div className="space-y-4">
            <FAQItem
                question="How long does it take to get a quote?"
                answer="Usually within 24 hours. For urgent tasks, the admin team prioritizes faster responses."
            />

            <FAQItem
                question="Can I edit a task after submitting it?"
                answer="Use the chat feature to request changes. The admin can update task details based on your discussion."
            />

            <FAQItem
                question="What if the quote is too expensive?"
                answer="Don't reject immediately! Use chat to discuss pricing or ways to reduce the scope to fit your budget."
            />

            <FAQItem
                question="How many tasks can I create?"
                answer="There's no limit! Create as many tasks as you need. Each one is tracked separately."
            />

            <FAQItem
                question="Can I cancel a task after approving the quote?"
                answer="Contact the admin immediately via chat. Depending on how much work has been done, cancellation may be possible."
            />

            <FAQItem
                question="What do the different task statuses mean?"
                answer="Pending Quote (waiting for price) → Quote Sent (review quote) → In Progress (work being done) → Review (check deliverables) → Completed (all done!)"
            />

            <FAQItem
                question="My file won't upload. What should I do?"
                answer="Check that it's under 10MB, your internet is stable, and try refreshing the page. If issues persist, share the file via chat using external links."
            />

            <FAQItem
                question="Will I get notifications for updates?"
                answer="Yes! Unread message badges appear on task cards. Email notifications may also be sent (check your email settings)."
            />
        </div>
    </div>
);

// Helper Components
const StepCard = ({ number, title, description, color = 'blue' }) => {
    const colorClasses = {
        blue: 'bg-blue-100 text-blue-800 border-blue-200',
        green: 'bg-green-100 text-green-800 border-green-200',
        purple: 'bg-purple-100 text-purple-800 border-purple-200',
        indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        orange: 'bg-orange-100 text-orange-800 border-orange-200',
    };

    return (
        <div className={`border rounded-lg p-4 ${colorClasses[color]}`}>
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white flex items-center justify-center font-bold">
                    {number}
                </div>
                <div>
                    <h4 className="font-semibold mb-1">{title}</h4>
                    <p className="text-sm opacity-90">{description}</p>
                </div>
            </div>
        </div>
    );
};

const InfoSection = ({ title, children }) => (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-800 mb-3">{title}</h4>
        {children}
    </div>
);

const ProcessStep = ({ step, title, description, status, children }) => (
    <div className="border-l-4 border-indigo-500 pl-4 py-2">
        <div className="flex items-center gap-2 mb-1">
            <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-sm font-semibold">
                Step {step}
            </span>
            <h4 className="font-semibold text-gray-800">{title}</h4>
        </div>
        <p className="text-gray-600 text-sm">{description}</p>
        {children}
    </div>
);

const FAQItem = ({ question, answer }) => (
    <div className="border-b border-gray-200 pb-4">
        <h4 className="font-semibold text-gray-800 mb-2">Q: {question}</h4>
        <p className="text-gray-600 text-sm">A: {answer}</p>
    </div>
);

export default HelpModal;
