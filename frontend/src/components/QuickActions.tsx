import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../store/hooks';
import { addNotification } from '../store/slices/systemSlice';

const QuickActions: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const actions = [
    {
      id: 'start-discovery',
      title: 'Start Pattern Discovery',
      description: 'Extract new patterns from forex data',
      icon: '🔍',
      color: 'primary',
      onClick: () => navigate('/discovery'),
    },
    {
      id: 'view-patterns',
      title: 'View Patterns',
      description: 'Browse discovered patterns',
      icon: '📊',
      color: 'success',
      onClick: () => navigate('/discovery'),
    },
    {
      id: 'run-analysis',
      title: 'Run Analysis',
      description: 'Analyze pattern performance',
      icon: '📈',
      color: 'warning',
      onClick: () => navigate('/analysis'),
    },
    {
      id: 'export-data',
      title: 'Export Data',
      description: 'Download results and reports',
      icon: '💾',
      color: 'secondary',
      onClick: () => {
        dispatch(addNotification({
          type: 'info',
          title: 'Export Feature',
          message: 'Export functionality will be available in the respective sections',
        }));
      },
    },
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'primary':
        return 'bg-primary-50 border-primary-200 hover:bg-primary-100 text-primary-700';
      case 'success':
        return 'bg-success-50 border-success-200 hover:bg-success-100 text-success-700';
      case 'warning':
        return 'bg-warning-50 border-warning-200 hover:bg-warning-100 text-warning-700';
      case 'secondary':
        return 'bg-secondary-50 border-secondary-200 hover:bg-secondary-100 text-secondary-700';
      default:
        return 'bg-background border-border hover:bg-surface text-text-primary';
    }
  };

  return (
    <div className="bg-surface border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text-primary">
          Quick Actions
        </h3>
        <span className="text-sm text-text-tertiary">
          Common tasks
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={action.onClick}
            className={`
              p-4 rounded-lg border transition-all duration-200 text-left
              hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
              ${getColorClasses(action.color)}
            `}
          >
            <div className="flex items-start space-x-3">
              <div className="text-2xl flex-shrink-0">
                {action.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm mb-1">
                  {action.title}
                </h4>
                <p className="text-xs opacity-80">
                  {action.description}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-tertiary">
            Need help getting started?
          </span>
          <button 
            className="text-primary-600 hover:text-primary-700 font-medium"
            onClick={() => {
              dispatch(addNotification({
                type: 'info',
                title: 'Documentation',
                message: 'Check the API documentation at /docs for detailed guides',
              }));
            }}
          >
            View Documentation →
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickActions;
