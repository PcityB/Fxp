import React from 'react';

interface Job {
  id: string;
  type: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  result?: any;
}

interface JobMonitorProps {
  jobs: Job[];
  maxVisible?: number;
  showHistory?: boolean;
  onJobCancel?: (jobId: string) => void;
  onJobRetry?: (jobId: string) => void;
}

const JobMonitor: React.FC<JobMonitorProps> = ({
  jobs,
  maxVisible = 5,
  showHistory = true,
  onJobCancel,
  onJobRetry,
}) => {
  const getStatusIcon = (status: Job['status']) => {
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

  const getStatusColor = (status: Job['status']) => {
    switch (status) {
      case 'completed':
        return 'text-success-600 bg-success-50';
      case 'running':
        return 'text-primary-600 bg-primary-50';
      case 'failed':
        return 'text-error-600 bg-error-50';
      case 'queued':
        return 'text-warning-600 bg-warning-50';
      default:
        return 'text-text-tertiary bg-background';
    }
  };

  const formatJobType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getRelativeTime = (date: Date) => {
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

  const getDuration = (startedAt: Date, completedAt?: Date) => {
    const endTime = completedAt || new Date();
    const diffMs = endTime.getTime() - startedAt.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    
    if (diffSecs < 60) return `${diffSecs}s`;
    if (diffMins < 60) return `${diffMins}m ${diffSecs % 60}s`;
    return `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;
  };

  const visibleJobs = showHistory ? jobs.slice(0, maxVisible) : jobs.filter(job => job.status === 'running' || job.status === 'queued');

  return (
    <div className="bg-surface border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text-primary">
          Job Monitor
        </h3>
        <div className="flex items-center space-x-2 text-sm text-text-tertiary">
          <span>{jobs.filter(j => j.status === 'running').length} running</span>
          <span>•</span>
          <span>{jobs.filter(j => j.status === 'queued').length} queued</span>
        </div>
      </div>

      {visibleJobs.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">⚡</div>
          <p className="text-text-secondary">No active jobs</p>
          <p className="text-sm text-text-tertiary mt-1">
            Jobs will appear here when you start processing
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleJobs.map((job) => (
            <div
              key={job.id}
              className="border border-border rounded-lg p-4 hover:bg-background transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div className="text-lg">
                    {getStatusIcon(job.status)}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-text-primary">
                      {formatJobType(job.type)}
                    </h4>
                    <p className="text-xs text-text-tertiary">
                      ID: {job.id.substring(0, 8)}...
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                    {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                  </span>
                  
                  {job.status === 'running' && onJobCancel && (
                    <button
                      onClick={() => onJobCancel(job.id)}
                      className="text-xs text-error-600 hover:text-error-700 px-2 py-1 rounded hover:bg-error-50"
                    >
                      Cancel
                    </button>
                  )}
                  
                  {job.status === 'failed' && onJobRetry && (
                    <button
                      onClick={() => onJobRetry(job.id)}
                      className="text-xs text-primary-600 hover:text-primary-700 px-2 py-1 rounded hover:bg-primary-50"
                    >
                      Retry
                    </button>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              {job.status === 'running' && (
                <div className="mb-2">
                  <div className="flex items-center justify-between text-xs text-text-tertiary mb-1">
                    <span>Progress</span>
                    <span>{Math.round(job.progress)}%</span>
                  </div>
                  <div className="w-full bg-background rounded-full h-2">
                    <div
                      className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Job Details */}
              <div className="flex items-center justify-between text-xs text-text-tertiary">
                <div className="flex items-center space-x-4">
                  <span>Started: {getRelativeTime(job.startedAt)}</span>
                  <span>Duration: {getDuration(job.startedAt, job.completedAt)}</span>
                </div>
                
                {job.status === 'completed' && job.result && (
                  <span className="text-success-600">
                    ✓ {Object.keys(job.result).length} results
                  </span>
                )}
              </div>

              {/* Error Message */}
              {job.error && (
                <div className="mt-2 p-2 bg-error-50 border border-error-200 rounded text-xs text-error-700">
                  <strong>Error:</strong> {job.error}
                </div>
              )}

              {/* Success Result Summary */}
              {job.status === 'completed' && job.result && (
                <div className="mt-2 p-2 bg-success-50 border border-success-200 rounded text-xs text-success-700">
                  <strong>Completed:</strong> {
                    job.type === 'pattern_extraction' 
                      ? `${job.result.n_patterns || 0} patterns extracted in ${job.result.n_clusters || 0} clusters`
                      : 'Job completed successfully'
                  }
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {jobs.length > maxVisible && showHistory && (
        <div className="mt-4 pt-4 border-t border-border text-center">
          <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            View all {jobs.length} jobs →
          </button>
        </div>
      )}
    </div>
  );
};

export default JobMonitor;
