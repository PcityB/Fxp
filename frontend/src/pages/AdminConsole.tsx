import React, { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { fetchSystemStatus } from '../store/slices/systemSlice';
import LoadingSpinner from '../components/LoadingSpinner';
import MetricCard from '../components/MetricCard';

const AdminConsole: React.FC = () => {
  const dispatch = useAppDispatch();
  const { status, tasks, loading } = useAppSelector((state) => state.system);

  useEffect(() => {
    dispatch(fetchSystemStatus());
  }, [dispatch]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Admin Console</h1>
          <p className="text-text-secondary">
            System administration and monitoring
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-text-tertiary">Admin Panel</span>
          {loading && <LoadingSpinner size="small" />}
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          title="System Status"
          value={status?.status || 'Unknown'}
          subtitle={`Version ${status?.version || 'N/A'}`}
          color={status?.status === 'running' ? 'success' : 'error'}
        />
        
        <MetricCard
          title="Active Tasks"
          value={tasks.filter(t => t.status === 'running').length}
          subtitle={`${tasks.length} total`}
          color="primary"
        />
        
        <MetricCard
          title="Memory Usage"
          value={status?.memory_usage.percent || '0%'}
          subtitle={`${status?.memory_usage.used || '0'} / ${status?.memory_usage.total || '0'}`}
          color="warning"
        />
        
        <MetricCard
          title="Disk Usage"
          value={status?.disk_usage.percent || '0%'}
          subtitle={`${status?.disk_usage.used || '0'} / ${status?.disk_usage.total || '0'}`}
          color="primary"
        />
      </div>

      {/* Admin Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Management */}
        <div className="bg-surface border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">
            System Management
          </h3>
          
          <div className="space-y-3">
            <button className="w-full text-left p-3 rounded-md hover:bg-background transition-colors">
              <div className="font-medium text-text-primary">Restart Services</div>
              <div className="text-sm text-text-secondary">Restart all system services</div>
            </button>
            
            <button className="w-full text-left p-3 rounded-md hover:bg-background transition-colors">
              <div className="font-medium text-text-primary">Clear Cache</div>
              <div className="text-sm text-text-secondary">Clear system cache and temporary files</div>
            </button>
            
            <button className="w-full text-left p-3 rounded-md hover:bg-background transition-colors">
              <div className="font-medium text-text-primary">Database Maintenance</div>
              <div className="text-sm text-text-secondary">Run database optimization tasks</div>
            </button>
          </div>
        </div>

        {/* User Management */}
        <div className="bg-surface border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">
            User Management
          </h3>
          
          <div className="space-y-3">
            <button className="w-full text-left p-3 rounded-md hover:bg-background transition-colors">
              <div className="font-medium text-text-primary">Manage Users</div>
              <div className="text-sm text-text-secondary">Add, edit, or remove user accounts</div>
            </button>
            
            <button className="w-full text-left p-3 rounded-md hover:bg-background transition-colors">
              <div className="font-medium text-text-primary">Access Control</div>
              <div className="text-sm text-text-secondary">Configure user permissions and roles</div>
            </button>
            
            <button className="w-full text-left p-3 rounded-md hover:bg-background transition-colors">
              <div className="font-medium text-text-primary">Activity Logs</div>
              <div className="text-sm text-text-secondary">View user activity and audit logs</div>
            </button>
          </div>
        </div>
      </div>

      {/* System Logs */}
      <div className="bg-surface border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          System Logs
        </h3>
        
        <div className="bg-background rounded border p-4 font-mono text-sm max-h-64 overflow-y-auto">
          <div className="space-y-1 text-text-secondary">
            <div>[2024-01-15 10:30:15] INFO: System started successfully</div>
            <div>[2024-01-15 10:30:16] INFO: Database connection established</div>
            <div>[2024-01-15 10:30:17] INFO: API server listening on port 8000</div>
            <div>[2024-01-15 10:35:22] INFO: Pattern extraction job started for 1h timeframe</div>
            <div>[2024-01-15 10:37:45] INFO: Pattern extraction completed - 5000 patterns found</div>
            <div>[2024-01-15 10:40:12] INFO: Analysis job started for 1h patterns</div>
            <div>[2024-01-15 10:42:33] INFO: Analysis completed - 12 profitable clusters identified</div>
            <div className="text-success-600">[2024-01-15 10:45:01] SUCCESS: All services running normally</div>
          </div>
        </div>
        
        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-text-tertiary">
            Showing last 50 entries
          </div>
          <div className="space-x-2">
            <button className="px-3 py-1 text-sm border border-border rounded hover:bg-background">
              Refresh
            </button>
            <button className="px-3 py-1 text-sm border border-border rounded hover:bg-background">
              Download
            </button>
          </div>
        </div>
      </div>

      {/* Configuration */}
      <div className="bg-surface border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          System Configuration
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-text-primary mb-2">API Settings</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">Rate Limit:</span>
                <span className="text-text-primary">1000 req/min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Timeout:</span>
                <span className="text-text-primary">30 seconds</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">CORS:</span>
                <span className="text-success-600">Enabled</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-text-primary mb-2">Storage Settings</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">Primary Storage:</span>
                <span className="text-text-primary">Database</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Backup Storage:</span>
                <span className="text-text-primary">File System</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Auto Backup:</span>
                <span className="text-success-600">Enabled</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 pt-4 border-t border-border">
          <button className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600">
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminConsole;
