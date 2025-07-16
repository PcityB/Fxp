import React from 'react';
import type { Task } from '../store/slices/systemSlice';

interface RecentActivityProps {
  tasks: Task[];
}

const RecentActivity: React.FC<RecentActivityProps> = ({ tasks }) => {
  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'running':
        return '⏳';
      case 'failed':
        return '❌';
      case 'queued':
        return '⏸️';
      default:
        return '❓';
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return 'text-success-600';
      case 'running':
        return 'text-primary-600';
      case 'failed':
        return 'text-error-600';
      case 'queued':
        return 'text-warning-600';
      default:
        return 'text-text-tertiary';
    }
  };

  const formatTaskId = (taskId: string) => {
    // Extract meaningful part from task ID
    if (taskId.includes('_')) {
      const parts = taskId.split('_');
      return parts.slice(0, 2).join(' ').replace(/([A-Z])/g, ' $1').trim();
    }
    return taskId.substring(0, 20) + (taskId.length > 20 ? '...' : '');
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="bg-surface border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text-primary">
          Recent Activity
        </h3>
        <span className="text-sm text-text-tertiary">
          {tasks.length} recent tasks
        </span>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">📋</div>
          <p className="text-text-secondary">No recent activity</p>
          <p className="text-sm text-text-tertiary mt-1">
            Tasks will appear here once you start using the system
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.task_id}
              className="flex items-center space-x-3 p-3 rounded-md hover:bg-background transition-colors"
            >
              <div className="flex-shrink-0 text-lg">
                {getStatusIcon(task.status)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {formatTaskId(task.task_id)}
                  </p>
                  <span className="text-xs text-text-tertiary ml-2">
                    {getRelativeTime(task.started_at)}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`text-xs font-medium ${getStatusColor(task.status)}`}>
                    {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                  </span>
                  
                  {task.status === 'running' && (
                    <>
                      <span className="text-xs text-text-tertiary">•</span>
                      <div className="flex items-center space-x-1">
                        <div className="w-16 bg-background rounded-full h-1">
                          <div
                            className="bg-primary-500 h-1 rounded-full transition-all duration-300"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-text-tertiary">
                          {Math.round(task.progress)}%
                        </span>
                      </div>
                    </>
                  )}
                </div>
                
                {task.error && (
                  <p className="text-xs text-error-600 mt-1 truncate">
                    Error: {task.error}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tasks.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            View all activity →
          </button>
        </div>
      )}
    </div>
  );
};

export default RecentActivity;
