import React, { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { fetchSystemStatus } from '../store/slices/systemSlice';
import { fetchDatasets } from '../store/slices/dataSlice';
import { fetchPatternsList } from '../store/slices/patternsSlice';
import { fetchAnalysisList } from '../store/slices/analysisSlice';
import LoadingSpinner from '../components/LoadingSpinner';
import MetricCard from '../components/MetricCard';
import SystemStatusCard from '../components/SystemStatusCard';
import RecentActivity from '../components/RecentActivity';
import QuickActions from '../components/QuickActions';

const Dashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const { status, tasks, loading: systemLoading } = useAppSelector((state) => state.system);
  const { datasets, loading: dataLoading } = useAppSelector((state) => state.data);
  const { extractedPatterns, loading: patternsLoading } = useAppSelector((state) => state.patterns);
  const { results: analysisResults, loading: analysisLoading } = useAppSelector((state) => state.analysis);

  useEffect(() => {
    // Fetch initial data
    dispatch(fetchSystemStatus());
    dispatch(fetchDatasets());
    dispatch(fetchPatternsList());
    dispatch(fetchAnalysisList());
  }, [dispatch]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch(fetchSystemStatus());
    }, 30000);

    return () => clearInterval(interval);
  }, [dispatch]);

  const isLoading = systemLoading || dataLoading || patternsLoading || analysisLoading;

  if (isLoading && !status) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="large" message="Loading dashboard..." />
      </div>
    );
  }

  // Calculate metrics
  const runningTasks = tasks.filter(task => task.status === 'running').length;
  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const failedTasks = tasks.filter(task => task.status === 'failed').length;
  const totalPatterns = extractedPatterns.length;
  const profitablePatterns = analysisResults.reduce((acc, result) => acc + result.profitable_clusters, 0);

  if (!status) {
    return (
      <div className="p-6 text-text-secondary">
        System status unavailable. Please try again later.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-text-secondary">
            System overview and key performance metrics
          </p>
        </div>
        
        <div className="flex items-center space-x-2 text-sm text-text-tertiary">
          <span>Last updated:</span>
          <span>{new Date().toLocaleTimeString()}</span>
          {isLoading && <LoadingSpinner size="small" />}
        </div>
      </div>

      {/* System Status */}
      <SystemStatusCard status={status} />

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Active Jobs"
          value={runningTasks}
          subtitle={`${tasks.length} total`}
          trend={runningTasks > 0 ? 'up' : 'neutral'}
          color="primary"
        />
        
        <MetricCard
          title="Datasets"
          value={datasets.length}
          subtitle="Available timeframes"
          color="success"
        />
        
        <MetricCard
          title="Patterns Discovered"
          value={totalPatterns}
          subtitle="Unique patterns"
          color="primary"
        />
        
        <MetricCard
          title="Profitable Patterns"
          value={profitablePatterns}
          subtitle={`${totalPatterns > 0 ? Math.round((profitablePatterns / totalPatterns) * 100) : 0}% success rate`}
          trend={profitablePatterns > 0 ? 'up' : 'neutral'}
          color="success"
        />
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">
            Task Performance
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Completed</span>
              <div className="flex items-center space-x-2">
                <div className="w-32 bg-background rounded-full h-2">
                  <div 
                    className="bg-success-500 h-2 rounded-full"
                    style={{ 
                      width: `${tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0}%` 
                    }}
                  />
                </div>
                <span className="text-sm font-medium text-text-primary">
                  {completedTasks}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Running</span>
              <div className="flex items-center space-x-2">
                <div className="w-32 bg-background rounded-full h-2">
                  <div 
                    className="bg-primary-500 h-2 rounded-full"
                    style={{ 
                      width: `${tasks.length > 0 ? (runningTasks / tasks.length) * 100 : 0}%` 
                    }}
                  />
                </div>
                <span className="text-sm font-medium text-text-primary">
                  {runningTasks}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Failed</span>
              <div className="flex items-center space-x-2">
                <div className="w-32 bg-background rounded-full h-2">
                  <div 
                    className="bg-error-500 h-2 rounded-full"
                    style={{ 
                      width: `${tasks.length > 0 ? (failedTasks / tasks.length) * 100 : 0}%` 
                    }}
                  />
                </div>
                <span className="text-sm font-medium text-text-primary">
                  {failedTasks}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">
            System Resources
          </h3>
          
          {status && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Memory Usage</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-background rounded-full h-2">
                    <div 
                      className="bg-warning-500 h-2 rounded-full"
                      style={{ 
                        width: status.memory_usage.percent 
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-text-primary">
                    {status.memory_usage.percent}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Disk Usage</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-background rounded-full h-2">
                    <div 
                      className="bg-primary-500 h-2 rounded-full"
                      style={{ 
                        width: status.disk_usage.percent 
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-text-primary">
                    {status.disk_usage.percent}
                  </span>
                </div>
              </div>
              
              <div className="pt-2 border-t border-border">
                <div className="text-sm text-text-tertiary">
                  <div>Uptime: {status.uptime}</div>
                  <div>Version: {status.version}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity tasks={tasks.slice(0, 5)} />
        <QuickActions />
      </div>
    </div>
  );
};

export default Dashboard;
