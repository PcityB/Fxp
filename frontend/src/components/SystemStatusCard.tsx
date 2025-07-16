import React from 'react';
import type { SystemStatus } from '../store/slices/systemSlice';

interface SystemStatusCardProps {
  status: SystemStatus | null;
}

const SystemStatusCard: React.FC<SystemStatusCardProps> = ({ status }) => {
  if (!status) {
    return (
      <div className="bg-surface border border-border rounded-lg p-6">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 bg-error-500 rounded-full animate-pulse"></div>
          <span className="text-text-secondary">System status unavailable</span>
        </div>
      </div>
    );
  }

  const isHealthy = status.status === 'running';
  const statusColor = isHealthy ? 'success' : 'error';
  const statusIcon = isHealthy ? '✅' : '❌';

  return (
    <div className="bg-surface border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <span className="text-lg">{statusIcon}</span>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              System Status
            </h2>
            <p className={`text-sm font-medium ${
              statusColor === 'success' ? 'text-success-600' : 'text-error-600'
            }`}>
              {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
            </p>
          </div>
        </div>
        
        <div className="text-right text-sm text-text-tertiary">
          <div>Version {status.version}</div>
          <div>Uptime: {status.uptime}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Memory Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">Memory</span>
            <span className="text-sm font-medium text-text-primary">
              {status.memory_usage.used} / {status.memory_usage.total}
            </span>
          </div>
          <div className="w-full bg-background rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                parseFloat(status.memory_usage.percent) > 80
                  ? 'bg-error-500'
                  : parseFloat(status.memory_usage.percent) > 60
                  ? 'bg-warning-500'
                  : 'bg-success-500'
              }`}
              style={{ width: status.memory_usage.percent }}
            />
          </div>
          <div className="text-xs text-text-tertiary">
            {status.memory_usage.percent} used
          </div>
        </div>

        {/* Disk Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">Disk</span>
            <span className="text-sm font-medium text-text-primary">
              {status.disk_usage.used} / {status.disk_usage.total}
            </span>
          </div>
          <div className="w-full bg-background rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                parseFloat(status.disk_usage.percent) > 80
                  ? 'bg-error-500'
                  : parseFloat(status.disk_usage.percent) > 60
                  ? 'bg-warning-500'
                  : 'bg-success-500'
              }`}
              style={{ width: status.disk_usage.percent }}
            />
          </div>
          <div className="text-xs text-text-tertiary">
            {status.disk_usage.percent} used
          </div>
        </div>
      </div>

      {/* Database Status */}
      {status.database && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className={`w-2 h-2 rounded-full ${
                status.database.connected ? 'bg-success-500' : 'bg-error-500'
              }`}></span>
              <span className="text-sm text-text-secondary">Database</span>
            </div>
            <div className="text-right text-sm text-text-tertiary">
              <div>{status.database.type} {status.database.version}</div>
              {status.database.timescaledb_enabled && (
                <div className="text-xs text-success-600">TimescaleDB enabled</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemStatusCard;
