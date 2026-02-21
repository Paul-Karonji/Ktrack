import React from 'react';
import ProjectCard from './ProjectCard';

const ProjectGrid = ({ tasks, isOnline, hideAmounts, user, onEdit, onDelete, onTogglePayment, onDownloadFile, onDeliverWork }) => {
    if (!tasks || tasks.length === 0) {
        return (
            <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-gray-200">
                <p className="text-gray-500 text-lg">No projects found</p>
                <p className="text-gray-400 text-sm mt-2">Try adjusting your filters or create a new project</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tasks.map(task => (
                <ProjectCard
                    key={task.id}
                    task={task}
                    isOnline={isOnline}
                    hideAmounts={hideAmounts}
                    user={user}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onTogglePayment={onTogglePayment}
                    onDownloadFile={onDownloadFile}
                    onDeliverWork={onDeliverWork}
                />
            ))}
        </div>
    );
};

export default ProjectGrid;
